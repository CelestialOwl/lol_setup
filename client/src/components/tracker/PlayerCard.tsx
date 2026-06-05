'use client';

import React, { useCallback, useEffect, useState } from 'react';
import CompactMatchRow from './CompactMatchRow';
import LiveGameModal from './LiveGameModal';
import { LeagueEntry, LiveGameData, Match, SummonerProfile } from '@/types/riot-api';
import { PlayerMatchCard } from '@/components/match-history/types';
import { TrackedPlayer } from '@/hooks/useTrackedPlayers';
import { buildPlayerMatches } from '@/components/match-history/utils';

const MAX_ROWS = 5;

interface PlayerCardProps {
  player: TrackedPlayer;
  liveGame: LiveGameData | null;
  onResolvePuuid: (puuid: string, profileIconId: number, summonerLevel: number) => void;
  onRemove: () => void;
}

function getProfileIconUrl(profileIconId: number) {
  return `/dragontail/16.11.1/img/profileicon/${profileIconId}.png`;
}

function getRankIconUrl(tier: string) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}.svg`;
}

function formatLpDelta(delta: number): React.ReactNode {
  if (delta === 0) return null;
  const sign = delta > 0 ? '+' : '';
  const color = delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const arrow = delta > 0 ? '↑' : '↓';
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {sign}
      {delta} LP {arrow}
    </span>
  );
}

function formatRank(entry: LeagueEntry): string {
  return `${entry.tier.charAt(0) + entry.tier.slice(1).toLowerCase()} ${entry.rank} · ${entry.leaguePoints} LP`;
}

function GameTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startTime) / 1000));

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span>
      {m}:{String(s).padStart(2, '0')}
    </span>
  );
}

export default function PlayerCard({ player, liveGame, onResolvePuuid, onRemove }: PlayerCardProps) {
  const [profile, setProfile] = useState<SummonerProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rank, setRank] = useState<LeagueEntry | null>(null);
  const [lpDelta, setLpDelta] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        gameName: player.gameName,
        tagLine: player.tagLine,
        region: player.region,
      });

      // 1. Profile
      const profileRes = await fetch(`/api/summoner?${params}`);
      const profileJson = (await profileRes.json()) as SummonerProfile & { error?: string };
      if (!profileRes.ok) throw new Error(profileJson.error ?? 'Failed to load profile');
      setProfile(profileJson);
      onResolvePuuid(profileJson.account.puuid, profileJson.summoner.profileIconId, profileJson.summoner.summonerLevel);

      const puuid = profileJson.account.puuid;

      // 2. Matches (last 5 only)
      const matchParams = new URLSearchParams({ region: player.region, limit: '5' });
      const matchRes = await fetch(`/api/summoner/${puuid}/matches?${matchParams}`);
      if (!matchRes.ok) {
        const errJson = (await matchRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error ?? 'Failed to load match history');
      }
      const matchJson = (await matchRes.json()) as { matches?: Match[]; error?: string };
      setMatches(matchJson.matches ?? []);

      // 3. Rank (soft failure — card still renders without rank)
      try {
        const rankParams = new URLSearchParams({ gameName: player.gameName });
        const rankRes = await fetch(`/api/summoner/${puuid}/rank?${rankParams}`);
        if (rankRes.ok) {
          const rankJson = (await rankRes.json()) as LeagueEntry[];
          if (Array.isArray(rankJson)) {
            const solo = rankJson.find((e) => e.queueType === 'RANKED_SOLO_5x5') ?? null;
            setRank(solo);

            // 4. LP delta from rank history (soft failure)
            try {
              const historyRes = await fetch(`/api/summoner/${puuid}/rank/history`);
              if (historyRes.ok && solo) {
                const historyJson = (await historyRes.json()) as Array<{ leaguePoints: number; queueType: string }>;
                if (Array.isArray(historyJson)) {
                  const soloHistory = historyJson.filter((h) => h.queueType === 'RANKED_SOLO_5x5');
                  if (soloHistory.length >= 2) {
                    setLpDelta(soloHistory[0].leaguePoints - soloHistory[1].leaguePoints);
                  }
                }
              }
            } catch {
              // LP delta is cosmetic — ignore errors
            }
          }
        }
      } catch {
        // Rank is cosmetic — ignore errors
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [player.gameName, player.tagLine, player.region]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const playerMatches: PlayerMatchCard[] = profile
    ? buildPlayerMatches({
        account: profile.account,
        summoner: profile.summoner,
        matchHistory: matches.map((m) => m.metadata.matchId),
        matches,
      }).slice(0, MAX_ROWS)
    : [];

  const inGame = !!liveGame;
  const gameStartMs = liveGame ? liveGame.gameInfo.gameStartTime : 0;
  const playerName = `${player.gameName}#${player.tagLine}`;

  return (
    <>
      <div className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/70 dark:shadow-black/30 border border-slate-200 dark:border-slate-700 overflow-hidden h-full">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
          {profile?.summoner.profileIconId ? (
            <div className="relative flex-shrink-0">
              <img
                src={getProfileIconUrl(profile.summoner.profileIconId)}
                alt="icon"
                className="h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-700"
              />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 dark:bg-slate-600 px-1 text-[9px] font-bold text-white leading-tight">
                {profile.summoner.summonerLevel}
              </span>
            </div>
          ) : (
            <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {player.gameName}
              <span className="font-normal text-slate-400 dark:text-slate-500">#{player.tagLine}</span>
            </p>
            <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 tracking-wide">{player.region}</p>
          </div>
          <button
            onClick={onRemove}
            className="flex-shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-500 transition-colors"
            aria-label="Remove player"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Rank row */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 min-h-[32px]">
          {rank ? (
            <>
              <img src={getRankIconUrl(rank.tier)} alt={rank.tier} className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                {formatRank(rank)}
              </span>
              {formatLpDelta(lpDelta)}
            </>
          ) : loading ? (
            <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ) : (
            <span className="text-xs text-slate-400">Unranked</span>
          )}
        </div>

        {/* Live game banner */}
        {inGame && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 transition-colors px-3 py-1.5 text-white text-xs font-semibold"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-200" />
            </span>
            LIVE
            <span className="font-mono">
              <GameTimer startTime={gameStartMs} />
            </span>
            <span className="ml-1 opacity-70">↗</span>
          </button>
        )}

        {/* Match rows */}
        <div className="flex flex-col gap-1 px-2 py-2 flex-1">
          {loading ? (
            Array.from({ length: MAX_ROWS }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))
          ) : error ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 py-4 text-center">
              <p className="text-xs text-rose-500">{error}</p>
              <button onClick={fetchData} className="text-xs text-blue-500 hover:underline">
                Retry
              </button>
            </div>
          ) : playerMatches.length > 0 ? (
            playerMatches.map((match) => <CompactMatchRow key={match.matchId} match={match} />)
          ) : (
            <p className="py-4 text-center text-xs text-slate-400">No recent matches</p>
          )}
        </div>

        {/* Win/Loss footer */}
        {!loading && !error && playerMatches.length > 0 && (
          <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800 px-3 py-1.5 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {playerMatches.filter((m) => m.win).length}W
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {playerMatches.filter((m) => !m.win).length}L
            </span>
            {rank && (
              <span className="ml-auto text-slate-400">
                {((rank.wins / (rank.wins + rank.losses)) * 100).toFixed(0)}% WR
              </span>
            )}
          </div>
        )}
      </div>

      {showModal && liveGame && (
        <LiveGameModal playerName={playerName} liveGameData={liveGame} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
