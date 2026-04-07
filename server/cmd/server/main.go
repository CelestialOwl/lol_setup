package main

import (
	"log"

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
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Redis cache
	redisClient, err := cache.NewRedisClient(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
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
	router.Use(middleware.Logger())
	router.Use(middleware.ErrorHandler())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		AllowCredentials: true,
	}))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
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
			summoner.GET("", summonerHandler.GetSummoner)
			summoner.POST("/search", summonerHandler.SearchSummoner)
			summoner.GET("/:puuid/stats", summonerHandler.GetSummonerStats)
		}
		// Live game route
		api.GET("/live-game", liveGameHandler.GetLiveGame)
	}

	// Start server
	port := ":" + cfg.Port
	log.Printf("Starting server on port %s", port)
	log.Printf("Allowed origins: %v", cfg.AllowedOrigins)

	if err := router.Run(port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
