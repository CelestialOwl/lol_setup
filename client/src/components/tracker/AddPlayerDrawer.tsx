"use client";

import React, { useRef, useState } from "react";

const REGIONS = [
  { value: "na1",  label: "NA" },
  { value: "euw1", label: "EUW" },
  { value: "eun1", label: "EUNE" },
  { value: "kr",   label: "KR" },
  { value: "jp1",  label: "JP" },
  { value: "br1",  label: "BR" },
  { value: "oc1",  label: "OCE" },
  { value: "tr1",  label: "TR" },
  { value: "ru",   label: "RU" },
  { value: "las",  label: "LAS" },
  { value: "lan1", label: "LAN" },
  { value: "me1",  label: "ME" },
];

interface AddPlayerDrawerProps {
  onAdd: (gameName: string, tagLine: string, region: string) => Promise<void>;
  onClose: () => void;
  error?: string | null;
}

export default function AddPlayerDrawer({
  onAdd,
  onClose,
  error,
}: AddPlayerDrawerProps) {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("euw1");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parts = riotId.split("#");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return;

    const [gameName, tagLine] = parts;
    setLoading(true);
    try {
      await onAdd(gameName.trim(), tagLine.trim(), region);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add Player</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Riot ID
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="GameName#TAG"
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-slate-400">e.g. Faker#T1 or Caps#EUW</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !riotId.includes("#")}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Looking up…" : "Add to Tracker"}
          </button>
        </form>
      </div>
    </div>
  );
}
