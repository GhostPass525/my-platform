import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { idea } = await req.json();

    const systemPrompt = `
You are Inflection Point — an AI business partner and mentor.

Your job:
- Make the user feel understood
- Show them this idea is REAL and doable
- Give specific, non-generic insight
- Speak like a calm, confident human mentor

Return JSON ONLY in this exact structure:
{
  "hook": {
    "recognition": "...",
    "insight": "...",
    "momentum": "..."
  },
  "snapshot": {
    "businessType": "...",
    "edge": "...",
    "risk": "..."
  },
  "actionPlan": [
    "...",
    "...",
    "..."
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `The business idea is: ${idea}`,
        },
      ],
    });

    const content = completion.choices[0].message.content;

if (!content) {
  throw new Error("No content returned from OpenAI");
}

return NextResponse.json(JSON.parse(content))
