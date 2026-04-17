import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

async function generateSiteMetadata(messages: Array<{ role: string; content: string }>) {
  const systemPrompt = `You are Inflection Point.

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
- Must be valid JSON`;

  // Build alternating message list — Anthropic requires user/assistant alternation.
  // Compress all conversation turns into a single user message to avoid 400 errors.
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "Founder" : "Mentor"}: ${m.content}`)
    .join("\n\n");

  const resp = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Here is the conversation so far:\n\n${conversationText}\n\nNow generate the landing page JSON.`,
      },
    ],
  });

  const text = resp.content[0]?.type === "text" ? resp.content[0].text.trim() : "";
  if (!text) throw new Error("Empty metadata response from model.");
  return tryParseJSON(text);
}

async function generateUniqueStorefront(
  businessDescription: string,
  mentorConversation: string
) {
  const prompt = `You are an elite ecommerce designer with 15 years of experience designing high-converting online stores for premium brands. Your task is to generate a complete, unique, stunning storefront for this specific business.

BUSINESS DETAILS:
${businessDescription}

CONVERSATION CONTEXT (use this to understand brand personality, target customer, and tone):
${mentorConversation.slice(-3000)}

DESIGN REQUIREMENTS:
1. Generate a COMPLETELY UNIQUE design — no generic layouts
2. Choose a color palette that is perfectly calibrated for this specific niche
3. Choose Google Fonts that express this brand's personality
4. Write ALL copy specifically for this business — no placeholder text
5. Create a hero that immediately communicates the unique value proposition
6. Make it look like a $15,000 custom website built by a top agency
7. Include subtle CSS animations and micro-interactions
8. Make it fully mobile responsive

DESIGN PHILOSOPHY BY NICHE:
- Luxury/premium/jewelry: Deep blacks or creams, serif fonts (Cormorant Garamond, Playfair Display), extreme whitespace, editorial photography areas, gold accents
- Fitness/sports/energy: Bold reds/blacks or electric colors, condensed fonts (Oswald, Bebas Neue), dynamic diagonal layouts, high contrast
- Eco/sustainable/natural: Sage greens, warm creams, earthy tones, organic rounded shapes, serif body font (Lora), nature-inspired details
- Tech/software/digital: Clean whites or deep navy/dark, sharp edges, modern sans (DM Sans, Plus Jakarta Sans), data-forward layouts
- Fashion/clothing/streetwear: Editorial black and white OR bold brand color, strong typography, asymmetric grid, magazine feel
- Beauty/skincare/wellness: Blush pinks, lavenders, or clean whites, elegant serifs, soft shadows, clean minimalism
- Food/restaurant/cafe: Warm ambers, deep greens or rich blacks, characterful display fonts, appetite-driven layout
- Art/creative/handmade: Expressive colors, unique typography, gallery-style grid, personality-forward
- Kids/family/education: Bright friendly colors, rounded fonts, playful but trustworthy
- Pet/animals: Warm friendly tones, approachable fonts, joyful energy

TECHNICAL REQUIREMENTS:
- Return ONLY a complete HTML document — no explanation, no markdown
- Embedded CSS in a <style> tag with Google Fonts via @import
- CSS custom properties for easy customization: --primary, --secondary, --accent, --bg, --surface, --text, --text-muted, --border
- Sections: nav, hero, features/benefits (3 cards), products grid, about/story, social proof, footer
- IMPORTANT — every section MUST have both data-section and id attributes:
  - Hero: <section data-section="hero" id="home">
  - Products/Collection: <section data-section="products" id="collection">
  - About/Story/Philosophy: <section data-section="about" id="about">
  - Contact/Footer area: <section data-section="contact" id="contact">
- Navigation links MUST use these exact anchor hrefs: <a href="#collection">, <a href="#about">, <a href="#contact">
- Add html { scroll-behavior: smooth; } in the CSS
- Product cards: <div data-product-id="1" class="product-card">
- Each product card MUST have the product name in an <h3> tag
- Stripe checkout button on each product: <button class="add-to-cart" data-price="49">Add to Cart — $49</button>
- Navigation: logo left, links center, CTA button right
- Hero: Full viewport height, compelling headline, subheading, primary CTA
- CSS animations: fade-in on scroll using @keyframes, hover effects on buttons and cards
- No JavaScript — CSS only animations
- No external images — use CSS gradients as hero backgrounds, light gray rectangles as product image placeholders with the product name inside
- Footer: links, copyright, social icons (SVG)
- Mobile responsive: stack nav at 768px, single column products at 480px

MICRO-DETAIL REQUIREMENTS (these separate good from great):
- Button hover: subtle scale(1.02) + shadow increase, 200ms ease
- Product card hover: translateY(-4px) + shadow, smooth transition
- Nav links: underline animation from left on hover
- Section transitions: staggered fade-in with animation-delay
- Smooth scroll behavior on html element
- Border radius consistency: 8px for cards, 6px for buttons, 4px for inputs
- Line heights: 1.2 for headings, 1.7 for body text
- Letter spacing: 0.05em on uppercase labels, -0.02em on large headings

OUTPUT: Return ONLY the complete HTML. Start with <!DOCTYPE html> and end with </html>. No other text.`;

  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  console.log("[generate] HTML response stop_reason:", resp.stop_reason);
  console.log("[generate] HTML content[0] type:", resp.content[0]?.type);

  const raw = resp.content[0]?.type === "text" ? resp.content[0].text : "";
  console.log("[generate] HTML raw length:", raw.length, "first 120 chars:", raw.slice(0, 120));

  // Strip any markdown code fences Claude may wrap around the HTML
  const html = raw
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  console.log("[generate] HTML after strip, length:", html.length, "starts with:", html.slice(0, 60));
  return html;
}

export async function POST(req: Request) {
  console.log("[generate] POST called");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[generate] user:", user.id);

  try {
    const body = await req.json().catch(() => ({}));
    const messages = body?.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No conversation messages provided." },
        { status: 400 }
      );
    }

    console.log("[generate] message count:", messages.length);

    const businessDescription = (messages as Array<{ role: string; content: string }>)
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    const mentorConversation = (messages as Array<{ role: string; content: string }>)
      .map((m) => `${m.role === "user" ? "Founder" : "Mentor"}: ${m.content}`)
      .join("\n\n");

    console.log("[generate] starting HTML + metadata generation in parallel");

    // Run both in parallel; metadata failure is non-fatal — we use a fallback
    const [htmlResult, metaResult] = await Promise.allSettled([
      generateUniqueStorefront(businessDescription, mentorConversation),
      generateSiteMetadata(messages as Array<{ role: string; content: string }>),
    ]);

    console.log("[generate] htmlResult status:", htmlResult.status);
    console.log("[generate] metaResult status:", metaResult.status);

    if (htmlResult.status === "rejected") {
      console.error("[generate] HTML generation failed:", htmlResult.reason);
      return NextResponse.json(
        { error: `Store generation failed: ${(htmlResult.reason as Error)?.message || htmlResult.reason}` },
        { status: 500 }
      );
    }

    const html = htmlResult.value;

    if (!html || !html.includes("<!DOCTYPE") && !html.includes("<html")) {
      console.error("[generate] HTML appears invalid, length:", html?.length, "content:", html?.slice(0, 200));
      return NextResponse.json(
        { error: "Claude returned invalid HTML. Please try again." },
        { status: 500 }
      );
    }

    // Use generated metadata if available; otherwise fall back to minimal defaults
    let site: Record<string, unknown>;
    if (metaResult.status === "fulfilled") {
      site = metaResult.value;
      console.log("[generate] metadata OK, brandName:", site.brandName);
    } else {
      console.warn("[generate] metadata failed (non-fatal):", (metaResult.reason as Error)?.message);
      // Extract a rough brand name from the first user message
      const firstUserMsg = (messages as Array<{ role: string; content: string }>).find(m => m.role === "user")?.content ?? "";
      site = {
        brandName: firstUserMsg.slice(0, 40) || "My Store",
        tagline: "",
        heroHeadline: "Welcome",
        heroSubheadline: "",
        primaryCTA: "Shop Now",
        audience: "",
        offer: "",
        firstProductOrService: "",
        sections: [],
        faq: [],
      };
    }

    console.log("[generate] returning html length:", html.length);
    return NextResponse.json({ site, html });
  } catch (err: unknown) {
    console.error("[generate] ROUTE ERROR:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Server generation error" },
      { status: 500 }
    );
  }
}
