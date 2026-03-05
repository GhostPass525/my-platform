import { Redis } from "@upstash/redis";
import PublishedClient from "./published-client";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function Published({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await redis.get(`site:${id}`);

  if (!site) {
    return (
      <main className="min-h-screen bg-white p-8">
        <div className="max-w-xl mx-auto border rounded-2xl p-6">
          <div className="font-semibold text-lg">Site not found</div>
          <div className="text-sm text-slate-600 mt-2">
            This publish link is invalid or expired.
          </div>
        </div>
      </main>
    );
  }

  return <PublishedClient site={site as any} />;
}
