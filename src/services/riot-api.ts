import {
  Account,
  ApiError,
  LeagueEntry,
  Match,
  Summoner,
  SummonerData,
  TeammateInfo,
} from "@/types/riot-api";

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Regional routing configuration
const REGIONAL_ENDPOINTS = {
  // Americas region
  na1: {
    regional: "americas.api.riotgames.com",
    platform: "na1.api.riotgames.com",
  },
  br1: {
    regional: "americas.api.riotgames.com",
    platform: "br1.api.riotgames.com",
  },
  la1: {
    regional: "americas.api.riotgames.com",
    platform: "la1.api.riotgames.com",
  },
  la2: {
    regional: "americas.api.riotgames.com",
    platform: "la2.api.riotgames.com",
  },

  // Asia region
  kr: { regional: "asia.api.riotgames.com", platform: "kr.api.riotgames.com" },
  jp1: {
    regional: "asia.api.riotgames.com",
    platform: "jp1.api.riotgames.com",
  },

  // Europe region
  euw1: {
    regional: "europe.api.riotgames.com",
    platform: "euw1.api.riotgames.com",
  },
  eun1: {
    regional: "europe.api.riotgames.com",
    platform: "eun1.api.riotgames.com",
  },
  tr1: {
    regional: "europe.api.riotgames.com",
    platform: "tr1.api.riotgames.com",
  },
  ru: {
    regional: "europe.api.riotgames.com",
    platform: "ru.api.riotgames.com",
  },
  me1: {
    regional: "europe.api.riotgames.com",
    platform: "me1.api.riotgames.com",
  },

  // Sea region
  oc1: { regional: "sea.api.riotgames.com", platform: "oc1.api.riotgames.com" },
};

type Region = keyof typeof REGIONAL_ENDPOINTS;

class RiotApiService {
  private async makeRequest<T>(url: string): Promise<T> {
    if (!RIOT_API_KEY) {
      throw new Error("Riot API key is not configured");
    }

    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData: ApiError = {
        message: `API request failed: ${response.statusText}`,
        status: response.status,
      };

      if (response.status === 404) {
        errorData.message =
          "Summoner not found. Please check the name and tag.";
      } else if (response.status === 403) {
        errorData.message = "Invalid API key or rate limit exceeded.";
      } else if (response.status === 429) {
        errorData.message = "Rate limit exceeded. Please try again later.";
      }

      throw errorData;
    }

    return response.json();
  }

  async getAccountByRiotId(
    gameName: string,
    tagLine: string,
    region: string
  ): Promise<Account> {
    const endpoints = REGIONAL_ENDPOINTS[region as Region];
    if (!endpoints) {
      throw new Error(`Unsupported region: ${region}`);
    }

    const url = `https://${
      endpoints.regional
    }/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`;
    return this.makeRequest<Account>(url);
  }

  async getSummonerByPuuid(puuid: string, region: string): Promise<Summoner> {
    const endpoints = REGIONAL_ENDPOINTS[region as Region];
    if (!endpoints) {
      throw new Error(`Unsupported region: ${region}`);
    }

    const url = `https://${endpoints.platform}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    return this.makeRequest<Summoner>(url);
  }

  async getMatchHistory(
    puuid: string,
    region: string,
    count: number = 10
  ): Promise<string[]> {
    const endpoints = REGIONAL_ENDPOINTS[region as Region];
    if (!endpoints) {
      throw new Error(`Unsupported region: ${region}`);
    }

    const url = `https://${endpoints.regional}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
    return this.makeRequest<string[]>(url);
  }

  async getMatchDetails(matchId: string, region: string): Promise<Match> {
    const endpoints = REGIONAL_ENDPOINTS[region as Region];
    if (!endpoints) {
      throw new Error(`Unsupported region: ${region}`);
    }

    const url = `https://${endpoints.regional}/lol/match/v5/matches/${matchId}`;
    return this.makeRequest<Match>(url);
  }

  async getLeagueEntriesByPuuid(
    puuid: string,
    region: string
  ): Promise<LeagueEntry[]> {
    const endpoints = REGIONAL_ENDPOINTS[region as Region];
    if (!endpoints) {
      throw new Error(`Unsupported region: ${region}`);
    }

    const url = `https://${endpoints.platform}/lol/league/v4/entries/by-puuid/${puuid}`;
    return this.makeRequest<LeagueEntry[]>(url);
  }

  async getTeammateInfoWithRank(
    puuid: string,
    gameName: string,
    region: string
  ): Promise<TeammateInfo> {
    try {
      // Get league entries directly by PUUID (no need for summoner data now)
      const leagueEntries = await this.getLeagueEntriesByPuuid(puuid, region);

      // Find ranked solo/duo entry (most common ranked queue)
      const rankedSoloEntry = leagueEntries.find(
        (entry: LeagueEntry) => entry.queueType === "RANKED_SOLO_5x5"
      );

      return {
        puuid,
        gameName,
        tier: rankedSoloEntry?.tier,
        rank: rankedSoloEntry?.rank,
        leaguePoints: rankedSoloEntry?.leaguePoints,
      };
    } catch {
      // If we can't get rank info, return basic info
      return {
        puuid,
        gameName,
      };
    }
  }

  async getSummonerData(
    gameName: string,
    tagLine: string,
    region: string
  ): Promise<SummonerData> {
    try {
      // Get account by Riot ID
      const account = await this.getAccountByRiotId(gameName, tagLine, region);

      // Get summoner details
      const summoner = await this.getSummonerByPuuid(account.puuid, region);

      // Get match history
      const matchHistory = await this.getMatchHistory(
        account.puuid,
        region,
        10
      );

      // Get match details for each match
      const matchDetailsPromises = matchHistory.map((matchId) =>
        this.getMatchDetails(matchId, region)
      );

      const matches = await Promise.all(matchDetailsPromises);

      // Process matches to include teammate rank information
      const processedMatches = await Promise.all(
        matches.map(async (match) => {
          const playerData = match.info.participants.find(
            (p) => p.puuid === account.puuid
          );
          if (!playerData) return match;

          // Get teammates with rank info
          const teammateParticipants = match.info.participants.filter(
            (p) => p.teamId === playerData.teamId && p.puuid !== account.puuid
          );

          // Fetch rank info for teammates (with error handling)
          const teammatesWithRank = await Promise.allSettled(
            teammateParticipants.map((teammate) =>
              this.getTeammateInfoWithRank(
                teammate.puuid,
                teammate.riotIdGameName,
                region
              )
            )
          );

          // Add teammate rank info to match data
          const enrichedParticipants = match.info.participants.map(
            (participant) => {
              if (
                participant.teamId === playerData.teamId &&
                participant.puuid !== account.puuid
              ) {
                const teammateRankResult = teammatesWithRank.find(
                  (result, index) =>
                    result.status === "fulfilled" &&
                    teammateParticipants[index].puuid === participant.puuid
                );

                if (
                  teammateRankResult &&
                  teammateRankResult.status === "fulfilled"
                ) {
                  return {
                    ...participant,
                    teammateRankInfo: teammateRankResult.value,
                  };
                }
              }
              return participant;
            }
          );

          return {
            ...match,
            info: {
              ...match.info,
              participants: enrichedParticipants,
            },
          };
        })
      );

      return {
        account,
        summoner,
        matchHistory,
        matches: processedMatches,
      };
    } catch (error) {
      if (
        error instanceof Error ||
        (typeof error === "object" && error !== null && "message" in error)
      ) {
        throw error;
      }
      throw new Error(
        "An unexpected error occurred while fetching summoner data"
      );
    }
  }
}

export const riotApiService = new RiotApiService();
