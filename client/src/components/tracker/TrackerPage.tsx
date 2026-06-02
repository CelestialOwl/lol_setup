"use client";

import React, { useState } from "react";
import AddPlayerDrawer from "./AddPlayerDrawer";
import PlayerCard from "./PlayerCard";
import { useTrackedPlayers } from "@/hooks/useTrackedPlayers";
import { useTrackerWebSocket } from "@/hooks/useTrackerWebSocket";

const MAX_PLAYERS = 5;

export default function TrackerPage() {
  const { players, hydrated, canAdd, addPlayer, removePlayer, updatePlayer } =
    useTrackedPlayers();
  const { liveGames } = useTrackerWebSocket(players);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = async (gameName: string, tagLine: string, region: string) => {
    setAddError(null);
    try {
      const params = new URLSearchParams({ gameName, tagLine, region });
      const res = await fetch(`/api/summoner?${params}`);
      const data = await res.json() as {
        account?: { puuid: string };
        summoner?: { profileIconId: number; summonerLevel: number };
        error?: string;
      };

      if (!res.ok) {
        setAddError(data.error ?? "Player not found");
        return;
      }

      addPlayer({
        gameName,
        tagLine,
        region,
        puuid: data.account?.puuid,
        profileIconId: data.summoner?.profileIconId,
        summonerLevel: data.summoner?.summonerLevel,
      });
      setDrawerOpen(false);
    } catch {
      setAddError("Network error. Please try again.");
    }
  };

  // Empty slot cards shown to fill the remaining space up to MAX_PLAYERS
  const emptySlots = Math.max(0, MAX_PLAYERS - players.length);

  if (!hydrated) {
    // Skeleton on first render to avoid hydration mismatch
    return (
      <div className="flex gap-4 mt-6">
        {Array.from({ length: MAX_PLAYERS }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Tracker</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track up to 5 players • Live game auto-detected
          </p>
        </div>
        <button
          onClick={() => {
            setAddError(null);
            setDrawerOpen(true);
          }}
          disabled={!canAdd}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Player
          {!canAdd && <span className="text-xs opacity-70">(max {MAX_PLAYERS})</span>}
        </button>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {players.map((player, index) => (
          <PlayerCard
            key={`${player.gameName}-${player.tagLine}-${player.region}`}
            player={player}
            liveGame={player.puuid ? (liveGames[player.puuid] ?? null) : null}
            onResolvePuuid={(puuid, profileIconId, summonerLevel) =>
              updatePlayer(index, { puuid, profileIconId, summonerLevel })
            }
            onRemove={() => removePlayer(index)}
          />
        ))}

        {/* Empty slot prompts */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <button
            key={`empty-${i}`}
            onClick={() => {
              setAddError(null);
              setDrawerOpen(true);
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600 hover:border-blue-400 dark:hover:border-blue-700 hover:text-blue-500 dark:hover:text-blue-500 transition-colors min-h-[320px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">Add player</span>
          </button>
        ))}
      </div>

      {/* Add player drawer */}
      {drawerOpen && (
        <AddPlayerDrawer
          onAdd={handleAdd}
          onClose={() => setDrawerOpen(false)}
          error={addError}
        />
      )}
    </div>
  );
}
