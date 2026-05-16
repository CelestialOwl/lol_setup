package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"lol-match-tracker/internal/cache"
	"lol-match-tracker/internal/config"
	"lol-match-tracker/internal/database"
	"lol-match-tracker/internal/handlers"
	"lol-match-tracker/internal/middleware"
	"lol-match-tracker/internal/repository"
	"lol-match-tracker/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Initialize database
	db, err := database.NewPostgresDB(cfg)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// Initialize Redis cache
	redisClient, err := cache.NewRedisClient(cfg)
	if err != nil {
		slog.Error("failed to connect to Redis", "error", err)
		os.Exit(1)
	}
	defer redisClient.Close()

	// Initialize repositories
	summonerRepo := repository.NewSummonerRepository(db)
	matchRepo := repository.NewMatchRepository(db)

	// Initialize services
	riotAPIService := services.NewRiotAPIService(cfg.RiotAPIKey)
	summonerService := services.NewSummonerService(summonerRepo, matchRepo, riotAPIService, redisClient, cfg)
	liveGameService := services.NewLiveGameService(riotAPIService)

	// Initialize handlers
	summonerHandler := handlers.NewSummonerHandler(summonerService)
	liveGameHandler := handlers.NewLiveGameHandler(liveGameService)

	// Initialize Gin router
	router := gin.New()

	// Middleware
	router.Use(middleware.RequestID())
	router.Use(middleware.Logger())
	router.Use(middleware.ErrorHandler())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "X-Request-ID"},
		AllowCredentials: true,
	}))

	// Health check endpoint — verifies DB and Redis are reachable
	router.GET("/health", func(c *gin.Context) {
		if err := db.Ping(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "degraded",
				"db":     "unhealthy",
				"error":  err.Error(),
			})
			return
		}
		if err := redisClient.Ping(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "degraded",
				"redis":  "unhealthy",
				"error":  err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "lol-match-tracker-api",
		})
	})

	// API routes
	api := router.Group("/api")
	{
		// Summoner routes
		summoner := api.Group("/summoner")
		{
			summoner.GET("", summonerHandler.GetSummoner)                        // profile only
			summoner.POST("/search", summonerHandler.SearchSummoner)             // same as GET but via POST body
			summoner.GET("/:puuid/matches", summonerHandler.GetMatchHistory)     // match history
			summoner.GET("/:puuid/stats", summonerHandler.GetSummonerStats)      // aggregate stats
			summoner.GET("/:puuid/rank", summonerHandler.GetRank)                // latest rank from DB
			summoner.GET("/:puuid/rank/history", summonerHandler.GetRankHistory) // LP history for charts
		}
		// Live game route
		api.GET("/live-game", liveGameHandler.GetLiveGame)
	}

	// Start server with graceful shutdown
	addr := ":" + cfg.Port
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	slog.Info("starting server", "addr", addr, "allowed_origins", cfg.AllowedOrigins)

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Block until OS signal received
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server…")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("server forced shutdown", "error", err)
	}
	slog.Info("server stopped")
}
