# rate limiting
Implement per-user or per-IP rate limiting (beyond Riot API limits).
Use Redis for distributed rate limiting.

# add circuit breaker
sony/gobreaker in Go

# metrics & logging
- promethous/grafana and opentelemetry
- Add structured logging (Zap, Logrus).
- Integrate metrics (Prometheus) and tracing (OpenTelemetry, Jaeger).
- zerolog or slog
- ELK Stack" (Elasticsearch, Logstash, Kibana) or a modern alternative like the Grafana Stack (Loki for logs, Prometheus for metrics, Grafana for dashboards
Track: request count, latency histograms, cache hit/miss ratio, Riot API error rate
Teaches you the difference between counters, gauges, and histograms

# Context propagation
Context propagation + timeouts everywhere: Right now Redis uses a context.Background() in redis.go. Refactor so handlers pass c.Request.Context() through services/repos/cache, and enforce timeouts (e.g., shorter for Redis, longer for DB, strict for Riot). You’ll learn cancellation, tail latency control, and avoiding goroutine leaks.

# add background jobs and queues for fetching the match details
Use a job queue (e.g., with Redis) for tasks like periodic data sync, email notifications, or heavy computations.
Explore libraries like go-workers or asynq.

# add api versioning

# unit tests
Unit tests for services with mocked repos/Riot client; integration tests with docker-compose (DB+Redis) for repositories; and a small set of end-to-end API tests
- testify 
- mockery
- integration test with postgres/redis


# do the perforamnce and load testing
 Add k6/vegeta to simulate traffic; measure p95/p99, cache hit ratio, DB query time, Riot call rate. Then tune: connection pools, query indexes, concurrency limits, batching.

# Deploy this on kubernetes cluster

# setup a CI/CD pipeline on github
golangci-lint

Static analysis aggregator for Go — catches unused parameters, shadow variables, error return values being silently dropped, etc.



# Later
## add authentication
Implement OAuth2, JWT, or session-based authentication.
Add user roles (admin, user) and permissions.


## Advanced Database Patterns
Implement database migrations (you already have some).
Add support for transactions, indexing, and query optimization.
Explore read replicas or sharding (theory and/or practice).

## WebSockets or Server-Sent Events
Add real-time features (e.g., live match updates) using WebSockets.

## Feature Flags & Configuration Management
Use feature flags to enable/disable features dynamically

## API Gateway & Microservices (Advanced)
Split your backend into smaller services.

## Caching Strategies
Implement cache invalidation and cache warming.

## Data Modeling & Denormalization
Experiment with denormalized tables or materialized views for performance.

## Distributed tracing — OpenTelemetry

Adds a trace span to every Riot API call; you can see exactly how long each HTTP call to Riot took and where latency comes from
Works with Jaeger (free, local) or any OTLP backend
Teaches you how to propagate context through a call chain

## PerIP rate limting
Add a per-IP token bucket with golang.org/x/time/rate — cheap middleware to write, teaches you the token bucket algorithm

## add swagger docs
swaggo/swag generates a Swagger UI from Go comments
Teaches you contract-first API design

## Query Explain
Run EXPLAIN ANALYZE on your JOIN query in GetRecentMatchesForPUUID — teaches you index usage, seq scans, and how to read query plans