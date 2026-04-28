"use client";

import React from "react";
import {
  getChampionImageUrl,
  getChampionInfo,
  getSummonerSpellImageUrl,
  getSummonerSpellInfo,
} from "@/data/champions";
import IconBox from "./IconBox";
import InventoryRow from "./InventoryRow";
import RosterRow from "./RosterRow";
import {
  ParticipantRankLabelGetter,
  ParticipantRankStateGetter,
  PlayerMatchCard,
  RankHoverHandler,
} from "./types";
import { formatDuration, formatKDA, formatTimeAgo } from "./utils";

interface MatchCardProps {
  getRankLabel: ParticipantRankLabelGetter;
  getRankState: ParticipantRankStateGetter;
  match: PlayerMatchCard;
  onHoverRank: RankHoverHandler;
}

export default function MatchCard({
  getRankLabel,
  getRankState,
  match,
  onHoverRank,
}: MatchCardProps) {
  const championInfo = getChampionInfo(match.championId);
  const spellOne = getSummonerSpellInfo(match.spellIds[0]);
  const spellTwo = getSummonerSpellInfo(match.spellIds[1]);

  return (
    <div
      data-testid={`match-card-${match.matchId}`}
      className={`overflow-hidden rounded-2xl border bg-white shadow-md shadow-slate-200/70 ${
        match.win ? "border-emerald-100" : "border-rose-100"
      }`}
    >
      <div
        className={`h-1.5 w-full ${
          match.win ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              match.win
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {match.win ? "Victory" : "Defeat"}
          </span>
          <div className="space-y-1 text-sm text-slate-600">
            <p className="font-medium text-slate-800">{match.gameMode}</p>
            <p>{formatDuration(match.gameDuration)}</p>
            <p>{formatTimeAgo(match.gameDate)}</p>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="flex gap-3">
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
                <p className="text-lg font-semibold text-slate-800">
                  {match.champion}
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {match.kills}/{match.deaths}/{match.assists}
                  <span className="ml-2 text-slate-500">
                    {formatKDA(match.kills, match.deaths, match.assists)} KDA
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Damage
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {match.damage.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Gold
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {match.gold.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                CS
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {match.cs}{" "}
                <span className="text-slate-500">
                  ({match.csPerMinute.toFixed(1)}/m)
                </span>
              </p>
            </div>
          </div>

          <InventoryRow itemIds={match.itemIds} matchId={match.matchId} />
        </div>

        <div className="space-y-2 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Allies
            </h4>
            <span className="text-xs text-slate-400">Hover for rank</span>
          </div>
          <div className="space-y-2">
            {match.allies.map((participant) => (
              <RosterRow
                key={`${match.matchId}-${participant.puuid}`}
                participant={participant}
                rankLabel={getRankLabel(participant)}
                rankState={getRankState(participant)}
                onHoverRank={onHoverRank}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Enemies
            </h4>
            <span className="text-xs text-slate-400">Hover for rank</span>
          </div>
          <div className="space-y-2">
            {match.enemies.map((participant) => (
              <RosterRow
                key={`${match.matchId}-${participant.puuid}`}
                participant={participant}
                rankLabel={getRankLabel(participant)}
                rankState={getRankState(participant)}
                onHoverRank={onHoverRank}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}