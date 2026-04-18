package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"lol-match-tracker/internal/config"

	"github.com/go-redis/redis/v8"
)

// ErrCacheMiss is returned when a key is not found in the cache.
// Callers should use errors.Is(err, cache.ErrCacheMiss) to distinguish a miss
// from a genuine connection error.
var ErrCacheMiss = errors.New("cache miss")

type RedisClient struct {
	client *redis.Client
	ctx    context.Context
}

func NewRedisClient(cfg *config.Config) (*RedisClient, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisURL,
		Password: cfg.RedisPassword,
		DB:       0,
	})

	ctx := context.Background()

	// Test connection
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	slog.Info("connected to Redis", "addr", cfg.RedisURL)
	return &RedisClient{
		client: rdb,
		ctx:    ctx,
	}, nil
}

// Ping checks the Redis connection. Used by the health endpoint.
func (r *RedisClient) Ping() error {
	_, err := r.client.Ping(r.ctx).Result()
	return err
}

func (r *RedisClient) Set(key string, value interface{}, ttl time.Duration) error {
	jsonData, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	return r.client.Set(r.ctx, key, jsonData, ttl).Err()
}

func (r *RedisClient) Get(key string, dest interface{}) error {
	val, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return ErrCacheMiss
		}
		return fmt.Errorf("failed to get value: %w", err)
	}

	return json.Unmarshal([]byte(val), dest)
}

func (r *RedisClient) Delete(key string) error {
	return r.client.Del(r.ctx, key).Err()
}

func (r *RedisClient) Exists(key string) (bool, error) {
	result, err := r.client.Exists(r.ctx, key).Result()
	return result > 0, err
}

func (r *RedisClient) SetHash(key string, fields map[string]interface{}, ttl time.Duration) error {
	pipe := r.client.Pipeline()

	for field, value := range fields {
		jsonData, err := json.Marshal(value)
		if err != nil {
			return fmt.Errorf("failed to marshal field %s: %w", field, err)
		}
		pipe.HSet(r.ctx, key, field, jsonData)
	}

	if ttl > 0 {
		pipe.Expire(r.ctx, key, ttl)
	}

	_, err := pipe.Exec(r.ctx)
	return err
}

func (r *RedisClient) GetHash(key, field string, dest interface{}) error {
	val, err := r.client.HGet(r.ctx, key, field).Result()
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
