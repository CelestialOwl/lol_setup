import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from '@/types/riot-api';

const BACKEND_URL = process.env.BACKEND_URL;

// GET /api/summoner/:puuid/matches?region=
// Returns: { puuid, matches: Match[], total: number }
//
// This is kept separate from the summoner profile route so the UI can display
// the summoner card immediately after the fast profile call, then load match
// history in a follow-up request.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  try {
    const { puuid } = await params;
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') || 'na1';

    if (!puuid) {
      return NextResponse.json({ error: 'PUUID is required' }, { status: 400 });
    }

    if (BACKEND_URL) {
      const res  = await fetch(
        `${BACKEND_URL}/api/summoner/${puuid}/matches?region=${region}`
      );
      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json(
          { error: data.error || 'Failed to fetch match history' },
          { status: res.status }
        );
      }

      return NextResponse.json(data);
    }

    // Without a Go backend the PUUID-based match lookup is not supported in the
    // direct-Riot-API fallback path (it would require an extra account lookup).
    return NextResponse.json(
      { error: 'BACKEND_URL is required for match history lookup by PUUID' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Match history API error:', error);

    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      const apiError = error as ApiError;
      return NextResponse.json({ error: apiError.message }, { status: apiError.status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
