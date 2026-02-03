import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { idea } = await req.json();

    if (!idea) {
      return NextResponse.json(
        { error: "No idea provided" },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are Inflection Point — an experienced business partner and operator.

Your role:
Help everyday people turn vague ideas into real, achievable online businesses.

Rules:
- Speak directly to the user
- Be calm, grounded, and encouraging
- Be specific to THEIR idea
- Avoid generic advice
- Reduce overwhelm
- Give clear, realistic direction
- Keep it concise but meaningful
- Make the user feel: "I can actually do this"
`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `The business idea is: ${idea}`,
        },
      ],
    });

    const output =
      response.output_text ||
      "I see potential here, but let’s slow down and clarify it.";

    return NextResponse.json({ result: output });
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
