import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function tryParseAIEditResponse(text: string): { result: string; siteUpdate?: Record<string, unknown> } {
  // Try to parse the full response as JSON
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && "result" in parsed) {
      return parsed as { result: string; siteUpdate?: Record<string, unknown> };
    }
  } catch {}

  // Try to find a JSON block within the text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed && typeof parsed === "object" && "result" in parsed) {
        return parsed as { result: string; siteUpdate?: Record<string, unknown> };
      }
    } catch {}
  }

  // Try to extract a JSON object from the text
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      if (parsed && typeof parsed === "object" && "result" in parsed) {
        return parsed as { result: string; siteUpdate?: Record<string, unknown> };
      }
    } catch {}
  }

  // Fallback: treat the entire text as the result
  return { result: text };
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
    const { messages, site } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      site: unknown;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const systemPrompt = `You are an AI site editor for VentureOS. When the user asks to change the site, respond conversationally AND return a siteUpdate JSON object with the specific fields to change.

You can modify: brandName, tagline, primaryCTA, heroHeadline, heroSubheadline, theme.accent, theme.bg, theme.text, font, sections (array), products (array).

ALWAYS respond with a JSON object in this exact format:
{
  "result": "Your conversational response here explaining what you changed",
  "siteUpdate": {
    "fieldToChange": "new value"
  }
}

For nested theme changes, use the theme object: { "theme": { "accent": "#newcolor" } }
Only include fields that need to change in siteUpdate.
If no site change is needed (e.g. the user is asking a question), set siteUpdate to null or omit it.
Return ONLY the JSON object, no markdown, no code blocks, no extra text.

Current site context: ${JSON.stringify({ ...(site as Record<string, unknown>), logoDataUrl: undefined })}`;

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      input: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const text = resp.output_text?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response." },
        { status: 500 }
      );
    }

    const parsed = tryParseAIEditResponse(text);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("AI-EDIT ROUTE ERROR:", err);
    return NextResponse.json(
      { error: `Server error in /api/ai-edit: ${err?.message || err}` },
      { status: 500 }
    );
  }
}
