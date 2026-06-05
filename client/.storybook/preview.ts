import type { Preview } from "@storybook/react";
import { initialize, mswLoader } from "msw-storybook-addon";
// @ts-expect-error Storybook loads this global stylesheet at bundling time.
import "../src/app/globals.css";

initialize({
  onUnhandledRequest: "bypass",
  serviceWorker: {
    url: "/mockServiceWorker.js",
  },
});

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    layout: "centered",
  },
};

export default preview;