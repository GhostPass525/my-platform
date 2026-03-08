import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createClient } from "@/utils/supabase/server";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const TTL = 60 * 60 * 24 * 30; // 30 days

function id() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export async function POST(req: Request) {
  try {
    const { site } = await req.json();

    if (!site) {
      return NextResponse.json({ error: "Missing site" }, { status: 400 });
    }

    const publishId = id();

    // Store site JSON for 30 days
    await redis.set(`site:${publishId}`, site, { ex: TTL });

    // Record which user owns this published site so webhooks can attribute orders
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await redis.set(`site-owner:${publishId}`, user.id, { ex: TTL });
    }

    return NextResponse.json({ id: publishId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Publish failed" },
      { status: 500 }
    );
  }
}

