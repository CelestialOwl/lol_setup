import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

// GET /api/summoner/:puuid/rank?gameName=
// Returns: LeagueEntry[]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  try {
    const { puuid } = await params;
    const { searchParams } = new URL(request.url);

    if (!puuid) {
      return NextResponse.json({ error: 'PUUID is required' }, { status: 400 });
    }

    if (!BACKEND_URL) {
      return NextResponse.json(
        { error: 'BACKEND_URL is required for rank lookup' },
        { status: 501 }
      );
    }

    const qs = searchParams.toString();
    const res = await fetch(
      `${BACKEND_URL}/api/summoner/${puuid}/rank${qs ? `?${qs}` : ''}`
    );
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch rank' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Rank API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
