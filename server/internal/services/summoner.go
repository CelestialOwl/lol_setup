package services

import (
	"fmt"
	"log/slog"
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

// GetSummonerProfile fetches account + summoner info only (no matches).
// It checks Redis → Postgres → Riot API and is a fast 2-call path.
func (s *SummonerService) GetSummonerProfile(gameName, tagLine, region string) (*models.SummonerProfileResponse, error) {
	cacheKey := fmt.Sprintf("profile:%s:%s:%s", region, gameName, tagLine)

	// 1. Redis cache
	var cached models.SummonerProfileResponse
	if err := s.cache.Get(cacheKey, &cached); err == nil {
		slog.Debug("profile cache hit", "summoner", gameName+"#"+tagLine)
		return &cached, nil
	}

	// 2. Postgres — recently-updated row
	dbSummoner, err := s.summonerRepo.FindRecent(gameName, tagLine, region, s.config.SummonerCacheTTL)
	if err == nil && dbSummoner != nil {
		slog.Debug("profile database hit", "summoner", gameName+"#"+tagLine)
		summonerInfo := &models.SummonerInfo{
			PUUID:         dbSummoner.PUUID,
			SummonerLevel: dbSummoner.SummonerLevel,
			ProfileIconID: dbSummoner.ProfileIconID,
		}
		// Best-effort refresh from Riot — ignore errors
		if fresh, e := s.riotAPI.GetSummonerByPUUID(dbSummoner.PUUID, region); e == nil {
			summonerInfo = fresh
		}
		resp := &models.SummonerProfileResponse{
			Account: models.AccountInfo{
				PUUID:    dbSummoner.PUUID,
				GameName: dbSummoner.GameName,
				TagLine:  dbSummoner.TagLine,
			},
			Summoner: *summonerInfo,
		}
		s.cache.Set(cacheKey, resp, time.Duration(s.config.SummonerCacheTTL)*time.Second) //nolint:errcheck
		return resp, nil
	}

	// 3. Riot API
	slog.Info("fetching profile from Riot API", "summoner", gameName+"#"+tagLine)
	account, err := s.riotAPI.GetAccountByRiotID(gameName, tagLine, region)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %w", err)
	}
	summonerInfo, err := s.riotAPI.GetSummonerByPUUID(account.PUUID, region)
	if err != nil {
		return nil, fmt.Errorf("failed to get summoner info: %w", err)
	}

	// Persist summoner
	if err := s.summonerRepo.Upsert(&models.Summoner{
		PUUID:         account.PUUID,
		GameName:      account.GameName,
		TagLine:       account.TagLine,
		Region:        region,
		SummonerLevel: summonerInfo.SummonerLevel,
		ProfileIconID: summonerInfo.ProfileIconID,
	}); err != nil {
		slog.Warn("failed to upsert summoner", "error", err)
	}

	resp := &models.SummonerProfileResponse{Account: *account, Summoner: *summonerInfo}
	s.cache.Set(cacheKey, resp, time.Duration(s.config.SummonerCacheTTL)*time.Second) //nolint:errcheck
	return resp, nil
}

// GetMatchHistory fetches the last 10 matches for a PUUID.
// This is kept separate from GetSummonerProfile so the UI can display the
// summoner card immediately while match data loads in a follow-up request.
func (s *SummonerService) GetMatchHistory(puuid, region string) (*models.MatchHistoryResponse, error) {
	cacheKey := fmt.Sprintf("matches:%s:%s", region, puuid)

	// 1. Redis cache
	var cached models.MatchHistoryResponse
	if err := s.cache.Get(cacheKey, &cached); err == nil {
		slog.Debug("matches cache hit", "puuid", puuid)
		return &cached, nil
	}

	// 2. Postgres
	dbMatches, err := s.matchRepo.GetRecentMatchesForPUUID(puuid, 10)
	if err == nil && len(dbMatches) > 0 {
		slog.Debug("matches database hit", "puuid", puuid, "count", len(dbMatches))
		var matchData []models.MatchData
		for _, m := range dbMatches {
			matchData = append(matchData, m.MatchData)
		}
		resp := &models.MatchHistoryResponse{PUUID: puuid, Matches: matchData, Total: len(matchData)}
		s.cache.Set(cacheKey, resp, time.Duration(s.config.MatchCacheTTL)*time.Second) //nolint:errcheck
		return resp, nil
	}

	// 3. Riot API
	slog.Info("fetching match history from Riot API", "puuid", puuid)
	matchIDs, err := s.riotAPI.GetMatchList(puuid, region, 10)
	if err != nil {
		return nil, fmt.Errorf("failed to get match list: %w", err)
	}

	var matches []models.MatchData
	for _, matchID := range matchIDs {
		matchData, err := s.riotAPI.GetMatch(matchID, region)
		if err != nil {
			slog.Warn("failed to fetch match", "match_id", matchID, "error", err)
			continue
		}
		matches = append(matches, *matchData)
	}

	// Best-effort persistence
	if err := s.storeMatchData(matches, region); err != nil {
		slog.Warn("failed to store match data", "error", err)
	}

	resp := &models.MatchHistoryResponse{PUUID: puuid, Matches: matches, Total: len(matches)}
	s.cache.Set(cacheKey, resp, time.Duration(s.config.MatchCacheTTL)*time.Second) //nolint:errcheck
	return resp, nil
}

// storeMatchData persists match rows and all 10 participants to the database.
// Participants are stored without a FK to summoners — see schema comments.
func (s *SummonerService) storeMatchData(matchesData []models.MatchData, region string) error {
	var matches []models.Match
	for _, matchData := range matchesData {
		info, ok := matchData["info"].(map[string]interface{})
		if !ok {
			slog.Warn("skipping match: missing 'info' field")
			continue
		}
		metadata, ok := matchData["metadata"].(map[string]interface{})
		if !ok {
			slog.Warn("skipping match: missing 'metadata' field")
			continue
		}
		matchID, ok := metadata["matchId"].(string)
		if !ok || matchID == "" {
			slog.Warn("skipping match: missing 'matchId'")
			continue
		}

		match := models.Match{
			MatchID:      matchID,
			GameCreation: int64(getFloat64(info, "gameCreation")),
			GameDuration: int(getFloat64(info, "gameDuration")),
			GameMode:     getString(info, "gameMode"),
			QueueID:      int(getFloat64(info, "queueId")),
			Region:       region,
			MatchData:    matchData,
		}
		matches = append(matches, match)

		if participants, ok := info["participants"].([]interface{}); ok {
			var pModels []models.Participant
			for _, p := range participants {
				part, ok := p.(map[string]interface{})
				if !ok {
					continue
				}
				puuid, ok := part["puuid"].(string)
				if !ok || puuid == "" {
					continue
				}
				pModels = append(pModels, models.Participant{
					PUUID:        puuid,
					ChampionID:   int(getFloat64(part, "championId")),
					ChampionName: getString(part, "championName"),
					Kills:        int(getFloat64(part, "kills")),
					Deaths:       int(getFloat64(part, "deaths")),
					Assists:      int(getFloat64(part, "assists")),
					Win:          getBool(part, "win"),
					TotalDamage:  int64(getFloat64(part, "totalDamageDealtToChampions")),
					GoldEarned:   int(getFloat64(part, "goldEarned")),
				})
			}
			if err := s.matchRepo.BulkInsertParticipants(match.MatchID, pModels); err != nil {
				slog.Warn("failed to insert participants", "match_id", match.MatchID, "error", err)
			}
		}
	}

	if err := s.matchRepo.BulkInsert(matches); err != nil {
		return fmt.Errorf("failed to bulk insert matches: %w", err)
	}
	return nil
}

// GetSummonerStats retrieves aggregated win/loss stats for a summoner.
func (s *SummonerService) GetSummonerStats(puuid string) (*models.MatchStats, error) {
	cacheKey := fmt.Sprintf("stats:%s", puuid)

	var cachedStats models.MatchStats
	if err := s.cache.Get(cacheKey, &cachedStats); err == nil {
		return &cachedStats, nil
	}

	stats, err := s.summonerRepo.GetStats(puuid)
	if err != nil {
		return nil, fmt.Errorf("failed to get summoner stats: %w", err)
	}

	s.cache.Set(cacheKey, stats, 1*time.Hour) //nolint:errcheck
	return stats, nil
}

// ── safe map helpers ──────────────────────────────────────────────────────────

func getFloat64(m map[string]interface{}, key string) float64 {
	v, ok := m[key]
	if !ok {
		return 0
	}
	f, _ := v.(float64)
	return f
}

func getString(m map[string]interface{}, key string) string {
	v, ok := m[key]
	if !ok {
		return ""
	}
	s, _ := v.(string)
	return s
}

func getBool(m map[string]interface{}, key string) bool {
	v, ok := m[key]
	if !ok {
		return false
	}
	b, _ := v.(bool)
	return b
}
