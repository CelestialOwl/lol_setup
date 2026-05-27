package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"lol-match-tracker/internal/metrics"
	"lol-match-tracker/internal/models"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
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
func (r *RiotAPIService) GetAccountByRiotID(ctx context.Context, gameName, tagLine, region string) (*models.AccountInfo, error) {
	url := fmt.Sprintf("https://%s.api.riotgames.com/riot/account/v1/accounts/by-riot-id/%s/%s",
		r.getRegionCluster(region), url.PathEscape(gameName), url.PathEscape(tagLine))

	var account models.AccountInfo
	err := r.makeRequest(ctx, "account", url, &account)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %w", err)
	}

	return &account, nil
}

// GetSummonerByPUUID fetches summoner information by PUUID
func (r *RiotAPIService) GetSummonerByPUUID(ctx context.Context, puuid, region string) (*models.SummonerInfo, error) {
	url := fmt.Sprintf("https://%s.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/%s", region, puuid)

	var summoner models.SummonerInfo
	err := r.makeRequest(ctx, "summoner", url, &summoner)
	if err != nil {
		return nil, fmt.Errorf("failed to get summoner: %w", err)
	}

	return &summoner, nil
}

// GetMatchList fetches recent matches for a summoner
func (r *RiotAPIService) GetMatchList(ctx context.Context, puuid, region string, count int) ([]string, error) {
	regionCluster := r.getRegionCluster(region)
	url := fmt.Sprintf("https://%s.api.riotgames.com/lol/match/v5/matches/by-puuid/%s/ids?start=0&count=%d",
		regionCluster, puuid, count)

	var matchIds []string
	err := r.makeRequest(ctx, "match_list", url, &matchIds)
	if err != nil {
		return nil, fmt.Errorf("failed to get match list: %w", err)
	}

	return matchIds, nil
}

// GetMatch fetches detailed match information
func (r *RiotAPIService) GetMatch(ctx context.Context, matchID, region string) (*models.MatchData, error) {
	regionCluster := r.getRegionCluster(region)
	url := fmt.Sprintf("https://%s.api.riotgames.com/lol/match/v5/matches/%s", regionCluster, matchID)

	var matchData models.MatchData
	err := r.makeRequest(ctx, "match", url, &matchData)
	if err != nil {
		return nil, fmt.Errorf("failed to get match: %w", err)
	}

	return &matchData, nil
}

// GetCurrentGameInfo fetches current game information for a summoner
func (r *RiotAPIService) GetCurrentGameInfo(ctx context.Context, summonerID, region string) (*models.LiveGameInfo, error) {
	url := fmt.Sprintf("https://%s.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/%s",
		region, summonerID)

	var liveGame models.LiveGameInfo
	err := r.makeRequest(ctx, "current_game_v4", url, &liveGame)
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
func (r *RiotAPIService) GetCurrentGameByPUUID(ctx context.Context, puuid, region string) (map[string]interface{}, error) {
	url := fmt.Sprintf("https://%s.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/%s",
		region, puuid)

	var gameData map[string]interface{}
	if err := r.makeRequest(ctx, "live_game", url, &gameData); err != nil {
		return nil, err
	}

	return gameData, nil
}

// GetLeagueEntriesByPUUID fetches ranked queue entries for a summoner by PUUID.
// Uses the platform endpoint (e.g. na1.api.riotgames.com), not the regional cluster.
func (r *RiotAPIService) GetLeagueEntriesByPUUID(ctx context.Context, puuid, region string) ([]models.LeagueEntry, error) {
	apiURL := fmt.Sprintf("https://%s.api.riotgames.com/lol/league/v4/entries/by-puuid/%s",
		region, url.PathEscape(puuid))

	var entries []models.LeagueEntry
	if err := r.makeRequest(ctx, "rank", apiURL, &entries); err != nil {
		return nil, fmt.Errorf("failed to get league entries: %w", err)
	}

	return entries, nil
}

// makeRequest makes an authenticated GET request to the Riot API, records
// Prometheus metrics (call count by endpoint+status, latency by endpoint),
// emits an OTel span, and decodes the JSON response body into dest.
func (r *RiotAPIService) makeRequest(ctx context.Context, endpoint, url string, dest interface{}) error {
	tracer := otel.Tracer("lol-match-tracker/riot_api")
	ctx, span := tracer.Start(ctx, "riot_api."+endpoint)
	defer span.End()

	span.SetAttributes(
		attribute.String("riot.endpoint", endpoint),
		attribute.String("http.url", url),
	)

	start := time.Now()

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	req.Header.Set("X-Riot-Token", r.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	duration := time.Since(start)
	metrics.RiotAPIDuration.WithLabelValues(endpoint).Observe(duration.Seconds())

	if err != nil {
		metrics.RiotAPICallsTotal.WithLabelValues(endpoint, "error").Inc()
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	defer resp.Body.Close()

	statusStr := strconv.Itoa(resp.StatusCode)
	metrics.RiotAPICallsTotal.WithLabelValues(endpoint, statusStr).Inc()
	span.SetAttributes(attribute.Int("http.status_code", resp.StatusCode))

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		errMsg := fmt.Sprintf("%d: %s", resp.StatusCode, string(body))
		span.SetStatus(codes.Error, errMsg)
		return fmt.Errorf("%s", errMsg)
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
