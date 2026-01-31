import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { idea, count } = await req.json();

    if (!idea) {
      return NextResponse.json(
        { error: "No idea provided." },
        { status: 400 }
      );
    }

    // 3-response free limit
    if (count >= 3) {
      return NextResponse.json({
        result:
          "You’re at an inflection point.\n\nYou’ve got something real here — and this is usually where clarity turns into momentum.\n\nTo keep building with guidance and turn this into something concrete, continue with Inflection Point.",
        locked: true,
      });
    }

    const systemPrompt = `
You are Inflection Point — an experienced business partner and operator.

Your job is to help everyday people turn vague ideas into real businesses.

Rules:
- Speak directly to the user
- Be calm, confident, and encouraging
- Be specific to the idea provided
- Avoid generic advice
- Reduce overwhelm
- Give one strong, grounded opinion
- Keep responses short and powerful
- Make the user feel: "I can actually do this"

Do not hype. Do not overexplain.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `The business idea is: ${idea}`,
        },
      ],
      temperature: 0.8,
    });

    const response =
      completion.choices[0].message.content ||
      "Something went wrong generating a response.";

    return NextResponse.json({ result: response });
  } catch (err) {
    return NextResponse.json(
      { error: "Error generating idea." },
      { status: 500 }
    );
  }
}
