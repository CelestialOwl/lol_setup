package services

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"lol-match-tracker/internal/config"
	"lol-match-tracker/internal/interfaces"
	"lol-match-tracker/internal/metrics"
	"lol-match-tracker/internal/models"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
)

type SummonerService struct {
	summonerRepo interfaces.SummonerRepository
	matchRepo    interfaces.MatchRepository
	riotAPI      interfaces.RiotClient
	cache        interfaces.Cache
	config       *config.Config
	rankWorker   *RankFetchWorker
}

func NewSummonerService(
	summonerRepo interfaces.SummonerRepository,
	matchRepo interfaces.MatchRepository,
	riotAPI interfaces.RiotClient,
	cache interfaces.Cache,
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

// WithRankWorker attaches a background rank-fetch worker to the service.
// Call this once after construction; existing tests that pass no worker are unaffected.
func (s *SummonerService) WithRankWorker(w *RankFetchWorker) *SummonerService {
	s.rankWorker = w
	return s
}

// GetSummonerProfile fetches account + summoner info only (no matches).
// It checks Redis → Postgres → Riot API and is a fast 2-call path.
// On every live fetch it also retrieves and stores the player's rank.
func (s *SummonerService) GetSummonerProfile(ctx context.Context, gameName, tagLine, region string) (*models.SummonerProfileResponse, error) {
	tracer := otel.Tracer("lol-match-tracker/services")
	ctx, span := tracer.Start(ctx, "service.GetSummonerProfile")
	span.SetAttributes(
		attribute.String("summoner.game_name", gameName),
		attribute.String("summoner.tag_line", tagLine),
		attribute.String("summoner.region", region),
	)
	defer span.End()

	cacheKey := fmt.Sprintf("profile:%s:%s:%s", region, gameName, tagLine)

	// 1. Redis cache
	var cached models.SummonerProfileResponse
	cacheCtx, cancel := withTimeout(ctx, redisTimeout)
	if err := s.cache.Get(cacheCtx, cacheKey, &cached); err == nil {
		cancel()
		slog.Debug("profile cache hit", "summoner", gameName+"#"+tagLine)
		metrics.ResolutionTotal.WithLabelValues("profile", "cache").Inc()
		return &cached, nil
	}
	cancel()

	// 2. Postgres — recently-updated row
	dbCtx, cancel := withTimeout(ctx, dbTimeout)
	dbSummoner, err := s.summonerRepo.FindRecent(dbCtx, gameName, tagLine, region, s.config.SummonerCacheTTL)
	cancel()
	if err == nil && dbSummoner != nil {
		slog.Debug("profile database hit", "summoner", gameName+"#"+tagLine)
		metrics.ResolutionTotal.WithLabelValues("profile", "db").Inc()
		summonerInfo := &models.SummonerInfo{
			PUUID:         dbSummoner.PUUID,
			SummonerLevel: dbSummoner.SummonerLevel,
			ProfileIconID: dbSummoner.ProfileIconID,
		}
		// Best-effort refresh from Riot — ignore errors
		riotCtx, riotCancel := withTimeout(ctx, riotTimeout)
		if fresh, e := s.riotAPI.GetSummonerByPUUID(riotCtx, dbSummoner.PUUID, region); e == nil {
			summonerInfo = fresh
		}
		riotCancel()
		resp := &models.SummonerProfileResponse{
			Account: models.AccountInfo{
				PUUID:    dbSummoner.PUUID,
				GameName: dbSummoner.GameName,
				TagLine:  dbSummoner.TagLine,
			},
			Summoner: *summonerInfo,
		}
		// Attach rank from DB (no live fetch on cache hit)
		dbCtx, cancel = withTimeout(ctx, dbTimeout)
		if rankEntries, e := s.summonerRepo.GetLatestRankSnapshots(dbCtx, dbSummoner.PUUID); e == nil {
			resp.Rank = rankEntries
		}
		cancel()
		cacheCtx, cancel = withTimeout(ctx, redisTimeout)
		s.cache.Set(cacheCtx, cacheKey, resp, time.Duration(s.config.SummonerCacheTTL)*time.Second) //nolint:errcheck
		cancel()
		return resp, nil
	}

	// 3. Riot API
	slog.Info("fetching profile from Riot API", "summoner", gameName+"#"+tagLine)
	metrics.ResolutionTotal.WithLabelValues("profile", "riot_api").Inc()
	riotCtx, riotCancel := withTimeout(ctx, riotTimeout)
	account, err := s.riotAPI.GetAccountByRiotID(riotCtx, gameName, tagLine, region)
	riotCancel()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, fmt.Errorf("failed to get account: %w", err)
	}
	riotCtx, riotCancel = withTimeout(ctx, riotTimeout)
	summonerInfo, err := s.riotAPI.GetSummonerByPUUID(riotCtx, account.PUUID, region)
	riotCancel()
	if err != nil {
		return nil, fmt.Errorf("failed to get summoner info: %w", err)
	}

	// Persist summoner
	dbCtx, cancel = withTimeout(ctx, dbTimeout)
	if err := s.summonerRepo.Upsert(dbCtx, &models.Summoner{
		PUUID:         account.PUUID,
		GameName:      account.GameName,
		TagLine:       account.TagLine,
		Region:        region,
		SummonerLevel: summonerInfo.SummonerLevel,
		ProfileIconID: summonerInfo.ProfileIconID,
	}); err != nil {
		slog.Warn("failed to upsert summoner", "error", err)
	}
	cancel()

	// Fetch and store rank for the searched player
	rankEntries, rankErr := s.FetchAndStoreRank(ctx, account.PUUID, region)
	if rankErr != nil {
		slog.Warn("failed to fetch/store rank", "puuid", account.PUUID, "region", region, "error", rankErr)
	}

	resp := &models.SummonerProfileResponse{Account: *account, Summoner: *summonerInfo, Rank: rankEntries}
	cacheCtx, cancel = withTimeout(ctx, redisTimeout)
	s.cache.Set(cacheCtx, cacheKey, resp, time.Duration(s.config.SummonerCacheTTL)*time.Second) //nolint:errcheck
	cancel()
	return resp, nil
}

// GetMatchHistory fetches the last 10 matches for a PUUID.
// This is kept separate from GetSummonerProfile so the UI can display the
// summoner card immediately while match data loads in a follow-up request.
// The response includes a Ranks map with the latest solo rank from DB for every
// participant that has one — no live Riot API call is made for other players.
func (s *SummonerService) GetMatchHistory(ctx context.Context, puuid, region string) (*models.MatchHistoryResponse, error) {
	tracer := otel.Tracer("lol-match-tracker/services")
	ctx, span := tracer.Start(ctx, "service.GetMatchHistory")
	span.SetAttributes(
		attribute.String("summoner.puuid", puuid),
		attribute.String("summoner.region", region),
	)
	defer span.End()

	cacheKey := fmt.Sprintf("matches:%s:%s", region, puuid)

	// 1. Redis cache
	var cached models.MatchHistoryResponse
	cacheCtx, cancel := withTimeout(ctx, redisTimeout)
	if err := s.cache.Get(cacheCtx, cacheKey, &cached); err == nil {
		cancel()
		slog.Debug("matches cache hit", "puuid", puuid)
		metrics.ResolutionTotal.WithLabelValues("matches", "cache").Inc()
		return &cached, nil
	}
	cancel()

	// 2. Postgres
	dbCtx, cancel := withTimeout(ctx, dbTimeout)
	dbMatches, err := s.matchRepo.GetRecentMatchesForPUUID(dbCtx, puuid, 10)
	cancel()
	if err == nil && len(dbMatches) > 0 {
		slog.Debug("matches database hit", "puuid", puuid, "count", len(dbMatches))
		metrics.ResolutionTotal.WithLabelValues("matches", "db").Inc()
		var matchData []models.MatchData
		for _, m := range dbMatches {
			matchData = append(matchData, m.MatchData)
		}
		ranks := s.collectParticipantRanks(ctx, matchData)
		resp := &models.MatchHistoryResponse{PUUID: puuid, Matches: matchData, Total: len(matchData), Ranks: ranks}
		cacheCtx, cancel = withTimeout(ctx, redisTimeout)
		s.cache.Set(cacheCtx, cacheKey, resp, time.Duration(s.config.MatchCacheTTL)*time.Second) //nolint:errcheck
		cancel()
		return resp, nil
	}

	// 3. Riot API
	slog.Info("fetching match history from Riot API", "puuid", puuid)
	metrics.ResolutionTotal.WithLabelValues("matches", "riot_api").Inc()
	riotCtx, riotCancel := withTimeout(ctx, riotTimeout)
	matchIDs, err := s.riotAPI.GetMatchList(riotCtx, puuid, region, 10)
	riotCancel()
	if err != nil {
		return nil, fmt.Errorf("failed to get match list: %w", err)
	}

	var matches []models.MatchData
	for _, matchID := range matchIDs {
		riotCtx, riotCancel = withTimeout(ctx, riotTimeout)
		matchData, err := s.riotAPI.GetMatch(riotCtx, matchID, region)
		riotCancel()
		if err != nil {
			slog.Warn("failed to fetch match", "match_id", matchID, "error", err)
			continue
		}
		matches = append(matches, *matchData)
	}

	// Best-effort persistence
	if err := s.storeMatchData(ctx, matches, region); err != nil {
		slog.Warn("failed to store match data", "error", err)
	}

	ranks := s.collectParticipantRanks(ctx, matches)
	resp := &models.MatchHistoryResponse{PUUID: puuid, Matches: matches, Total: len(matches), Ranks: ranks}
	cacheCtx, cancel = withTimeout(ctx, redisTimeout)
	s.cache.Set(cacheCtx, cacheKey, resp, time.Duration(s.config.MatchCacheTTL)*time.Second) //nolint:errcheck
	cancel()
	return resp, nil
}

// collectParticipantRanks gathers all unique participant PUUIDs from a set of
// match data and batch-queries the DB for their latest solo rank. No Riot API
// calls are made — data is best-effort from previous snapshots.
func (s *SummonerService) collectParticipantRanks(ctx context.Context, matches []models.MatchData) map[string]*models.LeagueEntry {
	seen := make(map[string]struct{})
	var puuids []string

	for _, md := range matches {
		info, ok := md["info"].(map[string]interface{})
		if !ok {
			continue
		}
		participants, ok := info["participants"].([]interface{})
		if !ok {
			continue
		}
		for _, p := range participants {
			part, ok := p.(map[string]interface{})
			if !ok {
				continue
			}
			puuid, _ := part["puuid"].(string)
			if puuid == "" {
				continue
			}
			if _, dup := seen[puuid]; !dup {
				seen[puuid] = struct{}{}
				puuids = append(puuids, puuid)
			}
		}
	}

	dbCtx, cancel := withTimeout(ctx, dbTimeout)
	ranks, err := s.summonerRepo.GetLatestSoloRankByPUUIDs(dbCtx, puuids)
	cancel()
	if err != nil {
		slog.Warn("failed to fetch participant ranks from DB", "error", err)
		return nil
	}

	return ranks
}

// storeMatchData persists match rows and all 10 participants to the database.
// Participants are stored without a FK to summoners — see schema comments.
func (s *SummonerService) storeMatchData(ctx context.Context, matchesData []models.MatchData, region string) error {
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

				// Upsert participant to summoners table to cache them locally.
				// This avoids redundant API calls if the same player appears in future matches.
				gameName := getString(part, "riotIdGameName")
				tagLine := getString(part, "riotIdTagline")
				if gameName != "" && tagLine != "" {
					summoner := &models.Summoner{
						PUUID:         puuid,
						GameName:      gameName,
						TagLine:       tagLine,
						Region:        region,
						SummonerLevel: int(getFloat64(part, "summonerLevel")),
						ProfileIconID: int(getFloat64(part, "profileIcon")),
					}
					dbCtx, cancel := withTimeout(ctx, dbTimeout)
					if err := s.summonerRepo.Upsert(dbCtx, summoner); err != nil {
						slog.Warn("failed to upsert participant summoner", "puuid", puuid, "error", err)
					}
					cancel()
					if s.rankWorker != nil {
						s.rankWorker.Enqueue(RankFetchTask{PUUID: puuid, Region: region})
					}
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
			dbCtx, cancel := withTimeout(ctx, dbTimeout)
			if err := s.matchRepo.BulkInsertParticipants(dbCtx, match.MatchID, pModels); err != nil {
				slog.Warn("failed to insert participants", "match_id", match.MatchID, "error", err)
			}
			cancel()
		}
	}

	dbCtx, cancel := withTimeout(ctx, dbTimeout)
	if err := s.matchRepo.BulkInsert(dbCtx, matches); err != nil {
		cancel()
		return fmt.Errorf("failed to bulk insert matches: %w", err)
	}
	cancel()
	return nil
}

// GetSummonerStats retrieves aggregated win/loss stats for a summoner.
func (s *SummonerService) GetSummonerStats(ctx context.Context, puuid string) (*models.MatchStats, error) {
	cacheKey := fmt.Sprintf("stats:%s", puuid)

	var cachedStats models.MatchStats
	cacheCtx, cancel := withTimeout(ctx, redisTimeout)
	if err := s.cache.Get(cacheCtx, cacheKey, &cachedStats); err == nil {
		cancel()
		return &cachedStats, nil
	}
	cancel()

	dbCtx, cancel := withTimeout(ctx, dbTimeout)
	stats, err := s.summonerRepo.GetStats(dbCtx, puuid)
	cancel()
	if err != nil {
		return nil, fmt.Errorf("failed to get summoner stats: %w", err)
	}

	cacheCtx, cancel = withTimeout(ctx, redisTimeout)
	s.cache.Set(cacheCtx, cacheKey, stats, 1*time.Hour) //nolint:errcheck
	cancel()
	return stats, nil
}

// FetchAndStoreRank calls the Riot league API for the given player, persists
// a snapshot (deduplicated by 1-hour window), and returns the live entries.
// Only call this for the searched player — not for match participants.
func (s *SummonerService) FetchAndStoreRank(ctx context.Context, puuid, region string) ([]models.LeagueEntry, error) {
	riotCtx, riotCancel := withTimeout(ctx, riotTimeout)
	entries, err := s.riotAPI.GetLeagueEntriesByPUUID(riotCtx, puuid, region)
	riotCancel()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch rank from Riot API: %w", err)
	}

	dbCtx, cancel := withTimeout(ctx, dbTimeout)
	if err := s.summonerRepo.SaveRankSnapshots(dbCtx, puuid, entries); err != nil {
		slog.Warn("failed to save rank snapshots", "puuid", puuid, "error", err)
	}
	cancel()

	return entries, nil
}

// GetCachedRank returns the latest rank snapshots from DB for any puuid.
// No Riot API call is made — suitable for non-searched participants.
func (s *SummonerService) GetCachedRank(ctx context.Context, puuid string) ([]models.LeagueEntry, error) {
	dbCtx, cancel := withTimeout(ctx, dbTimeout)
	defer cancel()
	return s.summonerRepo.GetLatestRankSnapshots(dbCtx, puuid)
}

// GetRankHistory returns all stored rank snapshots for a puuid+queueType
// ordered oldest-first (for LP-over-time charts).
func (s *SummonerService) GetRankHistory(ctx context.Context, puuid, queueType string) ([]models.RankSnapshot, error) {
	if queueType == "" {
		queueType = "RANKED_SOLO_5x5"
	}
	dbCtx, cancel := withTimeout(ctx, dbTimeout)
	defer cancel()
	return s.summonerRepo.GetRankHistory(dbCtx, puuid, queueType)
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
