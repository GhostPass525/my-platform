import { createServiceClient } from "@/utils/supabase/service";

export type MentorContext = {
  user: {
    firstName: string | null;
    joinedDaysAgo: number;
    subscriptionStatus: string | null;
  };
  discovery?: {
    whyThisBusiness: string;
    topInterests: string[];
    chosenIdeaRationale: string;
  };
  business: {
    hasProject: boolean;
    projectName: string | null;
    niche: string | null;
    isLive: boolean;
    publishedDaysAgo: number | null;
    productCount: number;
    productsList: Array<{ name: string; priceUsd: number }>;
  };
  performance: {
    totalRevenueDollars: number;
    salesLast7DaysDollars: number;
    ordersCount: number;
    lastOrderDaysAgo: number | null;
  };
  integrations: {
    stripeConnected: boolean;
    stripeOnboarded: boolean;
    printfulConnected: boolean;
  };
  journey: {
    stage: "idea" | "setup" | "launch" | "first_sale" | "growing";
    nextAction: string;
  };
  conversationHistory: {
    totalMessages: number;
    daysSinceLastMessage: number;
    recentTopics: string[];
  };
};

const NEXT_ACTIONS: Record<MentorContext["journey"]["stage"], string> = {
  idea:       "Create a store by describing your business in the builder",
  setup:      "Connect Stripe so you can accept payments, then publish",
  launch:     "Share your store link and get your first paying customer",
  first_sale: "Find out exactly how that first customer found you and repeat it",
  growing:    "Double down on the channel that drives most orders",
};

export async function getMentorContext(userId: string): Promise<MentorContext> {
  const db = createServiceClient();
  const now = Date.now();

  const daysSince = (dateStr: string | null | undefined): number | null => {
    if (!dateStr) return null;
    return Math.floor((now - new Date(dateStr).getTime()) / 86_400_000);
  };

  // Fetch all base data in parallel
  const [
    { data: profile },
    { data: project },
    { data: subscription },
    { data: stripeConnect },
    { data: printful },
    { data: orders },
    { data: recentMessages },
  ] = await Promise.all([
    db.from("profiles")
      .select("first_name, created_at, discovery_answers")
      .eq("id", userId)
      .maybeSingle(),
    db.from("projects")
      .select("id, name, status, published_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("stripe_connect")
      .select("connected_account_id, charges_enabled")
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("printful_connections")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("orders")
      .select("total, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("mentor_messages")
      .select("content, role, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Fetch the published HTML for the most recent project (separate query to avoid join complexity)
  let publishedHtml: string | null = null;
  if (project?.id) {
    const { data: site } = await db
      .from("sites")
      .select("published_html")
      .eq("project_id", project.id)
      .maybeSingle();
    publishedHtml = (site as any)?.published_html ?? null;
  }

  // Sales calculations
  const orderList = orders ?? [];
  const totalRevenueCents = orderList.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const salesLast7dCents = orderList
    .filter((o) => (daysSince(o.created_at) ?? 999) <= 7)
    .reduce((s, o) => s + Number(o.total ?? 0), 0);

  // Product / niche extraction from published HTML
  const productsList = publishedHtml ? extractProducts(publishedHtml) : [];
  const niche = publishedHtml ? extractNiche(publishedHtml) : (project?.name ?? null);

  // Status flags
  const isLive = project?.status === "live";
  const stripeOnboarded = !!stripeConnect?.charges_enabled;
  const ordersCount = orderList.length;

  // Journey stage — mirrors computeStageIndex logic in lib/journey.ts
  const stage = deriveStage({
    hasProject: !!project,
    stripeOnboarded,
    isLive,
    ordersCount,
  });

  // Extract discovery context if available
  const discoveryAnswers = (profile as any)?.discovery_answers ?? null;
  let discovery: MentorContext["discovery"] | undefined;
  if (discoveryAnswers?.chosenIdea) {
    const idea = discoveryAnswers.chosenIdea;
    const conversation: Array<{ role: string; content: string }> = discoveryAnswers.conversation ?? [];
    const userAnswers = conversation
      .filter((m) => m.role === "user")
      .map((m) => m.content.slice(0, 100))
      .slice(0, 5);
    discovery = {
      whyThisBusiness: idea.whyFits ?? "",
      topInterests: userAnswers,
      chosenIdeaRationale: `${idea.name} — ${idea.tagline}. ${idea.whyFits}`,
    };
  }

  return {
    user: {
      firstName: profile?.first_name ?? null,
      joinedDaysAgo: daysSince(profile?.created_at) ?? 0,
      subscriptionStatus: subscription?.status ?? null,
    },
    discovery,
    business: {
      hasProject: !!project,
      projectName: project?.name ?? null,
      niche,
      isLive,
      publishedDaysAgo: isLive ? daysSince(project?.published_at) : null,
      productCount: productsList.length,
      productsList: productsList.slice(0, 10),
    },
    performance: {
      totalRevenueDollars: totalRevenueCents / 100,
      salesLast7DaysDollars: salesLast7dCents / 100,
      ordersCount,
      lastOrderDaysAgo: orderList[0] ? daysSince(orderList[0].created_at) : null,
    },
    integrations: {
      stripeConnected: !!stripeConnect?.connected_account_id,
      stripeOnboarded,
      printfulConnected: !!printful,
    },
    journey: {
      stage,
      nextAction: NEXT_ACTIONS[stage],
    },
    conversationHistory: {
      totalMessages: recentMessages?.length ?? 0,
      daysSinceLastMessage: recentMessages?.[0]
        ? (daysSince(recentMessages[0].created_at) ?? 0)
        : 999,
      recentTopics: extractTopics(recentMessages ?? []),
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function deriveStage(input: {
  hasProject: boolean;
  stripeOnboarded: boolean;
  isLive: boolean;
  ordersCount: number;
}): MentorContext["journey"]["stage"] {
  if (!input.hasProject) return "idea";
  if (!input.isLive) return "setup";
  if (input.ordersCount === 0) return "launch";
  if (input.ordersCount < 5) return "first_sale";
  return "growing";
}

function extractProducts(html: string): Array<{ name: string; priceUsd: number }> {
  const results: Array<{ name: string; priceUsd: number }> = [];
  const seen = new Set<string>();

  // Try both attribute orderings since HTML generation may vary
  const patterns = [
    /data-product-name="([^"]+)"[^>]*?data-product-price="(\d+)"/g,
    /data-product-price="(\d+)"[^>]*?data-product-name="([^"]+)"/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const [name, priceCents] =
        re.source.startsWith("data-product-name")
          ? [m[1], m[2]]
          : [m[2], m[1]];
      if (!seen.has(name)) {
        seen.add(name);
        results.push({ name, priceUsd: parseInt(priceCents, 10) / 100 });
      }
    }
  }

  return results;
}

function extractNiche(html: string): string | null {
  const titleMatch = html.match(/<title>([^<]{1,80})<\/title>/i);
  if (titleMatch?.[1]?.trim()) return titleMatch[1].trim();
  const h1Match = html.match(/<h1[^>]*>([^<]{1,80})<\/h1>/i);
  return h1Match?.[1]?.trim() ?? null;
}

function extractTopics(
  messages: Array<{ content: string; role: string }>
): string[] {
  return messages
    .filter((m) => m.role === "user")
    .slice(0, 3)
    .map((m) => m.content.slice(0, 80).replace(/\s+/g, " ").trim());
}
