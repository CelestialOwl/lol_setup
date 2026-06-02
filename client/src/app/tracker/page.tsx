import { Suspense } from "react";
import TrackerPage from "@/components/tracker/TrackerPage";

export const metadata = {
  title: "Player Tracker | LoL Match Tracker",
  description: "Track up to 5 League of Legends players simultaneously",
};

export default function TrackerRoute() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="container mx-auto px-4 max-w-[1920px]">
        <Suspense>
          <TrackerPage />
        </Suspense>
      </div>
    </main>
  );
}
