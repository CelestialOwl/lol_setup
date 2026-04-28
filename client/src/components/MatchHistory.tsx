"use client";

import React, { useState } from "react";
import MatchCard from "@/components/match-history/MatchCard";
import { MatchHistoryProps, RankLookupState, TeamRosterEntry } from "@/components/match-history/types";
import { buildPlayerMatches, formatRank } from "@/components/match-history/utils";
import { TeammateInfo } from "@/types/riot-api";

export default function MatchHistory({
  summonerData,
  region,
}: MatchHistoryProps) {
  const { account, summoner, matches } = summonerData;
  const [rankByPuuid, setRankByPuuid] = useState<Record<string, RankLookupState>>({});
  const playerMatches = buildPlayerMatches(summonerData);

  const getRankData = (participant: TeamRosterEntry) => {
    return rankByPuuid[participant.puuid]?.data ?? participant.initialRank;
  };

  const getRankLabel = (participant: TeamRosterEntry): string => {
    const rankData = getRankData(participant);

    if (!rankData) {
      return rankByPuuid[participant.puuid]?.status === "error"
        ? "Rank unavailable"
        : "Hover to load rank";
    }

    return formatRank(rankData);
  };

  const getRankState = (participant: TeamRosterEntry) => {
    return rankByPuuid[participant.puuid];
  };

  const loadRankInfo = async (participant: TeamRosterEntry) => {
    if (participant.initialRank?.tier || rankByPuuid[participant.puuid]) {
      return;
    }

    setRankByPuuid((current) => ({
      ...current,
      [participant.puuid]: { status: "loading" },
    }));

    try {
      const params = new URLSearchParams({
        gameName: participant.gameName,
        region,
      });
      const response = await fetch(`/api/summoner/${participant.puuid}/rank?${params}`);

      if (!response.ok) {
        throw new Error("Failed to load rank");
      }

      const data: TeammateInfo = await response.json();

      setRankByPuuid((current) => ({
        ...current,
        [participant.puuid]: {
          data,
          status: "loaded",
        },
      }));
    } catch {
      setRankByPuuid((current) => ({
        ...current,
        [participant.puuid]: { status: "error" },
      }));
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-2xl font-bold text-white">
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

      <div className="space-y-4">
        <h3 className="mb-4 text-xl font-semibold text-gray-800">
          Recent Matches ({matches.length})
        </h3>

        {playerMatches.map((match) => (
          <MatchCard
            key={match.matchId}
            match={match}
            getRankLabel={getRankLabel}
            getRankState={getRankState}
            onHoverRank={loadRankInfo}
          />
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/70">
        <h3 className="mb-4 text-xl font-semibold text-gray-800">Match Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
          <div>
            <p className="text-2xl font-bold text-emerald-700">
              {playerMatches.filter((match) => match.win).length}
            </p>
            <p className="text-sm text-gray-600">Wins</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-700">
              {playerMatches.filter((match) => !match.win).length}
            </p>
            <p className="text-sm text-gray-600">Losses</p>
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
            <p className="text-sm text-gray-600">Win Rate</p>
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
            <p className="text-sm text-gray-600">Avg Damage</p>
          </div>
        </div>
      </div>
    </div>
  );
}
