import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// ─── Custom metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate("errors");
const profileDuration = new Trend("profile_duration", true);
const matchesDuration = new Trend("matches_duration", true);
const healthDuration = new Trend("health_duration", true);

// ─── Configuration ───────────────────────────────────────────────────────────
// Override with: k6 run --env BASE_URL=http://localhost:8080 loadtest/smoke.js
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

// Use a known summoner that has been searched before (cached path).
// Override with env vars if needed.
const GAME_NAME = __ENV.GAME_NAME || "bro";
const TAG_LINE = __ENV.TAG_LINE || "han";
const REGION = __ENV.REGION || "euw1";

// ─── Scenarios ───────────────────────────────────────────────────────────────
// Smoke test: 1 VU, 30 iterations — validates endpoints work under zero load.
export const options = {
  scenarios: {
    smoke: {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: 10,
      maxDuration: "1m",
    },
  },
  thresholds: {
    errors: ["rate<0.1"], // <10% error rate
    http_req_duration: ["p(95)<5000"], // p95 < 5s
  },
};

// ─── Test logic ──────────────────────────────────────────────────────────────
export default function () {
  group("Health Check", () => {
    const res = http.get(`${BASE_URL}/health`);
    const ok = check(res, {
      "health status 200": (r) => r.status === 200,
      "health body ok": (r) => r.json().status === "ok",
    });
    errorRate.add(!ok);
    healthDuration.add(res.timings.duration);
  });

  group("Summoner Profile", () => {
    const res = http.get(
      `${BASE_URL}/api/summoner?gameName=${encodeURIComponent(GAME_NAME)}&tagLine=${encodeURIComponent(TAG_LINE)}&region=${REGION}`
    );
    const ok = check(res, {
      "profile status 200": (r) => r.status === 200,
      "profile has account": (r) => r.json().account !== undefined,
    });
    errorRate.add(!ok);
    profileDuration.add(res.timings.duration);

    // If profile succeeded, fetch match history
    if (res.status === 200) {
      const puuid = res.json().account.puuid;

      group("Match History", () => {
        const matchRes = http.get(
          `${BASE_URL}/api/summoner/${puuid}/matches?region=${REGION}`
        );
        const matchOk = check(matchRes, {
          "matches status 200": (r) => r.status === 200,
          "matches has data": (r) => r.json().matches !== undefined,
        });
        errorRate.add(!matchOk);
        matchesDuration.add(matchRes.timings.duration);
      });
    }
  });

  sleep(0.5);
}
