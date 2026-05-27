# Load Test Performance Benchmarks

Reference guide for interpreting k6 results for this service. Thresholds are
tuned for a **cached Go API + Redis + Postgres** stack calling an external Riot
API on misses.

---

## Response Time Tiers

```
HTTP p(95) response time

  0ms ──────────── 50ms ──────────── 200ms ──────────── 1s ──────────── 3s+
   │                 │                  │                 │               │
   │   ██████████   │   ░░░░░░░░░░░   │   ▒▒▒▒▒▒▒▒▒▒   │   ████████   │
   │    EXCELLENT   │      GOOD        │    WARNING       │     BAD      │
   │   (cache hit)  │  (DB/some miss)  │  (degradation)  │  (incident)  │
```

| Tier          | p(50)    | p(90)     | p(95)      | p(99)      | What it means                        |
|---------------|----------|-----------|------------|------------|--------------------------------------|
| **Excellent** | < 5ms    | < 30ms    | < 50ms     | < 200ms    | Redis cache serving most traffic     |
| **Good**      | < 50ms   | < 100ms   | < 200ms    | < 500ms    | DB hits + occasional Riot API misses |
| **Warning**   | < 200ms  | < 500ms   | < 1s       | < 2s       | Cache cold / DB pressure building    |
| **Bad**       | < 1s     | < 2s      | < 3s       | < 5s       | Systematic Riot API misses or DB lag |
| **Critical**  | > 1s     | > 2s      | > 3s       | > 5s       | Likely incident — check logs         |

---

## Error Rate Tiers

| Rate        | Tier          | Action                                          |
|-------------|---------------|-------------------------------------------------|
| 0%          | **Excellent** | No action needed                                |
| < 0.1%      | **Good**      | Acceptable, monitor trend                       |
| 0.1–1%      | **Warning**   | Investigate — likely Riot 429s or DB timeouts   |
| 1–5%        | **Bad**       | Active degradation, check rate limits & DB pool |
| > 5%        | **Critical**  | Service is failing under load — page on-call    |

---

## This Run — May 28 2026 (Stress: 0→100 VUs)

| Metric               | Value       | Tier          |
|----------------------|-------------|---------------|
| avg response time    | 8.62ms      | ✅ Excellent  |
| median (p50)         | 1.37ms      | ✅ Excellent  |
| p(90)                | 27.52ms     | ✅ Excellent  |
| p(95)                | 35.08ms     | ✅ Excellent  |
| max                  | 3.04s       | ⚠️ Outlier¹  |
| error rate           | 0.00%       | ✅ Excellent  |
| throughput           | ~221 req/s  | —             |
| total iterations     | 46,863      | —             |
| VU peak              | 100         | —             |

> ¹ Single max spike of 3.04s is expected — it's a cold-cache Riot API fetch on
> the very first iteration before Redis warms up. Not reflected in p95/p99 so
> not actionable. If max consistently exceeds 3s after warmup, investigate.

### Traffic mix

| Group    | Share | Route                             | Cached?          |
|----------|-------|-----------------------------------|------------------|
| Profile  | 50%   | `GET /api/summoner`               | ✅ Redis → DB     |
| Health   | 30%   | `GET /health`                     | ✅ No Riot calls  |
| Matches  | 20%   | `GET /api/summoner/:puuid/matches`| ✅ Redis → DB     |

---

## When Things Start Going Wrong

```
Typical degradation sequence under increasing load:

  1. p(95) crosses 200ms
        └─ Redis cache is warm but DB pool is saturating.
           Check: Postgres max_connections, slow query log.

  2. Error rate crosses 0.1%
        └─ Riot API 429s starting to bleed through.
           Check: rate limiter logs, RankWorkerRPM config.

  3. p(95) crosses 1s
        └─ DB queries blocking, or Redis latency spiking.
           Check: Redis memory usage, Postgres locks.

  4. p(95) crosses 3s AND error rate > 1%
        └─ Server is under genuine distress.
           Check: goroutine count, GC pauses, container CPU throttling.

  5. max consistently > 5s OR error rate > 5%
        └─ Incident. Scale horizontally or shed load.
```

---

## k6 Thresholds Quick Reference

```js
thresholds: {
  // Healthy cached API (this service target)
  errors:            ["rate<0.01"],       // < 1% errors
  http_req_duration: ["p(95)<200"],       // p95 < 200ms

  // Stress test (looser — we're finding the breaking point)
  errors:            ["rate<0.3"],        // < 30% errors at spike
  http_req_duration: ["p(95)<10000"],     // p95 < 10s (generous)

  // Smoke test (strictest — just checking it works)
  errors:            ["rate<0.001"],      // near-zero
  http_req_duration: ["p(95)<500"],       // p95 < 500ms
}
```

---

## Useful k6 Commands

```bash
# Run stress test
make loadtest-stress

# Override summoner
k6 run -e BASE_URL=http://localhost:8080 \
       -e GAME_NAME=YourName \
       -e TAG_LINE=EUW \
       -e REGION=euw1 \
       loadtest/stress.js

# Output to JSON for trend tracking
k6 run --out json=results/$(date +%Y%m%d).json loadtest/stress.js
```
