package services

import (
	"context"
	"time"
)

const (
	redisTimeout = 500 * time.Millisecond
	dbTimeout    = 2 * time.Second
	riotTimeout  = 5 * time.Second
)

func withTimeout(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	if ctx == nil {
		return context.WithTimeout(context.Background(), timeout)
	}
	return context.WithTimeout(ctx, timeout)
}
