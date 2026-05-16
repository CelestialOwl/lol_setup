// Package mocks contains hand-written test doubles for the service layer interfaces.
// Each mock records calls and lets tests configure return values per method.
package mocks

import (
	"context"
	"time"

	"lol-match-tracker/internal/models"
)

// ── SummonerRepository ────────────────────────────────────────────────────────

type SummonerRepository struct {
	FindRecentFn                func(ctx context.Context, gameName, tagLine, region string, maxAgeSeconds int) (*models.Summoner, error)
	UpsertFn                    func(ctx context.Context, summoner *models.Summoner) error
	FindByPUUIDFn               func(ctx context.Context, puuid string) (*models.Summoner, error)
	GetStatsFn                  func(ctx context.Context, puuid string) (*models.MatchStats, error)
	SaveRankSnapshotsFn         func(ctx context.Context, puuid string, entries []models.LeagueEntry) error
	GetLatestRankSnapshotsFn    func(ctx context.Context, puuid string) ([]models.LeagueEntry, error)
	GetLatestSoloRankByPUUIDsFn func(ctx context.Context, puuids []string) (map[string]*models.LeagueEntry, error)
	GetRankHistoryFn            func(ctx context.Context, puuid, queueType string) ([]models.RankSnapshot, error)
}

func (m *SummonerRepository) FindRecent(ctx context.Context, gameName, tagLine, region string, maxAgeSeconds int) (*models.Summoner, error) {
	if m.FindRecentFn != nil {
		return m.FindRecentFn(ctx, gameName, tagLine, region, maxAgeSeconds)
	}
	return nil, nil
}

func (m *SummonerRepository) Upsert(ctx context.Context, summoner *models.Summoner) error {
	if m.UpsertFn != nil {
		return m.UpsertFn(ctx, summoner)
	}
	return nil
}

func (m *SummonerRepository) FindByPUUID(ctx context.Context, puuid string) (*models.Summoner, error) {
	if m.FindByPUUIDFn != nil {
		return m.FindByPUUIDFn(ctx, puuid)
	}
	return nil, nil
}

func (m *SummonerRepository) GetStats(ctx context.Context, puuid string) (*models.MatchStats, error) {
	if m.GetStatsFn != nil {
		return m.GetStatsFn(ctx, puuid)
	}
	return nil, nil
}

func (m *SummonerRepository) SaveRankSnapshots(ctx context.Context, puuid string, entries []models.LeagueEntry) error {
	if m.SaveRankSnapshotsFn != nil {
		return m.SaveRankSnapshotsFn(ctx, puuid, entries)
	}
	return nil
}

func (m *SummonerRepository) GetLatestRankSnapshots(ctx context.Context, puuid string) ([]models.LeagueEntry, error) {
	if m.GetLatestRankSnapshotsFn != nil {
		return m.GetLatestRankSnapshotsFn(ctx, puuid)
	}
	return nil, nil
}

func (m *SummonerRepository) GetLatestSoloRankByPUUIDs(ctx context.Context, puuids []string) (map[string]*models.LeagueEntry, error) {
	if m.GetLatestSoloRankByPUUIDsFn != nil {
		return m.GetLatestSoloRankByPUUIDsFn(ctx, puuids)
	}
	return map[string]*models.LeagueEntry{}, nil
}

func (m *SummonerRepository) GetRankHistory(ctx context.Context, puuid, queueType string) ([]models.RankSnapshot, error) {
	if m.GetRankHistoryFn != nil {
		return m.GetRankHistoryFn(ctx, puuid, queueType)
	}
	return nil, nil
}

// ── MatchRepository ───────────────────────────────────────────────────────────

type MatchRepository struct {
	BulkInsertFn               func(ctx context.Context, matches []models.Match) error
	GetRecentMatchesForPUUIDFn func(ctx context.Context, puuid string, limit int) ([]models.Match, error)
	FindByIDFn                 func(ctx context.Context, matchID string) (*models.Match, error)
	BulkInsertParticipantsFn   func(ctx context.Context, matchID string, participants []models.Participant) error
	GetParticipantsFn          func(ctx context.Context, matchID string) ([]models.Participant, error)
}

func (m *MatchRepository) BulkInsert(ctx context.Context, matches []models.Match) error {
	if m.BulkInsertFn != nil {
		return m.BulkInsertFn(ctx, matches)
	}
	return nil
}

func (m *MatchRepository) GetRecentMatchesForPUUID(ctx context.Context, puuid string, limit int) ([]models.Match, error) {
	if m.GetRecentMatchesForPUUIDFn != nil {
		return m.GetRecentMatchesForPUUIDFn(ctx, puuid, limit)
	}
	return nil, nil
}

func (m *MatchRepository) FindByID(ctx context.Context, matchID string) (*models.Match, error) {
	if m.FindByIDFn != nil {
		return m.FindByIDFn(ctx, matchID)
	}
	return nil, nil
}

func (m *MatchRepository) BulkInsertParticipants(ctx context.Context, matchID string, participants []models.Participant) error {
	if m.BulkInsertParticipantsFn != nil {
		return m.BulkInsertParticipantsFn(ctx, matchID, participants)
	}
	return nil
}

func (m *MatchRepository) GetParticipants(ctx context.Context, matchID string) ([]models.Participant, error) {
	if m.GetParticipantsFn != nil {
		return m.GetParticipantsFn(ctx, matchID)
	}
	return nil, nil
}

// ── Cache ─────────────────────────────────────────────────────────────────────

type Cache struct {
	GetFn    func(ctx context.Context, key string, dest interface{}) error
	SetFn    func(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	DeleteFn func(ctx context.Context, key string) error
	ExistsFn func(ctx context.Context, key string) (bool, error)
}

func (m *Cache) Get(ctx context.Context, key string, dest interface{}) error {
	if m.GetFn != nil {
		return m.GetFn(ctx, key, dest)
	}
	return nil
}

func (m *Cache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if m.SetFn != nil {
		return m.SetFn(ctx, key, value, ttl)
	}
	return nil
}

func (m *Cache) Delete(ctx context.Context, key string) error {
	if m.DeleteFn != nil {
		return m.DeleteFn(ctx, key)
	}
	return nil
}

func (m *Cache) Exists(ctx context.Context, key string) (bool, error) {
	if m.ExistsFn != nil {
		return m.ExistsFn(ctx, key)
	}
	return false, nil
}

// ── RiotClient ────────────────────────────────────────────────────────────────

type RiotClient struct {
	GetAccountByRiotIDFn      func(ctx context.Context, gameName, tagLine, region string) (*models.AccountInfo, error)
	GetSummonerByPUUIDFn      func(ctx context.Context, puuid, region string) (*models.SummonerInfo, error)
	GetMatchListFn            func(ctx context.Context, puuid, region string, count int) ([]string, error)
	GetMatchFn                func(ctx context.Context, matchID, region string) (*models.MatchData, error)
	GetCurrentGameByPUUIDFn   func(ctx context.Context, puuid, region string) (map[string]interface{}, error)
	GetLeagueEntriesByPUUIDFn func(ctx context.Context, puuid, region string) ([]models.LeagueEntry, error)
}

func (m *RiotClient) GetAccountByRiotID(ctx context.Context, gameName, tagLine, region string) (*models.AccountInfo, error) {
	if m.GetAccountByRiotIDFn != nil {
		return m.GetAccountByRiotIDFn(ctx, gameName, tagLine, region)
	}
	return nil, nil
}

func (m *RiotClient) GetSummonerByPUUID(ctx context.Context, puuid, region string) (*models.SummonerInfo, error) {
	if m.GetSummonerByPUUIDFn != nil {
		return m.GetSummonerByPUUIDFn(ctx, puuid, region)
	}
	return nil, nil
}

func (m *RiotClient) GetMatchList(ctx context.Context, puuid, region string, count int) ([]string, error) {
	if m.GetMatchListFn != nil {
		return m.GetMatchListFn(ctx, puuid, region, count)
	}
	return nil, nil
}

func (m *RiotClient) GetMatch(ctx context.Context, matchID, region string) (*models.MatchData, error) {
	if m.GetMatchFn != nil {
		return m.GetMatchFn(ctx, matchID, region)
	}
	return nil, nil
}

func (m *RiotClient) GetCurrentGameByPUUID(ctx context.Context, puuid, region string) (map[string]interface{}, error) {
	if m.GetCurrentGameByPUUIDFn != nil {
		return m.GetCurrentGameByPUUIDFn(ctx, puuid, region)
	}
	return nil, nil
}

func (m *RiotClient) GetLeagueEntriesByPUUID(ctx context.Context, puuid, region string) ([]models.LeagueEntry, error) {
	if m.GetLeagueEntriesByPUUIDFn != nil {
		return m.GetLeagueEntriesByPUUIDFn(ctx, puuid, region)
	}
	return nil, nil
}
