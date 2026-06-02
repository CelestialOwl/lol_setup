"use client";

import React from "react";
import {
  getChampionImageUrl,
  getChampionInfo,
  getSummonerSpellImageUrl,
  getSummonerSpellInfo,
} from "@/data/champions";

const CDN = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/position-selector/positions";

const ROLE_ICONS: Record<string, { label: string; url: string }> = {
  TOP:     { label: "Top",     url: `${CDN}/icon-position-top.png`     },
  JUNGLE:  { label: "Jungle",  url: `${CDN}/icon-position-jungle.png`  },
  MIDDLE:  { label: "Mid",     url: `${CDN}/icon-position-middle.png`  },
  BOTTOM:  { label: "Bot",     url: `${CDN}/icon-position-bottom.png`  },
  UTILITY: { label: "Support", url: `${CDN}/icon-position-support.png` },
};
import IconBox from "./IconBox";
import InventoryRow from "./InventoryRow";
import RosterRow from "./RosterRow";
import {
  ParticipantRankLabelGetter,
  PlayerMatchCard,
} from "./types";
import { formatDuration, formatKDA, formatTimeAgo } from "./utils";

interface MatchCardProps {
  getRankLabel: ParticipantRankLabelGetter;
  match: PlayerMatchCard;
}

export default function MatchCard({
  getRankLabel,
  match,
}: MatchCardProps) {
  const championInfo = getChampionInfo(match.championId);
  const spellOne = getSummonerSpellInfo(match.spellIds[0]);
  const spellTwo = getSummonerSpellInfo(match.spellIds[1]);

  return (
    <div
      data-testid={`match-card-${match.matchId}`}
      className={`overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 shadow-md shadow-slate-200/70 dark:shadow-black/30 ${
        match.win ? "border-emerald-100 dark:border-emerald-900/50" : "border-rose-100 dark:border-rose-900/50"
      }`}
    >
      <div
        className={`h-1.5 w-full ${
          match.win ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-12">
        <div className="space-y-2 lg:col-span-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              match.win
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300"
            }`}
          >
            {match.win ? "Victory" : "Defeat"}
          </span>
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-800 dark:text-slate-100">{match.gameMode}</p>
            <p>{formatDuration(match.gameDuration)}</p>
            <p>{formatTimeAgo(match.gameDate)}</p>
          </div>
        </div>

        <div className="space-y-3 lg:col-span-4">
          <div className="flex gap-2">
            <IconBox
              src={getChampionImageUrl(championInfo.key)}
              alt={championInfo.name}
              fallback={match.championId}
              className="h-16 w-16 rounded-xl"
              title={championInfo.name}
            />
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                <IconBox
                  src={getSummonerSpellImageUrl(spellOne.key)}
                  alt={spellOne.name}
                  fallback={match.spellIds[0]}
                  className="h-7 w-7 rounded-md"
                  title={spellOne.name}
                />
                <IconBox
                  src={getSummonerSpellImageUrl(spellTwo.key)}
                  alt={spellTwo.name}
                  fallback={match.spellIds[1]}
                  className="h-7 w-7 rounded-md"
                  title={spellTwo.name}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    {match.champion}
                  </p>
                  {match.role && ROLE_ICONS[match.role] && (
                    <img
                      src={ROLE_ICONS[match.role].url}
                      alt={ROLE_ICONS[match.role].label}
                      title={ROLE_ICONS[match.role].label}
                      className="h-5 w-5 object-contain opacity-75"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {match.kills}/{match.deaths}/{match.assists}
                  <span className="ml-2 text-slate-500 dark:text-slate-400">
                    {formatKDA(match.kills, match.deaths, match.assists)} KDA
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Damage
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {match.damage.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Gold
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {match.gold.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                CS
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {match.cs}{" "}
                <span className="text-slate-500 dark:text-slate-400">
                  ({match.csPerMinute.toFixed(1)}/m)
                </span>
              </p>
            </div>
          </div>

          <InventoryRow itemIds={match.itemIds} matchId={match.matchId} />
        </div>

        <div className="space-y-2 lg:col-span-3">
          <div className="space-y-2">
            {match.allies.map((participant) => (
              <RosterRow
                key={`${match.matchId}-${participant.puuid}`}
                participant={participant}
                rankLabel={getRankLabel(participant)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2 lg:col-span-3">
          <div className="space-y-2">
            {match.enemies.map((participant) => (
              <RosterRow
                key={`${match.matchId}-${participant.puuid}`}
                participant={participant}
                rankLabel={getRankLabel(participant)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}