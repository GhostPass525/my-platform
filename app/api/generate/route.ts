import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

// ---------- helper to safely parse JSON ----------
function tryParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Invalid JSON returned by model.");
  }
}

// ---------- generate once ----------
async function generateOnce(openai: OpenAI, messages: any[]) {
  const systemPrompt = `
You are Inflection Point.

Generate a first-version landing page blueprint from the conversation.

Return ONLY valid JSON with EXACTLY this structure:

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
- No markdown
- No explanation
- No extra text
- Must be valid JSON
`;

  const resp = await openai.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0.7,
    input: [
      { role: "system", content: systemPrompt },
      ...messages,
      {
        role: "user",
        content: "Generate the landing page JSON now.",
      },
    ],
  });

  const text = resp.output_text?.trim();
  if (!text) throw new Error("Empty model response");

  return tryParseJSON(text);
}

// ---------- route handler ----------
export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const body = await req.json().catch(() => ({}));
    const messages = body?.messages;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "No conversation messages provided." },
        { status: 400 }
      );
    }

    let site;

    try {
      site = await generateOnce(openai, messages);
    } catch {
      // automatic retry once
      site = await generateOnce(openai, messages);
    }

    if (!site) {
      return NextResponse.json(
        { error: "Generation failed after retry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ site });
  } catch (err: any) {
    console.error("GENERATE ROUTE ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Server generation error" },
      { status: 500 }
    );
  }
}
