'use client';

import React, { useState } from 'react';
import { SearchFormData } from '@/types/riot-api';

interface SearchComponentProps {
  onSearch: (data: SearchFormData) => void;
  loading: boolean;
}

export default function SearchComponent({ onSearch, loading }: SearchComponentProps) {
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('euw1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = gameName.trim();
    const trimmedTag = tagLine.trim();
    if (!trimmedName || !trimmedTag) return;
    onSearch({ gameName: trimmedName, tagLine: trimmedTag, region });
  };

  const regions = [
    { value: 'euw1', label: 'EUW' },
    { value: 'na1', label: 'NA' },
    { value: 'eun1', label: 'EUNE' },
    { value: 'kr', label: 'KR' },
    { value: 'jp1', label: 'JP' },
    { value: 'br1', label: 'BR' },
    { value: 'la1', label: 'LAN' },
    { value: 'la2', label: 'LAS' },
    { value: 'oc1', label: 'OCE' },
    { value: 'tr1', label: 'TR' },
    { value: 'ru', label: 'RU' },
    { value: 'me1', label: 'ME' }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-lg shadow-lg dark:shadow-black/30">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-slate-100">
        League of Legends Match History
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="w-24">
            <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Region
            </label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="gameName" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Summoner Name
            </label>
            <input
              type="text"
              id="gameName"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="e.g. Faker"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          <div className="w-28">
            <label htmlFor="tagLine" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Tag Line
            </label>
            <input
              type="text"
              id="tagLine"
              value={tagLine}
              onChange={(e) => setTagLine(e.target.value)}
              placeholder="e.g. KR1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !gameName.trim() || !tagLine.trim()}
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
    </div>
  );
}