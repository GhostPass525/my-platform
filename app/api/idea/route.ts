import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idea = body.idea;
    const context = body.context || "";

    if (!idea) {
      return NextResponse.json(
        { error: "Missing idea" },
        { status: 400 }
      );
    }

    const prompt = `
You are an AI business partner and mentor.

Original idea:
${idea}

User follow-up (if any):
${context || "None"}

Respond thoughtfully, personally, and specifically.
Avoid generic advice.
Make the user feel understood, capable, and motivated.

Return ONLY valid JSON in this exact format:

{
  "hook": {
    "recognition": "",
    "insight": "",
    "momentum": ""
  },
  "snapshot": {
    "businessType": "",
    "edge": "",
    "risk": ""
  },
  "actionPlan": []
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a sharp, encouraging startup mentor." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
    });

    const content = completion.choices[0].message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    // ✅ SAFE JSON PARSE
    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("JSON parse failed:", content);
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
