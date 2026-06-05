import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import ErrorDisplay, { LoadingSpinner } from "./ErrorDisplay";

const meta = {
  title: "Feedback/ErrorDisplay",
  component: ErrorDisplay,
  tags: ["autodocs"],
  args: {
    error: "Riot API rate limit exceeded. Please try again in a moment.",
    onRetry: fn(),
  },
} satisfies Meta<typeof ErrorDisplay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutRetry: Story = {
  args: {
    onRetry: undefined,
  },
};

export const Loading: Story = {
  render: () => <LoadingSpinner message="Loading match history..." />,
};