package services

import (
	"fmt"
	"log"
	"time"

	"lol-match-tracker/internal/cache"
	"lol-match-tracker/internal/config"
	"lol-match-tracker/internal/models"
	"lol-match-tracker/internal/repository"
)

type SummonerService struct {
	summonerRepo *repository.SummonerRepository
	matchRepo    *repository.MatchRepository
	riotAPI      *RiotAPIService
	cache        *cache.RedisClient
	config       *config.Config
}

func NewSummonerService(
	summonerRepo *repository.SummonerRepository,
	matchRepo *repository.MatchRepository,
	riotAPI *RiotAPIService,
	cache *cache.RedisClient,
	config *config.Config,
) *SummonerService {
	return &SummonerService{
		summonerRepo: summonerRepo,
		matchRepo:    matchRepo,
		riotAPI:      riotAPI,
		cache:        cache,
		config:       config,
	}
}

// GetSummonerData retrieves summoner data with caching strategy
func (s *SummonerService) GetSummonerData(gameName, tagLine, region string) (*models.SummonerResponse, error) {
	cacheKey := fmt.Sprintf("summoner:%s:%s:%s", region, gameName, tagLine)

	// 1. Try cache first
	var cachedData models.SummonerResponse
	if err := s.cache.Get(cacheKey, &cachedData); err == nil {
		log.Printf("Cache hit for summoner: %s#%s", gameName, tagLine)
		return &cachedData, nil
	}

	// 2. Try database for recent data
	dbSummoner, err := s.summonerRepo.FindRecent(gameName, tagLine, region, s.config.SummonerCacheTTL)
	if err == nil && dbSummoner != nil {
		log.Printf("Database hit for summoner: %s#%s", gameName, tagLine)

		// Get recent matches from database
		matches, err := s.matchRepo.GetRecentMatchesForPUUID(dbSummoner.PUUID, 10)
		if err != nil {
			log.Printf("Error fetching matches from database: %v", err)
		}

		// Get live game info
		summonerInfo, _ := s.riotAPI.GetSummonerByPUUID(dbSummoner.PUUID, region)
		var liveGame *models.LiveGameInfo
		if summonerInfo != nil {
			liveGame, _ = s.riotAPI.GetCurrentGameInfo(summonerInfo.ID, region)
		}

		response := s.formatDatabaseResponse(dbSummoner, matches, liveGame)

		// Cache the result
		s.cache.Set(cacheKey, response, time.Duration(s.config.SummonerCacheTTL)*time.Second)

		return response, nil
	}

	// 3. Fetch from Riot API
	log.Printf("Fetching from Riot API for summoner: %s#%s", gameName, tagLine)

	response, err := s.fetchFromRiotAPI(gameName, tagLine, region)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch from Riot API: %w", err)
	}

	// 4. Store in database
	if err := s.storeSummonerData(response, region); err != nil {
		log.Printf("Error storing summoner data: %v", err)
	}

	// 5. Cache the result
	s.cache.Set(cacheKey, response, time.Duration(s.config.SummonerCacheTTL)*time.Second)

	return response, nil
}

// fetchFromRiotAPI fetches complete summoner data from Riot API
func (s *SummonerService) fetchFromRiotAPI(gameName, tagLine, region string) (*models.SummonerResponse, error) {
	// Get account info
	account, err := s.riotAPI.GetAccountByRiotID(gameName, tagLine, region)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %w", err)
	}

	// Get summoner info
	summoner, err := s.riotAPI.GetSummonerByPUUID(account.PUUID, region)
	if err != nil {
		return nil, fmt.Errorf("failed to get summoner: %w", err)
	}

	// Get match list
	matchIds, err := s.riotAPI.GetMatchList(account.PUUID, region, 10)
	if err != nil {
		return nil, fmt.Errorf("failed to get match list: %w", err)
	}

	// Get detailed match data
	var matches []models.MatchData
	for _, matchID := range matchIds {
		matchData, err := s.riotAPI.GetMatch(matchID, region)
		if err != nil {
			log.Printf("Error fetching match %s: %v", matchID, err)
			continue
		}
		matches = append(matches, *matchData)
	}

	// Get current game info
	liveGame, err := s.riotAPI.GetCurrentGameInfo(summoner.ID, region)
	if err != nil {
		log.Printf("No active game or error fetching live game: %v", err)
	}

	return &models.SummonerResponse{
		Account:  *account,
		Summoner: *summoner,
		Matches:  matches,
		LiveGame: liveGame,
	}, nil
}

// storeSummonerData stores summoner and match data in database
func (s *SummonerService) storeSummonerData(response *models.SummonerResponse, region string) error {
	// Store summoner
	summoner := &models.Summoner{
		PUUID:         response.Account.PUUID,
		GameName:      response.Account.GameName,
		TagLine:       response.Account.TagLine,
		Region:        region,
		SummonerLevel: response.Summoner.SummonerLevel,
		ProfileIconID: response.Summoner.ProfileIconID,
	}

	if err := s.summonerRepo.Upsert(summoner); err != nil {
		return fmt.Errorf("failed to upsert summoner: %w", err)
	}

	// Store matches
	var matches []models.Match
	for _, matchData := range response.Matches {
		if info, ok := matchData["info"].(map[string]interface{}); ok {
			match := models.Match{
				MatchID:      matchData["metadata"].(map[string]interface{})["matchId"].(string),
				GameCreation: int64(info["gameCreation"].(float64)),
				GameDuration: int(info["gameDuration"].(float64)),
				GameMode:     info["gameMode"].(string),
				QueueID:      int(info["queueId"].(float64)),
				Region:       region,
				MatchData:    matchData,
			}
			matches = append(matches, match)

			// Store participants
			if participants, ok := info["participants"].([]interface{}); ok {
				var participantModels []models.Participant
				for _, p := range participants {
					participant := p.(map[string]interface{})
					participantModel := models.Participant{
						PUUID:        participant["puuid"].(string),
						ChampionID:   int(participant["championId"].(float64)),
						ChampionName: participant["championName"].(string),
						Kills:        int(participant["kills"].(float64)),
						Deaths:       int(participant["deaths"].(float64)),
						Assists:      int(participant["assists"].(float64)),
						Win:          participant["win"].(bool),
						TotalDamage:  int64(participant["totalDamageDealtToChampions"].(float64)),
						GoldEarned:   int(participant["goldEarned"].(float64)),
					}
					participantModels = append(participantModels, participantModel)
				}

				if err := s.matchRepo.BulkInsertParticipants(match.MatchID, participantModels); err != nil {
					log.Printf("Error inserting participants for match %s: %v", match.MatchID, err)
				}
			}
		}
	}

	if err := s.matchRepo.BulkInsert(matches); err != nil {
		return fmt.Errorf("failed to insert matches: %w", err)
	}

	return nil
}

// formatDatabaseResponse formats database data for API response
func (s *SummonerService) formatDatabaseResponse(summoner *models.Summoner, matches []models.Match, liveGame *models.LiveGameInfo) *models.SummonerResponse {
	var matchData []models.MatchData
	for _, match := range matches {
		matchData = append(matchData, match.MatchData)
	}

	return &models.SummonerResponse{
		Account: models.AccountInfo{
			PUUID:    summoner.PUUID,
			GameName: summoner.GameName,
			TagLine:  summoner.TagLine,
		},
		Summoner: models.SummonerInfo{
			PUUID:         summoner.PUUID,
			SummonerLevel: summoner.SummonerLevel,
			ProfileIconID: summoner.ProfileIconID,
		},
		Matches:  matchData,
		LiveGame: liveGame,
	}
}

// GetSummonerStats retrieves aggregated statistics for a summoner
func (s *SummonerService) GetSummonerStats(puuid string) (*models.MatchStats, error) {
	cacheKey := fmt.Sprintf("stats:%s", puuid)

	// Try cache first
	var cachedStats models.MatchStats
	if err := s.cache.Get(cacheKey, &cachedStats); err == nil {
		return &cachedStats, nil
	}

	// Get from database
	stats, err := s.summonerRepo.GetStats(puuid)
	if err != nil {
		return nil, fmt.Errorf("failed to get summoner stats: %w", err)
	}

	// Cache for 1 hour
	s.cache.Set(cacheKey, stats, 1*time.Hour)

	return stats, nil
}
