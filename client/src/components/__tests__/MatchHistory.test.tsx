import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MatchHistory from "../MatchHistory";
import { buildMockSummonerData } from "@/test/fixtures/riot";

describe("MatchHistory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders richer match details including relative time, rosters, and CS", () => {
    render(
      <MatchHistory
        summonerData={buildMockSummonerData(Date.now())}
        region="euw1"
      />
    );

    const secondMatchCard = screen.getByTestId("match-card-EUW1_100002");

    expect(screen.getByText("Recent Matches (2)")).toBeInTheDocument();
    expect(screen.getByText("2d ago")).toBeInTheDocument();
    expect(within(secondMatchCard).getByText(/196/)).toBeInTheDocument();
  });

  it("renders roster entries with tags", () => {
    const referenceTime = new Date("2026-04-28T12:00:00.000Z").getTime();

    render(
      <MatchHistory
        summonerData={buildMockSummonerData(referenceTime)}
        region="euw1"
      />
    );

    const firstMatchCard = screen.getByTestId("match-card-EUW1_100001");
    // Roster entries should be present
    expect(within(firstMatchCard).getAllByText(/#/i).length).toBeGreaterThan(0);
  });
});