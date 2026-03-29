"use client";

import { useMemo, useState } from "react";
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
  | "DM Sans"
  | "Manrope"
  | "Work Sans"
  | "Poppins"
  | "Nunito"
  | "Raleway"
  | "Josefin Sans"
  | "Montserrat"
  | "Space Grotesk"
  | "Syne"
  | "Oswald"
  | "Bebas Neue"
  | "Playfair Display"
  | "Cormorant Garamond"
  | "Lora"
  | "Merriweather"
  | "Fraunces"
  | "Crimson Pro"
  | "Instrument Serif"
  | "Source Serif 4"
  | "Libre Baskerville"
  | "Georgia"
  | "Times New Roman"
  | "Pacifico";

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

function fontStack(font: FontChoice): string {
  const fontRef = font.includes(" ") ? `"${font}"` : font;
  const serifFonts: FontChoice[] = ["Playfair Display", "Cormorant Garamond", "Lora", "Merriweather", "Fraunces", "Crimson Pro", "Instrument Serif", "Source Serif 4", "Libre Baskerville", "Georgia", "Times New Roman"];
  if (font === "Georgia") return `Georgia, "Times New Roman", Times, serif`;
  if (font === "Times New Roman") return `"Times New Roman", Times, serif`;
  if (serifFonts.includes(font)) return `${fontRef}, Georgia, "Times New Roman", serif`;
  if (font === "Bebas Neue") return `"Bebas Neue", Impact, "Arial Narrow", sans-serif`;
  if (font === "Pacifico") return `"Pacifico", cursive`;
  return `${fontRef}, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
}

function decodeSite(data: string): SiteSpec | null {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function PublishedClient() {
  const params  = useSearchParams();
  const data    = params.get("data") || "";
  const site    = useMemo(() => decodeSite(data), [data]);
  const [activeKey, setActiveKey] = useState<PageKey>("home");

  if (!site) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-sm w-full bg-white rounded-xl border border-slate-200 p-6 text-center">
          <div className="text-sm font-medium text-slate-700 mb-1">Invalid preview link</div>
          <p className="text-sm text-slate-400">This link is missing data or was copied incorrectly.</p>
        </div>
      </main>
    );
  }

  const t = site.theme;
  const pages = site.pages?.length
    ? site.pages
    : [{ id: "home", key: "home", name: "Home" }];
  const activePage = pages.find((p) => p.key === activeKey) ?? pages[0];

  return (
    <main
      className="min-h-screen py-8 px-4"
      style={{ background: "#f8fafc", fontFamily: fontStack(site.font) }}
    >
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-2xl overflow-hidden border"
          style={{ borderColor: t.border, boxShadow: "0 4px 24px rgba(15,23,42,0.08)" }}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: t.border, background: t.panel || "#fff" }}>
            <div className="flex items-center gap-2.5">
              {site.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={site.logoDataUrl} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-lg flex-shrink-0" style={{ background: t.accent }} />
              )}
              <div>
                <div className="font-semibold text-sm leading-tight" style={{ color: t.text }}>{site.brandName}</div>
                {site.tagline && <div className="text-xs leading-tight" style={{ color: t.mutedText }}>{site.tagline}</div>}
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: t.accent, color: "#fff" }}>
              {site.primaryCTA}
            </button>
          </div>

          {/* Nav */}
          <div className="px-4 py-2 border-b flex gap-0.5 flex-wrap" style={{ borderColor: t.border, background: t.bg }}>
            {pages.map((p) => {
              const active = p.key === activePage.key;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveKey(p.key)}
                  className="px-3 py-1.5 rounded-md text-sm transition-all duration-150"
                  style={{ background: active ? `${t.accent}14` : "transparent", color: active ? t.accent : t.mutedText, fontWeight: active ? 600 : 400 }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="p-6" style={{ background: t.bg, color: t.text }}>
            {activePage.key === "products" ? (
              <ProductsPage site={site} />
            ) : activePage.key === "about" ? (
              <AboutPage site={site} />
            ) : activePage.key === "contact" ? (
              <ContactPage site={site} />
            ) : (
              <HomePage site={site} />
            )}
            <div className="mt-10 pt-4 border-t text-xs" style={{ borderColor: t.border, color: t.mutedText }}>
              © {new Date().getFullYear()} {site.brandName}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400 text-center">
          Published with <a href="/" className="hover:underline">Volcity</a>
        </p>
      </div>
    </main>
  );
}

function HomePage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <>
      <div className="grid gap-8 md:grid-cols-2 items-center">
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">{site.heroHeadline}</h1>
          <p className="mt-3 leading-relaxed" style={{ color: t.mutedText }}>{site.heroSubheadline}</p>
          <div className="mt-5 flex gap-2.5">
            <button className="px-5 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90" style={{ background: t.accent, color: "#fff" }}>{site.primaryCTA}</button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-medium border transition hover:opacity-80" style={{ borderColor: t.border, background: "transparent" }}>Learn more</button>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: t.border }}>
          {site.heroImageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.heroImageDataUrl} alt="Hero" className="w-full h-64 object-cover" />
          ) : (
            <div className="h-64 flex items-center justify-center text-sm" style={{ background: `${t.accent}08`, color: t.mutedText }}>No hero image set</div>
          )}
        </div>
      </div>

      {Array.isArray(site.sections) && site.sections.length > 0 && (
        <div className="mt-10 space-y-3">
          {site.sections.map((sec, idx) => (
            <div key={`${sec.title}-${idx}`} className="rounded-xl border p-5" style={{ borderColor: t.border, background: t.surface || "#fff" }}>
              <h3 className="text-base font-semibold mb-2">{sec.title}</h3>
              {Array.isArray(sec.bullets) && sec.bullets.length > 0 && (
                <ul className="space-y-1.5">
                  {sec.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm items-start">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: t.accent }} />
                      <span style={{ color: t.mutedText }}>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {Array.isArray(site.faq) && site.faq.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl font-bold mb-4">FAQ</h3>
          <div className="space-y-2">
            {site.faq.map((item, idx) => (
              <details key={idx} className="rounded-xl border p-4" style={{ borderColor: t.border, background: t.surface || "#fff" }}>
                <summary className="cursor-pointer font-medium text-sm">{item.q}</summary>
                <div className="mt-2 text-sm leading-relaxed" style={{ color: t.mutedText }}>{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ProductsPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <>
      <h2 className="text-2xl font-bold tracking-tight mb-6">Products</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {(site.products || []).map((p) => (
          <div key={p.id} className="rounded-xl border overflow-hidden" style={{ borderColor: t.border, background: t.surface || "#fff" }}>
            <div className="overflow-hidden">
              {p.imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageDataUrl} alt={p.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="h-40 flex items-center justify-center text-xs" style={{ background: `${t.accent}08`, color: t.mutedText }}>No image</div>
              )}
            </div>
            <div className="p-4">
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-sm font-semibold mt-0.5" style={{ color: t.accent }}>{p.price}</div>
              <button className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: t.accent, color: "#fff" }}>Add to cart</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AboutPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div className="rounded-xl border p-6" style={{ borderColor: t.border, background: t.surface || "#fff" }}>
      <h2 className="text-2xl font-bold tracking-tight mb-3">About</h2>
      <p className="leading-relaxed" style={{ color: t.mutedText }}>
        {site.brandName} exists to deliver a clear promise: {site.offer}.
      </p>
    </div>
  );
}

function ContactPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div className="rounded-xl border p-6" style={{ borderColor: t.border, background: t.surface || "#fff" }}>
      <h2 className="text-2xl font-bold tracking-tight mb-3">Contact</h2>
      <p className="leading-relaxed" style={{ color: t.mutedText }}>
        Keep contact simple and professional.
      </p>
      <div className="mt-3 text-sm" style={{ color: t.mutedText }}>
        Email: support@{site.brandName.toLowerCase().replace(/\s+/g, "")}.com
      </div>
    </div>
  );
}
