export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const TTL = 60 * 60 * 24 * 30; // 30 days

function id() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function prepareForPublish(html: string, projectId: string): string {
  // Replace __PROJECT_ID__ placeholder the generator was told to include
  let out = html.replace(/__PROJECT_ID__/g, projectId);

  // Fallback: if the generator omitted the cart assets, inject them now
  const missingMeta   = !out.includes('volcity-project-id');
  const missingCss    = !out.includes('volcity-cart/cart.css');
  const missingScript = !out.includes('volcity-cart/cart.js');

  if (missingMeta || missingCss) {
    const inject = [
      missingMeta ? `<meta name="volcity-project-id" content="${projectId}">` : '',
      missingCss  ? `<link rel="stylesheet" href="https://volcity.to/volcity-cart/cart.css">` : '',
    ].join('\n');
    out = out.includes('</head>')
      ? out.replace('</head>', inject + '\n</head>')
      : out.replace('<body', inject + '\n<body');
    if (missingMeta) console.warn('[publish] fallback: injected volcity-project-id meta');
    if (missingCss)  console.warn('[publish] fallback: injected cart.css link');
  }

  if (missingScript) {
    const scriptTag = `<script src="https://volcity.to/volcity-cart/cart.js" defer></script>`;
    out = out.includes('</body>')
      ? out.replace('</body>', scriptTag + '\n</body>')
      : out + scriptTag;
    console.warn('[publish] fallback: injected cart.js script');
  }

  return out;
}

export async function POST(req: Request) {
  try {
    const { site, projectId } = await req.json();

    if (!site) {
      return NextResponse.json({ error: "Missing site" }, { status: 400 });
    }

    // Log what we received
    console.log("[publish] generatedHtml present:", !!site.generatedHtml);
    console.log("[publish] generatedHtml length:", site.generatedHtml?.length ?? 0);
    console.log("[publish] generatedHtml preview:", site.generatedHtml?.slice(0, 200) ?? "MISSING");
    console.log("[publish] projectId:", projectId);

    // ── Step 1: Authenticate the request ─────────────────────────
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[publish] user:", user.id);

    // ── Use service role for all DB writes to bypass RLS ─────────
    const db = createServiceClient();

    const publishId = id();
    const now = new Date().toISOString();

    // ── Step 2: Prepare HTML (replace __PROJECT_ID__ + fallback inject) ───
    let publishedHtml: string | null = null;
    if (site?.generatedHtml && typeof site.generatedHtml === "string") {
      console.log("[publish] pre-prepare length:", site.generatedHtml.length);
      publishedHtml = prepareForPublish(site.generatedHtml, projectId ?? publishId);
      console.log("[publish] post-prepare length:", publishedHtml.length);
      console.log("[publish] has volcity-project-id:", publishedHtml.includes("volcity-project-id"));
      console.log("[publish] has cart.js:", publishedHtml.includes("volcity-cart/cart.js"));
    } else {
      console.warn("[publish] no generatedHtml — published_html will be null");
    }

    // ── Step 3: Single upsert to sites with all fields ────────────
    if (projectId) {
      console.log("[publish] upserting to sites table…");
      // Build payload — include published_html if we have it
      const upsertPayload: Record<string, unknown> = {
        project_id: projectId,
        user_id: user.id,
        site_json: site,
        updated_at: now,
      };
      if (publishedHtml) {
        upsertPayload.published_html = publishedHtml;
        upsertPayload.published_at = now;
      }

      const { error: siteError } = await db.from("sites").upsert(upsertPayload, { onConflict: "project_id" });

      if (siteError) {
        // If the error is specifically about published_html not being in the schema cache,
        // fall back to upsert without it — publish still works via Redis
        if (siteError.message.includes("published_html") || siteError.message.includes("schema cache")) {
          console.warn("[publish] published_html column not in schema cache — retrying without it");
          const { error: fallbackError } = await db.from("sites").upsert(
            { project_id: projectId, user_id: user.id, site_json: site, updated_at: now },
            { onConflict: "project_id" }
          );
          if (fallbackError) {
            console.error("[publish] fallback upsert error:", fallbackError);
            return NextResponse.json({ error: `Failed to save site: ${fallbackError.message}` }, { status: 500 });
          }
          console.log("[publish] site saved OK (without published_html — run migration to enable)");
        } else {
          console.error("[publish] site upsert error:", siteError);
          return NextResponse.json({ error: `Failed to save site: ${siteError.message}` }, { status: 500 });
        }
      } else {
        console.log("[publish] site upserted OK");
      }
    } else {
      console.log("[publish] no projectId — skipping sites table write");
    }

    // ── Step 5: Update projects.status = 'live' ───────────────────
    if (projectId) {
      console.log("[publish] updating projects.status = live…");
      const { error: statusError } = await db.from("projects")
        .update({ status: "live", published_at: now })
        .eq("id", projectId)
        .eq("user_id", user.id);
      if (statusError) {
        console.error("[publish] projects status update error:", statusError);
        // Non-fatal — column may not exist yet in older schemas
      } else {
        console.log("[publish] projects.status updated OK");
      }
    }

    // ── Step 6: Store in Redis for s/[id] route ───────────────────
    const siteToStore = publishedHtml
      ? { ...site, generatedHtml: publishedHtml }
      : site;

    await redis.set(`site:${publishId}`, siteToStore, { ex: TTL });
    await redis.set(`site-owner:${publishId}`, user.id, { ex: TTL });
    console.log("[publish] redis written, publishId:", publishId);

    return NextResponse.json({ id: publishId });
  } catch (e: any) {
    console.error("[publish] unexpected error:", e);
    return NextResponse.json(
      { error: e?.message || "Publish failed" },
      { status: 500 }
    );
  }
}
