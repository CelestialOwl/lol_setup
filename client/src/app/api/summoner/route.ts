import { NextRequest, NextResponse } from 'next/server';
import { riotApiService } from '@/services/riot-api';
import { ApiError } from '@/types/riot-api';

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