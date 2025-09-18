'use client';

import { useState } from 'react';
import SearchComponent from '@/components/SearchComponent';
import MatchHistory from '@/components/MatchHistory';
import ErrorDisplay, { LoadingSpinner } from '@/components/ErrorDisplay';
import { SummonerData, SearchFormData } from '@/types/riot-api';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summonerData, setSummonerData] = useState<SummonerData | null>(null);

  const handleSearch = async (searchData: SearchFormData) => {
    setLoading(true);
    setError(null);
    setSummonerData(null);

    try {
      const params = new URLSearchParams({
        gameName: searchData.gameName,
        tagLine: searchData.tagLine,
        region: searchData.region,
      });

      const response = await fetch(`/api/summoner?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch summoner data');
      }

      setSummonerData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <SearchComponent onSearch={handleSearch} loading={loading} />
        
        {loading && <LoadingSpinner />}
        
        {error && (
          <ErrorDisplay 
            error={error} 
            onRetry={handleRetry}
          />
        )}
        
        {summonerData && !loading && !error && (
          <MatchHistory summonerData={summonerData} />
        )}
      </div>
    </main>
  );
}