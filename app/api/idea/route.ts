import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { idea } = await req.json();

  if (!idea) {
    return NextResponse.json({ error: "No idea provided" }, { status: 400 });
  }

  const result = `
Business Snapshot
• Business Type: Online brand
• Core Idea: ${idea}
• Best Starting Model: Simple, low-risk launch

Recommended First Move
• Start with 1–2 core products
• Use print-on-demand or digital delivery
• Focus on clarity, not scale

Next Steps
1. Name your business
2. Define your target customer
3. Launch a simple landing page
  `;

  return NextResponse.json({ result });
}
