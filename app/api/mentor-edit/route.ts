export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { html, instruction, images } = body as {
      html: string;
      instruction: string;
      images?: Array<{ data: string; mediaType: string }>;
    };

    if (!html || !instruction) {
      return NextResponse.json({ error: "Missing html or instruction" }, { status: 400 });
    }

    // Build user message — include images as vision blocks if provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any[] = [];
    if (images?.length) {
      for (const img of images) {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.data },
        });
      }
    }
    userContent.push({
      type: "text",
      text: `Here is the current storefront HTML:\n\n${html}\n\nInstruction: ${instruction}`,
    });

    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: `You are an expert web developer editing a live HTML storefront. Make ONLY the specific changes the user requests — do not restructure or redesign anything not mentioned. Preserve all existing styles, sections, and content. If the user provides an image and asks to place it somewhere in the store, embed it using an <img> tag with the base64 data URI directly as the src (data:image/...;base64,...).

PRICE CHANGES: When the user asks to change a product price, you MUST update ALL THREE of the following — missing any one will cause the cart to charge the wrong amount:
1. The visible price text in the HTML (e.g. change "$48" to "$65" in the element that displays it)
2. The data-product-price attribute on the matching Add to Cart button (value must be in CENTS: $65 = "6500", $48 = "4800")
3. The text content inside the Add to Cart button if it contains a price (e.g. "Add to Cart — $48" becomes "Add to Cart — $65")

Return the complete modified HTML document starting with <!DOCTYPE html>. After the closing </html> tag, on a new line write REPLY: followed by a short 1-sentence confirmation of what you changed (e.g. "Done — I've updated the Foundation Tank price to $65 everywhere.").`,
      messages: [{ role: "user", content: userContent }],
    });

    const raw = resp.content[0]?.type === "text" ? resp.content[0].text.trim() : "";

    // Extract reply after </html>
    const replyMatch = raw.match(/REPLY:\s*([\s\S]+)$/);
    const reply = replyMatch
      ? replyMatch[1].trim().split("\n")[0]
      : "Done! Let me know if you'd like any other changes.";

    // Everything before REPLY: is the HTML
    const htmlPart = replyMatch ? raw.slice(0, raw.lastIndexOf("REPLY:")).trim() : raw;

    // Extract HTML document — handles preamble text, code fences, trailing content
    const htmlMatch = htmlPart.match(/<!DOCTYPE\s+html[\s\S]*<\/html\s*>/i)
      ?? htmlPart.match(/<html[\s\S]*<\/html\s*>/i);

    const cleanHtml = htmlMatch
      ? htmlMatch[0].trim()
      : htmlPart.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    if (!cleanHtml || (!cleanHtml.includes("<!DOCTYPE") && !cleanHtml.includes("<html"))) {
      console.error("[mentor-edit] invalid HTML returned, length:", cleanHtml.length, "preview:", cleanHtml.slice(0, 200));
      return NextResponse.json({
        html: null,
        reply: "I couldn't apply that change cleanly — can you rephrase or be more specific?",
      });
    }

    if (!cleanHtml.includes("</body>")) {
      console.error("[mentor-edit] truncated HTML — missing </body>, length:", cleanHtml.length);
      return NextResponse.json({
        html: null,
        reply: "The edit was too large to complete in one pass — try a smaller, more specific change.",
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
