"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveGameData } from "@/types/riot-api";
import { TrackedPlayer } from "./useTrackedPlayers";

const WS_BACKEND_URL =
  process.env.NEXT_PUBLIC_WS_BACKEND_URL ?? "ws://localhost:8080";

interface TrackerWSMessage {
  type: "live_game_update";
  puuid: string;
  inGame: boolean;
  gameData?: LiveGameData;
}

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 2_000;

export function useTrackerWebSocket(players: TrackedPlayer[]) {
  const [liveGames, setLiveGames] = useState<Record<string, LiveGameData | null>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const activePlayersKey = players
    .filter((p) => p.puuid)
    .map((p) => `${p.puuid}:${p.region}`)
    .join(",");

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const connect = useCallback(
    (playerEntries: { puuid: string; region: string }[]) => {
      if (playerEntries.length === 0) return;

      clearReconnectTimer();
      wsRef.current?.close();

      const params = new URLSearchParams();
      playerEntries.forEach(({ puuid, region }) =>
        params.append("p", `${puuid}:${region}`)
      );

      const url = `${WS_BACKEND_URL}/ws/tracker?${params.toString()}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg: TrackerWSMessage = JSON.parse(event.data as string);
          if (msg.type !== "live_game_update" || !msg.puuid) return;

          setLiveGames((prev) => ({
            ...prev,
            [msg.puuid]: msg.inGame && msg.gameData ? msg.gameData : null,
          }));
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        // Reconnect with exponential backoff unless unmounted.
        attemptsRef.current += 1;
        const delay = Math.min(
          BASE_BACKOFF_MS * 2 ** (attemptsRef.current - 1),
          MAX_BACKOFF_MS
        );
        reconnectTimerRef.current = setTimeout(() => {
          connect(playerEntries);
        }, delay);
      };
    },
    []  
  );

  // Reconnect whenever the set of resolved players changes.
  useEffect(() => {
    const entries = players
      .filter((p): p is TrackedPlayer & { puuid: string } => !!p.puuid)
      .map((p) => ({ puuid: p.puuid, region: p.region }));

    if (entries.length === 0) {
      wsRef.current?.close();
      wsRef.current = null;
      clearReconnectTimer();
      return;
    }

    connect(entries);

    return () => {
      clearReconnectTimer();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [activePlayersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { liveGames };
}
