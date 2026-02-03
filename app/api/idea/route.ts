import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    // Attempt to extract JSON block if the model wraps it
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Invalid JSON");
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const systemPrompt = `
You are Inflection Point — an experienced business partner and operator.

The user has been having a conversation with you about their business.
Your task now is to generate a FIRST VERSION of a high-converting landing page.

Return ONLY valid JSON (no markdown, no commentary). The JSON must match this schema exactly:

{
  "brandName": "string",
  "tagline": "string",
  "heroHeadline": "string",
  "heroSubheadline": "string",
  "primaryCTA": "string",
  "audience": "string",
  "offer": "string",
  "firstProductOrService": "string",
  "sections": [
    { "title": "string", "bullets": ["string","string","string"] }
  ],
  "faq": [
    { "q": "string", "a": "string" }
  ]
}

Rules:
- Make it specific to what the user said in the conversation.
- No vague filler.
- The landing page should feel credible and exciting.
- Keep bullets practical and clear.
`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        ...messages,
        {
          role: "user",
          content:
            "Generate the landing page JSON now. Return ONLY JSON, matching the schema exactly.",
        },
      ],
      temperature: 0.8,
    });

    const text = resp.output_text || "";
    const site = safeJsonParse(text);

    return NextResponse.json({ site });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return NextResponse.json(
      { error: "Failed to generate site." },
      { status: 500 }
    );
  }
}
