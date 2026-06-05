package handlers_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"lol-match-tracker/internal/config"
	"lol-match-tracker/internal/handlers"
	"lol-match-tracker/internal/mocks"
	"lol-match-tracker/internal/models"
	"lol-match-tracker/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ── helpers ───────────────────────────────────────────────────────────────────

func newSummonerHandler(
	summonerRepo *mocks.SummonerRepository,
	matchRepo *mocks.MatchRepository,
	riotClient *mocks.RiotClient,
	cache *mocks.Cache,
) *handlers.SummonerHandler {
	svc := services.NewSummonerService(summonerRepo, matchRepo, riotClient, cache, &config.Config{
		SummonerCacheTTL: 300,
		MatchCacheTTL:    900,
	})
	return handlers.NewSummonerHandler(svc)
}

func cacheMissHandler() *mocks.Cache {
	return &mocks.Cache{
		GetFn: func(_ context.Context, _ string, _ interface{}) error {
			return errors.New("cache miss")
		},
	}
}

func performRequest(r http.Handler, method, path, body string) *httptest.ResponseRecorder {
	var b *strings.Reader
	if body != "" {
		b = strings.NewReader(body)
	} else {
		b = strings.NewReader("")
	}
	req := httptest.NewRequest(method, path, b)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ── GetSummoner ───────────────────────────────────────────────────────────────

func TestGetSummoner_Success(t *testing.T) {
	account := &models.AccountInfo{PUUID: "puuid-1", GameName: "Khoji", TagLine: "777"}
	summonerInfo := &models.SummonerInfo{SummonerLevel: 300}

	h := newSummonerHandler(
		&mocks.SummonerRepository{
			FindRecentFn: func(_ context.Context, _, _, _ string, _ int) (*models.Summoner, error) {
				return nil, errors.New("not found")
			},
			SaveRankSnapshotsFn: func(_ context.Context, _ string, _ []models.LeagueEntry) error { return nil },
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
				return account, nil
			},
			GetSummonerByPUUIDFn: func(_ context.Context, _, _ string) (*models.SummonerInfo, error) {
				return summonerInfo, nil
			},
			GetLeagueEntriesByPUUIDFn: func(_ context.Context, _, _ string) ([]models.LeagueEntry, error) {
				return nil, nil
			},
		},
		cacheMissHandler(),
	)

	router := gin.New()
	router.GET("/api/summoner", h.GetSummoner)

	w := performRequest(router, "GET", "/api/summoner?gameName=Khoji&tagLine=777&region=na1", "")
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.SummonerProfileResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "puuid-1", resp.Account.PUUID)
	assert.Equal(t, "Khoji", resp.Account.GameName)
}

func TestGetSummoner_MissingGameName(t *testing.T) {
	h := newSummonerHandler(
		&mocks.SummonerRepository{},
		&mocks.MatchRepository{},
		&mocks.RiotClient{},
		cacheMissHandler(),
	)

	router := gin.New()
	router.GET("/api/summoner", h.GetSummoner)

	w := performRequest(router, "GET", "/api/summoner?tagLine=777&region=na1", "")
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetSummoner_MissingTagLine(t *testing.T) {
	h := newSummonerHandler(
		&mocks.SummonerRepository{},
		&mocks.MatchRepository{},
		&mocks.RiotClient{},
		cacheMissHandler(),
	)

	router := gin.New()
	router.GET("/api/summoner", h.GetSummoner)

	w := performRequest(router, "GET", "/api/summoner?gameName=Khoji&region=na1", "")
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetSummoner_ServiceError(t *testing.T) {
	h := newSummonerHandler(
		&mocks.SummonerRepository{
			FindRecentFn: func(_ context.Context, _, _, _ string, _ int) (*models.Summoner, error) {
				return nil, errors.New("db error")
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
				return nil, errors.New("riot unavailable")
			},
		},
		cacheMissHandler(),
	)

	router := gin.New()
	router.GET("/api/summoner", h.GetSummoner)

	w := performRequest(router, "GET", "/api/summoner?gameName=Khoji&tagLine=777&region=na1", "")
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

// ── SearchSummoner (POST) ─────────────────────────────────────────────────────

func TestSearchSummoner_Success(t *testing.T) {
	account := &models.AccountInfo{PUUID: "puuid-post", GameName: "Khoji", TagLine: "777"}
	summonerInfo := &models.SummonerInfo{SummonerLevel: 100}

	h := newSummonerHandler(
		&mocks.SummonerRepository{
			FindRecentFn: func(_ context.Context, _, _, _ string, _ int) (*models.Summoner, error) {
				return nil, errors.New("not found")
			},
			SaveRankSnapshotsFn: func(_ context.Context, _ string, _ []models.LeagueEntry) error { return nil },
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			GetAccountByRiotIDFn: func(_ context.Context, _, _, _ string) (*models.AccountInfo, error) {
				return account, nil
			},
			GetSummonerByPUUIDFn: func(_ context.Context, _, _ string) (*models.SummonerInfo, error) {
				return summonerInfo, nil
			},
			GetLeagueEntriesByPUUIDFn: func(_ context.Context, _, _ string) ([]models.LeagueEntry, error) {
				return nil, nil
			},
		},
		cacheMissHandler(),
	)

	router := gin.New()
	router.POST("/api/summoner/search", h.SearchSummoner)

	body := `{"gameName":"Khoji","tagLine":"777","region":"na1"}`
	w := performRequest(router, "POST", "/api/summoner/search", body)
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.SummonerProfileResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "puuid-post", resp.Account.PUUID)
}

func TestSearchSummoner_InvalidJSON(t *testing.T) {
	h := newSummonerHandler(
		&mocks.SummonerRepository{},
		&mocks.MatchRepository{},
		&mocks.RiotClient{},
		cacheMissHandler(),
	)

	router := gin.New()
	router.POST("/api/summoner/search", h.SearchSummoner)

	w := performRequest(router, "POST", "/api/summoner/search", "not-json")
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ── GetMatchHistory ───────────────────────────────────────────────────────────

func TestGetMatchHistory_Success(t *testing.T) {
	matchData := models.MatchData{
		"metadata": map[string]interface{}{"matchId": "NA1_001"},
		"info": map[string]interface{}{
			"gameCreation": float64(1700000000000),
			"gameDuration": float64(1800),
			"gameMode":     "CLASSIC",
			"queueId":      float64(420),
			"participants": []interface{}{},
		},
	}

	h := newSummonerHandler(
		&mocks.SummonerRepository{
			GetLatestSoloRankByPUUIDsFn: func(_ context.Context, _ []string) (map[string]*models.LeagueEntry, error) {
				return map[string]*models.LeagueEntry{}, nil
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{
			GetMatchListFn: func(_ context.Context, _, _ string, _ int) ([]string, error) {
				return []string{"NA1_001"}, nil
			},
			GetMatchFn: func(_ context.Context, _, _ string) (*models.MatchData, error) {
				return &matchData, nil
			},
		},
		cacheMissHandler(),
	)

	router := gin.New()
	router.GET("/api/summoner/:puuid/matches", h.GetMatchHistory)

	w := performRequest(router, "GET", "/api/summoner/puuid-1/matches?region=na1", "")
	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.MatchHistoryResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, 1, resp.Total)
}

// ── GetRank ───────────────────────────────────────────────────────────────────

func TestGetRank_ReturnsEntries(t *testing.T) {
	entries := []models.LeagueEntry{{QueueType: "RANKED_SOLO_5x5", Tier: "DIAMOND"}}

	h := newSummonerHandler(
		&mocks.SummonerRepository{
			GetLatestRankSnapshotsFn: func(_ context.Context, _ string) ([]models.LeagueEntry, error) {
				return entries, nil
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{},
		cacheMissHandler(),
	)

	router := gin.New()
	router.GET("/api/summoner/:puuid/rank", h.GetRank)

	w := performRequest(router, "GET", "/api/summoner/puuid-1/rank", "")
	assert.Equal(t, http.StatusOK, w.Code)

	var got []models.LeagueEntry
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	require.Len(t, got, 1)
	assert.Equal(t, "DIAMOND", got[0].Tier)
}

// ── GetRankHistory ────────────────────────────────────────────────────────────

func TestGetRankHistory_ReturnsSnapshots(t *testing.T) {
	snapshots := []models.RankSnapshot{
		{QueueType: "RANKED_SOLO_5x5", Tier: "GOLD", LeaguePoints: 50},
		{QueueType: "RANKED_SOLO_5x5", Tier: "GOLD", LeaguePoints: 75},
	}

	h := newSummonerHandler(
		&mocks.SummonerRepository{
			GetRankHistoryFn: func(_ context.Context, _, _ string) ([]models.RankSnapshot, error) {
				return snapshots, nil
			},
		},
		&mocks.MatchRepository{},
		&mocks.RiotClient{},
		cacheMissHandler(),
	)

	router := gin.New()
	router.GET("/api/summoner/:puuid/rank/history", h.GetRankHistory)

	w := performRequest(router, "GET", "/api/summoner/puuid-1/rank/history?queueType=RANKED_SOLO_5x5", "")
	assert.Equal(t, http.StatusOK, w.Code)

	var got []models.RankSnapshot
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	assert.Len(t, got, 2)
}
