package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"lol-match-tracker/internal/models"
)

type RiotAPIService struct {
	apiKey     string
	httpClient *http.Client
}

func NewRiotAPIService(apiKey string) *RiotAPIService {
	return &RiotAPIService{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetAccountByRiotID fetches account information by Riot ID
func (r *RiotAPIService) GetAccountByRiotID(gameName, tagLine, region string) (*models.AccountInfo, error) {
	url := fmt.Sprintf("https://%s.api.riotgames.com/riot/account/v1/accounts/by-riot-id/%s/%s",
		r.getRegionCluster(region), url.PathEscape(gameName), url.PathEscape(tagLine))

	var account models.AccountInfo
	err := r.makeRequest(url, &account)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %w", err)
	}

	return &account, nil
}

// GetSummonerByPUUID fetches summoner information by PUUID
func (r *RiotAPIService) GetSummonerByPUUID(puuid, region string) (*models.SummonerInfo, error) {
	url := fmt.Sprintf("https://%s.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/%s", region, puuid)

	var summoner models.SummonerInfo
	err := r.makeRequest(url, &summoner)
	if err != nil {
		return nil, fmt.Errorf("failed to get summoner: %w", err)
	}

	return &summoner, nil
}

// GetMatchList fetches recent matches for a summoner
func (r *RiotAPIService) GetMatchList(puuid, region string, count int) ([]string, error) {
	regionCluster := r.getRegionCluster(region)
	url := fmt.Sprintf("https://%s.api.riotgames.com/lol/match/v5/matches/by-puuid/%s/ids?start=0&count=%d",
		regionCluster, puuid, count)

	var matchIds []string
	err := r.makeRequest(url, &matchIds)
	if err != nil {
		return nil, fmt.Errorf("failed to get match list: %w", err)
	}

	return matchIds, nil
}

// GetMatch fetches detailed match information
func (r *RiotAPIService) GetMatch(matchID, region string) (*models.MatchData, error) {
	regionCluster := r.getRegionCluster(region)
	url := fmt.Sprintf("https://%s.api.riotgames.com/lol/match/v5/matches/%s", regionCluster, matchID)

	var matchData models.MatchData
	err := r.makeRequest(url, &matchData)
	if err != nil {
		return nil, fmt.Errorf("failed to get match: %w", err)
	}

	return &matchData, nil
}

// GetCurrentGameInfo fetches current game information for a summoner
func (r *RiotAPIService) GetCurrentGameInfo(summonerID, region string) (*models.LiveGameInfo, error) {
	url := fmt.Sprintf("https://%s.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/%s",
		region, summonerID)

	var liveGame models.LiveGameInfo
	err := r.makeRequest(url, &liveGame)
	if err != nil {
		// If there's no active game, return nil without error
		if err.Error() == "404" {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get current game: %w", err)
	}

	return &liveGame, nil
}

// GetCurrentGameByPUUID fetches live game data using the spectator v5 API with PUUID.
// Returns the raw Riot API response as a generic map so no field mapping is needed.
func (r *RiotAPIService) GetCurrentGameByPUUID(puuid, region string) (map[string]interface{}, error) {
	url := fmt.Sprintf("https://%s.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/%s",
		region, puuid)

	var gameData map[string]interface{}
	if err := r.makeRequest(url, &gameData); err != nil {
		return nil, err
	}

	return gameData, nil
}

// makeRequest makes an HTTP request to the Riot API
func (r *RiotAPIService) makeRequest(url string, dest interface{}) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	req.Header.Set("X-Riot-Token", r.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("%d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	return json.Unmarshal(body, dest)
}

// getRegionCluster maps regions to their API clusters
func (r *RiotAPIService) getRegionCluster(region string) string {
	clusterMap := map[string]string{
		"na1":  "americas",
		"br1":  "americas",
		"la1":  "americas",
		"la2":  "americas",
		"euw1": "europe",
		"eun1": "europe",
		"tr1":  "europe",
		"ru":   "europe",
		"kr":   "asia",
		"jp1":  "asia",
		"oc1":  "sea",
		"ph2":  "sea",
		"sg2":  "sea",
		"th2":  "sea",
		"tw2":  "sea",
		"vn2":  "sea",
	}

	if cluster, exists := clusterMap[region]; exists {
		return cluster
	}
	return "americas" // default
}
