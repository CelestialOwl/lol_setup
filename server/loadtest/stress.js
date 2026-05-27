import http from "k6/http";
import { check, sleep, group, fail } from "k6";
import { Rate } from "k6/metrics";

// ─── Custom metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate("errors");

// ─── Configuration ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const GAME_NAME = __ENV.GAME_NAME || "bro";
const TAG_LINE = __ENV.TAG_LINE || "han";
const REGION = __ENV.REGION || "euw1";
const PUUID = __ENV.PUUID || "q3AvDZqD8n3yVGGPPYd8Spgj5HPAn5BJWTeUVyoh7A8wKkbvG7z4JaXLDe3LTdM6SH_9FxeKrIVMwQ"

// ─── Scenarios ───────────────────────────────────────────────────────────────
// Stress test: push past expected capacity to find the breaking point.
// Ramp to 50 VUs then spike to 100. Expect degradation — goal is to find
// where errors start and if the server recovers gracefully.
export const options = {
  scenarios: {
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },  // warm up
        { duration: "1m", target: 50 },   // push
        { duration: "30s", target: 100 }, // spike
        { duration: "1m", target: 100 },  // hold at spike
        { duration: "30s", target: 0 },   // ramp down — does it recover?
      ],
      gracefulRampDown: "15s",
    },
  },
  thresholds: {
    // Looser thresholds — we expect some failures under extreme load
    errors: ["rate<0.3"],               // <30% error rate at spike
    http_req_duration: ["p(95)<10000"], // p95 < 10s (generous)
  },
};

// ─── Setup (runs once before VUs start) ─────────────────────────────────────
// Resolves the PUUID for GAME_NAME#TAG_LINE so match-history VUs don't need
// to look it up on every iteration.
export function setup() {
  const res = http.get(
    `${BASE_URL}/api/summoner?gameName=${encodeURIComponent(GAME_NAME)}&tagLine=${encodeURIComponent(TAG_LINE)}&region=${REGION}`
  );
  if (res.status !== 200) {
    fail(`setup: failed to resolve summoner PUUID (status ${res.status})`);
  }
  const body = res.json();
  const puuid = body?.account?.puuid;
  if (!puuid) {
    fail("setup: PUUID not found in summoner response");
  }
  return { puuid };
}

// ─── Test logic ──────────────────────────────────────────────────────────────
export default function (data) {
  // Mix of endpoints to simulate realistic traffic distribution
  const rand = Math.random();

  if (rand < 0.5) {
    // 50% — summoner profile (most common request)
    group("Profile", () => {
      const res = http.get(
        `${BASE_URL}/api/summoner?gameName=${encodeURIComponent(GAME_NAME)}&tagLine=${encodeURIComponent(TAG_LINE)}&region=${REGION}`
      );
      const ok = check(res, {
        "profile ok": (r) => r.status === 200,
      });
      errorRate.add(!ok);
    });
  } else if (rand < 0.8) {
    // 30% — health check (lightweight, tests server capacity)
    group("Health", () => {
      const res = http.get(`${BASE_URL}/health`);
      const ok = check(res, {
        "health ok": (r) => r.status === 200,
      });
      errorRate.add(!ok);
    });
  } else {
    // 20% — match history (cached, exercises DB + Redis path)
    group("Matches", () => {
      const res = http.get(
        `${BASE_URL}/api/summoner/${encodeURIComponent(PUUID)}/matches?region=${REGION}`
      );
      const ok = check(res, {
        "matches ok": (r) => r.status === 200,
      });
      errorRate.add(!ok);
    });
  }

  sleep(Math.random() * 0.5); // minimal think time under stress
}
