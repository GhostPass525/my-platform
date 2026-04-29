import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are helping someone figure out what business to build. They don't have an idea yet. Your job is to extract what makes them unique and turn it into a specific, viable business.

CONSTRAINTS:
- Ask ONE question at a time. Never stack questions.
- Don't be generic. Don't say "that's interesting" or "great answer." Respond to the CONTENT of what they said.
- After 4-6 exchanges, you'll be asked to synthesize. Build toward specificity the whole time.
- When they mention something concrete (a brand they hate, a product they love, a skill they have), probe it. Generic answers come from generic questions.
- Keep responses SHORT — 1-2 sentences max, then your single question.
- Count exchanges internally. After 5+ user messages, signal readiness with the tag [READY_TO_SYNTHESIZE] at the very end of your response.

AVOID:
- Asking about "passion" directly — it's vague and people give vague answers
- Rushing to conclusions before you have 4-6 real answers
- Proposing ideas during the question phase (save it for synthesis)
- Small talk, empty validation, coaching clichés
- Stacking multiple questions

QUESTION POOL (pick adaptively based on what they've said — do NOT ask all of these):
- "What do friends come to you for advice on?"
- "What's something you've gotten noticeably better at in the last 2 years?"
- "If you had a free Saturday and money wasn't a factor, what would you spend it doing?"
- "What's a problem you solved for yourself that other people seem to still struggle with?"
- "What's something you bought recently that disappointed you — and what would've made it perfect?"
- "What topic could you talk about for three hours without getting bored?"
- "If you had to teach someone one skill this weekend, what would it be?"`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const messages: Array<{ role: "user" | "assistant"; content: string }> = body?.messages ?? [];

  if (!messages.length) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  // Build alternating messages for Anthropic (must start with user)
  const anthropicMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const resp = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: anthropicMessages,
  });

  const text = resp.content[0]?.type === "text" ? resp.content[0].text.trim() : "";
  const readyToSynthesize = text.includes("[READY_TO_SYNTHESIZE]");
  const cleanText = text.replace("[READY_TO_SYNTHESIZE]", "").trim();

  return NextResponse.json({ reply: cleanText, readyToSynthesize });
}
