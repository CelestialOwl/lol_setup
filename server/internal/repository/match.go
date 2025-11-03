package repository

import (
	"database/sql"
	"fmt"
	"strings"

	"lol-match-tracker/internal/database"
	"lol-match-tracker/internal/models"
)

type MatchRepository struct {
	db *database.DB
}

func NewMatchRepository(db *database.DB) *MatchRepository {
	return &MatchRepository{db: db}
}

// BulkInsert inserts multiple matches efficiently
func (r *MatchRepository) BulkInsert(matches []models.Match) error {
	if len(matches) == 0 {
		return nil
	}

	// Prepare bulk insert query
	valueStrings := make([]string, 0, len(matches))
	valueArgs := make([]interface{}, 0, len(matches)*6)

	for i, match := range matches {
		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d)",
			i*6+1, i*6+2, i*6+3, i*6+4, i*6+5, i*6+6))
		valueArgs = append(valueArgs,
			match.MatchID,
			match.GameCreation,
			match.GameDuration,
			match.GameMode,
			match.QueueID,
			match.MatchData,
		)
	}

	query := fmt.Sprintf(`
		INSERT INTO matches (match_id, game_creation, game_duration, game_mode, queue_id, match_data)
		VALUES %s
		ON CONFLICT (match_id) DO NOTHING
	`, strings.Join(valueStrings, ","))

	_, err := r.db.Exec(query, valueArgs...)
	return err
}

// GetRecentMatchesForPUUID retrieves recent matches for a summoner
func (r *MatchRepository) GetRecentMatchesForPUUID(puuid string, limit int) ([]models.Match, error) {
	query := `
		SELECT DISTINCT m.match_id, m.game_creation, m.game_duration, m.game_mode, 
		       m.queue_id, m.region, m.match_data, m.created_at, m.last_updated
		FROM matches m
		JOIN participants p ON m.match_id = p.match_id
		WHERE p.puuid = $1
		ORDER BY m.game_creation DESC
		LIMIT $2
	`

	rows, err := r.db.Query(query, puuid, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var matches []models.Match
	for rows.Next() {
		var match models.Match
		err := rows.Scan(
			&match.MatchID,
			&match.GameCreation,
			&match.GameDuration,
			&match.GameMode,
			&match.QueueID,
			&match.Region,
			&match.MatchData,
			&match.CreatedAt,
			&match.LastUpdated,
		)
		if err != nil {
			return nil, err
		}
		matches = append(matches, match)
	}

	return matches, nil
}

// FindByID finds a match by its ID
func (r *MatchRepository) FindByID(matchID string) (*models.Match, error) {
	query := `
		SELECT match_id, game_creation, game_duration, game_mode, queue_id, 
		       region, match_data, created_at, last_updated
		FROM matches
		WHERE match_id = $1
	`

	var match models.Match
	err := r.db.QueryRow(query, matchID).Scan(
		&match.MatchID,
		&match.GameCreation,
		&match.GameDuration,
		&match.GameMode,
		&match.QueueID,
		&match.Region,
		&match.MatchData,
		&match.CreatedAt,
		&match.LastUpdated,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &match, nil
}

// BulkInsertParticipants inserts participants for a match
func (r *MatchRepository) BulkInsertParticipants(matchID string, participants []models.Participant) error {
	if len(participants) == 0 {
		return nil
	}

	valueStrings := make([]string, 0, len(participants))
	valueArgs := make([]interface{}, 0, len(participants)*11)

	for i, p := range participants {
		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			i*11+1, i*11+2, i*11+3, i*11+4, i*11+5, i*11+6, i*11+7, i*11+8, i*11+9, i*11+10, i*11+11))

		// Calculate KDA
		kda := float64(p.Kills + p.Assists)
		if p.Deaths > 0 {
			kda = float64(p.Kills+p.Assists) / float64(p.Deaths)
		}

		valueArgs = append(valueArgs,
			matchID,
			p.PUUID,
			p.ChampionID,
			p.ChampionName,
			p.Kills,
			p.Deaths,
			p.Assists,
			p.Win,
			p.TotalDamage,
			p.GoldEarned,
			kda,
		)
	}

	query := fmt.Sprintf(`
		INSERT INTO participants (
			match_id, puuid, champion_id, champion_name, kills, deaths, assists, 
			win, total_damage, gold_earned, kda
		)
		VALUES %s
		ON CONFLICT (match_id, puuid) DO NOTHING
	`, strings.Join(valueStrings, ","))

	_, err := r.db.Exec(query, valueArgs...)
	return err
}

// GetParticipants retrieves participants for a specific match
func (r *MatchRepository) GetParticipants(matchID string) ([]models.Participant, error) {
	query := `
		SELECT id, match_id, puuid, champion_id, champion_name, kills, deaths, assists,
		       win, total_damage, gold_earned, cs_score, vision_score, kda, created_at
		FROM participants
		WHERE match_id = $1
		ORDER BY id
	`

	rows, err := r.db.Query(query, matchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var participants []models.Participant
	for rows.Next() {
		var p models.Participant
		err := rows.Scan(
			&p.ID,
			&p.MatchID,
			&p.PUUID,
			&p.ChampionID,
			&p.ChampionName,
			&p.Kills,
			&p.Deaths,
			&p.Assists,
			&p.Win,
			&p.TotalDamage,
			&p.GoldEarned,
			&p.CSScore,
			&p.VisionScore,
			&p.KDA,
			&p.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		participants = append(participants, p)
	}

	return participants, nil
}
