// Package metrics defines all Prometheus metric variables used across the server.
// It is a leaf package — it imports nothing from lol-match-tracker internals —
// so any package can import it without creating circular dependencies.
package metrics

import "github.com/prometheus/client_golang/prometheus"

// ── HTTP layer ────────────────────────────────────────────────────────────────

// HTTPRequestsTotal counts every HTTP request handled by Gin.
// Labels: method (GET/POST…), route (c.FullPath e.g. /api/summoner/:puuid/matches),
// status_code (200, 400, 500…).
// Using c.FullPath keeps cardinality bounded — path params are not substituted.
var HTTPRequestsTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total number of HTTP requests.",
	},
	[]string{"method", "route", "status_code"},
)

// HTTPRequestDuration measures the wall-clock time spent serving each request.
var HTTPRequestDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "http_request_duration_seconds",
		Help:    "HTTP request latency in seconds.",
		Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5},
	},
	[]string{"method", "route", "status_code"},
)

// ── Cache layer ───────────────────────────────────────────────────────────────

// CacheOperationsTotal counts Get/Set/Delete calls and their outcomes.
// result label values: "hit", "miss", "error"
var CacheOperationsTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "cache_operations_total",
		Help: "Total number of cache operations.",
	},
	[]string{"operation", "result"},
)

// CacheOperationDuration measures Redis round-trip time per operation type.
var CacheOperationDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "cache_operation_duration_seconds",
		Help:    "Redis operation latency in seconds.",
		Buckets: []float64{.0005, .001, .0025, .005, .01, .025, .05, .1, .25, .5},
	},
	[]string{"operation"},
)

// ── Database layer ────────────────────────────────────────────────────────────

// DBQueryDuration measures how long each database call takes.
// operation label values: "query", "queryrow", "exec"
var DBQueryDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "db_query_duration_seconds",
		Help:    "Database query latency in seconds.",
		Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5},
	},
	[]string{"operation"},
)

// ── Riot API layer ────────────────────────────────────────────────────────────

// RiotAPICallsTotal counts outbound Riot API calls per endpoint and HTTP status.
// endpoint label values: "account", "summoner", "match_list", "match",
//
//	"live_game", "rank", "current_game"
//
// status_code label: the raw HTTP status code string e.g. "200", "429", "404".
// This is the primary metric for monitoring your Riot API rate-limit usage.
var RiotAPICallsTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "riot_api_calls_total",
		Help: "Total outbound Riot API calls.",
	},
	[]string{"endpoint", "status_code"},
)

// RiotAPIDuration measures Riot API response time per endpoint.
var RiotAPIDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "riot_api_duration_seconds",
		Help:    "Riot API call latency in seconds.",
		Buckets: []float64{.05, .1, .25, .5, 1, 2.5, 5, 10},
	},
	[]string{"endpoint"},
)

// ── Service resolution layer ──────────────────────────────────────────────────

// ResolutionTotal counts how each service operation was resolved.
// operation label: "profile", "matches", "stats", "rank"
// source label:    "cache", "db", "riot_api"
// This lets you visualise cache effectiveness over time.
var ResolutionTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "resolution_total",
		Help: "Data source used to resolve each service operation.",
	},
	[]string{"operation", "source"},
)

// ── Background rank-fetch worker ─────────────────────────────────────────────

// RankWorkerQueueDepth tracks the number of tasks currently sitting in the
// worker's buffered channel. Use Inc/Dec when enqueuing/dequeuing.
var RankWorkerQueueDepth = prometheus.NewGauge(
	prometheus.GaugeOpts{
		Name: "rank_worker_queue_depth",
		Help: "Number of rank-fetch tasks currently queued.",
	},
)

// RankWorkerTasksTotal counts tasks that were fully processed by the worker.
// result label values: "success", "failed"
var RankWorkerTasksTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "rank_worker_tasks_total",
		Help: "Total rank-fetch tasks processed by the background worker.",
	},
	[]string{"result"},
)

// RankWorkerTasksDropped counts tasks discarded because the queue was full
// or the PUUID was already pending.
var RankWorkerTasksDropped = prometheus.NewCounter(
	prometheus.CounterOpts{
		Name: "rank_worker_tasks_dropped_total",
		Help: "Total rank-fetch tasks dropped (queue full or duplicate PUUID).",
	},
)

// ── Rate limiting ─────────────────────────────────────────────────────────────

// RateLimitRejectedTotal counts requests rejected due to per-IP rate limiting.
var RateLimitRejectedTotal = prometheus.NewCounter(
	prometheus.CounterOpts{
		Name: "rate_limit_rejected_total",
		Help: "Total requests rejected by the per-IP rate limiter (HTTP 429).",
	},
)

// ── Circuit breaker ───────────────────────────────────────────────────────────

// CircuitBreakerState tracks the current state of the circuit breaker.
// Values: 0 = closed (healthy), 1 = half-open (probing), 2 = open (tripped).
var CircuitBreakerState = prometheus.NewGaugeVec(
	prometheus.GaugeOpts{
		Name: "circuit_breaker_state",
		Help: "Current circuit breaker state: 0=closed, 1=half-open, 2=open.",
	},
	[]string{"name"},
)

// init registers all metrics with the default Prometheus registry.
// This runs automatically when any package imports lol-match-tracker/internal/metrics.
func init() {
	prometheus.MustRegister(
		HTTPRequestsTotal,
		HTTPRequestDuration,
		CacheOperationsTotal,
		CacheOperationDuration,
		DBQueryDuration,
		RiotAPICallsTotal,
		RiotAPIDuration,
		ResolutionTotal,
		RankWorkerQueueDepth,
		RankWorkerTasksTotal,
		RankWorkerTasksDropped,
		RateLimitRejectedTotal,
		CircuitBreakerState,
	)
}
