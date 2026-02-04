import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = body?.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No conversation messages received." },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are Inflection Point — a calm, experienced business partner.

This is an ongoing conversation.
You MUST remember prior decisions and NEVER ask something the user already answered.

Rules:
- Be specific to the conversation (no generic templates)
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
  } catch (err: any) {
    console.error("IDEA ROUTE ERROR:", err);
    return NextResponse.json(
      { error: `Server error in /api/idea: ${err?.message || err}` },
      { status: 500 }
    );
  }
}
