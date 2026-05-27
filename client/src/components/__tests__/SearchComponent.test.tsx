import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SearchComponent from "../SearchComponent";

describe("SearchComponent", () => {
  it("submits the filled search form", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();

    render(<SearchComponent onSearch={onSearch} loading={false} />);

    await user.type(screen.getByLabelText(/summoner/i), "Khoji#777");
    await user.selectOptions(screen.getByLabelText(/region/i), "euw1");
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith({
      gameName: "Khoji",
      tagLine: "777",
      region: "euw1",
    });
  });

  it("disables form controls while loading", () => {
    render(<SearchComponent onSearch={vi.fn()} loading={true} />);

    expect(screen.getByLabelText(/summoner/i)).toBeDisabled();
    expect(screen.getByLabelText(/region/i)).toBeDisabled();
  });
});