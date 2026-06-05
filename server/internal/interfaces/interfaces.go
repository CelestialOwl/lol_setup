package interfaces

import (
	"context"
	"time"

	"lol-match-tracker/internal/models"
)

// SummonerRepository defines read/write access to the summoners and rank_snapshots tables.
type SummonerRepository interface {
	FindRecent(ctx context.Context, gameName, tagLine, region string, maxAgeSeconds int) (*models.Summoner, error)
	Upsert(ctx context.Context, summoner *models.Summoner) error
	FindByPUUID(ctx context.Context, puuid string) (*models.Summoner, error)
	GetStats(ctx context.Context, puuid string) (*models.MatchStats, error)
	SaveRankSnapshots(ctx context.Context, puuid string, entries []models.LeagueEntry) error
	GetLatestRankSnapshots(ctx context.Context, puuid string) ([]models.LeagueEntry, error)
	GetLatestSoloRankByPUUIDs(ctx context.Context, puuids []string) (map[string]*models.LeagueEntry, error)
	GetRankHistory(ctx context.Context, puuid, queueType string) ([]models.RankSnapshot, error)
}

// MatchRepository defines read/write access to the matches and participants tables.
type MatchRepository interface {
	BulkInsert(ctx context.Context, matches []models.Match) error
	GetRecentMatchesForPUUID(ctx context.Context, puuid string, limit int) ([]models.Match, error)
	FindByID(ctx context.Context, matchID string) (*models.Match, error)
	BulkInsertParticipants(ctx context.Context, matchID string, participants []models.Participant) error
	GetParticipants(ctx context.Context, matchID string) ([]models.Participant, error)
}

// Cache defines the key-value caching operations used by the service layer.
type Cache interface {
	Get(ctx context.Context, key string, dest interface{}) error
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
}

// RiotClient defines the external Riot API calls made by services.
type RiotClient interface {
	GetAccountByRiotID(ctx context.Context, gameName, tagLine, region string) (*models.AccountInfo, error)
	GetSummonerByPUUID(ctx context.Context, puuid, region string) (*models.SummonerInfo, error)
	GetMatchList(ctx context.Context, puuid, region string, count int) ([]string, error)
	GetMatch(ctx context.Context, matchID, region string) (*models.MatchData, error)
	GetCurrentGameByPUUID(ctx context.Context, puuid, region string) (map[string]interface{}, error)
	GetLeagueEntriesByPUUID(ctx context.Context, puuid, region string) ([]models.LeagueEntry, error)
}
