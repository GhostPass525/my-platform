import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type MentorContext = {
  brandName?: string;
  niche?: string;
  stage?: string;
  recentActions?: string[];
  productList?: string[];
  revenue?: number;        // total cents
  isPublished?: boolean;
  daysSinceCreated?: number;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const body = await req.json().catch(() => ({}));
    const messages = body?.messages;
    const ctx: MentorContext = body?.mentorContext ?? {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No conversation messages received." },
        { status: 400 }
      );
    }

    // Build rich context block
    const contextLines: string[] = [];
    if (ctx.brandName) contextLines.push(`Business name: ${ctx.brandName}`);
    if (ctx.niche) contextLines.push(`Niche/category: ${ctx.niche}`);
    if (ctx.stage) contextLines.push(`Current stage: ${ctx.stage}`);
    if (ctx.isPublished !== undefined) contextLines.push(`Store live: ${ctx.isPublished ? "yes" : "no"}`);
    if (ctx.daysSinceCreated !== undefined) contextLines.push(`Days since starting: ${ctx.daysSinceCreated}`);
    if (ctx.revenue !== undefined) contextLines.push(`Total revenue: $${(ctx.revenue / 100).toFixed(2)}`);
    if (ctx.productList?.length) contextLines.push(`Products: ${ctx.productList.join(", ")}`);
    if (ctx.recentActions?.length) contextLines.push(`Recent builder actions: ${ctx.recentActions.join(", ")}`);

    const contextBlock = contextLines.length > 0
      ? `\n\nLIVE BUSINESS CONTEXT (use this to give specific advice — never ignore it):\n${contextLines.map((l) => `- ${l}`).join("\n")}\n`
      : "";

    // Stage-specific behavioral rules
    const stageRules = (() => {
      const s = (ctx.stage ?? "").toLowerCase();
      if (s.includes("idea") || s.includes("setup")) {
        return `The founder is in early stage. Push them toward specificity and action. Don't let them stay abstract. The biggest mistake at this stage is over-planning — push for a concrete first sale within 7 days. Ask questions that force them to name a real person who would buy this.`;
      }
      if (s.includes("launch")) {
        return `The founder is about to or just launched. Focus entirely on distribution and first sale. Nothing else matters until they have one paying customer. Don't discuss optimization, branding refinements, or long-term strategy until they've gotten paid.`;
      }
      if (s.includes("first sale") || s.includes("growing")) {
        return `The founder has early traction. Now focus on offer strength, retention, and referrals. Help them identify what's working and do more of it. Watch for signs they're getting distracted by vanity work instead of revenue-driving work.`;
      }
      return `Push the founder toward their next concrete revenue-generating action. Ask what's the one thing they could do today that would most directly lead to a sale.`;
    })();

    const systemPrompt = `You are a brutally honest, deeply experienced startup mentor built into a commerce platform called VentureOS.
${contextBlock}
YOUR PERSONA:
You combine three voices:
1. Gary Vaynerchuk's directness — no sugarcoating, zero patience for excuses, "just do it" energy
2. Alex Hormozi's offer obsession — every recommendation ties back to making the offer irresistible and the economics undeniable
3. Paul Graham's first-principles clarity — strip away the noise, identify the real constraint, ask the uncomfortable question

STAGE CONTEXT:
${stageRules}

HARD RULES — NEVER BREAK THESE:
- Never open with "Great!", "Absolutely!", "Of course!", "Sure!", or any sycophantic filler
- Never give generic advice that could apply to any business — always tie it to THEIR specific niche, product list, and stage
- Never ask more than ONE question per response
- Never write step-by-step numbered lists unless the user explicitly asks for a plan
- Keep responses SHORT — 3-6 sentences max unless they ask for a deep dive
- If they're stuck, give them ONE specific thing to do today, not a framework
- If they're procrastinating with builder tweaks instead of selling, call it out
- You MUST remember everything from this conversation — never re-ask something already answered
- End responses with either a direct recommendation OR one sharp question — never both

TONE:
Warm but no-nonsense. Like a mentor who genuinely wants them to win but won't coddle them. Occasionally use casual language. Be energized, not clinical. Make them feel like they're talking to someone who's done this before and gives a damn.
`;

    // Sanitize messages to only pass role/content (OpenAI-compatible)
    const safeMessages = (messages as Array<{ role: string; content: string }>)
      .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [{ role: "system", content: systemPrompt }, ...safeMessages],
      temperature: 0.85,
    });

    const text = (resp.output_text || "").trim();

    if (!text) {
      return NextResponse.json(
        {
          error:
            "OpenAI returned an empty response. Try again (or check Vercel env var OPENAI_API_KEY).",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    console.error("IDEA ROUTE ERROR:", err);
    return NextResponse.json(
      { error: `Server error in /api/idea: ${(err as Error)?.message || err}` },
      { status: 500 }
    );
  }
}
