package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger logs HTTP requests
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get status
		status := c.Writer.Status()

		// Log format
		log.Printf("[%s] %s %s %d %v",
			c.Request.Method,
			path,
			raw,
			status,
			latency,
		)
	}
}

// ErrorHandler handles panics and errors
func ErrorHandler() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		if err, ok := recovered.(string); ok {
			log.Printf("Panic recovered: %s", err)
			c.JSON(500, gin.H{
				"error":   "Internal server error",
				"message": "Something went wrong",
				"code":    500,
			})
		}
		c.Abort()
	})
}
