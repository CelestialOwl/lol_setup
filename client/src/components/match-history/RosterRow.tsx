"use client";

import React from "react";
import { getChampionImageUrl, getChampionInfo } from "@/data/champions";
import IconBox from "./IconBox";
import { TeamRosterEntry } from "./types";

const ROLE_LABELS: Record<string, string> = {
  TOP: "TOP",
  JUNGLE: "JG",
  MIDDLE: "MID",
  BOTTOM: "BOT",
  UTILITY: "SUP",
};

const ROLE_COLORS: Record<string, string> = {
  TOP: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  JUNGLE: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  MIDDLE: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  BOTTOM: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  UTILITY: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
};

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
              {participant.tagLine && (
                <span className="text-slate-400 dark:text-slate-500">#{participant.tagLine}</span>
              )}
            </span>
            {participant.isPlayer ? (
              <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                You
              </span>
            ) : null}
            {participant.role && ROLE_LABELS[participant.role] ? (
              <span
                className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${ROLE_COLORS[participant.role] ?? "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}
              >
                {ROLE_LABELS[participant.role]}
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
