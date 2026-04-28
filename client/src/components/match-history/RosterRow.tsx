"use client";

import React from "react";
import { getChampionImageUrl, getChampionInfo } from "@/data/champions";
import IconBox from "./IconBox";
import { RankHoverHandler, RankLookupState, TeamRosterEntry } from "./types";

interface RosterRowProps {
  onHoverRank: RankHoverHandler;
  participant: TeamRosterEntry;
  rankLabel: string;
  rankState?: RankLookupState;
}

export default function RosterRow({
  onHoverRank,
  participant,
  rankLabel,
  rankState,
}: RosterRowProps) {
  const championInfo = getChampionInfo(participant.championId);

  return (
    <div
      className={`rounded-xl border px-2 py-2 ${
        participant.isPlayer
          ? "border-blue-200 bg-blue-50/80"
          : "border-slate-200 bg-slate-50/80"
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
          <button
            type="button"
            className="group/tooltip relative max-w-full text-left"
            onMouseEnter={() => onHoverRank(participant)}
            onFocus={() => onHoverRank(participant)}
          >
            <span className="inline-flex max-w-full items-center gap-1">
              <span className="truncate text-sm font-medium text-slate-800">
                {participant.gameName}
              </span>
              {participant.isPlayer ? (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                  You
                </span>
              ) : null}
            </span>
            <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover/tooltip:block group-focus/tooltip:block">
              {rankState?.status === "loading" ? "Loading rank..." : rankLabel}
            </span>
          </button>
          <p className="truncate text-xs text-slate-500">{championInfo.name}</p>
        </div>
      </div>
    </div>
  );
}