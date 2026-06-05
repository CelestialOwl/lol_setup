"use client";

import React from "react";
import { getChampionImageUrl, getChampionInfo } from "@/data/champions";
import { PlayerMatchCard } from "@/components/match-history/types";
import { formatTimeAgo } from "@/components/match-history/utils";

interface CompactMatchRowProps {
  match: PlayerMatchCard;
}

function formatDamage(dmg: number): string {
  if (dmg >= 1000) return `${(dmg / 1000).toFixed(1)}k`;
  return String(dmg);
}

export default function CompactMatchRow({ match }: CompactMatchRowProps) {
  const championInfo = getChampionInfo(match.championId ?? 0);
  const imgUrl = getChampionImageUrl(championInfo.key);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
        match.win
          ? "border-l-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
          : "border-l-2 border-rose-500 bg-rose-50 dark:bg-rose-900/10"
      }`}
    >
      {/* Champion icon */}
      <div className="relative flex-shrink-0">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={championInfo.name}
            title={championInfo.name}
            className="h-7 w-7 rounded-md"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-300 dark:bg-slate-700 text-[10px] font-bold">
            {match.championId ?? "?"}
          </div>
        )}
      </div>

      {/* W/L badge */}
      <span
        className={`w-4 flex-shrink-0 font-bold ${
          match.win ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {match.win ? "W" : "L"}
      </span>

      {/* KDA */}
      <span className="flex-shrink-0 font-mono text-slate-700 dark:text-slate-300">
        {match.kills}/{match.deaths}/{match.assists}
      </span>

      {/* Damage — push to right with flex-1 spacer */}
      <span className="flex-1 text-right text-slate-500 dark:text-slate-400">
        {formatDamage(match.damage)}
      </span>

      {/* Time ago */}
      <span className="flex-shrink-0 text-slate-400 dark:text-slate-500">
        {formatTimeAgo(match.gameDate)}
      </span>
    </div>
  );
}
