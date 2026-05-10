package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// Summoner represents a League of Legends summoner
type Summoner struct {
	PUUID         string    `json:"puuid" db:"puuid"`
	GameName      string    `json:"gameName" db:"game_name"`
	TagLine       string    `json:"tagLine" db:"tag_line"`
	Region        string    `json:"region" db:"region"`
	SummonerLevel int       `json:"summonerLevel" db:"summoner_level"`
	ProfileIconID int       `json:"profileIconId" db:"profile_icon_id"`
	LastUpdated   time.Time `json:"lastUpdated" db:"last_updated"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}

// Match represents a League of Legends match
type Match struct {
	MatchID      string    `json:"matchId" db:"match_id"`
	GameCreation int64     `json:"gameCreation" db:"game_creation"`
	GameDuration int       `json:"gameDuration" db:"game_duration"`
	GameMode     string    `json:"gameMode" db:"game_mode"`
	QueueID      int       `json:"queueId" db:"queue_id"`
	Region       string    `json:"region" db:"region"`
	MatchData    MatchData `json:"matchData" db:"match_data"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	LastUpdated  time.Time `json:"lastUpdated" db:"last_updated"`
}

// MatchData represents the full match data from Riot API
type MatchData map[string]interface{}

// Value implements the driver.Valuer interface for database storage
func (m MatchData) Value() (driver.Value, error) {
	return json.Marshal(m)
}

// Scan implements the sql.Scanner interface for database retrieval
func (m *MatchData) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), m)
	}

	return json.Unmarshal(bytes, m)
}

// Participant represents a participant in a match
type Participant struct {
	ID           int       `json:"id" db:"id"`
	MatchID      string    `json:"matchId" db:"match_id"`
	PUUID        string    `json:"puuid" db:"puuid"`
	ChampionID   int       `json:"championId" db:"champion_id"`
	ChampionName string    `json:"championName" db:"champion_name"`
	Kills        int       `json:"kills" db:"kills"`
	Deaths       int       `json:"deaths" db:"deaths"`
	Assists      int       `json:"assists" db:"assists"`
	Win          bool      `json:"win" db:"win"`
	TotalDamage  int64     `json:"totalDamage" db:"total_damage"`
	GoldEarned   int       `json:"goldEarned" db:"gold_earned"`
	CSScore      int       `json:"csScore" db:"cs_score"`
	VisionScore  int       `json:"visionScore" db:"vision_score"`
	KDA          float64   `json:"kda" db:"kda"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
}

// SummonerResponse represents the legacy combined API response (kept for compatibility).
type SummonerResponse struct {
	Account  AccountInfo   `json:"account"`
	Summoner SummonerInfo  `json:"summoner"`
	Matches  []MatchData   `json:"matches"`
	LiveGame *LiveGameInfo `json:"liveGame,omitempty"`
}

// SummonerProfileResponse is returned by GET /api/summoner.
// Contains account + summoner info, plus the freshly-fetched rank for the searched player.
type SummonerProfileResponse struct {
	Account  AccountInfo   `json:"account"`
	Summoner SummonerInfo  `json:"summoner"`
	Rank     []LeagueEntry `json:"rank,omitempty"`
}

// MatchHistoryResponse is returned by GET /api/summoner/:puuid/matches.
// Ranks is a map of puuid → latest RANKED_SOLO_5x5 snapshot from DB for every
// participant that has one; omitted/null means no historical data available.
type MatchHistoryResponse struct {
	PUUID   string                  `json:"puuid"`
	Matches []MatchData             `json:"matches"`
	Total   int                     `json:"total"`
	Ranks   map[string]*LeagueEntry `json:"ranks,omitempty"`
}

// LeagueEntry represents a single ranked queue entry from the Riot league API.
type LeagueEntry struct {
	LeagueID     string `json:"leagueId"`
	QueueType    string `json:"queueType"`
	Tier         string `json:"tier"`
	Rank         string `json:"rank"`
	PUUID        string `json:"puuid,omitempty"`
	LeaguePoints int    `json:"leaguePoints"`
	Wins         int    `json:"wins"`
	Losses       int    `json:"losses"`
	Veteran      bool   `json:"veteran"`
	Inactive     bool   `json:"inactive"`
	FreshBlood   bool   `json:"freshBlood"`
	HotStreak    bool   `json:"hotStreak"`
}

// RankSnapshot represents one row in the rank_snapshots table.
type RankSnapshot struct {
	ID           int       `json:"id" db:"id"`
	PUUID        string    `json:"puuid" db:"puuid"`
	QueueType    string    `json:"queueType" db:"queue_type"`
	Tier         string    `json:"tier" db:"tier"`
	Rank         string    `json:"rank" db:"rank"`
	LeaguePoints int       `json:"leaguePoints" db:"league_points"`
	Wins         int       `json:"wins" db:"wins"`
	Losses       int       `json:"losses" db:"losses"`
	HotStreak    bool      `json:"hotStreak" db:"hot_streak"`
	Veteran      bool      `json:"veteran" db:"veteran"`
	FreshBlood   bool      `json:"freshBlood" db:"fresh_blood"`
	Inactive     bool      `json:"inactive" db:"inactive"`
	RecordedAt   time.Time `json:"recordedAt" db:"recorded_at"`
}

// AccountInfo represents Riot account information
type AccountInfo struct {
	PUUID    string `json:"puuid"`
	GameName string `json:"gameName"`
	TagLine  string `json:"tagLine"`
}

// SummonerInfo represents summoner information
type SummonerInfo struct {
	ID            string `json:"id"`
	AccountID     string `json:"accountId"`
	PUUID         string `json:"puuid"`
	Name          string `json:"name"`
	ProfileIconID int    `json:"profileIconId"`
	RevisionDate  int64  `json:"revisionDate"`
	SummonerLevel int    `json:"summonerLevel"`
}

// LiveGameInfo represents current game information
type LiveGameInfo struct {
	GameID       int64             `json:"gameId"`
	GameType     string            `json:"gameType"`
	GameMode     string            `json:"gameMode"`
	GameLength   int64             `json:"gameLength"`
	PlatformID   string            `json:"platformId"`
	Participants []LiveParticipant `json:"participants"`
}

// LiveParticipant represents a participant in a live game
type LiveParticipant struct {
	TeamID        int    `json:"teamId"`
	ChampionID    int    `json:"championId"`
	ProfileIconID int    `json:"profileIconId"`
	SummonerName  string `json:"summonerName"`
	SummonerID    string `json:"summonerId"`
	PUUID         string `json:"puuid"`
	Bot           bool   `json:"bot"`
	Spell1ID      int    `json:"spell1Id"`
	Spell2ID      int    `json:"spell2Id"`
}

// SearchRequest represents a summoner search request
type SearchRequest struct {
	GameName string `json:"gameName" validate:"required,min=1,max=16"`
	TagLine  string `json:"tagLine" validate:"required,min=1,max=5"`
	Region   string `json:"region" validate:"required,oneof=na1 euw1 eun1 kr oc1 jp1 br1 las lan1 tr1 ru"`
}

// ErrorResponse represents an API error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
	Code    int    `json:"code,omitempty"`
}

// MatchStats represents aggregated match statistics
type MatchStats struct {
	PUUID          string  `json:"puuid" db:"puuid"`
	GameName       string  `json:"gameName" db:"game_name"`
	TagLine        string  `json:"tagLine" db:"tag_line"`
	TotalGames     int     `json:"totalGames" db:"total_games"`
	Wins           int     `json:"wins" db:"wins"`
	WinRate        float64 `json:"winRate" db:"win_rate"`
	AvgKills       float64 `json:"avgKills" db:"avg_kills"`
	AvgDeaths      float64 `json:"avgDeaths" db:"avg_deaths"`
	AvgAssists     float64 `json:"avgAssists" db:"avg_assists"`
	AvgKDA         float64 `json:"avgKDA" db:"avg_kda"`
	AvgCS          float64 `json:"avgCS" db:"avg_cs"`
	AvgVisionScore float64 `json:"avgVisionScore" db:"avg_vision_score"`
}
