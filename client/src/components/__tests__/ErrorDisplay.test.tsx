import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ErrorDisplay, { LoadingSpinner } from "../ErrorDisplay";

describe("ErrorDisplay", () => {
  it("renders the error state and triggers retry", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <ErrorDisplay
        error="Unable to contact Riot API"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Unable to contact Riot API")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows live-game specific loading copy when the message mentions live", () => {
    render(<LoadingSpinner message="Checking live game status..." />);

    expect(screen.getByText("Checking live game status...")).toBeInTheDocument();
    expect(
      screen.getByText("Checking if player is currently in a game...")
    ).toBeInTheDocument();
  });
});