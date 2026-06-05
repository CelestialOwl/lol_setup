package middleware

import (
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"lol-match-tracker/internal/metrics"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Logger logs HTTP requests and records Prometheus HTTP metrics.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)
		status := c.Writer.Status()

		// c.FullPath returns the registered pattern e.g. /api/summoner/:puuid/matches
		// which keeps Prometheus label cardinality bounded regardless of path param values.
		route := c.FullPath()
		if route == "" {
			route = "unknown"
		}
		statusStr := strconv.Itoa(status)
		method := c.Request.Method

		metrics.HTTPRequestsTotal.WithLabelValues(method, route, statusStr).Inc()
		metrics.HTTPRequestDuration.WithLabelValues(method, route, statusStr).Observe(latency.Seconds())

		slog.Info("http_request",
			"method", method,
			"path", path,
			"query", raw,
			"status", status,
			"latency_ms", latency.Milliseconds(),
			"request_id", c.GetString("request_id"),
			"client_ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
		)
	}
}

// RequestID injects a unique request ID into every request context and response header.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if id == "" {
			id = uuid.New().String()
		}
		c.Set("request_id", id)
		c.Header("X-Request-ID", id)
		c.Next()
	}
}

// ErrorHandler recovers from panics, logs them, and returns a 500 response.
// It handles both string and error panic values (the two most common kinds).
func ErrorHandler() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		var msg string
		switch v := recovered.(type) {
		case string:
			msg = v
		case error:
			msg = v.Error()
		default:
			msg = fmt.Sprintf("%v", v)
		}
		slog.Error("panic recovered", "error", msg, "request_id", c.GetString("request_id"))
		c.AbortWithStatusJSON(500, gin.H{
			"error":      "Internal server error",
			"message":    "Something went wrong",
			"code":       500,
			"request_id": c.GetString("request_id"),
		})
	})
}
