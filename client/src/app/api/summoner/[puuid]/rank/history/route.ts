import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

// GET /api/summoner/:puuid/rank/history
// Returns: RankSnapshot[] (sorted newest-first)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  try {
    const { puuid } = await params;

    if (!puuid) {
      return NextResponse.json({ error: 'PUUID is required' }, { status: 400 });
    }

    if (!BACKEND_URL) {
      return NextResponse.json(
        { error: 'BACKEND_URL is required for rank history lookup' },
        { status: 501 }
      );
    }

    const res = await fetch(`${BACKEND_URL}/api/summoner/${puuid}/rank/history`);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch rank history' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Rank history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
