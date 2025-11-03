package repository

import (
	"fmt"

	"lol-match-tracker/internal/database"
	"lol-match-tracker/internal/models"
)

type SummonerRepository struct {
	db *database.DB
}

func NewSummonerRepository(db *database.DB) *SummonerRepository {
	return &SummonerRepository{db: db}
}

// FindRecent finds a summoner with recent data within the specified time window
func (r *SummonerRepository) FindRecent(gameName, tagLine, region string, maxAgeSeconds int) (*models.Summoner, error) {
	query := `
		SELECT puuid, game_name, tag_line, region, summoner_level, profile_icon_id, last_updated, created_at
		FROM summoners
		WHERE game_name = $1 AND tag_line = $2 AND region = $3
		  AND last_updated > NOW() - INTERVAL '%d seconds'
		LIMIT 1
	`

	var summoner models.Summoner
	err := r.db.QueryRow(fmt.Sprintf(query, maxAgeSeconds), gameName, tagLine, region).Scan(
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
func (r *SummonerRepository) Upsert(summoner *models.Summoner) error {
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

	err := r.db.QueryRow(
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
func (r *SummonerRepository) FindByPUUID(puuid string) (*models.Summoner, error) {
	query := `
		SELECT puuid, game_name, tag_line, region, summoner_level, profile_icon_id, last_updated, created_at
		FROM summoners
		WHERE puuid = $1
	`

	var summoner models.Summoner
	err := r.db.QueryRow(query, puuid).Scan(
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
func (r *SummonerRepository) GetStats(puuid string) (*models.MatchStats, error) {
	query := `
		SELECT puuid, game_name, tag_line, total_games, wins, win_rate, 
		       avg_kills, avg_deaths, avg_assists, avg_kda, avg_cs, avg_vision_score
		FROM match_stats
		WHERE puuid = $1
	`

	var stats models.MatchStats
	err := r.db.QueryRow(query, puuid).Scan(
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
