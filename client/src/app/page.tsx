"use client";

import ErrorDisplay, { LoadingSpinner } from "@/components/ErrorDisplay";
import LiveGame, { NoActiveGame } from "@/components/LiveGame";
import MatchHistory from "@/components/MatchHistory";
import SearchComponent from "@/components/SearchComponent";
import { LiveGameData, SearchFormData, SummonerData } from "@/types/riot-api";
import { useRef, useState } from "react";

type ViewMode = "match-history" | "live-game";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  // loadingStep drives the spinner message so users see what's happening
  const [loadingStep, setLoadingStep] = useState<"profile" | "matches">("profile");
  const [currentRegion, setCurrentRegion] = useState<string>("euw1");
  const [error, setError] = useState<string | null>(null);
  const [summonerData, setSummonerData] = useState<SummonerData | null>(null);
  const [liveGameData, setLiveGameData] = useState<LiveGameData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("match-history");
  const [lastSearchedPlayer, setLastSearchedPlayer] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearch = async (searchData: SearchFormData) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setLoadingStep("profile");
    setError(null);
    setSummonerData(null);
    setLiveGameData(null);
    setCurrentRegion(searchData.region);
    setLastSearchedPlayer(`${searchData.gameName}#${searchData.tagLine}`);

    try {
      const params = new URLSearchParams({
        gameName: searchData.gameName,
        tagLine: searchData.tagLine,
        region: searchData.region,
      });

      if (viewMode === "match-history") {
        // ── Step 1: profile (fast — 2 Riot API calls max) ──────────────────
        const profileRes = await fetch(`/api/summoner?${params}`, {
          signal: controller.signal,
        });
        const profile = await profileRes.json();
        if (!profileRes.ok) {
          throw new Error(profile.error || "Failed to fetch summoner profile");
        }

        // ── Step 2: match history (slower — up to 11 Riot API calls) ───────
        setLoadingStep("matches");
        const matchParams = new URLSearchParams({ region: searchData.region });
        const matchesRes = await fetch(
          `/api/summoner/${profile.account.puuid}/matches?${matchParams}`,
          { signal: controller.signal }
        );
        const matchesJson = await matchesRes.json();
        if (!matchesRes.ok) {
          throw new Error(matchesJson.error || "Failed to fetch match history");
        }

        // Merge profile + matches into the shape MatchHistory expects
        setSummonerData({
          account:      profile.account,
          summoner:     profile.summoner,
          matchHistory: (matchesJson.matches ?? []).map(
            (m: { metadata: { matchId: string } }) => m.metadata.matchId
          ),
          matches: matchesJson.matches ?? [],
          ranks:   matchesJson.ranks ?? {},
        });
      } else {
        // ── Live game ──────────────────────────────────────────────────────
        const response = await fetch(`/api/live-game?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (response.status === 404 && !data.inGame) {
          setLiveGameData(null);
        } else if (!response.ok) {
          throw new Error(data.error || "Failed to fetch live game data");
        } else {
          setLiveGameData(data);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => setError(null);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSummonerData(null);
    setLiveGameData(null);
    setError(null);
  };

  const loadingMessage =
    viewMode === "live-game"
      ? "Checking live game status..."
      : loadingStep === "profile"
      ? "Finding summoner..."
      : "Loading match history...";

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="container mx-auto px-4">
        <SearchComponent onSearch={handleSearch} loading={loading} />

        {/* View Mode Toggle */}
        <div className="w-full max-w-2xl mx-auto mt-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md dark:shadow-black/30 p-1 flex">
            <button
              onClick={() => handleViewModeChange("match-history")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === "match-history"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              📊 Match History
            </button>
            <button
              onClick={() => handleViewModeChange("live-game")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === "live-game"
                  ? "bg-red-600 text-white"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              🔴 Live Game
            </button>
          </div>
        </div>

        {loading && <LoadingSpinner message={loadingMessage} />}

        {error && <ErrorDisplay error={error} onRetry={handleRetry} />}

        {viewMode === "match-history" && summonerData && !loading && !error && (
          <MatchHistory summonerData={summonerData} region={currentRegion} />
        )}

        {viewMode === "live-game" && !loading && !error && (
          <>
            {liveGameData ? (
              <LiveGame liveGameData={liveGameData} />
            ) : lastSearchedPlayer ? (
              <NoActiveGame playerName={lastSearchedPlayer} />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
