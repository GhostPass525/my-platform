import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    const assistantMessages = messages.filter(
      (m: any) => m.role === "assistant"
    ).length;

    const systemPrompt = `
You are Inflection Point — an experienced business partner and operator.

This is an ongoing conversation.
You remember prior decisions and NEVER ask questions already answered.

Rules:
- Speak like a calm, thoughtful mentor
- Build on what the user already said
- Do NOT repeat advice
- Avoid lists unless necessary
- Reduce overwhelm
- Guide toward clarity and commitment
- After clarity forms, gently suggest generation

Tone:
Grounded. Human. Encouraging. Precise.

Do NOT reset the conversation.
`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const output =
      response.output_text ||
      "Let’s slow down and make sure we’re aligned.";

    return NextResponse.json({
      result: output,
      canGenerate: assistantMessages >= 2,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
