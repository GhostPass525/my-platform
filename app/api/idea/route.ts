import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idea = body.idea;

    if (!idea) {
      return NextResponse.json(
        { error: "No idea provided" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are an AI business partner and mentor.
Return ONLY valid JSON in the exact structure below.
DO NOT include markdown, explanations, or extra text.

{
  "hook": {
    "recognition": "string",
    "insight": "string",
    "momentum": "string"
  },
  "snapshot": {
    "businessType": "string",
    "edge": "string",
    "risk": "string"
  },
  "actionPlan": ["string", "string", "string"]
}
          `,
        },
        {
          role: "user",
          content: idea,
        },
      ],
    });

    const content = completion.choices[0].message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "OpenAI returned empty response" },
        { status: 500 }
      );
    }

    // ✅ SAFELY PARSE JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("Invalid JSON from OpenAI:", content);
      return NextResponse.json(
        { error: "Invalid JSON returned by AI", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Server error generating idea" },
      { status: 500 }
    );
  }
}
