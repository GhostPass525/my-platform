import { Suspense } from "react";
import InsightsClient from "./insights-client";

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}>
      <InsightsClient />
    </Suspense>
  );
}
