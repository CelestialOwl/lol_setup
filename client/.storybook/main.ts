import path from "path";
import type { StorybookConfig } from "@storybook/react-vite";
import type { InlineConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  staticDirs: ["../public"],
  docs: {
    autodocs: "tag",
  },
  viteFinal: async (config: InlineConfig) => {
    config.esbuild = {
      ...(config.esbuild || {}),
      jsx: "automatic",
      jsxImportSource: "react",
    };

    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "../src"),
    };

    return config;
  },
};

export default config;