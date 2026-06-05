package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"lol-match-tracker/internal/config"
	"lol-match-tracker/internal/metrics"

	"github.com/go-redis/redis/extra/redisotel/v8"
	"github.com/go-redis/redis/v8"
)

// ErrCacheMiss is returned when a key is not found in the cache.
// Callers should use errors.Is(err, cache.ErrCacheMiss) to distinguish a miss
// from a genuine connection error.
var ErrCacheMiss = errors.New("cache miss")

type RedisClient struct {
	client *redis.Client
}

func NewRedisClient(cfg *config.Config) (*RedisClient, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisURL,
		Password: cfg.RedisPassword,
		DB:       0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Test connection
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	slog.Info("connected to Redis", "addr", cfg.RedisURL)

	// Attach OpenTelemetry tracing hook — auto-creates spans for every Redis command.
	rdb.AddHook(redisotel.NewTracingHook())

	return &RedisClient{
		client: rdb,
	}, nil
}

// Ping checks the Redis connection. Used by the health endpoint.
func (r *RedisClient) Ping(ctx context.Context) error {
	_, err := r.client.Ping(ctx).Result()
	return err
}

func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	start := time.Now()

	jsonData, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	setErr := r.client.Set(ctx, key, jsonData, ttl).Err()
	metrics.CacheOperationDuration.WithLabelValues("set").Observe(time.Since(start).Seconds())
	if setErr != nil {
		metrics.CacheOperationsTotal.WithLabelValues("set", "error").Inc()
	} else {
		metrics.CacheOperationsTotal.WithLabelValues("set", "ok").Inc()
	}
	return setErr
}

func (r *RedisClient) Get(ctx context.Context, key string, dest interface{}) error {
	start := time.Now()

	val, err := r.client.Get(ctx, key).Result()
	metrics.CacheOperationDuration.WithLabelValues("get").Observe(time.Since(start).Seconds())
	if err != nil {
		if err == redis.Nil {
			metrics.CacheOperationsTotal.WithLabelValues("get", "miss").Inc()
			return ErrCacheMiss
		}
		metrics.CacheOperationsTotal.WithLabelValues("get", "error").Inc()
		return fmt.Errorf("failed to get value: %w", err)
	}

	metrics.CacheOperationsTotal.WithLabelValues("get", "hit").Inc()
	return json.Unmarshal([]byte(val), dest)
}

func (r *RedisClient) Delete(ctx context.Context, key string) error {
	start := time.Now()
	err := r.client.Del(ctx, key).Err()
	metrics.CacheOperationDuration.WithLabelValues("delete").Observe(time.Since(start).Seconds())
	if err != nil {
		metrics.CacheOperationsTotal.WithLabelValues("delete", "error").Inc()
	} else {
		metrics.CacheOperationsTotal.WithLabelValues("delete", "ok").Inc()
	}
	return err
}

func (r *RedisClient) Exists(ctx context.Context, key string) (bool, error) {
	result, err := r.client.Exists(ctx, key).Result()
	return result > 0, err
}

func (r *RedisClient) SetHash(ctx context.Context, key string, fields map[string]interface{}, ttl time.Duration) error {
	pipe := r.client.Pipeline()

	for field, value := range fields {
		jsonData, err := json.Marshal(value)
		if err != nil {
			return fmt.Errorf("failed to marshal field %s: %w", field, err)
		}
		pipe.HSet(ctx, key, field, jsonData)
	}

	if ttl > 0 {
		pipe.Expire(ctx, key, ttl)
	}

	_, err := pipe.Exec(ctx)
	return err
}

func (r *RedisClient) GetHash(ctx context.Context, key, field string, dest interface{}) error {
	val, err := r.client.HGet(ctx, key, field).Result()
	if err != nil {
		if err == redis.Nil {
			return ErrCacheMiss
		}
		return fmt.Errorf("failed to get hash field: %w", err)
	}

	return json.Unmarshal([]byte(val), dest)
}

func (r *RedisClient) Close() error {
	return r.client.Close()
}
