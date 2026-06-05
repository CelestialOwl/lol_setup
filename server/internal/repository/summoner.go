package repository

import (
	"context"
	"fmt"

	"lol-match-tracker/internal/database"
	"lol-match-tracker/internal/models"

	"github.com/lib/pq"
)

type SummonerRepository struct {
	db *database.DB
}

func NewSummonerRepository(db *database.DB) *SummonerRepository {
	return &SummonerRepository{db: db}
}

// FindRecent finds a summoner with recent data within the specified time window
func (r *SummonerRepository) FindRecent(ctx context.Context, gameName, tagLine, region string, maxAgeSeconds int) (*models.Summoner, error) {
	query := `
		SELECT puuid, game_name, tag_line, region, summoner_level, profile_icon_id, last_updated, created_at
		FROM summoners
		WHERE game_name = $1 AND tag_line = $2 AND region = $3
		  AND last_updated > NOW() - INTERVAL '%d seconds'
		LIMIT 1
	`

	var summoner models.Summoner
	err := r.db.QueryRowContext(ctx, fmt.Sprintf(query, maxAgeSeconds), gameName, tagLine, region).Scan(
		&summoner.PUUID,
		&summoner.GameName,
		&summoner.TagLine,
		&summoner.Region,
		&summoner.SummonerLevel,
		&summoner.ProfileIconID,
		&summoner.LastUpdated,
		&summoner.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &summoner, nil
}

// Upsert creates or updates a summoner record
func (r *SummonerRepository) Upsert(ctx context.Context, summoner *models.Summoner) error {
	query := `
		INSERT INTO summoners (puuid, game_name, tag_line, region, summoner_level, profile_icon_id, last_updated)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (puuid)
		DO UPDATE SET
			game_name = EXCLUDED.game_name,
			tag_line = EXCLUDED.tag_line,
			region = EXCLUDED.region,
			summoner_level = EXCLUDED.summoner_level,
			profile_icon_id = EXCLUDED.profile_icon_id,
			last_updated = NOW()
		RETURNING puuid, game_name, tag_line, region, summoner_level, profile_icon_id, last_updated, created_at
	`

	err := r.db.QueryRowContext(
		ctx,
		query,
		summoner.PUUID,
		summoner.GameName,
		summoner.TagLine,
		summoner.Region,
		summoner.SummonerLevel,
		summoner.ProfileIconID,
	).Scan(
		&summoner.PUUID,
		&summoner.GameName,
		&summoner.TagLine,
		&summoner.Region,
		&summoner.SummonerLevel,
		&summoner.ProfileIconID,
		&summoner.LastUpdated,
		&summoner.CreatedAt,
	)

	return err
}

// FindByPUUID finds a summoner by their PUUID
func (r *SummonerRepository) FindByPUUID(ctx context.Context, puuid string) (*models.Summoner, error) {
	query := `
		SELECT puuid, game_name, tag_line, region, summoner_level, profile_icon_id, last_updated, created_at
		FROM summoners
		WHERE puuid = $1
	`

	var summoner models.Summoner
	err := r.db.QueryRowContext(ctx, query, puuid).Scan(
		&summoner.PUUID,
		&summoner.GameName,
		&summoner.TagLine,
		&summoner.Region,
		&summoner.SummonerLevel,
		&summoner.ProfileIconID,
		&summoner.LastUpdated,
		&summoner.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &summoner, nil
}

// GetStats retrieves aggregated statistics for a summoner
func (r *SummonerRepository) GetStats(ctx context.Context, puuid string) (*models.MatchStats, error) {
	query := `
		SELECT puuid, game_name, tag_line, total_games, wins, win_rate, 
		       avg_kills, avg_deaths, avg_assists, avg_kda, avg_cs, avg_vision_score
		FROM match_stats
		WHERE puuid = $1
	`

	var stats models.MatchStats
	err := r.db.QueryRowContext(ctx, query, puuid).Scan(
		&stats.PUUID,
		&stats.GameName,
		&stats.TagLine,
		&stats.TotalGames,
		&stats.Wins,
		&stats.WinRate,
		&stats.AvgKills,
		&stats.AvgDeaths,
		&stats.AvgAssists,
		&stats.AvgKDA,
		&stats.AvgCS,
		&stats.AvgVisionScore,
	)

	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// SaveRankSnapshots inserts a rank snapshot for each entry if no snapshot
// already exists within the last hour for that puuid+queue_type pair.
func (r *SummonerRepository) SaveRankSnapshots(ctx context.Context, puuid string, entries []models.LeagueEntry) error {
	checkQuery := `
		SELECT COUNT(*) FROM rank_snapshots
		WHERE puuid = $1 AND queue_type = $2
		  AND recorded_at > NOW() - INTERVAL '1 hour'
	`
	insertQuery := `
		INSERT INTO rank_snapshots
		    (puuid, queue_type, tier, rank, league_points, wins, losses, hot_streak, veteran, fresh_blood, inactive)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	for _, e := range entries {
		var count int
		if err := r.db.QueryRowContext(ctx, checkQuery, puuid, e.QueueType).Scan(&count); err != nil {
			return fmt.Errorf("failed to check rank snapshot for queue %s: %w", e.QueueType, err)
		}
		if count > 0 {
			continue // already have a snapshot within the last hour
		}
		if _, err := r.db.ExecContext(ctx, insertQuery,
			puuid, e.QueueType, e.Tier, e.Rank, e.LeaguePoints,
			e.Wins, e.Losses, e.HotStreak, e.Veteran, e.FreshBlood, e.Inactive,
		); err != nil {
			return fmt.Errorf("failed to save rank snapshot for queue %s: %w", e.QueueType, err)
		}
	}

	return nil
}

// GetLatestRankSnapshots returns the latest snapshot per queue_type for a puuid.
func (r *SummonerRepository) GetLatestRankSnapshots(ctx context.Context, puuid string) ([]models.LeagueEntry, error) {
	query := `
		SELECT DISTINCT ON (queue_type)
		    queue_type, tier, rank, league_points, wins, losses, hot_streak, veteran, fresh_blood, inactive
		FROM rank_snapshots
		WHERE puuid = $1
		ORDER BY queue_type, recorded_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, puuid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []models.LeagueEntry
	for rows.Next() {
		var e models.LeagueEntry
		if err := rows.Scan(
			&e.QueueType, &e.Tier, &e.Rank, &e.LeaguePoints,
			&e.Wins, &e.Losses, &e.HotStreak, &e.Veteran, &e.FreshBlood, &e.Inactive,
		); err != nil {
			return nil, err
		}
		e.PUUID = puuid
		entries = append(entries, e)
	}

	return entries, rows.Err()
}

// GetLatestSoloRankByPUUIDs returns the latest RANKED_SOLO_5x5 snapshot for
// each of the given PUUIDs. PUUIDs with no snapshot are omitted from the map.
func (r *SummonerRepository) GetLatestSoloRankByPUUIDs(ctx context.Context, puuids []string) (map[string]*models.LeagueEntry, error) {
	if len(puuids) == 0 {
		return map[string]*models.LeagueEntry{}, nil
	}

	query := `
		SELECT DISTINCT ON (puuid)
		    puuid, queue_type, tier, rank, league_points, wins, losses, hot_streak, veteran, fresh_blood, inactive
		FROM rank_snapshots
		WHERE puuid = ANY($1)
		  AND queue_type = 'RANKED_SOLO_5x5'
		ORDER BY puuid, recorded_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, pq.Array(puuids))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]*models.LeagueEntry, len(puuids))
	for rows.Next() {
		var e models.LeagueEntry
		if err := rows.Scan(
			&e.PUUID, &e.QueueType, &e.Tier, &e.Rank, &e.LeaguePoints,
			&e.Wins, &e.Losses, &e.HotStreak, &e.Veteran, &e.FreshBlood, &e.Inactive,
		); err != nil {
			return nil, err
		}
		entry := e
		result[e.PUUID] = &entry
	}

	return result, rows.Err()
}

// GetRankHistory returns all snapshots for a puuid+queue_type ordered oldest-first
// (suitable for LP-over-time charts).
func (r *SummonerRepository) GetRankHistory(ctx context.Context, puuid, queueType string) ([]models.RankSnapshot, error) {
	query := `
		SELECT id, puuid, queue_type, tier, rank, league_points, wins, losses,
		       hot_streak, veteran, fresh_blood, inactive, recorded_at
		FROM rank_snapshots
		WHERE puuid = $1 AND queue_type = $2
		ORDER BY recorded_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query, puuid, queueType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []models.RankSnapshot
	for rows.Next() {
		var s models.RankSnapshot
		if err := rows.Scan(
			&s.ID, &s.PUUID, &s.QueueType, &s.Tier, &s.Rank, &s.LeaguePoints,
			&s.Wins, &s.Losses, &s.HotStreak, &s.Veteran, &s.FreshBlood, &s.Inactive, &s.RecordedAt,
		); err != nil {
			return nil, err
		}
		snapshots = append(snapshots, s)
	}

	return snapshots, rows.Err()
}
