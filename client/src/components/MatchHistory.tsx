"use client";

import React from "react";
import MatchCard from "@/components/match-history/MatchCard";
import { MatchHistoryProps } from "@/components/match-history/types";
import { buildPlayerMatches, formatRank } from "@/components/match-history/utils";
import { TeamRosterEntry } from "@/components/match-history/types";

export default function MatchHistory({
  summonerData,
  region: _region,
}: MatchHistoryProps) {
  const { account, summoner, matches } = summonerData;
  const playerMatches = buildPlayerMatches(summonerData);

  const getRankLabel = (participant: TeamRosterEntry): string => {
    return formatRank(participant.initialRank);
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200/70 dark:shadow-black/30">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-2xl font-bold text-white">
            {summoner.summonerLevel}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
              {account.gameName}#{account.tagLine}
            </h2>
            <p className="text-gray-600 dark:text-slate-400">Level {summoner.summonerLevel}</p>
          </div>
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
