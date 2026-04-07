import { riotApiService } from "@/services/riot-api";
import { ApiError } from "@/types/riot-api";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get("gameName");
    const tagLine = searchParams.get("tagLine");
    const region = searchParams.get("region") || "na1";

    if (!gameName || !tagLine) {
      return NextResponse.json(
        { error: "Both gameName and tagLine are required" },
        { status: 400 }
      );
    }

    if (BACKEND_URL) {
      // Proxy to Go backend which handles the Riot spectator v5 lookup and team splitting
      const res = await fetch(`${BACKEND_URL}/api/live-game?${searchParams}`);
      const data = await res.json();

      if (res.status === 404) {
        return NextResponse.json(
          { error: data.error || "Player is not currently in a game", inGame: false },
          { status: 404 }
        );
      }

      if (!res.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to fetch live game data", inGame: false },
          { status: res.status }
        );
      }

      return NextResponse.json(data);
    }

    // Fallback: call Riot API directly (no Go backend configured)
    const liveGameData = await riotApiService.getCurrentGame(
      gameName,
      tagLine,
      region
    );

    if (!liveGameData) {
      return NextResponse.json(
        { error: "Player is not currently in a game", inGame: false },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...liveGameData, inGame: true });
  } catch (error) {
    console.error("Live Game API Error:", error);

    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      "message" in error
    ) {
      const apiError = error as ApiError;
      return NextResponse.json(
        { error: apiError.message, inGame: false },
        { status: apiError.status }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", inGame: false },
      { status: 500 }
    );
  }
}
