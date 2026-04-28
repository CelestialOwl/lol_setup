'use client';

import React, { useState } from 'react';
import { SearchFormData } from '@/types/riot-api';

interface SearchComponentProps {
  onSearch: (data: SearchFormData) => void;
  loading: boolean;
}

export default function SearchComponent({ onSearch, loading }: SearchComponentProps) {
  const [formData, setFormData] = useState<SearchFormData>({
    gameName: '',
    tagLine: '',
    region: 'na1'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.gameName.trim() && formData.tagLine.trim()) {
      onSearch(formData);
    }
  };

  const regions = [
    { value: 'na1', label: 'North America' },
    { value: 'euw1', label: 'Europe West' },
    { value: 'eun1', label: 'Europe Nordic & East' },
    { value: 'kr', label: 'Korea' },
    { value: 'jp1', label: 'Japan' },
    { value: 'br1', label: 'Brazil' },
    { value: 'la1', label: 'Latin America North' },
    { value: 'la2', label: 'Latin America South' },
    { value: 'oc1', label: 'Oceania' },
    { value: 'tr1', label: 'Turkey' },
    { value: 'ru', label: 'Russia' },
    { value: 'me1', label: 'Middle East' }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
        League of Legends Match History
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="gameName" className="block text-sm font-medium text-gray-700 mb-2">
              Summoner Name
            </label>
            <input
              type="text"
              id="gameName"
              value={formData.gameName}
              onChange={(e) => setFormData({ ...formData, gameName: e.target.value })}
              placeholder="e.g., Hide on bush"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="tagLine" className="block text-sm font-medium text-gray-700 mb-2">
              Tag Line
            </label>
            <input
              type="text"
              id="tagLine"
              value={formData.tagLine}
              onChange={(e) => setFormData({ ...formData, tagLine: e.target.value })}
              placeholder="e.g., KR1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
            Region
          </label>
          <select
            id="region"
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            {regions.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !formData.gameName.trim() || !formData.tagLine.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Searching...
            </div>
          ) : (
            'Search Matches'
          )}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>Enter your summoner name and tag (e.g., &quot;Hide on bush&quot; and &quot;KR1&quot;)</p>
        <p>Make sure to select the correct region for accurate results</p>
      </div>
    </div>
  );
}