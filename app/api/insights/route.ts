import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function tryParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
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
    const { site, projectId } = body as { site: Record<string, unknown>; projectId?: string };

    if (!site) {
      return NextResponse.json({ error: "site is required" }, { status: 400 });
    }

    // Strip large fields before sending to OpenAI
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

    const systemPrompt = `You are an expert ecommerce conversion optimizer. Analyze this store and provide specific, actionable insights.
Return a JSON array of insights. Each insight has:
- category: one of "conversion", "homepage", "products", "pricing", "marketing"
- issue: what's wrong or could be improved (1 sentence)
- suggestion: specific improvement text (if it's copy, give exact copy to use)
- siteUpdate: optional object with the exact site JSON fields to update (e.g. { "tagline": "New tagline text" } or { "primaryCTA": "Shop Now" })

Analyze: brandName, tagline, primaryCTA, products (names/prices), sections, number of pages.
Return 5-8 insights as a JSON array only, no other text.`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze this store: ${JSON.stringify(trimmedSite)}`,
        },
      ],
    });

    const text = resp.output_text?.trim();
    if (!text) throw new Error("Empty model response");

    const insights = tryParseJSON(text);

    return NextResponse.json({ insights: Array.isArray(insights) ? insights : [insights], projectId });
  } catch (err: any) {
    console.error("INSIGHTS ROUTE ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Server error in /api/insights" },
      { status: 500 }
    );
  }
}
