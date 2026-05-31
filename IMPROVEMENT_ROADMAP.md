# Plan: Comprehensive Project Improvement Roadmap

## TL;DR

Review of proposed improvements against the current LoL Match Tracker codebase (Go backend + Next.js frontend). The server has major foundational gaps (tests, CI/CD, rate limiting, context propagation), while the client is in better shape. Work is organized into phased implementation.

## Implementation Status

- [x] Step 0: Save roadmap in project
- [x] Phase 1.1: Context propagation + timeouts
- [x] Phase 1.2: Structured logging cleanup
- [x] Phase 1.3: Unit tests (server)
- [x] Phase 1.4: CI/CD pipeline
- [x] Phase 2.1: Rate limiting (per-IP token bucket)
- [x] Phase 2.2: Circuit breaker (Riot API)
- [ ] Phase 2.3: API versioning
- [x] Phase 3.1: Prometheus metrics + Grafana dashboard
- [x] Phase 3.2: OpenTelemetry tracing + Jaeger
- [x] Phase 4.1: Background rank-fetch worker (in-process queue)
- [x] Phase 4.2: k6 load testing (smoke, load, stress, soak scripts)
- [ ] Phase 4.3: Kubernetes deployment

---

## Current Project State Summary

### Server (Go + Gin)
- Testing: none
- Logging: partial and inconsistent
- Rate limiting: none
- Circuit breaker: none
- Context propagation: incomplete
- CI/CD: none
- API versioning: none
- Docker setup: solid
- Database/repository: good
- Redis cache: good

### Client (Next.js + TypeScript)
- Unit tests: partial
- E2E tests: good
- Linting/hooks: good
- Storybook: good
- Error handling: adequate
- Types: solid

---

## Step 0: Save Plan to Project

This file is the persisted roadmap for future reference.

---

## Phase 1: Foundation (Do First)

### 1.1 Context Propagation + Timeouts
- Pass request context from handlers through services, repositories, and cache.
- Enforce timeouts by layer:
  - Redis: 500ms
  - DB: 2s
  - Riot API: 5s

### 1.2 Structured Logging Cleanup
- Standardize on `log/slog` everywhere.
- Include request ID in log context.
- Configure log level via env/config.

### 1.3 Unit Tests (Server)
- Add service unit tests with mocked repos/cache/Riot client.
- Add repository integration tests with Postgres + Redis.
- Add minimal handler tests.
- Tools: `testify`, `mockery`, `testcontainers-go`.

### 1.4 CI/CD Pipeline
- Add GitHub Actions for lint, test, build (server + client).
- Add `golangci-lint` config.
- Add/expand Makefile targets for lint/test.

---

## Phase 2: Reliability (After Foundation)

### 2.1 Rate Limiting ✅
- Added per-IP token bucket middleware (`golang.org/x/time/rate`).
- `RATE_LIMIT_RPS` (default 10/s) + `RATE_LIMIT_BURST` (default 20) configurable via env.
- `rate_limit_rejected_total` Prometheus counter added.

### 2.2 Circuit Breaker ✅
- `sony/gobreaker` wraps all Riot API HTTP calls.
- Trips after 5 consecutive 5xx/429 responses, open for 30s, 2 probe requests in half-open.
- `circuit_breaker_state` Prometheus gauge tracks state changes (0=closed, 1=half-open, 2=open).

### 2.3 API Versioning
- Move routes under `/api/v1`.
- Update client backend route usage accordingly.

---

## Phase 3: Observability (After Reliability)

### 3.1 Metrics with Prometheus + Grafana ✅
- Add request metrics (count, latency, inflight).
- Add app metrics (cache hit/miss, Riot error rate, DB timing).
- Expose `/metrics`.
- Pre-built Grafana dashboard: cache hit rate, resolution breakdown, Riot API RPM/RPH/RPD, DB latency.

### 3.2 Tracing with OpenTelemetry + Jaeger ✅
- Add spans across handlers/services/repos/cache/Riot HTTP calls.
- Ensure trace context propagation through request chain.

---

## Phase 4: Advanced (After Observability)

### 4.1 Background Jobs and Queues ✅
- In-process `RankFetchWorker`: buffered channel (cap 1000), `sync.Map` dedup, ticker-based rate limiting.
- Enqueues all 10 match participants after each match-history fetch.
- `RANK_WORKER_RPM` env var (default 10/min). Three Grafana panels: queue depth, tasks processed, tasks dropped.

### 4.2 Performance & Load Testing ✅
- `k6` scripts in `server/loadtest/`: `smoke.js`, `load.js`, `stress.js`, `soak.js`.
- Makefile targets: `make loadtest-smoke`, `make loadtest-load`, `make loadtest-stress`.
- Defaults to `bro#han` / `Agurin#DND` (euw1). Override via `GAME_NAME`, `TAG_LINE`, `REGION` env vars.

### 4.3 Kubernetes Deployment
- Start with local cluster (`kind` or `minikube`).
- Add manifests for API, Postgres, Redis, and ingress/autoscaling.

---

## Later Items Assessment

- Authentication: optional unless product scope includes accounts/roles.
- WebSockets/SSE: good fit for live updates, after background jobs.
- Feature flags/microservices: defer for now.
- Swagger docs: good after API versioning.
- Query plan analysis (`EXPLAIN ANALYZE`): quick learning win.

---

## Additional Suggestions

- Improve graceful shutdown resource cleanup.
- Add `/health/live` and `/health/ready`.
- Add client error boundaries.
- Add server pre-commit checks.
- Add root-level make targets for full-stack workflows.

---

## Recommended Order

1. Phase 1.1 Context propagation and timeouts.
2. Phase 1.2 Logging standardization.
3. Phase 1.3 Server tests.
4. Phase 1.4 CI/CD.
5. Phase 2 reliability features.
6. Phase 3 observability.
7. Phase 4 advanced platform work.

---

## Decisions

- Logging: `slog`.
- Metrics stack: Prometheus + Grafana.
- Load testing: k6.
- Queueing: asynq.
- Kubernetes: local-first learning path.
- Defer: feature flags, microservices, denormalization, auth for now.
