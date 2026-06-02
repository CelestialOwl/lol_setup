"use client";

import React, { useEffect, useRef, useState } from "react";

import {
  getChampionImageUrl,
  getChampionInfo,
  getRuneIconUrl,
  getRunePathIconUrl,
  getSummonerSpellImageUrl,
  getSummonerSpellInfo,
  RUNE_PATHS,
  RUNES,
} from "@/data/champions";
import { CurrentGameParticipant, LeagueEntry, LiveGameData, Match } from "@/types/riot-api";

// ─── Static lookup tables ─────────────────────────────────────────────────────

const MAP_NAMES: Record<number, string> = {
  11: "Summoner's Rift",
  12: "Howling Abyss",
  14: "Butcher's Bridge",
  21: "Nexus Blitz",
  22: "TFT",
  30: "Convergence",
};

const QUEUE_MODES: Record<number, string> = {
  400: "Normal Draft",
  420: "Ranked Solo/Duo",
  440: "Ranked Flex",
  450: "ARAM",
  900: "URF",
  1020: "One For All",
  1300: "Nexus Blitz",
  1400: "Ultimate Spellbook",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Lazy-loads the last 5 champions a participant played (W/L coloured border). */
function ParticipantRecentChampions({
  puuid,
  region,
}: {
  puuid: string;
  region: string;
}) {
  const [champs, setChamps] = useState<
    { championId: number; win: boolean }[] | null
  >(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/summoner/${puuid}/matches?region=${region}&limit=5`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { matches?: Match[] } | null) => {
        if (!data?.matches) return;
        const result = data.matches
          .map((m) => {
            const p = m.info.participants.find((par) => par.puuid === puuid);
            return p ? { championId: p.championId, win: p.win } : null;
          })
          .filter(
            (x): x is { championId: number; win: boolean } => x !== null
          );
        setChamps(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [puuid, region]);

  if (!champs || champs.length === 0) return null;

  return (
    <div className="flex gap-0.5 shrink-0" title="Recent matches (green=W, red=L)">
      {champs.map((c, i) => {
        const info = getChampionInfo(c.championId);
        const img = getChampionImageUrl(info.key);
        return (
          <div
            key={i}
            className={`overflow-hidden rounded border-2 ${
              c.win
                ? "border-emerald-400 dark:border-emerald-500"
                : "border-rose-400 dark:border-rose-500"
            }`}
            title={info.name}
          >
            {img ? (
              <img
                src={img}
                alt={info.name}
                className="h-[22px] w-[22px] object-cover"
              />
            ) : (
              <div className="h-[22px] w-[22px] bg-slate-600 flex items-center justify-center text-[8px] font-bold text-white">
                {c.championId}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Vertical pair of summoner spell icons. */
function SpellPair({
  spell1Id,
  spell2Id,
}: {
  spell1Id: number;
  spell2Id: number;
}) {
  const renderSpell = (id: number) => {
    const info = getSummonerSpellInfo(id);
    const url = getSummonerSpellImageUrl(info.key);
    return url ? (
      <img
        src={url}
        alt={info.name}
        title={info.name}
        className="h-[22px] w-[22px] rounded object-cover"
      />
    ) : (
      <div
        className="h-[22px] w-[22px] rounded bg-slate-600 flex items-center justify-center text-[9px] text-white font-bold"
        title={info.name}
      >
        {id}
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      {renderSpell(spell1Id)}
      {renderSpell(spell2Id)}
    </div>
  );
}

/** Keystone + secondary path icons. Click to expand the full rune page. */
function RuneIcons({
  perkStyle,
  perkSubStyle,
  perkIds,
}: {
  perkStyle: number;
  perkSubStyle: number;
  perkIds: number[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  const keystoneUrl = perkIds[0] ? getRuneIconUrl(perkIds[0]) : null;
  const primaryUrl = getRunePathIconUrl(perkStyle);
  const subUrl = getRunePathIconUrl(perkSubStyle);
  const primaryPath = RUNE_PATHS[perkStyle];
  const subPath = RUNE_PATHS[perkSubStyle];

  const renderRuneIcon = (id: number, size: number, ring = false) => {
    const url = getRuneIconUrl(id);
    const info = RUNES[id];
    const title = info?.name ?? `Rune ${id}`;
    const sz = `${size}px`;
    if (url) {
      return (
        <img
          key={id}
          src={url}
          alt={title}
          title={title}
          style={{ width: sz, height: sz }}
          className={`object-contain rounded ${ring ? "ring-1 ring-slate-500/40" : ""}`}
        />
      );
    }
    return (
      <div
        key={id}
        title={title}
        style={{ width: sz, height: sz }}
        className="rounded-full bg-slate-700/70 flex items-center justify-center text-[8px] text-slate-400 shrink-0"
      >
        {id}
      </div>
    );
  };

  const renderPathHeader = (pathId: number, url: string | null, name: string) => (
    <div className="flex items-center gap-1.5 mb-1">
      {url ? (
        <img src={url} alt={name} className="h-4 w-4 object-contain" />
      ) : (
        <div className="h-4 w-4 rounded-full bg-slate-600" />
      )}
      <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
        {name}
      </span>
    </div>
  );

  return (
    <div ref={ref} className="relative flex items-center gap-0.5 shrink-0">
      {/* Collapsed trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Click to see full rune page"
        className="flex items-center gap-0.5 cursor-pointer focus:outline-none"
      >
        {keystoneUrl || primaryUrl ? (
          <img
            src={(keystoneUrl ?? primaryUrl)!}
            alt="Keystone"
            title="Keystone"
            className="h-7 w-7 object-contain rounded"
          />
        ) : (
          <div className="h-7 w-7 rounded bg-slate-700" />
        )}
        {subUrl ? (
          <img
            src={subUrl}
            alt="Secondary path"
            title="Secondary path"
            className="h-[18px] w-[18px] object-contain opacity-80"
          />
        ) : (
          <div className="h-[18px] w-[18px]" />
        )}
      </button>

      {/* Expanded popup */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[200px] rounded-xl bg-slate-800 border border-slate-700 shadow-xl p-3 text-xs space-y-3">
          {/* Primary tree */}
          <div>
            {renderPathHeader(perkStyle, primaryUrl, primaryPath?.name ?? `Style ${perkStyle}`)}
            <div className="flex gap-1.5 flex-wrap">
              {perkIds.slice(0, 4).map((id) => renderRuneIcon(id, 26, true))}
            </div>
          </div>

          {/* Secondary tree */}
          {perkSubStyle !== 0 && (
            <div>
              {renderPathHeader(perkSubStyle, subUrl, subPath?.name ?? `Style ${perkSubStyle}`)}
              <div className="flex gap-1.5">
                {perkIds.slice(4, 6).map((id) => renderRuneIcon(id, 22, true))}
              </div>
            </div>
          )}

          {/* Stat shards */}
          {perkIds.length > 6 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Stats
              </p>
              <div className="flex gap-1.5">
                {perkIds.slice(6, 9).map((id) => renderRuneIcon(id, 18, false))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Fetches and shows a participant's current rank (solo/duo). */
function ParticipantRankBadge({
  puuid,
  region,
}: {
  puuid: string;
  region: string;
}) {
  const [rank, setRank] = useState<LeagueEntry | null | "loading">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/summoner/${puuid}/rank?region=${region}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: LeagueEntry[] | null) => {
        const solo = data?.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
        setRank(solo);
      })
      .catch(() => setRank(null));
    return () => controller.abort();
  }, [puuid, region]);

  if (rank === "loading") {
    return (
      <div className="h-4 w-14 rounded bg-slate-700 animate-pulse shrink-0" />
    );
  }

  if (!rank) {
    return (
      <span className="text-[10px] text-slate-500 dark:text-slate-500 shrink-0">
        Unranked
      </span>
    );
  }

  const tierIcon = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${rank.tier.toLowerCase()}.svg`;

  // Tier abbreviations — no division shown for Master+
  const TIER_ABBR: Record<string, string> = {
    IRON: "I", BRONZE: "B", SILVER: "S", GOLD: "G",
    PLATINUM: "P", EMERALD: "E", DIAMOND: "D",
    MASTER: "M", GRANDMASTER: "GM", CHALLENGER: "C",
  };
  const NO_DIVISION = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);
  const shortTier = TIER_ABBR[rank.tier] ?? rank.tier.charAt(0);
  const division = NO_DIVISION.has(rank.tier) ? "" : rank.rank;
  const displayText = `${shortTier}${division} ${rank.leaguePoints}LP`;
  const label = `${rank.tier} ${division} ${rank.leaguePoints} LP`;

  return (
    <div className="flex items-center gap-0.5 shrink-0" title={label}>
      <img
        src={tierIcon}
        alt={rank.tier}
        className="h-4 w-4 object-contain"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
        {displayText}
      </span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LiveGameProps {
  liveGameData: LiveGameData;
}

export default function LiveGame({ liveGameData }: LiveGameProps) {
  const { gameInfo, playerTeam, enemyTeam, searchedPlayer } = liveGameData;

  const playerTeamId = playerTeam[0]?.teamId ?? 100;
  const playerSideIsBlue = playerTeamId === 100;
  const playerSide = playerSideIsBlue ? "Blue Side" : "Red Side";
  const enemySide = playerSideIsBlue ? "Red Side" : "Blue Side";

  const region = gameInfo.platformId.toLowerCase();
  const mapName = MAP_NAMES[gameInfo.mapId] ?? `Map ${gameInfo.mapId}`;
  const gameMode =
    QUEUE_MODES[gameInfo.gameQueueConfigId] ??
    `Queue ${gameInfo.gameQueueConfigId}`;

  const blueBans = (gameInfo.bannedChampions ?? []).filter(
    (b) => b.teamId === 100 && b.championId !== -1
  );
  const redBans = (gameInfo.bannedChampions ?? []).filter(
    (b) => b.teamId === 200 && b.championId !== -1
  );

  const renderParticipant = (participant: CurrentGameParticipant) => {
    const isSearched = participant.puuid === searchedPlayer.puuid;
    const hasSmite =
      participant.spell1Id === 11 || participant.spell2Id === 11;
    const champInfo = getChampionInfo(participant.championId);
    const champImg = getChampionImageUrl(champInfo.key);

    return (
      <div
        key={participant.puuid}
        className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
          isSearched
            ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700"
            : "hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
      >
        {/* Champion icon */}
        <div className="shrink-0">
          {champImg ? (
            <img
              src={champImg}
              alt={champInfo.name}
              title={champInfo.name}
              className="h-11 w-11 rounded-md object-cover"
            />
          ) : (
            <div className="h-11 w-11 rounded-md bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
              {participant.championId}
            </div>
          )}
        </div>

        {/* Summoner spells */}
        <SpellPair spell1Id={participant.spell1Id} spell2Id={participant.spell2Id} />

        {/* Runes — only rendered if perks data is available */}
        {participant.perks && (
          <RuneIcons
            perkStyle={participant.perks.perkStyle}
            perkSubStyle={participant.perks.perkSubStyle}
            perkIds={participant.perks.perkIds ?? []}
          />
        )}

        {/* Name + badges */}
        <div className="min-w-0 flex-1 flex flex-col justify-center overflow-hidden">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span
              className="truncate text-sm font-medium text-slate-800 dark:text-slate-100"
              title={participant.riotId ?? participant.summonerName}
            >
              {/* Prefer riotId ("Name#TAG") — split to style the tag dimly */}
              {participant.riotId ? (
                <>
                  {participant.riotId.split("#")[0]}
                  <span className="text-slate-400 dark:text-slate-500">
                    #{participant.riotId.split("#")[1]}
                  </span>
                </>
              ) : (
                participant.summonerName
              )}
            </span>
            {isSearched && (
              <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                YOU
              </span>
            )}
            {hasSmite && (
              <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                JG
              </span>
            )}
          </div>
          <ParticipantRankBadge puuid={participant.puuid} region={region} />
        </div>

        {/* Recent champion history — lazy-loaded from DB */}
        <ParticipantRecentChampions puuid={participant.puuid} region={region} />
      </div>
    );
  };

  const renderBanSection = (
    bans: typeof blueBans,
    side: string,
    isBlue: boolean
  ) => {
    if (bans.length === 0) return null;
    return (
      <div>
        <h4
          className={`text-sm font-semibold mb-2 ${
            isBlue
              ? "text-blue-600 dark:text-blue-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {side} Bans
        </h4>
        <div className="flex flex-wrap gap-2">
          {bans.map((ban, i) => {
            const info = getChampionInfo(ban.championId);
            const img = getChampionImageUrl(info.key);
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                {img ? (
                  <img
                    src={img}
                    alt={info.name}
                    title={`Banned: ${info.name}`}
                    className={`h-10 w-10 rounded border-2 opacity-60 ${
                      isBlue
                        ? "border-blue-300 dark:border-blue-600"
                        : "border-red-300 dark:border-red-600"
                    }`}
                  />
                ) : (
                  <div
                    className={`h-10 w-10 rounded border-2 bg-slate-600 flex items-center justify-center text-[9px] text-white ${
                      isBlue
                        ? "border-blue-300 dark:border-blue-600"
                        : "border-red-300 dark:border-red-600"
                    }`}
                    title={info.name}
                  >
                    {ban.championId}
                  </div>
                )}
                <span className="text-[9px] text-slate-500 dark:text-slate-400 w-10 text-center truncate">
                  {info.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md px-6 py-5">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Live — {searchedPlayer.summonerName}
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Mode</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {gameMode}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Duration</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {formatDuration(gameInfo.gameLength)}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Map</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {mapName}
            </p>
          </div>
        </div>
      </div>

      {/* ── Teams ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Player team */}
        <div
          className={`bg-white dark:bg-slate-900 rounded-xl shadow-md p-4 border-l-4 ${
            playerSideIsBlue ? "border-blue-500" : "border-red-500"
          }`}
        >
          <h3
            className={`text-base font-semibold mb-3 ${
              playerSideIsBlue
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {playerSide} · Your Team
          </h3>
          <div className="space-y-1">{playerTeam.map(renderParticipant)}</div>
        </div>

        {/* Enemy team */}
        <div
          className={`bg-white dark:bg-slate-900 rounded-xl shadow-md p-4 border-l-4 ${
            playerSideIsBlue ? "border-red-500" : "border-blue-500"
          }`}
        >
          <h3
            className={`text-base font-semibold mb-3 ${
              playerSideIsBlue
                ? "text-red-600 dark:text-red-400"
                : "text-blue-600 dark:text-blue-400"
            }`}
          >
            {enemySide} · Enemy Team
          </h3>
          <div className="space-y-1">{enemyTeam.map(renderParticipant)}</div>
        </div>
      </div>

      {/* ── Bans ── */}
      {(blueBans.length > 0 || redBans.length > 0) && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-4">
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Banned Champions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {renderBanSection(blueBans, "Blue Side", true)}
            {renderBanSection(redBans, "Red Side", false)}
          </div>
        </div>
      )}
    </div>
  );
}

export function NoActiveGame({ playerName }: { playerName: string }) {
  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29.82-5.877 2.172M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.875a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z"
            />
          </svg>
        </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-2">
          No Active Game
        </h3>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          <span className="font-medium">{playerName}</span> is currently not in
          a match.
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Try again when the player joins a game or check their match history
          instead.
        </p>
      </div>
    </div>
  );
}
