"use client";

import { PlayerMatch, SummonerData } from "@/types/riot-api";

interface MatchHistoryProps {
  summonerData: SummonerData;
}

export default function MatchHistory({ summonerData }: MatchHistoryProps) {
  const { account, summoner, matches } = summonerData;

  // Process matches to extract player-specific data — skip any match where the
  // player's participant data is missing (e.g. remakes, data gaps).
  const playerMatches: PlayerMatch[] = matches.flatMap((match) => {
    const playerData = match.info.participants.find(
      (participant) => participant.puuid === account.puuid
    );

    if (!playerData) {
      return []; // skip this match silently
    }

    // Get teammates (same team, excluding the player)
    const teammates = match.info.participants
      .filter(
        (participant) =>
          participant.teamId === playerData.teamId &&
          participant.puuid !== account.puuid
      )
      .map((teammate) => ({
        puuid: teammate.puuid,
        gameName: teammate.riotIdGameName,
        rank: teammate.teammateRankInfo?.rank,
        tier: teammate.teammateRankInfo?.tier,
        leaguePoints: teammate.teammateRankInfo?.leaguePoints,
      }));

    return {
      matchId: match.metadata.matchId,
      champion: playerData.championName,
      kills: playerData.kills,
      deaths: playerData.deaths,
      assists: playerData.assists,
      damage: playerData.totalDamageDealtToChampions,
      gold: playerData.goldEarned,
      win: playerData.win,
      gameMode: match.info.gameMode,
      gameDuration: match.info.gameDuration,
      gameDate: new Date(match.info.gameCreation),
      teammates,
    };
  });

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getKDA = (kills: number, deaths: number, assists: number): string => {
    const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
    return kda.toFixed(2);
  };

  const formatRank = (
    tier?: string,
    rank?: string,
    leaguePoints?: number
  ): string => {
    if (!tier || !rank) return "Unranked";

    // Handle special tiers that don't have ranks
    if (tier === "MASTER" || tier === "GRANDMASTER" || tier === "CHALLENGER") {
      return `${tier.charAt(0) + tier.slice(1).toLowerCase()} ${
        leaguePoints || 0
      } LP`;
    }

    // Format regular tiers
    const formattedTier = tier.charAt(0) + tier.slice(1).toLowerCase();
    return `${formattedTier} ${rank} ${leaguePoints || 0} LP`;
  };

  const getRankColor = (tier?: string): string => {
    if (!tier) return "text-gray-500";

    switch (tier.toUpperCase()) {
      case "IRON":
        return "text-gray-600";
      case "BRONZE":
        return "text-amber-600";
      case "SILVER":
        return "text-gray-400";
      case "GOLD":
        return "text-yellow-500";
      case "PLATINUM":
        return "text-cyan-500";
      case "EMERALD":
        return "text-emerald-500";
      case "DIAMOND":
        return "text-blue-500";
      case "MASTER":
        return "text-purple-500";
      case "GRANDMASTER":
        return "text-red-500";
      case "CHALLENGER":
        return "text-orange-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Summoner Info Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {summoner.summonerLevel}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {account.gameName}#{account.tagLine}
            </h2>
            <p className="text-gray-600">Level {summoner.summonerLevel}</p>
          </div>
        </div>
      </div>

      {/* Match History */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Recent Matches ({matches.length})
        </h3>

        {playerMatches.map((match) => (
          <div
            key={match.matchId}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
              match.win ? "border-green-500" : "border-red-500"
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Game Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 rounded text-sm font-semibold ${
                      match.win
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {match.win ? "Victory" : "Defeat"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{match.gameMode}</p>
                <p className="text-sm text-gray-600">
                  {formatDuration(match.gameDuration)}
                </p>
                <p className="text-sm text-gray-600">
                  {formatDate(match.gameDate)}
                </p>
              </div>

              {/* Champion & KDA */}
              <div className="space-y-2">
                <p className="font-semibold text-lg">{match.champion}</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-semibold">
                      {match.kills}/{match.deaths}/{match.assists}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    KDA: {getKDA(match.kills, match.deaths, match.assists)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Damage</p>
                  <p className="font-semibold">
                    {match.damage.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gold</p>
                  <p className="font-semibold">{match.gold.toLocaleString()}</p>
                </div>
              </div>

              {/* Teammates */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Teammates</p>
                <div className="space-y-1">
                  {match.teammates.slice(0, 4).map((teammate, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="truncate font-medium">
                        {teammate.gameName}
                      </p>
                      <p
                        className={`text-xs truncate font-semibold ${getRankColor(
                          teammate.tier
                        )}`}
                      >
                        {formatRank(
                          teammate.tier,
                          teammate.rank,
                          teammate.leaguePoints
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Match Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">
              {playerMatches.filter((m) => m.win).length}
            </p>
            <p className="text-sm text-gray-600">Wins</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {playerMatches.filter((m) => !m.win).length}
            </p>
            <p className="text-sm text-gray-600">Losses</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {(
                (playerMatches.filter((m) => m.win).length /
                  playerMatches.length) *
                100
              ).toFixed(0)}
              %
            </p>
            <p className="text-sm text-gray-600">Win Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {(
                playerMatches.reduce((sum, m) => sum + m.damage, 0) /
                playerMatches.length
              ).toFixed(0)}
            </p>
            <p className="text-sm text-gray-600">Avg Damage</p>
          </div>
        </div>
      </div>
    </div>
  );
}
