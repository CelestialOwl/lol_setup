import { setupWorker } from "msw/browser";
import { getRiotApiHandlersForScenario } from "@/test/msw/handlers";

let workerStartPromise: Promise<void> | undefined;

export function startMockWorker() {
  if (!workerStartPromise) {
    const scenarioName = new URLSearchParams(window.location.search).get(
      "mswScenario"
    );
    const worker = setupWorker(...getRiotApiHandlersForScenario(scenarioName));

    workerStartPromise = worker
      .start({
        onUnhandledRequest: "bypass",
        serviceWorker: {
          url: "/mockServiceWorker.js",
        },
      })
      .then(() => undefined);
  }

  return workerStartPromise;
}