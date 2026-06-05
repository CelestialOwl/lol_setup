import { HttpResponse, http } from "msw";
import { buildMockLiveGameData, buildMockSummonerData } from "@/test/fixtures/riot";
import {
  LiveGameData,
  MatchHistoryData,
  SummonerProfile,
  TeammateInfo,
} from "@/types/riot-api";

type MockFailure = {
  error: string;
  status: number;
};

type RankLookup = MockFailure | TeammateInfo;

type RiotApiMockScenario = {
  liveGame?: LiveGameData | null;
  liveGameFailure?: MockFailure;
  matchHistory?: MatchHistoryData;
  matchHistoryFailure?: MockFailure;
  profile?: SummonerProfile;
  profileFailure?: MockFailure;
  rankLookups?: Record<string, RankLookup>;
};

export type RiotApiScenarioName = "default" | "summoner-not-found";

const defaultSummonerData = buildMockSummonerData(
  new Date("2026-04-28T12:00:00.000Z").getTime()
);

const defaultProfile: SummonerProfile = {
  account: defaultSummonerData.account,
  summoner: defaultSummonerData.summoner,
};

const defaultMatchHistory: MatchHistoryData = {
  matches: defaultSummonerData.matches,
  puuid: defaultSummonerData.account.puuid,
  total: defaultSummonerData.matches.length,
};

const defaultLiveGame = buildMockLiveGameData();

const defaultRankLookups: Record<string, RankLookup> = {
  "enemy-top": {
    gameName: "TopCrusher",
    leaguePoints: 43,
    puuid: "enemy-top",
    rank: "II",
    tier: "GOLD",
  },
};

function isFailureResponse(value: RankLookup | undefined): value is MockFailure {
  return Boolean(value && "error" in value);
}

export function createRiotApiHandlers(scenario: RiotApiMockScenario = {}) {
  const liveGame = scenario.liveGame === undefined ? defaultLiveGame : scenario.liveGame;
  const matchHistory = scenario.matchHistory ?? defaultMatchHistory;
  const profile = scenario.profile ?? defaultProfile;
  const rankLookups = {
    ...defaultRankLookups,
    ...scenario.rankLookups,
  };

  return [
    http.get("*/api/summoner", ({ request }) => {
      const url = new URL(request.url);
      const gameName = url.searchParams.get("gameName");
      const tagLine = url.searchParams.get("tagLine");

      if (!gameName || !tagLine) {
        return HttpResponse.json(
          { error: "Both gameName and tagLine are required" },
          { status: 400 }
        );
      }

      if (scenario.profileFailure) {
        return HttpResponse.json(
          { error: scenario.profileFailure.error },
          { status: scenario.profileFailure.status }
        );
      }

      return HttpResponse.json(profile);
    }),
    http.get("*/api/summoner/:puuid/matches", ({ params }) => {
      if (!params.puuid) {
        return HttpResponse.json({ error: "PUUID is required" }, { status: 400 });
      }

      if (scenario.matchHistoryFailure) {
        return HttpResponse.json(
          { error: scenario.matchHistoryFailure.error },
          { status: scenario.matchHistoryFailure.status }
        );
      }

      return HttpResponse.json(matchHistory);
    }),
    http.get("*/api/summoner/:puuid/rank", ({ params, request }) => {
      const puuid = String(params.puuid ?? "");
      const url = new URL(request.url);
      const gameName = url.searchParams.get("gameName") ?? "Unknown Player";

      if (!puuid) {
        return HttpResponse.json({ error: "PUUID is required" }, { status: 400 });
      }

      const rankLookup = rankLookups[puuid];

      if (isFailureResponse(rankLookup)) {
        return HttpResponse.json(
          { error: rankLookup.error },
          { status: rankLookup.status }
        );
      }

      return HttpResponse.json(rankLookup ?? { gameName, puuid });
    }),
    http.get("*/api/live-game", ({ request }) => {
      const url = new URL(request.url);
      const gameName = url.searchParams.get("gameName");
      const tagLine = url.searchParams.get("tagLine");

      if (!gameName || !tagLine) {
        return HttpResponse.json(
          { error: "Both gameName and tagLine are required", inGame: false },
          { status: 400 }
        );
      }

      if (scenario.liveGameFailure) {
        return HttpResponse.json(
          { error: scenario.liveGameFailure.error, inGame: false },
          { status: scenario.liveGameFailure.status }
        );
      }

      if (!liveGame) {
        return HttpResponse.json(
          { error: "Player is not currently in a game", inGame: false },
          { status: 404 }
        );
      }

      return HttpResponse.json({ ...liveGame, inGame: true });
    }),
  ];
}

export const defaultRiotApiHandlers = createRiotApiHandlers();

export const summonerNotFoundHandlers = createRiotApiHandlers({
  profileFailure: {
    error: "Summoner not found",
    status: 404,
  },
});

export function getRiotApiHandlersForScenario(
  scenarioName?: RiotApiScenarioName | string | null
) {
  switch (scenarioName) {
    case "summoner-not-found":
      return summonerNotFoundHandlers;
    default:
      return defaultRiotApiHandlers;
  }
}