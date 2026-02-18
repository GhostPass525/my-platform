import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function id() {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req: Request) {
  try {
    const { site } = await req.json();

    if (!site) {
      return NextResponse.json({ error: "Missing site" }, { status: 400 });
    }

    const publishId = id();

    // Store JSON for 30 days (MVP)
    await redis.set(`site:${publishId}`, site, { ex: 60 * 60 * 24 * 30 });

    return NextResponse.json({ id: publishId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Publish failed" },
      { status: 500 }
    );
  }
}

