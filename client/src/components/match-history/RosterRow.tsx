"use client";

import React from "react";
import { getChampionImageUrl, getChampionInfo } from "@/data/champions";
import IconBox from "./IconBox";
import { TeamRosterEntry } from "./types";

interface RosterRowProps {
  participant: TeamRosterEntry;
  rankLabel: string;
}

export default function RosterRow({
  participant,
  rankLabel,
}: RosterRowProps) {
  const championInfo = getChampionInfo(participant.championId);

  return (
    <div
      className={`rounded-xl border px-2 py-2 ${
        participant.isPlayer
          ? "border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/20"
          : "border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50"
      }`}
    >
      <div className="flex items-center gap-2">
        <IconBox
          src={getChampionImageUrl(championInfo.key)}
          alt={championInfo.name}
          fallback={participant.championId}
          className="h-8 w-8 shrink-0 rounded-md"
          title={championInfo.name}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {participant.gameName}
            </span>
            {participant.isPlayer ? (
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                You
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {rankLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
