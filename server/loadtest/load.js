import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// ─── Custom metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate("errors");
const profileDuration = new Trend("profile_duration", true);
const matchesDuration = new Trend("matches_duration", true);

// ─── Configuration ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const GAME_NAME = __ENV.GAME_NAME || "bro";
const TAG_LINE = __ENV.TAG_LINE || "han";
const REGION = __ENV.REGION || "euw1";

// ─── Scenarios ───────────────────────────────────────────────────────────────
// Load test: ramp from 0 → 20 VUs over 1 min, hold for 3 min, ramp down.
// This simulates ~20 concurrent users repeatedly searching summoners.
// Since the same summoner is queried, this exercises the cache + DB path.
export const options = {
  scenarios: {
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 }, // ramp up
        { duration: "1m", target: 20 },  // ramp to peak
        { duration: "2m", target: 20 },  // sustain
        { duration: "30s", target: 0 },  // ramp down
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    errors: ["rate<0.05"],                 // <5% error rate
    http_req_duration: ["p(95)<3000"],     // p95 < 3s
    profile_duration: ["p(99)<2000"],      // p99 profile < 2s
    matches_duration: ["p(99)<4000"],      // p99 matches < 4s
  },
};

// ─── Test logic ──────────────────────────────────────────────────────────────
export default function () {
  group("Summoner Profile (cached)", () => {
    const res = http.get(
      `${BASE_URL}/api/summoner?gameName=${encodeURIComponent(GAME_NAME)}&tagLine=${encodeURIComponent(TAG_LINE)}&region=${REGION}`
    );
    const ok = check(res, {
      "profile status 200": (r) => r.status === 200,
      "profile has puuid": (r) => {
        try { return r.json().account.puuid.length > 0; } catch { return false; }
      },
    });
    errorRate.add(!ok);
    profileDuration.add(res.timings.duration);

    if (res.status === 200) {
      const puuid = res.json().account.puuid;

      group("Match History (cached)", () => {
        const matchRes = http.get(
          `${BASE_URL}/api/summoner/${puuid}/matches?region=${REGION}`
        );
        const matchOk = check(matchRes, {
          "matches status 200": (r) => r.status === 200,
        });
        errorRate.add(!matchOk);
        matchesDuration.add(matchRes.timings.duration);
      });

      group("Rank", () => {
        const rankRes = http.get(`${BASE_URL}/api/summoner/${puuid}/rank`);
        check(rankRes, {
          "rank status 200 or 404": (r) => r.status === 200 || r.status === 404,
        });
      });
    }
  });

  // Simulate user think time
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}
