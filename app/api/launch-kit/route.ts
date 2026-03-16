import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { site } = body as { site: Record<string, unknown> };

  if (!site) {
    return NextResponse.json({ error: "site required" }, { status: 400 });
  }

  const brandName = (site.brandName as string) || "your store";
  const tagline = (site.tagline as string) || "";
  const audience = (site.audience as string) || "";
  const offer =
    (site.offer as string) || (site.firstProductOrService as string) || "";
  const niche = [audience, offer].filter(Boolean).join(", ");

  const prompt = `You are a launch coach for a new online business. The founder just published their store for the first time.

Store details:
- Brand name: ${brandName}
- Tagline: ${tagline}
- Niche/audience: ${niche}

Return a JSON object with exactly these two fields:
{
  "instagramCaption": "A compelling, authentic Instagram caption (150-180 chars) announcing the store launch. Include the brand name. Conversational tone, no hashtags, ends with one emoji.",
  "firstMove": "One specific, actionable first step they should take today to get their first customer. 1-2 sentences. Personal and direct, like a mentor speaking to them."
}

Only return valid JSON, no markdown fences.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);

    return NextResponse.json({
      instagramCaption: parsed.instagramCaption || "",
      firstMove: parsed.firstMove || "",
    });
  } catch {
    return NextResponse.json({ instagramCaption: "", firstMove: "" }, { status: 500 });
  }
}
