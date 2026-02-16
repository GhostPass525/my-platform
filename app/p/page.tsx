"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

type Theme = {
  accent: string;
  accent2: string;
  bg: string;
  panel: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
};

type FontChoice =
  | "Inter"
  | "Plus Jakarta Sans"
  | "Poppins"
  | "Montserrat"
  | "DM Sans"
  | "Georgia"
  | "Times New Roman";

type Product = {
  id: string;
  name: string;
  price: string;
  imageDataUrl?: string;
};

type PageKey = "home" | "products" | "about" | "contact" | string;

type Page = {
  id: string;
  key: PageKey;
  name: string;
};

type SiteSpec = {
  brandName: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCTA: string;
  audience: string;
  offer: string;
  firstProductOrService: string;
  sections: { title: string; bullets: string[] }[];
  faq: { q: string; a: string }[];

  theme: Theme;
  font: FontChoice;

  logoDataUrl?: string;
  heroImageDataUrl?: string;

  products: Product[];
  pages: Page[];
};

function fontStack(font: FontChoice) {
  switch (font) {
    case "Georgia":
      return `Georgia, "Times New Roman", Times, serif`;
    case "Times New Roman":
      return `"Times New Roman", Times, serif`;
    default:
      return `${font}, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
  }
}

function decodeSite(data: string): SiteSpec | null {
  try {
    // URL-safe base64 → normal base64
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function PublishedPage() {
  const params = useSearchParams();
  const data = params.get("data") || "";

  const site = useMemo(() => decodeSite(data), [data]);

  if (!site) {
    return (
      <main className="min-h-screen bg-white text-[#0b1220] p-8">
        <div className="max-w-xl mx-auto border rounded-2xl p-6">
          <div className="font-semibold text-lg">Publish link invalid</div>
          <div className="text-sm text-slate-600 mt-2">
            This link is missing data or was copied incorrectly.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen p-6"
      style={{
        background: site.theme.bg,
        color: site.theme.text,
        fontFamily: fontStack(site.font),
      }}
    >
      <div className="max-w-4xl mx-auto">
        <SitePreview site={site} />
      </div>

      <div className="max-w-4xl mx-auto mt-6 text-xs text-slate-500">
        Published with VentureOS
      </div>
    </main>
  );
}

/* ---------- Preview (same as builder preview, but no editor) ---------- */

function SitePreview({ site }: { site: SiteSpec }) {
  const t = site.theme;
  const pages = site.pages?.length ? site.pages : [{ id: "home", key: "home", name: "Home" }];
  const active = pages[0];

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: t.border, background: t.surface }}>
      {/* header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: t.border, background: "#fff" }}>
        <div className="flex items-center gap-3">
          {site.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoDataUrl} alt="Logo" className="h-9 w-9 rounded object-cover" />
          ) : (
            <div className="h-9 w-9 rounded" style={{ background: t.accent }} />
          )}
          <div>
            <div className="text-xs" style={{ color: t.mutedText }}>{site.tagline}</div>
            <div className="text-lg font-semibold">{site.brandName}</div>
          </div>
        </div>

        <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: t.accent, color: "#fff" }}>
          {site.primaryCTA}
        </button>
      </div>

      {/* nav (static on published page) */}
      <div className="px-5 py-3 border-b flex gap-2 flex-wrap" style={{ borderColor: t.border, background: t.bg }}>
        {pages.map((p) => (
          <div
            key={p.id}
            className="px-3 py-1.5 rounded-lg text-sm border"
            style={{
              borderColor: t.border,
              background: p.id === active.id ? "rgba(37,99,235,0.10)" : "#fff",
            }}
          >
            {p.name}
          </div>
        ))}
      </div>

      <div className="p-6 md:p-8" style={{ background: t.bg }}>
        <HomePage site={site} />
        <div className="mt-10 text-xs" style={{ color: t.mutedText }}>
          © {new Date().getFullYear()} {site.brandName}
        </div>
      </div>
    </div>
  );
}

function HomePage({ site }: { site: SiteSpec }) {
  const t = site.theme;

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight">{site.heroHeadline}</h1>
          <p className="mt-3 whitespace-pre-line" style={{ color: t.mutedText }}>{site.heroSubheadline}</p>

          <div className="mt-5 flex gap-2">
            <button className="px-5 py-3 rounded-lg font-medium" style={{ background: t.accent, color: "#fff" }}>
              {site.primaryCTA}
            </button>
            <button className="px-5 py-3 rounded-lg font-medium border" style={{ borderColor: t.border, background: "#fff" }}>
              Learn more
            </button>
          </div>

          <div className="mt-6 text-sm" style={{ color: t.mutedText }}>
            <strong style={{ color: t.text }}>Audience:</strong> {site.audience}
            <br />
            <strong style={{ color: t.text }}>Offer:</strong> {site.offer}
            <br />
            <strong style={{ color: t.text }}>First Product:</strong> {site.firstProductOrService}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: t.border, background: "#fff" }}>
          {site.heroImageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.heroImageDataUrl} alt="Hero" className="w-full h-64 object-cover" />
          ) : (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: t.mutedText }}>
              No hero image set
            </div>
          )}
        </div>
      </div>

      {/* products */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold">Catalog</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(site.products || []).map((p) => (
            <div key={p.id} className="rounded-2xl p-4 border" style={{ borderColor: t.border, background: "#fff" }}>
              <div className="rounded-xl overflow-hidden mb-3 border" style={{ borderColor: t.border }}>
                {p.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageDataUrl} alt={p.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="h-36 flex items-center justify-center text-xs" style={{ color: t.mutedText }}>
                    No image
                  </div>
                )}
              </div>

              <div className="font-medium">{p.name}</div>
              <div className="text-sm" style={{ color: t.mutedText }}>{p.price}</div>
              <button className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-medium" style={{ background: t.accent, color: "#fff" }}>
                Add to cart
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
