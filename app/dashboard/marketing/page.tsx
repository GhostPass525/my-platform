import { Suspense } from "react";
import MarketingClient from "./marketing-client";

export default function MarketingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}>
      <MarketingClient />
    </Suspense>
  );
}
