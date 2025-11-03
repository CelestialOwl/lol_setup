import { riotApiService } from "@/services/riot-api";
import { ApiError } from "@/types/riot-api";
import { NextRequest, NextResponse } from "next/server";

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
