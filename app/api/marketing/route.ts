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
      pages: Array.isArray(site.pages) ? (site.pages as Record<string, unknown>[]).map((p) => ({ id: p.id, name: p.name })) : [],
    };

    const systemPrompt = `You are an expert social media and digital marketing strategist specializing in ecommerce brands.

Analyze this store and generate marketing content. Return ONLY valid JSON with EXACTLY this structure:
{
  "tiktok": ["idea 1", "idea 2", "idea 3", "idea 4"],
  "instagram": ["caption 1", "caption 2", "caption 3", "caption 4"],
  "adCopy": ["ad 1", "ad 2", "ad 3"],
  "emailIdeas": ["subject line idea 1", "subject line idea 2", "subject line idea 3"],
  "postTime": "Best times to post: [specific times and days with reasoning]"
}

Make all content specific to the brand, products, and target audience. Be creative and punchy.
Return only the JSON object, no other text.`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.8,
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate marketing content for this store: ${JSON.stringify(trimmedSite)}`,
        },
      ],
    });

    const text = resp.output_text?.trim();
    if (!text) throw new Error("Empty model response");

    const marketing = tryParseJSON(text);

    return NextResponse.json(marketing);
  } catch (err: any) {
    console.error("MARKETING ROUTE ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Server error in /api/marketing" },
      { status: 500 }
    );
  }
}
