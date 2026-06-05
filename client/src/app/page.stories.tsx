import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import HomePage from "./page";
import {
  defaultRiotApiHandlers,
  summonerNotFoundHandlers,
} from "@/test/msw/handlers";

const meta = {
  title: "Pages/HomePage",
  component: HomePage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof HomePage>;

export default meta;

type Story = StoryObj<typeof meta>;

async function submitSearch(canvasElement: HTMLElement, gameName: string, tagLine: string) {
  const canvas = within(canvasElement);

  await userEvent.clear(canvas.getByLabelText(/summoner name/i));
  await userEvent.type(canvas.getByLabelText(/summoner name/i), gameName);
  await userEvent.clear(canvas.getByLabelText(/tag line/i));
  await userEvent.type(canvas.getByLabelText(/tag line/i), tagLine);
  await userEvent.selectOptions(canvas.getByLabelText(/region/i), "euw1");
  await userEvent.click(canvas.getByRole("button", { name: /search matches/i }));

  return canvas;
}

export const MatchHistorySearch: Story = {
  parameters: {
    msw: {
      handlers: defaultRiotApiHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitSearch(canvasElement, "Khoji", "777");

    await expect(
      await canvas.findByRole("heading", { name: "Khoji#777" })
    ).toBeVisible();
    await expect(await canvas.findByText("Recent Matches (2)")).toBeVisible();
    await expect(await canvas.findByText("Match Summary")).toBeVisible();
  },
};

export const SummonerNotFound: Story = {
  parameters: {
    msw: {
      handlers: summonerNotFoundHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitSearch(canvasElement, "MissingPlayer", "404");

    await expect(await canvas.findByText("Something went wrong")).toBeVisible();
    await expect(await canvas.findByText("Summoner not found")).toBeVisible();
  },
};