import type { MentorContext } from "./context";

/**
 * Builds the context block that gets prepended to the mentor's system prompt.
 * This is injected into the existing /api/idea route's prompt, not used standalone.
 */
export function buildContextBlock(ctx: MentorContext): string {
  const name = ctx.user.firstName ?? "this founder";
  const { business: biz, performance: perf, integrations: int, journey, conversationHistory: hist } = ctx;

  const productLines = biz.productsList.length
    ? biz.productsList.map((p) => `  • ${p.name} — $${p.priceUsd.toFixed(2)}`).join("\n")
    : "  (none detected yet)";

  const recentTopicLines = hist.recentTopics.length
    ? hist.recentTopics.map((t) => `  • "${t}"`).join("\n")
    : "  (no prior messages)";

  const stripeWarning = !int.stripeOnboarded
    ? `\n⚠️  STRIPE NOT ONBOARDED — this user CANNOT receive payments right now. Mention this whenever they talk about sales, customers, or going live.`
    : "";

  const lastMessageNote =
    hist.daysSinceLastMessage >= 7
      ? `\nNote: ${hist.daysSinceLastMessage} days since their last message — acknowledge the gap warmly if relevant.`
      : "";

  return `=== LIVE BUSINESS CONTEXT (treat this as ground truth — never ignore it) ===

FOUNDER
  Name: ${name}
  Days on Volcity: ${ctx.user.joinedDaysAgo}
  Subscription: ${ctx.user.subscriptionStatus ?? "none"}

BUSINESS
  Project: ${biz.hasProject ? biz.projectName ?? "(unnamed)" : "none created yet"}
  Niche / store title: ${biz.niche ?? "unknown"}
  Status: ${biz.isLive ? `Live${biz.publishedDaysAgo !== null ? ` (${biz.publishedDaysAgo}d ago)` : ""}` : biz.hasProject ? "Draft — not published" : "No store built yet"}
  Products (${biz.productCount}):
${productLines}

PERFORMANCE
  Total revenue: $${perf.totalRevenueDollars.toFixed(2)}
  Last 7 days: $${perf.salesLast7DaysDollars.toFixed(2)}
  Total orders: ${perf.ordersCount}
  Last order: ${perf.lastOrderDaysAgo !== null ? `${perf.lastOrderDaysAgo}d ago` : "never"}

INTEGRATIONS
  Stripe connected: ${int.stripeConnected ? "yes" : "NO"}
  Stripe onboarded (can take money): ${int.stripeOnboarded ? "YES" : "NO"}
  Printful: ${int.printfulConnected ? "connected" : "not connected"}
${stripeWarning}
JOURNEY
  Stage: ${journey.stage}
  Next action: ${journey.nextAction}

CONVERSATION HISTORY
  Messages exchanged: ${hist.totalMessages}
  Last message: ${hist.daysSinceLastMessage < 999 ? `${hist.daysSinceLastMessage}d ago` : "first session"}
  Recent topics:
${recentTopicLines}
${lastMessageNote}
=== END CONTEXT — use it to make every response specific to ${name}'s actual business ===

`;
}

/**
 * Generates a smart, context-aware greeting for first-session or returning users.
 * Used by /api/mentor/greeting.
 */
export function buildGreeting(ctx: MentorContext): string {
  const name = ctx.user.firstName ? `, ${ctx.user.firstName}` : "";
  const { business: biz, performance: perf, journey } = ctx;

  // No project yet
  if (!biz.hasProject) {
    return `Hey${name} — ready to build your first business? Tell me what you're thinking about selling and we'll figure out if it's the right idea.`;
  }

  // Has project, not published
  if (!biz.isLive) {
    if (!ctx.integrations.stripeOnboarded) {
      return `Welcome back${name}. ${biz.projectName ?? "Your store"} is in draft and Stripe isn't connected yet — you can't take money until that's set up. Want to fix that now?`;
    }
    return `Welcome back${name}. ${biz.projectName ?? "Your store"} is still in draft. What's holding you back from publishing?`;
  }

  // Live, no sales
  if (perf.ordersCount === 0) {
    const days = biz.publishedDaysAgo ?? 0;
    const timeStr = days === 0 ? "just went live" : `has been live ${days} day${days === 1 ? "" : "s"}`;
    return `${biz.projectName ?? "Your store"} ${timeStr} with 0 orders${name ? `, ${ctx.user.firstName}` : ""}. Let's change that — what have you tried so far to get customers?`;
  }

  // Has sales
  const revenueStr = `$${perf.totalRevenueDollars.toFixed(2)}`;
  const orderStr = `${perf.ordersCount} order${perf.ordersCount === 1 ? "" : "s"}`;
  if (journey.stage === "growing") {
    return `You've made ${revenueStr} across ${orderStr}${name ? `, ${ctx.user.firstName}` : ""}. Solid start. What are you working on to keep the momentum going?`;
  }
  return `You've made ${revenueStr} so far${name ? `, ${ctx.user.firstName}` : ""}. That first sale proves the idea works — now let's get the next one. What happened with that first order?`;
}
