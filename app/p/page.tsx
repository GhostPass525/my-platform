import { Suspense } from "react";
import PublishedClient from "./published-client";

export const dynamic = "force-dynamic";

export default function PublishedPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white text-[#0b1220] p-8">
          <div className="max-w-xl mx-auto border rounded-2xl p-6">
            <div className="font-semibold text-lg">Loading published site…</div>
            <div className="text-sm text-slate-600 mt-2">
              Opening your shared link.
            </div>
          </div>
        </main>
      }
    >
      <PublishedClient />
    </Suspense>
  );
}
