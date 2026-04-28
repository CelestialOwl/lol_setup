import { NextRequest, NextResponse } from 'next/server';
import { riotApiService } from '@/services/riot-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puuid: string }> }
) {
  try {
    const { puuid } = await params;
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') || 'na1';
    const gameName = searchParams.get('gameName') || 'Unknown Player';

    if (!puuid) {
      return NextResponse.json({ error: 'PUUID is required' }, { status: 400 });
    }

    const rankInfo = await riotApiService.getTeammateInfoWithRank(
      puuid,
      gameName,
      region
    );

    return NextResponse.json(rankInfo);
  } catch (error) {
    console.error('Rank lookup API error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch rank info' },
      { status: 500 }
    );
  }
}