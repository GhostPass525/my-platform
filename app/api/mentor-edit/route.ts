import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { html, instruction } = body;

    if (!html || !instruction) {
      return NextResponse.json({ error: "Missing html or instruction" }, { status: 400 });
    }

    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: `You are an expert web developer editing a live HTML storefront. Make ONLY the specific changes the user requests — do not restructure or redesign anything not mentioned. Preserve all existing styles, sections, and content. Return the complete modified HTML document starting with <!DOCTYPE html>. After the closing </html> tag, on a new line write REPLY: followed by a short 1-sentence confirmation of what you changed (e.g. "Done — I've made the hero button orange.").`,
      messages: [
        {
          role: "user",
          content: `Here is the current storefront HTML:\n\n${html}\n\nInstruction: ${instruction}`,
        },
      ],
    });

    const raw = resp.content[0]?.type === "text" ? resp.content[0].text.trim() : "";

    // Extract reply after </html>
    const replyMatch = raw.match(/REPLY:\s*([\s\S]+)$/);
    const reply = replyMatch
      ? replyMatch[1].trim().split("\n")[0]
      : "Done! Let me know if you'd like any other changes.";

    // Everything before REPLY: is the HTML
    const htmlPart = replyMatch ? raw.slice(0, raw.lastIndexOf("REPLY:")).trim() : raw;

    // Strip markdown code fences if present
    const cleanHtml = htmlPart
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    if (!cleanHtml || (!cleanHtml.includes("<!DOCTYPE") && !cleanHtml.includes("<html"))) {
      console.error("[mentor-edit] invalid HTML returned, length:", cleanHtml.length);
      return NextResponse.json({
        html: null,
        reply: "I couldn't apply that change cleanly — can you rephrase or be more specific?",
      });
    }

    return NextResponse.json({ html: cleanHtml, reply });
  } catch (err: unknown) {
    console.error("[mentor-edit] error:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Edit failed" },
      { status: 500 }
    );
  }
}
