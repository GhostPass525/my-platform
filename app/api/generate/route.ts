import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = body?.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No conversation messages received in /api/generate." },
        { status: 400 }
      );
    }

    // Strong instruction: return ONLY JSON
    const systemPrompt = `
You are Inflection Point.

Task:
Generate a first-version landing page blueprint based on the conversation.

Return ONLY valid JSON with EXACTLY this structure (no markdown, no extra text):

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
- Specific to this user's conversation (motivational gym brand, breathable quality materials)
- No vague filler
- 3–6 sections
- 3–6 FAQs
- Output MUST be valid JSON. No trailing commas.
`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        ...messages,
        {
          role: "user",
          content:
            "Generate the landing page JSON now. Output ONLY the JSON object.",
        },
      ],
      temperature: 0.7,
    });

    const raw = (resp.output_text || "").trim();

    if (!raw) {
      return NextResponse.json(
        { error: "OpenAI returned empty output_text in /api/generate." },
        { status: 500 }
      );
    }

    // Try parse as JSON. If model wrapped it, extract the first {...} block.
    let jsonText = raw;
    if (!raw.startsWith("{")) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match?.[0]) jsonText = match[0];
    }

    let site: any;
    try {
      site = JSON.parse(jsonText);
    } catch (e: any) {
      return NextResponse.json(
        {
          error:
            "Generation returned non-JSON. Here is the raw output (first 800 chars):\n\n" +
            raw.slice(0, 800),
        },
        { status: 500 }
      );
    }

    // Minimal schema validation so you don’t get a blank editor
    const required = [
      "brandName",
      "tagline",
      "heroHeadline",
      "heroSubheadline",
      "primaryCTA",
      "audience",
      "offer",
      "firstProductOrService",
      "sections",
      "faq",
    ];
    for (const key of required) {
      if (!(key in site)) {
        return NextResponse.json(
          { error: `Missing "${key}" in generated JSON.` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ site });
  } catch (err: any) {
    console.error("GENERATE ROUTE ERROR:", err);
    return NextResponse.json(
      { error: `Server error in /api/generate: ${err?.message || err}` },
      { status: 500 }
    );
  }
}
