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
        { error: "Invalid message format." },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are Inflection Point — a calm, experienced business partner.

Your role:
- Help the user think clearly
- Respond like a real human mentor
- Be specific to THEIR idea
- Avoid generic startup advice
- Reduce overwhelm
- Encourage momentum
- Ask at most ONE thoughtful question per reply

Tone:
Grounded. Honest. Supportive.
Make the user feel:
"I can actually do this."
"I’m closer than I thought."

Do NOT pitch.
Do NOT overexplain.
Do NOT repeat yourself.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.85,
    });

    const reply =
      completion.choices[0].message.content ??
      "I’m thinking — try that again.";

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: "Error generating response." },
      { status: 500 }
    );
  }
}

