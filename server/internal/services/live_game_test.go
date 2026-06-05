package services_test

import (
	"context"
	"errors"
	"testing"

	"lol-match-tracker/internal/mocks"
	"lol-match-tracker/internal/models"
	"lol-match-tracker/internal/services"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newLiveGameService(riot *mocks.RiotClient) *services.LiveGameService {
	return services.NewLiveGameService(riot)
}

// ── GetLiveGame ───────────────────────────────────────────────────────────────

func TestGetLiveGame_PlayerInGame(t *testing.T) {
	account := &models.AccountInfo{PUUID: "puuid-1", GameName: "Khoji", TagLine: "777"}

	gameData := map[string]interface{}{
		"gameId": float64(1234567890),
		"participants": []interface{}{
			map[string]interface{}{"puuid": "puuid-1", "teamId": float64(100), "championId": float64(157)},
			map[string]interface{}{"puuid": "puuid-2", "teamId": float64(100), "championId": float64(64)},
			map[string]interface{}{"puuid": "puuid-3", "teamId": float64(200), "championId": float64(89)},
		},
	}

	svc := newLiveGameService(&mocks.RiotClient{
		GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
			return account, nil
		},
		GetCurrentGameByPUUIDFn: func(_ context.Context, _, _ string) (map[string]interface{}, error) {
			return gameData, nil
		},
	})

	result, err := svc.GetLiveGame(context.Background(), "Khoji", "777", "na1")
	require.NoError(t, err)

	assert.True(t, result["inGame"].(bool))

	playerTeam := result["playerTeam"].([]interface{})
	enemyTeam := result["enemyTeam"].([]interface{})
	searchedPlayer := result["searchedPlayer"].(map[string]interface{})

	assert.Len(t, playerTeam, 2)
	assert.Len(t, enemyTeam, 1)
	assert.Equal(t, "puuid-1", searchedPlayer["puuid"])
}

func TestGetLiveGame_PlayerNotInGame(t *testing.T) {
	account := &models.AccountInfo{PUUID: "puuid-1", GameName: "Khoji", TagLine: "777"}

	svc := newLiveGameService(&mocks.RiotClient{
		GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
			return account, nil
		},
		GetCurrentGameByPUUIDFn: func(_ context.Context, _, _ string) (map[string]interface{}, error) {
			return nil, errors.New("404: not found")
		},
	})

	_, err := svc.GetLiveGame(context.Background(), "Khoji", "777", "na1")
	require.Error(t, err)
	assert.ErrorIs(t, err, services.ErrNotInGame)
}

func TestGetLiveGame_AccountLookupError(t *testing.T) {
	svc := newLiveGameService(&mocks.RiotClient{
		GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
			return nil, errors.New("503: service unavailable")
		},
	})

	_, err := svc.GetLiveGame(context.Background(), "Ghost", "0000", "na1")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get account")
}

func TestGetLiveGame_SearchedPlayerNotInParticipants(t *testing.T) {
	account := &models.AccountInfo{PUUID: "puuid-absent"}

	gameData := map[string]interface{}{
		"participants": []interface{}{
			map[string]interface{}{"puuid": "puuid-other", "teamId": float64(100)},
		},
	}

	svc := newLiveGameService(&mocks.RiotClient{
		GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
			return account, nil
		},
		GetCurrentGameByPUUIDFn: func(_ context.Context, _, _ string) (map[string]interface{}, error) {
			return gameData, nil
		},
	})

	_, err := svc.GetLiveGame(context.Background(), "Ghost", "0000", "na1")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not found in game participants")
}

func TestGetLiveGame_TeamSplitAccuracy(t *testing.T) {
	account := &models.AccountInfo{PUUID: "p1"}

	// 5v5: searched player on team 100
	gameData := map[string]interface{}{
		"participants": buildParticipants(
			[]string{"p1", "p2", "p3", "p4", "p5"}, 100,
			[]string{"p6", "p7", "p8", "p9", "p10"}, 200,
		),
	}

	svc := newLiveGameService(&mocks.RiotClient{
		GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
			return account, nil
		},
		GetCurrentGameByPUUIDFn: func(_ context.Context, _, _ string) (map[string]interface{}, error) {
			return gameData, nil
		},
	})

	result, err := svc.GetLiveGame(context.Background(), "p1", "NA1", "na1")
	require.NoError(t, err)

	assert.Len(t, result["playerTeam"].([]interface{}), 5)
	assert.Len(t, result["enemyTeam"].([]interface{}), 5)
}

// buildParticipants constructs a []interface{} of participant maps for two teams.
func buildParticipants(teamA []string, teamAID int, teamB []string, teamBID int) []interface{} {
	var participants []interface{}
	for _, puuid := range teamA {
		participants = append(participants, map[string]interface{}{"puuid": puuid, "teamId": float64(teamAID)})
	}
	for _, puuid := range teamB {
		participants = append(participants, map[string]interface{}{"puuid": puuid, "teamId": float64(teamBID)})
	}
	return participants
}
