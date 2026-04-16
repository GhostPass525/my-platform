import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const resp = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: "Generate the landing page JSON now." },
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
- Each section: <section data-section="hero">, <section data-section="products">, etc.
- Product cards: <div data-product-id="1" class="product-card">
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
- Input focus states: smooth border color transition
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

  const html = resp.content[0]?.type === "text" ? resp.content[0].text : "";
  return html.replace(/^```html\n?/i, "").replace(/\n?```$/i, "").trim();
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const messages = body?.messages;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "No conversation messages provided." },
        { status: 400 }
      );
    }

    const businessDescription = (messages as Array<{ role: string; content: string }>)
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    const mentorConversation = (messages as Array<{ role: string; content: string }>)
      .map((m) => `${m.role === "user" ? "Founder" : "Mentor"}: ${m.content}`)
      .join("\n\n");

    // Run metadata and HTML generation in parallel
    const [site, html] = await Promise.all([
      generateSiteMetadata(messages as Array<{ role: string; content: string }>),
      generateUniqueStorefront(businessDescription, mentorConversation),
    ]);

    return NextResponse.json({ site, html });
  } catch (err: unknown) {
    console.error("GENERATE ROUTE ERROR:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Server generation error" },
      { status: 500 }
    );
  }
}
