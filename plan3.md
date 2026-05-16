# Plan: Comprehensive Project Improvement Roadmap

## TL;DR

Review of 20+ proposed improvements against the current LoL Match Tracker codebase (Go backend + Next.js frontend). The server has **zero tests**, **no CI/CD**, **no rate limiting**, **basic logging**, and **broken context propagation**. The client is in better shape with unit tests, E2E tests, ESLint, Husky, and MSW mocks. Improvements are prioritized into 4 phases with a recommended implementation order optimized for learning and incremental value.

---

## Current Project State Summary

### Server (Go + Gin)
| Area | Status | Details |
|------|--------|---------|
| **Testing** | None | Zero `_test.go` files anywhere |
| **Logging** | Partial | `slog` in services, raw `log.Printf` in middleware — inconsistent |
| **Rate Limiting** | None | No middleware; relies on Riot API's own limits |
| **Circuit Breaker** | None | Direct HTTP calls to Riot API with 10s timeout only |
| **Context Propagation** | Broken | Redis uses `context.Background()`; no per-request contexts flow through services/repos |
| **CI/CD** | None | No GitHub Actions, no linter config |
| **API Versioning** | None | Routes are `/api/summoner`, not `/api/v1/summoner` |
| **Docker** | Solid | Multi-stage builds, debug Dockerfile with Delve, docker-compose with healthchecks |
| **Database** | Good | Connection pooling (25/25), migrations, repository pattern, query logging |
| **Redis Cache** | Good | TTL-based cache-aside pattern, sentinel errors for cache miss |

### Client (Next.js + TypeScript)
| Area | Status | Details |
|------|--------|---------|
| **Unit Tests** | Partial | 3 component tests (SearchComponent, ErrorDisplay, MatchHistory); no API route or service tests |
| **E2E Tests** | Good | Playwright + MSW scenario-based mocking |
| **Linting** | Good | ESLint 9 + Husky + lint-staged (auto-fix + related test run on commit) |
| **Storybook** | Good | 4 stories with MSW addon, static build |
| **Error Handling** | Adequate | ErrorDisplay component, service-level error mapping; no React error boundaries |
| **Types** | Solid | ~280 lines of comprehensive type definitions |

---

## Step 0: Save Plan to Project

Create `IMPROVEMENT_ROADMAP.md` in the project root with the full contents of this plan (all phases, assessments, suggestions, decisions). This serves as a living reference document.

---

## Phase 1: Foundation (Do First)

These are foundational improvements that everything else builds on. They have no external dependencies and the highest learning-to-effort ratio.

### 1.1 Context Propagation + Timeouts
- **Current state**: `internal/cache/redis.go` uses a single `context.Background()` created at init. Handlers don't pass `c.Request.Context()` downstream.
- **What to do**: Refactor so every handler passes `c.Request.Context()` through services → repos → cache. Add timeouts: Redis ops (500ms), DB queries (2s), Riot API calls (5s).
- **Files to modify**: `internal/cache/redis.go` (accept ctx param), `internal/services/*.go` (thread ctx), `internal/repository/*.go` (use ctx), `internal/handlers/*.go` (pass c.Request.Context())
- **Learning**: Go context package, cancellation propagation, tail latency control, goroutine leak prevention
- **Why first**: Every other improvement (metrics, tracing, circuit breaker) depends on proper context flow.

### 1.2 Structured Logging Cleanup
- **Current state**: `slog` is already used in services and some handlers, but middleware uses `log.Printf`. Inconsistent.
- **Recommendation**: Standardize on `log/slog` everywhere (it's already in stdlib since Go 1.21). No need for zerolog/zap — slog is the idiomatic choice now and you're already using it.
- **What to do**: Replace `log.Printf` in middleware with `slog`. Add request_id to slog context via middleware so every log line is traceable. Configure log level from env var.
- **Files to modify**: `internal/middleware/middleware.go` (switch to slog, inject request_id into context), `cmd/server/main.go` (configure slog handler/level)
- **Learning**: Structured logging, log context enrichment, log levels in production vs development

### 1.3 Unit Tests (Server)
- **Current state**: Zero tests. This is the biggest gap.
- **What to do**: 
  - Define interfaces for `SummonerRepository`, `MatchRepository`, `RedisCache`, and the Riot HTTP client
  - Use `mockery` to generate mocks from those interfaces
  - Write unit tests for services (`summoner_service.go`, `match_service.go`, `live_game.go`) with mocked deps
  - Write integration tests for repositories using `testcontainers-go` (spins up real Postgres + Redis in Docker)
  - Add a small set of handler tests using `httptest.NewRecorder()` with mocked services
- **Tools**: `testify` (assertions + suites), `mockery` (mock generation), `testcontainers-go` (integration tests)
- **Files to create**: `internal/services/*_test.go`, `internal/repository/*_test.go`, `internal/handlers/*_test.go`
- **Files to modify**: Extract interfaces in `internal/services/` and `internal/repository/` (currently concrete structs)
- **Learning**: Table-driven tests, mocking in Go, testcontainers, test pyramid (unit vs integration vs e2e)

### 1.4 CI/CD Pipeline
- **Current state**: No GitHub Actions, no golangci-lint config.
- **What to do**:
  - Create `.github/workflows/ci.yml` with jobs for: lint (golangci-lint), test (with testcontainers/docker), build
  - Create `.golangci.yml` with linters: `errcheck`, `govet`, `staticcheck`, `unused`, `gosimple`, `ineffassign`, `gocritic`
  - Add a client CI job: `npm run lint`, `npm run typecheck`, `npm run test`, `npx playwright install && npm run test:e2e`
  - Add Makefile target: `make lint` → `golangci-lint run`
- **Files to create**: `.github/workflows/ci.yml`, `.golangci.yml`
- **Files to modify**: `server/Makefile` (add lint target)
- **Learning**: GitHub Actions syntax, golangci-lint configuration, CI matrix strategies, caching dependencies

---

## Phase 2: Reliability (After Foundation)

These improve the resilience of your system. They depend on proper context propagation (Phase 1.1).

### 2.1 Rate Limiting
- **Current state**: No server-side rate limiting at all. Riot API has its own limits but you have no protection against abuse of your own API.
- **Recommendation**: Two layers:
  1. **Per-IP rate limiting** (middleware): Use `golang.org/x/time/rate` token bucket — simple, stdlib-adjacent, no Redis needed for single-instance
  2. **Distributed rate limiting** (for multi-instance): Use Redis-based sliding window (only needed if you scale beyond 1 instance — defer this)
- **What to do**: Create `internal/middleware/rate_limiter.go` with a per-IP token bucket. Store rate limiters in a `sync.Map` keyed by IP. Configure limits via `Config` (e.g., 30 req/min per IP).
- **Files to create**: `internal/middleware/rate_limiter.go`
- **Files to modify**: `cmd/server/main.go` (add middleware), `internal/config/config.go` (add rate limit config)
- **Learning**: Token bucket algorithm, sync.Map, middleware patterns, HTTP 429 responses

### 2.2 Circuit Breaker
- **Current state**: Direct HTTP calls to Riot API with only a 10s timeout. If Riot is down, every request blocks for 10s.
- **What to do**: Wrap Riot API calls with `sony/gobreaker`. Configure: 5 consecutive failures → open circuit for 30s → half-open (allow 1 probe). Return cached data or a "service unavailable" error when circuit is open.
- **Files to modify**: `internal/services/riot_api.go` (wrap HTTP client calls with circuit breaker)
- **Files to create**: None (gobreaker is simple enough to use inline)
- **Learning**: Circuit breaker pattern, failure detection, graceful degradation, half-open state

### 2.3 API Versioning
- **Current state**: Routes are `/api/summoner`, `/api/live-game`, etc.
- **What to do**: Group routes under `/api/v1/`. Update client's `BACKEND_URL` usage to include `/api/v1/`.
- **Files to modify**: `cmd/server/main.go` (route groups), client API routes to update base path
- **Learning**: API versioning strategies (URL path vs header vs query param), backward compatibility
- **Note**: This is small but do it now before adding more endpoints. Retrofit is painful.

---

## Phase 3: Observability (After Reliability)

These give you visibility into what your system is doing. They build on structured logging (Phase 1.2) and context propagation (Phase 1.1).

### 3.1 Metrics with Prometheus + Grafana
- **Current state**: No metrics collection at all.
- **Recommendation**: Grafana Stack (Prometheus for metrics, Grafana for dashboards). Skip ELK — it's overkill for a learning project. Loki for logs can come later.
- **What to do**:
  - Add `prometheus/client_golang` dependency
  - Create metrics middleware: request count (counter), request duration (histogram), in-flight requests (gauge)
  - Add application metrics: cache hit/miss ratio, Riot API call count, Riot API error rate, DB query duration
  - Expose `/metrics` endpoint
  - Add `prometheus` and `grafana` services to `docker-compose.yml`
  - Create a Grafana dashboard JSON for the key metrics
- **Files to create**: `internal/middleware/metrics.go`, `internal/metrics/metrics.go`, `server/prometheus.yml`, Grafana dashboard JSON
- **Files to modify**: `cmd/server/main.go`, `docker-compose.yml`, `internal/services/*.go` (instrument), `internal/cache/redis.go` (instrument)
- **Learning**: Counters vs gauges vs histograms, PromQL, Grafana dashboards, RED method (Rate, Errors, Duration)

### 3.2 Distributed Tracing with OpenTelemetry + Jaeger
- **Current state**: No tracing.
- **What to do**:
  - Add `go.opentelemetry.io/otel` + Jaeger exporter
  - Create trace spans for: HTTP handler entry, Redis operations, DB queries, Riot API calls
  - Propagate trace context through the request chain (leverages Phase 1.1 context work)
  - Add Jaeger to `docker-compose.yml`
- **Files to create**: `internal/tracing/tracing.go` (init + helpers)
- **Files to modify**: `cmd/server/main.go` (init tracer), services/repos/cache (add spans), `docker-compose.yml`
- **Note**: This is listed under "Later" in your plan but it pairs naturally with metrics. The context propagation work from Phase 1 makes this straightforward. Consider doing it here instead of deferring.
- **Learning**: Trace spans, context propagation, distributed tracing concepts, OTLP protocol, Jaeger UI

---

## Phase 4: Advanced (After Observability)

These are larger initiatives that benefit from having testing, CI, and observability already in place.

### 4.1 Background Jobs with asynq
- **Current state**: Match details are fetched synchronously during the summoner search request. This is slow and blocks the response.
- **What to do**: 
  - Add `github.com/hibiken/asynq` (Redis-backed task queue, actively maintained, better than go-workers)
  - Create workers for: fetching match details (dequeue match IDs, fetch from Riot, store in DB), periodic rank snapshot collection
  - Add asynq dashboard (asynqmon) to docker-compose for monitoring
- **Files to create**: `internal/workers/`, `cmd/worker/main.go` (separate binary)
- **Files to modify**: `internal/services/match_service.go` (enqueue instead of synchronous fetch), `docker-compose.yml`
- **Learning**: Job queues, worker patterns, task idempotency, retry strategies, dead letter queues

### 4.2 Performance & Load Testing
- **Current state**: No performance testing.
- **Recommendation**: `k6` over vegeta — it uses JavaScript for test scripts (you already know JS), has better reporting, and integrates with Grafana.
- **What to do**:
  - Write k6 scripts for: summoner search flow, match history fetch, live game check
  - Measure: p50/p95/p99 latency, throughput, error rate under load
  - Run against local docker-compose stack
  - Use Grafana (from Phase 3.1) to visualize k6 results
- **Files to create**: `server/loadtest/` directory with k6 scripts
- **Depends on**: Phase 3.1 (metrics) for meaningful observation during load tests
- **Learning**: Load testing patterns (ramp-up, soak, spike), percentile latencies, bottleneck identification

### 4.3 Kubernetes Deployment
- **Current state**: Docker Compose for local dev. No K8s manifests.
- **Recommendation**: Start with **minikube** or **kind** (local K8s cluster). Use raw manifests first (not Helm) to learn the concepts.
- **What to do**:
  - Create K8s manifests: Deployment, Service, ConfigMap, Secret for the Go API
  - Create manifests for PostgreSQL and Redis (StatefulSets)
  - Add HPA (Horizontal Pod Autoscaler) based on CPU/memory
  - Create Ingress for external access
  - Optional: Add Kustomize for environment overlaps (dev/prod)
- **Files to create**: `k8s/` directory with YAML manifests
- **Depends on**: Phase 1.4 (CI/CD for building images), Phase 3 (observability for debugging K8s issues)
- **Learning**: Pods, Deployments, Services, ConfigMaps, Secrets, Ingress, HPA, kubectl, container orchestration

---

## "Later" Items Assessment

These are from line 50+ in your plan. Here's how they fit with the current project:

| Item | Fit | Recommendation |
|------|-----|----------------|
| **Authentication (OAuth2/JWT)** | Medium | Good learning but your app doesn't need auth — it's a public data viewer. Do it if you want to add user accounts/favorites. |
| **Advanced DB Patterns** | High | You already have migrations. **Query EXPLAIN is a quick win** — run `EXPLAIN ANALYZE` on `GetRecentMatchesForPUUID` JOIN query to learn about index usage. Do this anytime. |
| **WebSockets/SSE** | High | Natural fit for live game updates. SSE is simpler to start with. Use after Phase 4.1 (background jobs) since you need a mechanism to push updates. |
| **Feature Flags** | Low | Overkill for a learning project at this stage. |
| **Microservices** | Low | Your app is correctly sized as a monolith. Don't split unless you have a real reason. |
| **Caching Strategies** | Medium | Cache invalidation is relevant when you add background jobs (Phase 4.1). Cache warming could pair with rank snapshot collection. |
| **Denormalization** | Low | Your JSONB match_data is already a form of denormalization. Materialized views are interesting but no current need. |
| **Distributed Tracing** | **Moved to Phase 3.2** | Too valuable to defer — pairs with metrics and context propagation. |
| **Per-IP Rate Limiting** | **Moved to Phase 2.1** | Simple, high-value, teaches token bucket algorithm. |
| **Swagger Docs** | Medium | `swaggo/swag` generates from Go comments. Good for API documentation discipline. Do after API versioning (Phase 2.3). |
| **Query EXPLAIN** | **Quick win — do anytime** | Takes 10 minutes, teaches you query plans. No code changes needed. |

---

## Additional Suggestions (Not in Your Plan)

### A. Graceful Shutdown Improvement
- **Current state**: `cmd/server/main.go` has basic graceful shutdown with 10s timeout but doesn't drain in-flight requests or close Redis/DB connections cleanly.
- **What to do**: Add connection pool cleanup for DB and Redis in the shutdown path. Close asynq workers (Phase 4.1) gracefully.
- **Learning**: Signal handling, connection draining, resource cleanup

### B. Health Check Enhancement
- **Current state**: `/health` pings DB and Redis. Missing: Riot API connectivity check, cache stats, uptime.
- **What to do**: Add `/health/ready` (readiness) and `/health/live` (liveness) — separate endpoints for K8s probes.
- **Depends on**: Useful for Phase 4.3 (K8s)

### C. Client-Side Error Boundaries
- **Current state**: No React error boundaries. A component crash takes down the whole page.
- **What to do**: Add error boundaries around MatchHistory, LiveGame components.
- **Learning**: React error boundaries, graceful UI degradation

### D. Database Connection Resilience
- **Current state**: If Postgres goes down after startup, the app crashes. No reconnection logic.
- **What to do**: Add connection health checks and retry logic. The `database/sql` pool handles some of this, but explicit retry in repository methods would help.

### E. Git Hooks for Server
- **Current state**: Husky + lint-staged only covers the client. No pre-commit checks for Go code.
- **What to do**: Add a `server/` pre-commit hook that runs `go vet`, `golangci-lint run`, and `go test ./...`.

### F. Makefile Unification
- **Current state**: Makefile lives in `server/`. No root-level Makefile for full-stack operations.
- **What to do**: Add a root `Makefile` with targets like `make dev` (starts both client + server), `make test` (runs all tests), `make lint` (lints both).

---

## Recommended Implementation Order

```
Phase 1 (Foundation) ──────────────────────────────────
  1.1 Context Propagation     ← everything depends on this
  1.2 Structured Logging      ← parallel with 1.1
  1.3 Unit Tests              ← parallel with 1.1/1.2
  1.4 CI/CD Pipeline          ← after 1.3 (needs tests to run)
  
Phase 2 (Reliability) ─────────────────────────────────
  2.1 Rate Limiting           ← after 1.1
  2.2 Circuit Breaker         ← after 1.1, parallel with 2.1
  2.3 API Versioning          ← anytime, small task

Phase 3 (Observability) ───────────────────────────────
  3.1 Prometheus + Grafana    ← after 1.1, 1.2
  3.2 OpenTelemetry + Jaeger  ← after 3.1

Phase 4 (Advanced) ────────────────────────────────────
  4.1 Background Jobs (asynq) ← after 1.3, 3.1
  4.2 Load Testing (k6)       ← after 3.1
  4.3 Kubernetes               ← after 1.4, 3.x

Quick Wins (anytime):
  - Query EXPLAIN on GetRecentMatchesForPUUID
  - Client error boundaries
  - Git hooks for server
  - Swagger docs (after 2.3)
```

---

## Decisions
- **Logging**: Stick with `log/slog` (already in use, stdlib, idiomatic for Go 1.21+). No need for zerolog/zap.
- **Metrics stack**: Grafana Stack (Prometheus + Grafana). Skip ELK — overkill for learning.
- **Load testing**: k6 over vegeta (JS-based scripts, better Grafana integration).
- **Job queue**: asynq over go-workers (actively maintained, Redis-backed, built-in dashboard).
- **K8s**: minikube/kind locally, raw manifests first (not Helm).
- **Tracing**: Moved from "Later" to Phase 3 — high learning value, natural fit with context propagation work.
- **Per-IP rate limiting**: Moved from "Later" to Phase 2 — simple, high-value.
- **Skip for now**: Feature flags, microservices, denormalization, auth (no current need).
