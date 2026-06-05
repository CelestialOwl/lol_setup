package middleware

import (
	"log/slog"
	"net/http"
	"sync"
	"time"

	"lol-match-tracker/internal/metrics"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// ipLimiterEntry pairs a rate limiter with its last-seen time for GC.
type ipLimiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// IPRateLimiter implements per-IP token-bucket rate limiting.
type IPRateLimiter struct {
	ips   sync.Map // map[string]*ipLimiterEntry
	rps   rate.Limit
	burst int
	stop  chan struct{}
}

// NewIPRateLimiter creates a rate limiter that allows rps requests/sec with
// the given burst capacity per client IP. It starts a background goroutine
// that evicts stale entries every 5 minutes.
func NewIPRateLimiter(rps float64, burst int) *IPRateLimiter {
	rl := &IPRateLimiter{
		rps:   rate.Limit(rps),
		burst: burst,
		stop:  make(chan struct{}),
	}
	go rl.cleanup()
	return rl
}

// getLimiter returns the limiter for the given IP, creating one if needed.
func (rl *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	now := time.Now()
	if v, ok := rl.ips.Load(ip); ok {
		entry := v.(*ipLimiterEntry)
		entry.lastSeen = now
		return entry.limiter
	}
	limiter := rate.NewLimiter(rl.rps, rl.burst)
	rl.ips.Store(ip, &ipLimiterEntry{limiter: limiter, lastSeen: now})
	return limiter
}

// RateLimit returns a Gin middleware that rejects requests exceeding the limit.
func (rl *IPRateLimiter) RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		// fmt.Println("Client IP:", ip) // Debug: log client IPs
		limiter := rl.getLimiter(ip)

		if !limiter.Allow() {
			metrics.RateLimitRejectedTotal.Inc()
			slog.Warn("rate limit exceeded", "client_ip", ip, "request_id", c.GetString("request_id"))
			c.Header("Retry-After", "1")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded, please slow down",
			})
			return
		}
		c.Next()
	}
}

// cleanup evicts limiters that haven't been seen in 10 minutes.
func (rl *IPRateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-rl.stop:
			return
		case <-ticker.C:
			threshold := time.Now().Add(-10 * time.Minute)
			rl.ips.Range(func(key, value interface{}) bool {
				entry := value.(*ipLimiterEntry)
				if entry.lastSeen.Before(threshold) {
					rl.ips.Delete(key)
				}
				return true
			})
		}
	}
}

// Stop halts the background cleanup goroutine.
func (rl *IPRateLimiter) Stop() {
	close(rl.stop)
}
