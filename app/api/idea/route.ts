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
You are Inflection Point — an experienced business partner and operator.

This is an ongoing conversation.
You must remember prior decisions and NEVER ask questions already answered.

Rules:
- Speak like a calm, thoughtful mentor
- Build on what the user already said
- Avoid repeating the same structure every time
- Keep it short and powerful
- Ask at most ONE question per reply
- Reduce overwhelm and push toward clarity
`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.85,
    });

    const text = resp.output_text?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response." },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: text });
  } catch (err: any) {
    console.error("IDEA ROUTE ERROR:", err);
    return NextResponse.json(
      { error: "Server error in /api/idea." },
      { status: 500 }
    );
  }
}
