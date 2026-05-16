package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"lol-match-tracker/internal/interfaces"
)

// ErrNotInGame is returned when the player is not currently in an active game.
var ErrNotInGame = errors.New("player is not in an active game")

type LiveGameService struct {
	riotAPI interfaces.RiotClient
}

func NewLiveGameService(riotAPI interfaces.RiotClient) *LiveGameService {
	return &LiveGameService{riotAPI: riotAPI}
}

// GetLiveGame looks up a player by Riot ID, fetches their active game via spectator v5,
// and returns a response shaped to match the frontend LiveGameData type:
//
//	{ gameInfo, playerTeam, enemyTeam, searchedPlayer, inGame: true }
func (s *LiveGameService) GetLiveGame(ctx context.Context, gameName, tagLine, region string) (map[string]interface{}, error) {
	riotCtx, cancel := withTimeout(ctx, riotTimeout)
	defer cancel()

	account, err := s.riotAPI.GetAccountByRiotID(riotCtx, gameName, tagLine, region)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %w", err)
	}

	riotCtx, cancel = withTimeout(ctx, riotTimeout)
	defer cancel()

	gameData, err := s.riotAPI.GetCurrentGameByPUUID(riotCtx, account.PUUID, region)
	if err != nil {
		if strings.HasPrefix(err.Error(), "404") {
			return nil, ErrNotInGame
		}
		return nil, fmt.Errorf("failed to get live game: %w", err)
	}

	participants, ok := gameData["participants"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected game data structure from Riot API")
	}

	// Locate the searched player within the participants list.
	var searchedPlayer map[string]interface{}
	for _, p := range participants {
		participant, ok := p.(map[string]interface{})
		if !ok {
			continue
		}
		if participant["puuid"] == account.PUUID {
			searchedPlayer = participant
			break
		}
	}

	if searchedPlayer == nil {
		return nil, fmt.Errorf("searched player not found in game participants")
	}

	// Split participants into the player's team and the enemy team.
	playerTeamID := searchedPlayer["teamId"]
	var playerTeam []interface{}
	var enemyTeam []interface{}
	for _, p := range participants {
		participant, ok := p.(map[string]interface{})
		if !ok {
			continue
		}
		if participant["teamId"] == playerTeamID {
			playerTeam = append(playerTeam, participant)
		} else {
			enemyTeam = append(enemyTeam, participant)
		}
	}

	return map[string]interface{}{
		"gameInfo":       gameData,
		"playerTeam":     playerTeam,
		"enemyTeam":      enemyTeam,
		"searchedPlayer": searchedPlayer,
		"inGame":         true,
	}, nil
}
