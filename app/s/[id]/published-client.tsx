"use client";

import { useState } from "react";

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
  imageDataUrl?: string; // legacy
  imageUrl?: string;     // preferred
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

  logoDataUrl?: string; // legacy
  heroImageDataUrl?: string; // legacy

  logoUrl?: string;     // preferred
  heroImageUrl?: string; // preferred

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

export default function PublishedClient({ site }: { site: SiteSpec }) {
  const [activeKey, setActiveKey] = useState<PageKey>("home");
  const t = site.theme;

  const pages = site.pages?.length
    ? site.pages
    : [{ id: "home", key: "home", name: "Home" }];

  const activePage = pages.find((p) => p.key === activeKey) ?? pages[0];

  const logoSrc = site.logoUrl || site.logoDataUrl;
  const heroSrc = site.heroImageUrl || site.heroImageDataUrl;

  return (
    <main
      className="min-h-screen p-6"
      style={{
        background: t.bg,
        color: t.text,
        fontFamily: fontStack(site.font),
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-2xl overflow-hidden border"
          style={{ borderColor: t.border, background: t.surface }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: t.border, background: "#fff" }}
          >
            <div className="flex items-center gap-3">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="h-9 w-9 rounded object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded" style={{ background: t.accent }} />
              )}
              <div>
                <div className="text-xs" style={{ color: t.mutedText }}>
                  {site.tagline}
                </div>
                <div className="text-lg font-semibold">{site.brandName}</div>
              </div>
            </div>

            <button
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: t.accent, color: "#fff" }}
            >
              {site.primaryCTA}
            </button>
          </div>

          {/* Nav */}
          <div
            className="px-5 py-3 border-b flex gap-2 flex-wrap"
            style={{ borderColor: t.border, background: t.bg }}
          >
            {pages.map((p) => {
              const active = p.key === activePage.key;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveKey(p.key)}
                  className="px-3 py-1.5 rounded-lg text-sm border transition"
                  style={{
                    borderColor: t.border,
                    background: active ? "rgba(37,99,235,0.10)" : "#fff",
                    color: t.text,
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          {/* Page content */}
          <div className="p-6 md:p-8" style={{ background: t.bg }}>
            {activePage.key === "products" ? (
              <ProductsPage site={site} />
            ) : activePage.key === "about" ? (
              <AboutPage site={site} />
            ) : activePage.key === "contact" ? (
              <ContactPage site={site} />
            ) : (
              <HomePage site={site} heroSrc={heroSrc} />
            )}

            <div className="mt-10 text-xs" style={{ color: t.mutedText }}>
              © {new Date().getFullYear()} {site.brandName}
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-500">Published with VentureOS</div>
      </div>
    </main>
  );
}

function HomePage({ site, heroSrc }: { site: SiteSpec; heroSrc?: string }) {
  const t = site.theme;

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
            {site.heroHeadline}
          </h1>
          <p className="mt-3 whitespace-pre-line" style={{ color: t.mutedText }}>
            {site.heroSubheadline}
          </p>

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
          {heroSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroSrc} alt="Hero" className="w-full h-64 object-cover" />
          ) : (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: t.mutedText }}>
              No hero image set
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ProductsPage({ site }: { site: SiteSpec }) {
  const t = site.theme;

  return (
    <>
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-semibold">Products</h2>
        <div className="text-sm" style={{ color: t.mutedText }}>Catalog</div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {(site.products || []).map((p) => {
          const img = p.imageUrl || p.imageDataUrl;
          return (
            <div key={p.id} className="rounded-2xl p-4 border" style={{ borderColor: t.border, background: "#fff" }}>
              <div className="rounded-xl overflow-hidden mb-3 border" style={{ borderColor: t.border }}>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={p.name} className="w-full h-36 object-cover" />
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
          );
        })}
      </div>
    </>
  );
}

function AboutPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: t.border, background: "#fff" }}>
      <h2 className="text-2xl font-semibold">About</h2>
      <p className="mt-3" style={{ color: t.mutedText }}>
        {site.brandName} exists to deliver a clear promise: {site.offer}.
      </p>
    </div>
  );
}

function ContactPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: t.border, background: "#fff" }}>
      <h2 className="text-2xl font-semibold">Contact</h2>
      <p className="mt-2" style={{ color: t.mutedText }}>
        Keep contact simple and professional.
      </p>
    </div>
  );
}
