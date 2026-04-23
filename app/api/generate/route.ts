export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

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
    model: "claude-haiku-4-5-20251001",
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

function validateCartStructure(html: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!html.includes('volcity-project-id')) issues.push('Missing <meta name="volcity-project-id">');
  if (!html.includes('volcity-cart/cart.css')) issues.push('Missing cart.css <link>');
  if (!html.includes('volcity-cart/cart.js')) issues.push('Missing cart.js <script>');
  const buttonCount = (html.match(/data-add-to-cart/g) || []).length;
  if (buttonCount === 0) issues.push('No buttons have data-add-to-cart attribute');
  let invalidButtons = 0;
  for (const [btn] of html.matchAll(/<button[^>]*data-add-to-cart[^>]*>/g)) {
    const hasId    = /data-product-id="[^"]+"/.test(btn);
    const hasName  = /data-product-name="[^"]+"/.test(btn);
    const hasPrice = /data-product-price="\d+"/.test(btn);
    if (!hasId || !hasName || !hasPrice) invalidButtons++;
  }
  if (invalidButtons > 0) issues.push(`${invalidButtons} button(s) missing required data attributes`);
  return { valid: issues.length === 0, issues };
}

async function generateUniqueStorefront(
  businessDescription: string,
  mentorConversation: string
) {
  const prompt = `===========================================================
MANDATORY OUTPUT STRUCTURE — NON-NEGOTIABLE
===========================================================

You are generating HTML for a functional e-commerce store, not a design mockup. The store MUST work — customers must be able to add products to cart and check out. A beautiful store that can't accept payments is a failure.

REQUIRED IN <head> — copy exactly:
  <meta name="volcity-project-id" content="__PROJECT_ID__">
  <link rel="stylesheet" href="https://volcity.to/volcity-cart/cart.css">

REQUIRED AT END OF <body> — copy exactly:
  <script src="https://volcity.to/volcity-cart/cart.js" defer></script>

REQUIRED PRODUCT CARD STRUCTURE — every product must follow this pattern exactly:
<div class="product-card" data-product-card>
  <div class="product-image-placeholder">Product Name</div>
  <div class="product-info">
    <h3 class="product-name">Product Name</h3>
    <p class="product-desc">Short product description.</p>
    <div class="product-price">$48</div>
    <button
      class="add-to-cart"
      data-add-to-cart
      data-product-id="unique-slug"
      data-product-name="Product Name"
      data-product-price="4800"
    >Add to Cart — $48</button>
  </div>
</div>

PRICE FORMAT — data-product-price is always an INTEGER in CENTS:
  $48 → data-product-price="4800"
  $52.50 → data-product-price="5250"
  $120 → data-product-price="12000"
  NEVER decimals. NEVER include $ sign. NEVER leave it as 0.

PRODUCT ID FORMAT — lowercase slug, unique per product, no spaces:
  Good: "foundation-tank", "apex-tee", "botanical-candle"
  Bad: "product-1", "item", "Foundation Tank"

BEFORE RETURNING, verify:
  1. <head> contains the volcity-project-id meta tag (content="__PROJECT_ID__")
  2. <head> contains the cart.css link tag
  3. <body> ends with the cart.js script tag
  4. EVERY product button has data-add-to-cart, data-product-id, data-product-name, data-product-price
  5. All data-product-price values are integers (cents), all data-product-id values are unique

===========================================================
END OF MANDATORY STRUCTURE
===========================================================

You are an elite ecommerce designer with 15 years of experience designing high-converting online stores for premium brands. Your task is to generate a complete, unique, stunning storefront for this specific business.

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
- CSS custom properties: --primary, --secondary, --accent, --bg, --surface, --text, --text-muted, --border
- Sections: nav, hero, features/benefits (3 cards), products grid, about/story, social proof, footer
- Every section MUST have both data-section and id attributes:
  - Hero: <section data-section="hero" id="home">
  - Products: <section data-section="products" id="collection">
  - About: <section data-section="about" id="about">
  - Contact/Footer: <section data-section="contact" id="contact">
- Navigation links: <a href="#collection">, <a href="#about">, <a href="#contact">
- html { scroll-behavior: smooth; } in CSS
- Navigation: logo left, links center, CTA button right
- Hero: full viewport height, compelling headline, subheading, primary CTA
- CSS animations: fade-in on scroll via @keyframes, hover effects on buttons and cards
- No JavaScript — CSS only animations (cart.js handles all interactivity)
- No external images — CSS gradients as hero backgrounds, styled divs as product image placeholders
- Footer: links, copyright, social icons (SVG)
- Mobile responsive: stack nav at 768px, single column products at 480px

MICRO-DETAIL REQUIREMENTS:
- Button hover: scale(1.02) + shadow increase, 200ms ease
- Product card hover: translateY(-4px) + shadow, smooth transition
- Nav links: underline animation from left on hover
- Section transitions: staggered fade-in with animation-delay
- Border radius: 8px cards, 6px buttons, 4px inputs
- Line heights: 1.2 headings, 1.7 body
- Letter spacing: 0.05em uppercase labels, -0.02em large headings

OUTPUT: Return ONLY the complete HTML. Start with <!DOCTYPE html> and end with </html>. No other text.`;

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 32000,
    messages: [{ role: "user", content: prompt }],
  });

  let raw = "";
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      raw += chunk.delta.text;
    }
  }

  const finalMsg = await stream.finalMessage();
  console.log("[generate] HTML response stop_reason:", finalMsg.stop_reason);
  console.log("[generate] HTML raw length:", raw.length, "first 120 chars:", raw.slice(0, 120));

  // Extract the HTML document — handles preamble text, code fences, trailing content
  const htmlMatch = raw.match(/<!DOCTYPE\s+html[\s\S]*<\/html\s*>/i)
    ?? raw.match(/<html[\s\S]*<\/html\s*>/i);

  const html = htmlMatch
    ? htmlMatch[0].trim()
    : raw.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  console.log("[generate] HTML after extract, length:", html.length, "starts with:", html.slice(0, 60));
  console.log("[generate] has </body>:", html.includes("</body>"), "has </html>:", html.includes("</html>"));

  if (!html.includes("</body>") || !html.includes("</html>")) {
    console.error("[generate] HTML is truncated — stop_reason:", finalMsg.stop_reason, "length:", html.length);
    throw new Error("Store generation produced truncated HTML — please try again.");
  }

  // Diagnostic logs for cart structure
  const cartBtnCount = (html.match(/data-add-to-cart/g) || []).length;
  console.log("[generate] data-add-to-cart button count:", cartBtnCount);
  console.log("[generate] sample button:", html.match(/<button[^>]*data-add-to-cart[^>]*>/)?.[0] ?? "NO MATCH");
  console.log("[generate] has volcity-project-id:", html.includes("volcity-project-id"));
  console.log("[generate] has cart.js:", html.includes("volcity-cart/cart.js"));
  console.log("[generate] has cart.css:", html.includes("volcity-cart/cart.css"));

  if (cartBtnCount === 0) {
    console.error("[generate] no data-add-to-cart buttons in output — model did not follow instructions");
    throw new Error("Store generation missing Add to Cart buttons — please try again.");
  }

  // Validate full cart structure and warn (non-fatal — surface issues in logs)
  const validation = validateCartStructure(html);
  if (!validation.valid) {
    console.warn("[generate] cart structure validation issues:", validation.issues.join(" | "));
  } else {
    console.log("[generate] cart structure validation passed");
  }

  return html;
}

export async function POST(req: Request) {
  console.log("[generate] POST called");
  console.log("[generate] ANTHROPIC_API_KEY present:", !!process.env.ANTHROPIC_API_KEY, "prefix:", process.env.ANTHROPIC_API_KEY?.slice(0, 10));

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[generate] user:", user.id);
  } catch (authErr: unknown) {
    console.error("[generate] auth error:", authErr);
    return NextResponse.json({ error: "Auth failed — try refreshing the page." }, { status: 500 });
  }

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

    if (!html || (!html.includes("<!DOCTYPE") && !html.includes("<html")) || !html.includes("</body>")) {
      console.error("[generate] HTML appears invalid or truncated, length:", html?.length, "content:", html?.slice(0, 200));
      return NextResponse.json(
        { error: "Store generation produced incomplete HTML. Please try again." },
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
