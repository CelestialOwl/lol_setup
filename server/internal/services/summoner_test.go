package services_test

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"lol-match-tracker/internal/cache"
	"lol-match-tracker/internal/config"
	"lol-match-tracker/internal/mocks"
	"lol-match-tracker/internal/models"
	"lol-match-tracker/internal/services"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// cacheMiss returns a mock Cache whose Get always returns a cache miss.
func cacheMiss() *mocks.Cache {
	return &mocks.Cache{
		GetFn: func(_ context.Context, _ string, _ interface{}) error {
			return cache.ErrCacheMiss
		},
	}
}

// defaultConfig returns a minimal server config for tests.
func defaultConfig() *config.Config {
	return &config.Config{
		SummonerCacheTTL: 300,
		MatchCacheTTL:    900,
		LiveGameCacheTTL: 60,
	}
}

// ── GetSummonerProfile ────────────────────────────────────────────────────────

func TestGetSummonerProfile_CacheHit(t *testing.T) {
	want := &models.SummonerProfileResponse{
		Account:  models.AccountInfo{PUUID: "puuid-1", GameName: "Khoji", TagLine: "777"},
		Summoner: models.SummonerInfo{SummonerLevel: 300},
	}

	mockCache := &mocks.Cache{
		GetFn: func(_ context.Context, _ string, dest interface{}) error {
			// Populate the destination with a known response.
			*(dest.(*models.SummonerProfileResponse)) = *want
			return nil
		},
	}

	svc := services.NewSummonerService(
		&mocks.SummonerRepository{},
		&mocks.MatchRepository{},
		&mocks.RiotClient{},
		mockCache,
		defaultConfig(),
	)

	got, err := svc.GetSummonerProfile(context.Background(), "Khoji", "777", "na1")
	require.NoError(t, err)
	assert.Equal(t, want.Account.PUUID, got.Account.PUUID)
	assert.Equal(t, want.Account.GameName, got.Account.GameName)
}

func TestGetSummonerProfile_DBHit(t *testing.T) {
	dbSummoner := &models.Summoner{
		PUUID:    "puuid-db",
		GameName: "Khoji",
		TagLine:  "777",
		Region:   "na1",
	}

	svc := services.NewSummonerService(
		&mocks.SummonerRepository{
			FindRecentFn: func(_ context.Context, _, _, _ string, _ int) (*models.Summoner, error) {
				return dbSummoner, nil
			},
			GetLatestRankSnapshotsFn: func(_ context.Context, _ string) ([]models.LeagueEntry, error) {
				return []models.LeagueEntry{{QueueType: "RANKED_SOLO_5x5", Tier: "GOLD"}}, nil
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			// Best-effort Riot refresh returns error — should not fail the call.
			GetSummonerByPUUIDFn: func(_ context.Context, _, _ string) (*models.SummonerInfo, error) {
				return nil, errors.New("riot unavailable")
			},
		},
		cacheMiss(),
		defaultConfig(),
	)

	got, err := svc.GetSummonerProfile(context.Background(), "Khoji", "777", "na1")
	require.NoError(t, err)
	assert.Equal(t, "puuid-db", got.Account.PUUID)
	assert.Len(t, got.Rank, 1)
	assert.Equal(t, "GOLD", got.Rank[0].Tier)
}

func TestGetSummonerProfile_RiotAPIFallback(t *testing.T) {
	account := &models.AccountInfo{PUUID: "puuid-riot", GameName: "Khoji", TagLine: "777"}
	summonerInfo := &models.SummonerInfo{SummonerLevel: 250, ProfileIconID: 5}
	rankEntries := []models.LeagueEntry{{QueueType: "RANKED_SOLO_5x5", Tier: "PLATINUM"}}

	svc := services.NewSummonerService(
		&mocks.SummonerRepository{
			FindRecentFn: func(_ context.Context, _, _, _ string, _ int) (*models.Summoner, error) {
				return nil, errors.New("not found")
			},
			SaveRankSnapshotsFn: func(_ context.Context, _ string, _ []models.LeagueEntry) error {
				return nil
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
				return account, nil
			},
			GetSummonerByPUUIDFn: func(_ context.Context, _, _ string) (*models.SummonerInfo, error) {
				return summonerInfo, nil
			},
			GetLeagueEntriesByPUUIDFn: func(_ context.Context, _, _ string) ([]models.LeagueEntry, error) {
				return rankEntries, nil
			},
		},
		cacheMiss(),
		defaultConfig(),
	)

	got, err := svc.GetSummonerProfile(context.Background(), "Khoji", "777", "na1")
	require.NoError(t, err)
	assert.Equal(t, "puuid-riot", got.Account.PUUID)
	assert.Equal(t, 250, got.Summoner.SummonerLevel)
	assert.Equal(t, "PLATINUM", got.Rank[0].Tier)
}

func TestGetSummonerProfile_RiotAPIError(t *testing.T) {
	svc := services.NewSummonerService(
		&mocks.SummonerRepository{
			FindRecentFn: func(_ context.Context, _, _, _ string, _ int) (*models.Summoner, error) {
				return nil, errors.New("not found")
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
				return nil, errors.New("404: not found")
			},
		},
		cacheMiss(),
		defaultConfig(),
	)

	_, err := svc.GetSummonerProfile(context.Background(), "Ghost", "0000", "na1")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get account")
}

// ── GetMatchHistory ───────────────────────────────────────────────────────────

func TestGetMatchHistory_CacheHit(t *testing.T) {
	want := &models.MatchHistoryResponse{
		PUUID:   "puuid-1",
		Matches: []models.MatchData{{"info": map[string]interface{}{}}},
		Total:   1,
	}

	mockCache := &mocks.Cache{
		GetFn: func(_ context.Context, _ string, dest interface{}) error {
			*(dest.(*models.MatchHistoryResponse)) = *want
			return nil
		},
	}

	svc := services.NewSummonerService(
		&mocks.SummonerRepository{},
		&mocks.MatchRepository{},
		&mocks.RiotClient{},
		mockCache,
		defaultConfig(),
	)

	got, err := svc.GetMatchHistory(context.Background(), "puuid-1", "na1")
	require.NoError(t, err)
	assert.Equal(t, 1, got.Total)
}

func TestGetMatchHistory_RiotAPIFallback(t *testing.T) {
	matchData := models.MatchData{
		"metadata": map[string]interface{}{"matchId": "NA1_001"},
		"info": map[string]interface{}{
			"gameCreation": float64(1700000000000),
			"gameDuration": float64(1800),
			"gameMode":     "CLASSIC",
			"queueId":      float64(420),
			"participants": []interface{}{},
		},
	}

	svc := services.NewSummonerService(
		&mocks.SummonerRepository{
			GetLatestSoloRankByPUUIDsFn: func(_ context.Context, _ []string) (map[string]*models.LeagueEntry, error) {
				return map[string]*models.LeagueEntry{}, nil
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			GetMatchListFn: func(_ context.Context, _, _ string, _ int) ([]string, error) {
				return []string{"NA1_001"}, nil
			},
			GetMatchFn: func(_ context.Context, _, _ string) (*models.MatchData, error) {
				return &matchData, nil
			},
		},
		cacheMiss(),
		defaultConfig(),
	)

	got, err := svc.GetMatchHistory(context.Background(), "puuid-1", "na1")
	require.NoError(t, err)
	assert.Equal(t, 1, got.Total)
}

func TestGetMatchHistory_RiotListError(t *testing.T) {
	svc := services.NewSummonerService(
		&mocks.SummonerRepository{},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			GetMatchListFn: func(_ context.Context, _, _ string, _ int) ([]string, error) {
				return nil, errors.New("riot rate limit")
			},
		},
		cacheMiss(),
		defaultConfig(),
	)

	_, err := svc.GetMatchHistory(context.Background(), "puuid-1", "na1")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get match list")
}

// ── GetSummonerStats ──────────────────────────────────────────────────────────

func TestGetSummonerStats_CacheHit(t *testing.T) {
	want := &models.MatchStats{PUUID: "puuid-1", TotalGames: 42, WinRate: 53.5}

	mockCache := &mocks.Cache{
		GetFn: func(_ context.Context, _ string, dest interface{}) error {
			*(dest.(*models.MatchStats)) = *want
			return nil
		},
	}

	svc := services.NewSummonerService(
		&mocks.SummonerRepository{},
		&mocks.MatchRepository{},
		&mocks.RiotClient{},
		mockCache,
		defaultConfig(),
	)

	got, err := svc.GetSummonerStats(context.Background(), "puuid-1")
	require.NoError(t, err)
	assert.Equal(t, 42, got.TotalGames)
	assert.InDelta(t, 53.5, got.WinRate, 0.01)
}

func TestGetSummonerStats_DBHit(t *testing.T) {
	dbStats := &models.MatchStats{PUUID: "puuid-1", TotalGames: 10, Wins: 6}

	svc := services.NewSummonerService(
		&mocks.SummonerRepository{
			GetStatsFn: func(_ context.Context, _ string) (*models.MatchStats, error) {
				return dbStats, nil
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{},
		cacheMiss(),
		defaultConfig(),
	)

	got, err := svc.GetSummonerStats(context.Background(), "puuid-1")
	require.NoError(t, err)
	assert.Equal(t, 10, got.TotalGames)
}

// ── GetRankHistory ────────────────────────────────────────────────────────────

func TestGetRankHistory_DefaultsToSolo(t *testing.T) {
	var capturedQueueType string

	svc := services.NewSummonerService(
		&mocks.SummonerRepository{
			GetRankHistoryFn: func(_ context.Context, _ string, queueType string) ([]models.RankSnapshot, error) {
				capturedQueueType = queueType
				return []models.RankSnapshot{{QueueType: queueType, Tier: "DIAMOND"}}, nil
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{},
		cacheMiss(),
		defaultConfig(),
	)

	snapshots, err := svc.GetRankHistory(context.Background(), "puuid-1", "")
	require.NoError(t, err)
	assert.Equal(t, "RANKED_SOLO_5x5", capturedQueueType)
	assert.Len(t, snapshots, 1)
}

// ── FetchAndStoreRank ─────────────────────────────────────────────────────────

func TestFetchAndStoreRank_PersistsEntries(t *testing.T) {
	var savedPUUID string
	var savedEntries []models.LeagueEntry

	entries := []models.LeagueEntry{
		{QueueType: "RANKED_SOLO_5x5", Tier: "GOLD", Rank: "I"},
	}

	svc := services.NewSummonerService(
		&mocks.SummonerRepository{
			SaveRankSnapshotsFn: func(_ context.Context, puuid string, e []models.LeagueEntry) error {
				savedPUUID = puuid
				savedEntries = e
				return nil
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			GetLeagueEntriesByPUUIDFn: func(_ context.Context, _, _ string) ([]models.LeagueEntry, error) {
				return entries, nil
			},
		},
		cacheMiss(),
		defaultConfig(),
	)

	got, err := svc.FetchAndStoreRank(context.Background(), "puuid-store", "na1")
	require.NoError(t, err)
	assert.Equal(t, "puuid-store", savedPUUID)
	assert.Equal(t, entries, savedEntries)
	assert.Equal(t, entries, got)
}

// ── CacheKey format ───────────────────────────────────────────────────────────

func TestGetSummonerProfile_CacheKeyFormat(t *testing.T) {
	var capturedKey string

	mockCache := &mocks.Cache{
		GetFn: func(_ context.Context, key string, _ interface{}) error {
			capturedKey = key
			return cache.ErrCacheMiss
		},
		SetFn: func(_ context.Context, _ string, _ interface{}, _ time.Duration) error {
			return nil
		},
	}

	account := &models.AccountInfo{PUUID: "p", GameName: "Khoji", TagLine: "777"}
	summonerInfo := &models.SummonerInfo{SummonerLevel: 100}

	svc := services.NewSummonerService(
		&mocks.SummonerRepository{
			FindRecentFn: func(_ context.Context, _, _, _ string, _ int) (*models.Summoner, error) {
				return nil, errors.New("miss")
			},
			SaveRankSnapshotsFn: func(_ context.Context, _ string, _ []models.LeagueEntry) error { return nil },
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
				return account, nil
			},
			GetSummonerByPUUIDFn: func(_ context.Context, _, _ string) (*models.SummonerInfo, error) {
				return summonerInfo, nil
			},
			GetLeagueEntriesByPUUIDFn: func(_ context.Context, _, _ string) ([]models.LeagueEntry, error) {
				return nil, nil
			},
		},
		mockCache,
		defaultConfig(),
	)

	_, err := svc.GetSummonerProfile(context.Background(), "Khoji", "777", "na1")
	require.NoError(t, err)
	assert.Equal(t, fmt.Sprintf("profile:%s:%s:%s", "na1", "Khoji", "777"), capturedKey)
}
