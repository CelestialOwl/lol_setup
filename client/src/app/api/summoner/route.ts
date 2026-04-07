import { NextRequest, NextResponse } from 'next/server';
import { riotApiService } from '@/services/riot-api';
import { ApiError } from '@/types/riot-api';

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName');
    const tagLine = searchParams.get('tagLine');
    const region = searchParams.get('region') || 'na1';

    if (!gameName || !tagLine) {
      return NextResponse.json(
        { error: 'Both gameName and tagLine are required' },
        { status: 400 }
      );
    }

    if (BACKEND_URL) {
      // Proxy to Go backend which handles caching (Redis) and persistence (Postgres)
      const res = await fetch(`${BACKEND_URL}/api/summoner?${searchParams}`);
      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json(
          { error: data.error || 'Failed to fetch summoner data' },
          { status: res.status }
        );
      }

      // Go backend returns { account, summoner, matches, liveGame? }
      // Frontend SummonerData also expects matchHistory (array of match IDs).
      // Derive it from the match metadata so the type is satisfied.
      const matchHistory: string[] = (data.matches ?? []).flatMap(
        (m: { metadata?: { matchId?: string } }) =>
          m?.metadata?.matchId ? [m.metadata.matchId] : []
      );

      return NextResponse.json({ ...data, matchHistory });
    }

    // Fallback: call Riot API directly (no Go backend configured)
    const summonerData = await riotApiService.getSummonerData(gameName, tagLine, region);
    return NextResponse.json(summonerData);
  } catch (error) {
    console.error('API Error:', error);

    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      const apiError = error as ApiError;
      return NextResponse.json(
        { error: apiError.message },
        { status: apiError.status }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}