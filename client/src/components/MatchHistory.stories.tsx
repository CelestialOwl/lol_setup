import type { Meta, StoryObj } from "@storybook/react";
import { buildMockSummonerData } from "@/test/fixtures/riot";
import MatchHistory from "./MatchHistory";

const meta = {
  title: "League/MatchHistory",
  component: MatchHistory,
  tags: ["autodocs"],
  args: {
    summonerData: buildMockSummonerData(),
    region: "euw1",
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof MatchHistory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};