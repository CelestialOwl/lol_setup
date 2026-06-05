"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface TrackedPlayer {
  gameName: string;
  tagLine: string;
  region: string;
  /** Resolved after the player is added via /api/summoner */
  puuid?: string;
  profileIconId?: number;
  summonerLevel?: number;
}

const LS_KEY = "lol-tracker-players";
const MAX_PLAYERS = 5;

function encodePlayers(players: TrackedPlayer[]): string[] {
  return players.map(
    (p) => `${encodeURIComponent(p.gameName)}#${encodeURIComponent(p.tagLine)}:${p.region}${p.puuid ? `:${p.puuid}` : ""}`
  );
}

function decodePlayers(params: string[]): TrackedPlayer[] {
  return params.flatMap((raw) => {
    // format: gameName%23tagLine:region[:puuid]
    const colonIdx = raw.indexOf(":");
    if (colonIdx === -1) return [];
    const nameTag = decodeURIComponent(raw.slice(0, colonIdx));
    const rest = raw.slice(colonIdx + 1);

    const hashIdx = nameTag.indexOf("#");
    if (hashIdx === -1) return [];

    const gameName = nameTag.slice(0, hashIdx);
    const tagLine = nameTag.slice(hashIdx + 1);

    const restParts = rest.split(":");
    const region = restParts[0];
    const puuid = restParts[1] ?? undefined;

    if (!gameName || !tagLine || !region) return [];
    return [{ gameName, tagLine, region, puuid }];
  });
}

function loadFromStorage(): TrackedPlayer[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TrackedPlayer[];
  } catch {
    return [];
  }
}

function saveToStorage(players: TrackedPlayer[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(players));
  } catch {
    // storage quota exceeded — ignore
  }
}

export function useTrackedPlayers() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [players, setPlayersState] = useState<TrackedPlayer[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // On mount: prefer URL params, fall back to localStorage.
  useEffect(() => {
    const urlPlayers = decodePlayers(searchParams.getAll("p"));
    const stored = loadFromStorage();
    const initial = urlPlayers.length > 0 ? urlPlayers : stored;
    setPlayersState(initial.slice(0, MAX_PLAYERS));
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to localStorage + URL whenever players change (after hydration).
  const syncPlayers = useCallback(
    (next: TrackedPlayer[]) => {
      setPlayersState(next);
      saveToStorage(next);

      const params = new URLSearchParams();
      encodePlayers(next).forEach((v) => params.append("p", v));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router]
  );

  const addPlayer = useCallback(
    (player: TrackedPlayer) => {
      setPlayersState((prev) => {
        if (prev.length >= MAX_PLAYERS) return prev;
        const already = prev.some(
          (p) =>
            p.gameName.toLowerCase() === player.gameName.toLowerCase() &&
            p.tagLine.toLowerCase() === player.tagLine.toLowerCase() &&
            p.region === player.region
        );
        if (already) return prev;
        const next = [...prev, player];
        saveToStorage(next);
        const params = new URLSearchParams();
        encodePlayers(next).forEach((v) => params.append("p", v));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        return next;
      });
    },
    [pathname, router]
  );

  const removePlayer = useCallback(
    (index: number) => {
      setPlayersState((prev) => {
        const next = prev.filter((_, i) => i !== index);
        syncPlayers(next);
        return next;
      });
    },
    [syncPlayers]
  );

  const updatePlayer = useCallback(
    (index: number, patch: Partial<TrackedPlayer>) => {
      setPlayersState((prev) => {
        const next = prev.map((p, i) => (i === index ? { ...p, ...patch } : p));
        saveToStorage(next);
        const params = new URLSearchParams();
        encodePlayers(next).forEach((v) => params.append("p", v));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        return next;
      });
    },
    [pathname, router]
  );

  return {
    players,
    hydrated,
    canAdd: players.length < MAX_PLAYERS,
    addPlayer,
    removePlayer,
    updatePlayer,
  };
}
