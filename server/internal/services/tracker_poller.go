package services

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"time"

	"lol-match-tracker/internal/interfaces"
)

const trackerPollInterval = 60 * time.Second

// TrackerEntry identifies a single player to poll.
type TrackerEntry struct {
	PUUID  string
	Region string
}

// TrackerUpdate is the message sent to clients over the WebSocket.
type TrackerUpdate struct {
	Type     string                 `json:"type"`
	PUUID    string                 `json:"puuid"`
	InGame   bool                   `json:"inGame"`
	GameData map[string]interface{} `json:"gameData,omitempty"`
}

// MarshalJSON returns the JSON bytes of a TrackerUpdate.
func (u TrackerUpdate) Marshal() ([]byte, error) {
	return json.Marshal(u)
}

// TrackerPoller polls the Riot spectator API for a set of players and notifies
// the caller via a channel whenever a player's in-game status changes.
type TrackerPoller struct {
	riotAPI interfaces.RiotClient
}

func NewTrackerPoller(riotAPI interfaces.RiotClient) *TrackerPoller {
	return &TrackerPoller{riotAPI: riotAPI}
}

// Poll starts one goroutine per entry, emitting TrackerUpdates on the returned
// channel whenever a player's in-game status changes. The channel is closed
// when ctx is cancelled or all goroutines exit.
func (tp *TrackerPoller) Poll(ctx context.Context, entries []TrackerEntry) <-chan TrackerUpdate {
	out := make(chan TrackerUpdate, len(entries)*2)

	var wg sync.WaitGroup
	for _, entry := range entries {
		wg.Add(1)
		go func(e TrackerEntry) {
			defer wg.Done()
			tp.pollPlayer(ctx, e, out)
		}(entry)
	}

	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}

// pollPlayer polls a single player until ctx is cancelled. It sends an update
// immediately on first check and then on every status change.
func (tp *TrackerPoller) pollPlayer(ctx context.Context, entry TrackerEntry, out chan<- TrackerUpdate) {
	// sentinel: -1 = never checked, 0 = not in game, 1 = in game
	lastStatus := -1

	check := func() {
		gameData, err := tp.riotAPI.GetCurrentGameByPUUID(ctx, entry.PUUID, entry.Region)

		var update TrackerUpdate
		if err != nil {
			if strings.HasPrefix(err.Error(), "404") {
				// Not in game
				update = TrackerUpdate{
					Type:   "live_game_update",
					PUUID:  entry.PUUID,
					InGame: false,
				}
				if lastStatus != 0 {
					lastStatus = 0
					select {
					case out <- update:
					case <-ctx.Done():
					}
				}
			}
			// Other errors: skip silently (transient network / rate limit)
			return
		}

		// In game
		update = TrackerUpdate{
			Type:     "live_game_update",
			PUUID:    entry.PUUID,
			InGame:   true,
			GameData: buildTrackerGameData(gameData, entry.PUUID),
		}
		if lastStatus != 1 {
			lastStatus = 1
			select {
			case out <- update:
			case <-ctx.Done():
			}
		}
	}

	// Immediate first check
	check()

	ticker := time.NewTicker(trackerPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			check()
		}
	}
}

// buildTrackerGameData mirrors the shape of LiveGameData used by the frontend:
// { gameInfo, playerTeam, enemyTeam, searchedPlayer, inGame }
func buildTrackerGameData(raw map[string]interface{}, puuid string) map[string]interface{} {
	participants, ok := raw["participants"].([]interface{})
	if !ok {
		return raw
	}

	var searchedPlayer map[string]interface{}
	for _, p := range participants {
		participant, ok := p.(map[string]interface{})
		if !ok {
			continue
		}
		if participant["puuid"] == puuid {
			searchedPlayer = participant
			break
		}
	}

	if searchedPlayer == nil {
		return raw
	}

	playerTeamID := searchedPlayer["teamId"]
	var playerTeam, enemyTeam []interface{}
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
		"gameInfo":       raw,
		"playerTeam":     playerTeam,
		"enemyTeam":      enemyTeam,
		"searchedPlayer": searchedPlayer,
		"inGame":         true,
	}
}
