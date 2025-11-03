"use client";

import ErrorDisplay, { LoadingSpinner } from "@/components/ErrorDisplay";
import LiveGame, { NoActiveGame } from "@/components/LiveGame";
import MatchHistory from "@/components/MatchHistory";
import SearchComponent from "@/components/SearchComponent";
import { LiveGameData, SearchFormData, SummonerData } from "@/types/riot-api";
import { useState } from "react";

type ViewMode = "match-history" | "live-game";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summonerData, setSummonerData] = useState<SummonerData | null>(null);
  const [liveGameData, setLiveGameData] = useState<LiveGameData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("match-history");
  const [lastSearchedPlayer, setLastSearchedPlayer] = useState<string>("");

  const handleSearch = async (searchData: SearchFormData) => {
    setLoading(true);
    setError(null);
    setSummonerData(null);
    setLiveGameData(null);
    setLastSearchedPlayer(`${searchData.gameName}#${searchData.tagLine}`);

    try {
      const params = new URLSearchParams({
        gameName: searchData.gameName,
        tagLine: searchData.tagLine,
        region: searchData.region,
      });

      if (viewMode === "match-history") {
        const response = await fetch(`/api/summoner?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch summoner data");
        }

        setSummonerData(data);
      } else {
        const response = await fetch(`/api/live-game?${params}`);
        const data = await response.json();

        if (response.status === 404 && !data.inGame) {
          // Player is not in game - this is not an error, just show the no active game message
          setLiveGameData(null);
        } else if (!response.ok) {
          throw new Error(data.error || "Failed to fetch live game data");
        } else {
          setLiveGameData(data);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSummonerData(null);
    setLiveGameData(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <SearchComponent onSearch={handleSearch} loading={loading} />

        {/* View Mode Toggle */}
        <div className="w-full max-w-2xl mx-auto mt-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-1 flex">
            <button
              onClick={() => handleViewModeChange("match-history")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === "match-history"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              📊 Match History
            </button>
            <button
              onClick={() => handleViewModeChange("live-game")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === "live-game"
                  ? "bg-red-600 text-white"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              🔴 Live Game
            </button>
          </div>
        </div>

        {loading && (
          <LoadingSpinner
            message={
              viewMode === "live-game"
                ? "Checking live game status..."
                : "Loading match data..."
            }
          />
        )}

        {error && <ErrorDisplay error={error} onRetry={handleRetry} />}

        {/* Match History View */}
        {viewMode === "match-history" && summonerData && !loading && !error && (
          <MatchHistory summonerData={summonerData} />
        )}

        {/* Live Game View */}
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
