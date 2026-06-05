import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ─── Custom metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate("errors");
const profileDuration = new Trend("profile_duration", true);
const matchesDuration = new Trend("matches_duration", true);
const totalRequests = new Counter("total_requests");

// ─── Configuration ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

// Multiple summoners to test — simulates different users searching different players.
// Searches hit Riot API on first call, then cache/DB on subsequent calls.
// Add real summoner names you've searched before for best results.
const SUMMONERS = [
  { gameName: "bro", tagLine: "han", region: "euw1" },
  { gameName: "Agurin", tagLine: "DND", region: "euw1" },
];

// ─── Scenarios ───────────────────────────────────────────────────────────────
// Soak test: moderate load sustained for a longer period.
// Goal: detect memory leaks, connection pool exhaustion, goroutine leaks.
export const options = {
  scenarios: {
    soak: {
      executor: "constant-vus",
      vus: 10,
      duration: "5m",
    },
  },
  thresholds: {
    errors: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"],
    profile_duration: ["avg<1000"],
    matches_duration: ["avg<2000"],
  },
};

// ─── Test logic ──────────────────────────────────────────────────────────────
export default function () {
  // Pick a random summoner
  const summoner = SUMMONERS[Math.floor(Math.random() * SUMMONERS.length)];

  group("Full Search Flow", () => {
    // Step 1: Profile
    const profileRes = http.get(
      `${BASE_URL}/api/summoner?gameName=${encodeURIComponent(summoner.gameName)}&tagLine=${encodeURIComponent(summoner.tagLine)}&region=${summoner.region}`
    );
    totalRequests.add(1);
    const profileOk = check(profileRes, {
      "profile status 200": (r) => r.status === 200,
    });
    errorRate.add(!profileOk);
    profileDuration.add(profileRes.timings.duration);

    if (profileRes.status !== 200) {
      sleep(2);
      return;
    }

    const puuid = profileRes.json().account.puuid;

    // Step 2: Match History
    const matchRes = http.get(
      `${BASE_URL}/api/summoner/${puuid}/matches?region=${summoner.region}`
    );
    totalRequests.add(1);
    const matchOk = check(matchRes, {
      "matches status 200": (r) => r.status === 200,
    });
    errorRate.add(!matchOk);
    matchesDuration.add(matchRes.timings.duration);

    // Step 3: Rank (quick)
    const rankRes = http.get(`${BASE_URL}/api/summoner/${puuid}/rank`);
    totalRequests.add(1);
    check(rankRes, {
      "rank valid": (r) => r.status === 200 || r.status === 404,
    });

    // Step 4: Stats (quick)
    const statsRes = http.get(`${BASE_URL}/api/summoner/${puuid}/stats`);
    totalRequests.add(1);
    check(statsRes, {
      "stats valid": (r) => r.status === 200 || r.status === 404,
    });
  });

  // Realistic think time between searches
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}
