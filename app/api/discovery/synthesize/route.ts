import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function tryParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Invalid JSON");
  }
}

const SYNTHESIS_SYSTEM = `You are an expert business strategist. Given a discovery conversation, propose 3 specific business ideas this person could realistically launch in the next 30 days.

Each proposal must include:
- Business name (placeholder, creative, 1-2 words)
- Target customer in one sentence (specific, not "people who like X")
- 3-5 concrete product ideas with realistic prices
- Positioning angle (what makes this different from what already exists)
- "Why this fits you" — directly reference things the user said

Rules:
- No vague ideas. "A fitness brand" is too broad. "A bamboo activewear brand for quiet-intensity lifters" is specific.
- Prices must be realistic for the product. $48 tank is reasonable. $500 tank is not.
- Each idea should be genuinely different from the others, not three flavors of the same idea.
- If the person only gave vague answers, propose less polished ideas and note that you need more specifics.
- The business names should be single words or short phrases, evocative, brandable.

Return ONLY valid JSON — no markdown, no explanation:
{
  "ideas": [
    {
      "name": "string",
      "tagline": "string (one-line description of the business)",
      "target": "string (specific target customer)",
      "products": [{"name": "string", "price": number}],
      "positioning": "string",
      "whyFits": "string (directly reference what the user said)"
    }
  ]
}`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const messages: Array<{ role: string; content: string }> = body?.messages ?? [];

  if (!messages.length) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  const conversationText = messages
    .map((m) => `${m.role === "user" ? "User" : "Mentor"}: ${m.content}`)
    .join("\n\n");

  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYNTHESIS_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Here is the discovery conversation:\n\n${conversationText}\n\nNow generate 3 specific business ideas based on what this person shared.`,
      },
    ],
  });

  const text = resp.content[0]?.type === "text" ? resp.content[0].text.trim() : "";
  const parsed = tryParseJSON(text);

  return NextResponse.json(parsed);
}
