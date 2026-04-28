import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { buildMockLiveGameData } from "@/test/fixtures/riot";
import LiveGame, { NoActiveGame } from "./LiveGame";

const meta = {
  title: "League/LiveGame",
  component: LiveGame,
  tags: ["autodocs"],
  args: {
    liveGameData: buildMockLiveGameData(),
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof LiveGame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyState: Story = {
  render: () => <NoActiveGame playerName="Khoji#777" />,
};