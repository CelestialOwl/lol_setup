import { NextRequest, NextResponse } from 'next/server';
import { riotApiService } from '@/services/riot-api';
import { ApiError } from '@/types/riot-api';

const BACKEND_URL = process.env.BACKEND_URL;

// GET /api/summoner?gameName=&tagLine=&region=
// Returns profile only: { account, summoner }
// Call /api/summoner/:puuid/matches separately for match history.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName');
    const tagLine  = searchParams.get('tagLine');
    const region   = searchParams.get('region') || 'na1';

    if (!gameName || !tagLine) {
      return NextResponse.json(
        { error: 'Both gameName and tagLine are required' },
        { status: 400 }
      );
    }

    if (BACKEND_URL) {
      const res  = await fetch(`${BACKEND_URL}/api/summoner?${searchParams}`);
      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json(
          { error: data.error || 'Failed to fetch summoner profile' },
          { status: res.status }
        );
      }

      // Go backend returns { account, summoner } — forward as-is
      return NextResponse.json(data);
    }

    // Fallback: call Riot API directly (returns full data; extract profile fields)
    const full = await riotApiService.getSummonerData(gameName, tagLine, region);
    return NextResponse.json({ account: full.account, summoner: full.summoner });
  } catch (error) {
    console.error('Summoner profile API error:', error);

    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      const apiError = error as ApiError;
      return NextResponse.json({ error: apiError.message }, { status: apiError.status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}