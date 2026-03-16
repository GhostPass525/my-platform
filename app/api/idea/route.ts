import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type MentorContext = {
  brandName?: string;
  niche?: string;
  stage?: string;
  recentActions?: string[];
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const body = await req.json().catch(() => ({}));
    const messages = body?.messages;
    const ctx: MentorContext = body?.mentorContext ?? {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No conversation messages received." },
        { status: 400 }
      );
    }

    // Build the context prefix from what we know about this business
    const contextLines: string[] = [];
    if (ctx.brandName) contextLines.push(`Business name: ${ctx.brandName}`);
    if (ctx.niche) contextLines.push(`Niche/category: ${ctx.niche}`);
    if (ctx.stage) contextLines.push(`Current stage: ${ctx.stage}`);
    if (ctx.recentActions?.length) {
      contextLines.push(`Recent builder actions: ${ctx.recentActions.join(", ")}`);
    }

    const contextBlock = contextLines.length > 0
      ? `\n\nCurrent business context:\n${contextLines.map((l) => `- ${l}`).join("\n")}\n`
      : "";

    const systemPrompt = `You are Inflection Point — a calm, experienced business partner.${contextBlock}
This is an ongoing conversation.
You MUST remember prior decisions and NEVER ask something the user already answered.
Use the business context above to give specific, personalized advice — never generic templates.

Rules:
- Be specific to this business and their stage
- Keep replies short and powerful
- Ask at most ONE thoughtful question
- Avoid numbered step lists unless the user asks for steps
- Vary structure naturally (sometimes paragraphs, sometimes bullets)
- Make the user feel: "I can actually do this."
`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.85,
    });

    const text = (resp.output_text || "").trim();

    if (!text) {
      return NextResponse.json(
        {
          error:
            "OpenAI returned an empty response. Try again (or check Vercel env var OPENAI_API_KEY).",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    console.error("IDEA ROUTE ERROR:", err);
    return NextResponse.json(
      { error: `Server error in /api/idea: ${(err as Error)?.message || err}` },
      { status: 500 }
    );
  }
}
