import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

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

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const body = await req.json().catch(() => ({}));
    const { site } = body as { site: Record<string, unknown> };

    if (!site) {
      return NextResponse.json({ error: "site is required" }, { status: 400 });
    }

    const trimmedSite = {
      brandName: site.brandName,
      tagline: site.tagline,
      primaryCTA: site.primaryCTA,
      font: site.font,
      theme: site.theme,
      products: site.products,
      sections: site.sections,
    };

    const systemPrompt = `You are a world-class brand strategist who has built brands for companies like Apple, Nike, and Warby Parker.

Analyze this store and develop a complete brand identity. Return ONLY valid JSON with EXACTLY this structure:
{
  "brandVoice": "A 2-3 sentence description of the brand's voice, tone, and personality",
  "logoConceptDescription": "A detailed description of what the ideal logo should look like - style, symbols, typography, color usage",
  "brandStory": "A compelling 3-4 sentence brand story that connects emotionally with customers",
  "taglineVariations": ["tagline 1", "tagline 2", "tagline 3", "tagline 4", "tagline 5"],
  "colorRationale": "Explanation of why the current colors work for this brand and what they communicate psychologically"
}

Be specific, creative, and strategic. Return only the JSON object, no other text.`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.75,
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Develop brand identity for this store: ${JSON.stringify(trimmedSite)}`,
        },
      ],
    });

    const text = resp.output_text?.trim();
    if (!text) throw new Error("Empty model response");

    const brand = tryParseJSON(text);

    return NextResponse.json(brand);
  } catch (err: any) {
    console.error("BRAND ROUTE ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Server error in /api/brand" },
      { status: 500 }
    );
  }
}
