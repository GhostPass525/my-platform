import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCachedMentorContext } from "@/lib/mentor/contextCache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        suggestion: "Sign in to get personalised suggestions.",
        actionLabel: "Sign in",
        actionHref: "/login",
        actionType: "href",
      });
    }

    const ctx = await getCachedMentorContext(user.id);
    const { business: biz, integrations: int, performance: perf } = ctx;

    // Rule 1: Stripe not onboarded (takes priority if store exists)
    if (biz.hasProject && !int.stripeOnboarded) {
      return NextResponse.json({
        suggestion: "Your store can't take money yet. Connect Stripe in 3 minutes and you'll be ready to make your first sale.",
        actionLabel: "Connect Stripe",
        actionHref: "/dashboard/connect",
        actionType: "href",
      });
    }

    // Rule 2: No business yet
    if (!biz.hasProject) {
      return NextResponse.json({
        suggestion: "Describe your business idea in the mentor chat to generate your first store.",
        actionLabel: "Open mentor",
        actionType: "mentor",
      });
    }

    // Rule 3: Has first sale
    if (perf.ordersCount >= 1) {
      const revenueStr = `$${perf.totalRevenueDollars.toFixed(2)}`;
      return NextResponse.json({
        suggestion: `You've made ${revenueStr} so far. Let's talk about getting your next 10 orders and turning this into a real income stream.`,
        actionLabel: "Ask mentor",
        actionType: "mentor",
      });
    }

    // Rule 4: Published, 0 sales — check age
    if (biz.isLive) {
      const daysLive = biz.publishedDaysAgo ?? 0;
      if (daysLive >= 3) {
        return NextResponse.json({
          suggestion: `${biz.projectName ?? "Your store"} has been live ${daysLive} day${daysLive === 1 ? "" : "s"} with 0 orders. Something is blocking customers — let's diagnose it together.`,
          actionLabel: "Ask mentor",
          actionType: "mentor",
        });
      }
      return NextResponse.json({
        suggestion: "Your first customer won't come from waiting. Let's figure out exactly where to post your store link to find them.",
        actionLabel: "Ask mentor",
        actionType: "mentor",
      });
    }

    // Rule 5: Has project but not live
    return NextResponse.json({
      suggestion: `${biz.projectName ?? "Your store"} is still in draft. Publishing takes 10 seconds — what's holding you back?`,
      actionLabel: "Ask mentor",
      actionType: "mentor",
    });
  } catch (err) {
    console.error("[dashboard/today] error:", err);
    return NextResponse.json({
      suggestion: "What's the one thing you can do today to move your business forward?",
      actionLabel: "Ask mentor",
      actionType: "mentor",
    });
  }
}
