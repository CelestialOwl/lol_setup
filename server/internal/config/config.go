package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Redis
	RedisURL      string
	RedisPassword string

	// Server
	Port     string
	GinMode  string
	LogLevel string

	// API
	RiotAPIKey string

	// CORS
	AllowedOrigins []string

	// Cache TTL
	SummonerCacheTTL int
	MatchCacheTTL    int
	LiveGameCacheTTL int

	// Observability — OpenTelemetry
	// OtelEndpoint is the OTLP/HTTP receiver URL, e.g. http://jaeger:4318
	// Leave empty to disable tracing (uses a no-op provider).
	OtelEndpoint    string
	OtelServiceName string

	// Background worker
	// RankWorkerRPM controls how many Riot rank-API calls the background
	// worker makes per minute. Defaults to 10 (one every 6 s).
	RankWorkerRPM int
}

func Load() *Config {
	// Load .env file if it exists
	godotenv.Load()

	return &Config{
		// Database
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres123"),
		DBName:     getEnv("DB_NAME", "lol_tracker"),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),

		// Redis
		RedisURL:      getEnv("REDIS_URL", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		// Server
		Port:     getEnv("PORT", "8080"),
		GinMode:  getEnv("GIN_MODE", "debug"),
		LogLevel: getEnv("LOG_LEVEL", "info"),

		// API
		RiotAPIKey: getEnv("RIOT_API_KEY", ""),

		// CORS
		AllowedOrigins: strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:3000"), ","),

		// Cache TTL
		SummonerCacheTTL: getEnvAsInt("SUMMONER_CACHE_TTL", 300),
		MatchCacheTTL:    getEnvAsInt("MATCH_CACHE_TTL", 900),
		LiveGameCacheTTL: getEnvAsInt("LIVE_GAME_CACHE_TTL", 60),

		// Observability
		OtelEndpoint:    getEnv("OTEL_ENDPOINT", ""),
		OtelServiceName: getEnv("OTEL_SERVICE_NAME", "lol-match-tracker-api"),

		// Background worker
		RankWorkerRPM: getEnvAsInt("RANK_WORKER_RPM", 40),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
