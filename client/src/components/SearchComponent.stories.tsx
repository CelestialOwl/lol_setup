import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import SearchComponent from "./SearchComponent";

const meta = {
  title: "Forms/SearchComponent",
  component: SearchComponent,
  tags: ["autodocs"],
  args: {
    onSearch: fn(),
    loading: false,
  },
} satisfies Meta<typeof SearchComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
  },
};