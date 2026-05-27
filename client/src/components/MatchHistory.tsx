"use client";

import React from "react";
import MatchCard from "@/components/match-history/MatchCard";
import { MatchHistoryProps } from "@/components/match-history/types";
import { buildPlayerMatches, formatRank } from "@/components/match-history/utils";
import { TeamRosterEntry } from "@/components/match-history/types";
import { LeagueEntry } from "@/types/riot-api";

function getProfileIconUrl(profileIconId: number) {
  return `/dragontail/16.9.1/img/profileicon/${profileIconId}.png`;
}

function getRankIconUrl(tier: string) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}.svg`;
}

function getPlayerRank(ranks: Record<string, LeagueEntry> | undefined, puuid: string): LeagueEntry | undefined {
  if (!ranks) return undefined;
  return ranks[puuid];
}

export default function MatchHistory({
  summonerData,
  region: _region,
}: MatchHistoryProps) {
  const { account, summoner, matches, ranks } = summonerData;
  const playerMatches = buildPlayerMatches(summonerData);
  const playerRank = getPlayerRank(ranks, account.puuid);

  const getRankLabel = (participant: TeamRosterEntry): string => {
    return formatRank(participant.initialRank);
  };

  // Calculate streak
  const getStreak = () => {
    if (playerMatches.length === 0) return { type: "none" as const, count: 0 };
    const firstResult = playerMatches[0].win;
    let count = 0;
    for (const match of playerMatches) {
      if (match.win === firstResult) count++;
      else break;
    }
    if (count < 2) return { type: "none" as const, count: 0 };
    return { type: firstResult ? "win" as const : "loss" as const, count };
  };

  const streak = getStreak();

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200/70 dark:shadow-black/30">
        <div className="flex items-center gap-5">
          {/* Profile Icon */}
          <div className="relative">
            <img
              src={getProfileIconUrl(summoner.profileIconId)}
              alt="Profile Icon"
              className="h-20 w-20 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-md"
            />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 dark:bg-slate-700 px-2 py-0.5 text-xs font-bold text-white shadow">
              {summoner.summonerLevel}
            </span>
          </div>

          {/* Name & Tag */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
              {account.gameName}<span className="text-slate-400 dark:text-slate-500">#{account.tagLine}</span>
            </h2>

            {/* Rank info */}
            {playerRank ? (
              <div className="mt-1 flex items-center gap-2">
                <img
                  src={getRankIconUrl(playerRank.tier)}
                  alt={playerRank.tier}
                  className="h-6 w-6"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {playerRank.tier.charAt(0) + playerRank.tier.slice(1).toLowerCase()} {playerRank.rank} · {playerRank.leaguePoints} LP
                </span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Unranked</p>
            )}

            {/* Win/Loss Stats */}
            {playerRank && (
              <div className="mt-1 flex items-center gap-3 text-sm">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{playerRank.wins}W</span>
                <span className="text-rose-600 dark:text-rose-400 font-medium">{playerRank.losses}L</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {((playerRank.wins / (playerRank.wins + playerRank.losses)) * 100).toFixed(0)}% WR
                </span>
              </div>
            )}
          </div>

          {/* Streak indicator */}
          {streak.type !== "none" && (
            <div className={`flex items-center gap-1.5 rounded-xl px-3 py-2 ${
              streak.type === "win"
                ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
            }`}>
              <span className="text-xl">{streak.type === "win" ? "🔥" : "🥶"}</span>
              <div className="text-center">
                <p className={`text-sm font-bold ${
                  streak.type === "win" ? "text-orange-700 dark:text-orange-300" : "text-blue-700 dark:text-blue-300"
                }`}>
                  {streak.count} {streak.type === "win" ? "Win" : "Loss"} Streak
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="mb-4 text-xl font-semibold text-gray-800">
          Recent Matches ({matches.length})
        </h3>

        {playerMatches.map((match) => (
          <MatchCard
            key={match.matchId}
            match={match}
            getRankLabel={getRankLabel}
          />
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200/70 dark:shadow-black/30">
        <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-slate-100">Match Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
          <div>
            <p className="text-2xl font-bold text-emerald-700">
              {playerMatches.filter((match) => match.win).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400">Wins</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-700">
              {playerMatches.filter((match) => !match.win).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400">Losses</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-sky-700">
              {playerMatches.length
                ? ((playerMatches.filter((match) => match.win).length /
                    playerMatches.length) *
                    100).toFixed(0)
                : "0"}
              %
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400">Win Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-violet-700">
              {playerMatches.length
                ? (
                    playerMatches.reduce((sum, match) => sum + match.damage, 0) /
                    playerMatches.length
                  ).toFixed(0)
                : "0"}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-400">Avg Damage</p>
          </div>
        </div>
      </div>
    </div>
  );
}
