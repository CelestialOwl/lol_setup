"use client";

import { ReactNode, useEffect, useState } from "react";

const shouldEnableMocking = process.env.NEXT_PUBLIC_ENABLE_MSW === "true";

type MockProviderProps = {
  children: ReactNode;
};

export default function MockProvider({ children }: MockProviderProps) {
  const [isReady, setIsReady] = useState(!shouldEnableMocking);

  useEffect(() => {
    if (!shouldEnableMocking) {
      return;
    }

    let isMounted = true;

    void import("@/test/msw/browser")
      .then(({ startMockWorker }) => startMockWorker())
      .catch((error) => {
        console.error("Failed to start MSW in the browser", error);
      })
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}