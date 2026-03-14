"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  imageUrl?: string;
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
  logoUrl?: string;
  heroImageUrl?: string;
  products: Product[];
  pages: Page[];
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

function fontStack(font: FontChoice) {
  switch (font) {
    case "Georgia":       return `Georgia, "Times New Roman", Times, serif`;
    case "Times New Roman": return `"Times New Roman", Times, serif`;
    default:              return `${font}, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  }
}

function parsePriceDollars(raw: string): number {
  const cleaned = (raw || "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export default function PublishedClient({ site }: { site: SiteSpec }) {
  const [activeKey, setActiveKey]     = useState<PageKey>("home");
  const [cartOpen, setCartOpen]       = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [cart, setCart]               = useState<CartItem[]>([]);

  const productsTopRef             = useRef<HTMLDivElement | null>(null);
  const [pendingScroll, setPendingScroll] = useState(false);

  const t = site.theme;

  const pages = site.pages?.length
    ? site.pages
    : [
        { id: "home",     key: "home",     name: "Home" },
        { id: "products", key: "products", name: "Products" },
        { id: "about",    key: "about",    name: "About" },
        { id: "contact",  key: "contact",  name: "Contact" },
      ];

  const activePage = pages.find((p) => p.key === activeKey) ?? pages[0];
  const logoSrc    = site.logoUrl || site.logoDataUrl;
  const heroSrc    = site.heroImageUrl || site.heroImageDataUrl;

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const subtotal  = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  const addToCart = (p: Product) => {
    const price = parsePriceDollars(p.price);
    const image = p.imageUrl || p.imageDataUrl;
    setCart((prev) => {
      const existing = prev.find((x) => x.productId === p.id);
      if (existing) return prev.map((x) => x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x);
      return [...prev, { productId: p.id, name: p.name, price, quantity: 1, image }];
    });
    setCartOpen(true);
  };

  const setQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev.map((x) => x.productId === productId ? { ...x, quantity: Math.max(1, qty) } : x)
          .filter((x) => x.quantity > 0)
    );
  };

  const removeItem = (productId: string) => setCart((prev) => prev.filter((x) => x.productId !== productId));

  const goProducts = () => { setActiveKey("products"); setPendingScroll(true); };
  const goAbout    = () => setActiveKey("about");

  useEffect(() => {
    if (activeKey !== "products" || !pendingScroll) return;
    const t = window.setTimeout(() => {
      productsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScroll(false);
    }, 50);
    return () => window.clearTimeout(t);
  }, [activeKey, pendingScroll]);

  const checkout = async () => {
    if (checkingOut || cart.length === 0) { if (cart.length === 0) setCartOpen(true); return; }
    setCheckingOut(true);
    try {
      const publishId = window.location.pathname.split("/").pop() || "";
      const res  = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishId, cart: cart.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) { alert(data?.error || "Checkout failed. Try again."); return; }
      window.location.href = data.url;
    } catch { alert("Checkout failed. Try again."); }
    finally  { setCheckingOut(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: t.bg, color: t.text, fontFamily: fontStack(site.font) }}>

      {/* ─── Header ─── */}
      <header
        className="sticky top-0 z-30 w-full border-b backdrop-blur-md"
        style={{ background: `${t.bg}f0`, borderColor: t.border }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg flex-shrink-0" style={{ background: t.accent }} />
            )}
            <div>
              <div className="font-semibold text-sm leading-tight">{site.brandName}</div>
              {site.tagline && (
                <div className="text-xs leading-tight" style={{ color: t.mutedText }}>{site.tagline}</div>
              )}
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {pages.map((p) => {
              const active = p.key === activePage.key;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveKey(p.key)}
                  className="px-3.5 py-2 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background:  active ? `${t.accent}14` : "transparent",
                    color:       active ? t.accent : t.mutedText,
                    fontWeight:  active ? 600 : 400,
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setCartOpen(true)}
              className="relative h-9 px-3.5 rounded-lg text-sm font-medium border transition-all duration-150 hover:bg-slate-50"
              style={{ borderColor: t.border, color: t.text, background: "transparent" }}
            >
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full text-white text-[10px] font-semibold flex items-center justify-center"
                  style={{ background: t.accent }}
                >
                  {cartCount}
                </span>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </button>

            <button
              onClick={goProducts}
              className="h-9 px-4 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ background: t.accent, color: "#fff" }}
            >
              {site.primaryCTA}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div
          className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          {pages.map((p) => {
            const active = p.key === activePage.key;
            return (
              <button
                key={p.id}
                onClick={() => setActiveKey(p.key)}
                className="px-3 py-1.5 rounded-lg text-sm flex-shrink-0 transition-all duration-150"
                style={{ background: active ? `${t.accent}14` : "transparent", color: active ? t.accent : t.mutedText, fontWeight: active ? 600 : 400 }}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </header>

      {/* ─── Page content ─── */}
      <main className="animate-fadeIn">
        {activePage.key === "products" ? (
          <ProductsPage site={site} onAdd={addToCart} productsTopRef={productsTopRef} />
        ) : activePage.key === "about" ? (
          <AboutPage site={site} />
        ) : activePage.key === "contact" ? (
          <ContactPage site={site} />
        ) : (
          <HomePage site={site} heroSrc={heroSrc} onPrimaryCTA={goProducts} onLearnMore={goAbout} />
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-24 border-t" style={{ borderColor: t.border }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md flex-shrink-0" style={{ background: t.accent }} />
            <span className="font-semibold text-sm">{site.brandName}</span>
            {site.tagline && (
              <span className="text-sm hidden sm:inline" style={{ color: t.mutedText }}>· {site.tagline}</span>
            )}
          </div>
          <div className="text-xs" style={{ color: t.mutedText }}>
            © {new Date().getFullYear()} {site.brandName} · Powered by{" "}
            <a href="/" className="hover:underline" style={{ color: t.mutedText }}>VentureOS</a>
          </div>
        </div>
      </footer>

      {/* ─── Cart Drawer ─── */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setCartOpen(false)}
        >
          <div
            className="ml-auto h-full w-full max-w-sm bg-white border-l flex flex-col shadow-xl animate-slideIn"
            style={{ borderColor: t.border }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: t.border }}>
              <div className="font-semibold text-slate-900">
                Your cart {cartCount > 0 && <span className="text-slate-400 font-normal text-sm">({cartCount})</span>}
              </div>
              <button
                className="h-7 w-7 rounded-md border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center"
                onClick={() => setCartOpen(false)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="rounded-xl border p-3 flex gap-3"
                    style={{ borderColor: t.border }}
                  >
                    <div className="h-16 w-16 rounded-lg overflow-hidden border flex-shrink-0" style={{ borderColor: t.border }}>
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-slate-100" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 truncate">{item.name}</div>
                      <div className="text-sm text-slate-500 mt-0.5">${item.price.toFixed(2)}</div>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          className="h-6 w-6 rounded-md border flex items-center justify-center text-sm transition hover:bg-slate-50"
                          style={{ borderColor: t.border }}
                          onClick={() => setQty(item.productId, item.quantity - 1)}
                        >−</button>
                        <span className="text-sm w-5 text-center font-medium">{item.quantity}</span>
                        <button
                          className="h-6 w-6 rounded-md border flex items-center justify-center text-sm transition hover:bg-slate-50"
                          style={{ borderColor: t.border }}
                          onClick={() => setQty(item.productId, item.quantity + 1)}
                        >+</button>
                        <button
                          className="ml-auto text-xs text-slate-400 hover:text-red-500 transition-colors"
                          onClick={() => removeItem(item.productId)}
                        >Remove</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkout footer */}
            <div className="px-5 py-4 border-t" style={{ borderColor: t.border }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>

              <button
                onClick={checkout}
                disabled={checkingOut || cart.length === 0}
                className="w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 active:scale-[0.98]"
                style={{
                  background: checkingOut || cart.length === 0 ? "#f1f5f9" : t.accent,
                  color:      checkingOut || cart.length === 0 ? "#94a3b8" : "#fff",
                  cursor:     checkingOut || cart.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                {checkingOut ? "Redirecting…" : "Checkout"}
              </button>

              <p className="mt-2 text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Secure checkout via Stripe
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Home Page ──────────────────────────────────────────────────── */

function HomePage({ site, heroSrc, onPrimaryCTA, onLearnMore }: {
  site: SiteSpec;
  heroSrc?: string;
  onPrimaryCTA: () => void;
  onLearnMore: () => void;
}) {
  const t = site.theme;

  return (
    <>
      {/* HERO */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h1
              className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold leading-[1.08] tracking-tight"
              style={{ color: t.text }}
            >
              {site.heroHeadline}
            </h1>
            <p
              className="mt-5 text-lg leading-relaxed"
              style={{ color: t.mutedText }}
            >
              {site.heroSubheadline}
            </p>

            <div className="mt-8 flex gap-3 flex-wrap">
              <button
                onClick={onPrimaryCTA}
                className="px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ background: t.accent, color: "#fff", boxShadow: `0 4px 16px ${t.accent}35` }}
              >
                {site.primaryCTA}
              </button>
              <button
                onClick={onLearnMore}
                className="px-6 py-3 rounded-lg font-medium text-sm border transition-all duration-150 hover:opacity-80"
                style={{ borderColor: t.border, background: "transparent", color: t.text }}
              >
                Learn more
              </button>
            </div>

            {/* Stats row */}
            <div className="mt-10 flex gap-8 flex-wrap">
              {[
                { label: "Audience", value: site.audience },
                { label: "Featured",  value: site.firstProductOrService },
              ].map(({ label, value }) => value ? (
                <div key={label}>
                  <div className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: t.mutedText }}>{label}</div>
                  <div className="text-sm font-medium" style={{ color: t.text }}>{value}</div>
                </div>
              ) : null)}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: t.border, boxShadow: `0 20px 40px ${t.text}10` }}>
            {heroSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroSrc} alt="Hero" className="w-full h-72 md:h-[420px] object-cover" />
            ) : (
              <div
                className="h-72 md:h-[420px] flex items-center justify-center text-sm"
                style={{ background: `${t.accent}0c`, color: t.mutedText }}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🖼</div>
                  <div>Upload a hero image</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTIONS */}
      {Array.isArray(site.sections) && site.sections.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pb-16 space-y-4">
          {site.sections.map((sec, idx) => (
            <div
              key={`${sec.title}-${idx}`}
              className="rounded-xl border p-6 transition-shadow duration-200 hover:shadow-sm"
              style={{ borderColor: t.border, background: t.surface || "#fff" }}
            >
              <h3 className="text-base font-semibold mb-3" style={{ color: t.text }}>{sec.title}</h3>
              {Array.isArray(sec.bullets) && sec.bullets.length > 0 && (
                <ul className="space-y-2">
                  {sec.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2.5 text-sm items-start">
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

      {/* FAQ */}
      {Array.isArray(site.faq) && site.faq.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pb-20">
          <h2 className="text-2xl font-bold mb-6" style={{ color: t.text }}>Frequently asked</h2>
          <div className="space-y-2">
            {site.faq.map((item, idx) => (
              <details
                key={idx}
                className="group rounded-xl border transition-all duration-200"
                style={{ borderColor: t.border, background: t.surface || "#fff" }}
              >
                <summary
                  className="cursor-pointer font-medium flex items-center justify-between list-none text-sm px-5 py-4"
                  style={{ color: t.text }}
                >
                  {item.q}
                  <span className="text-base ml-4 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: t.mutedText }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: t.mutedText }}>
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Products Page ──────────────────────────────────────────────── */

function ProductsPage({ site, onAdd, productsTopRef }: {
  site: SiteSpec;
  onAdd: (p: Product) => void;
  productsTopRef: React.RefObject<HTMLDivElement | null>;
}) {
  const t = site.theme;

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div ref={productsTopRef} />

      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: t.text }}>Products</h2>
          <p className="text-sm mt-1" style={{ color: t.mutedText }}>{(site.products || []).length} items</p>
        </div>
      </div>

      {(site.products || []).length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: t.mutedText }}>No products yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {(site.products || []).map((p) => {
            const img = p.imageUrl || p.imageDataUrl;
            return (
              <div
                key={p.id}
                className="group rounded-xl border overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                style={{ borderColor: t.border, background: t.surface || "#fff" }}
              >
                <div className="overflow-hidden aspect-square">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: `${t.accent}08` }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.mutedText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-medium text-sm" style={{ color: t.text }}>{p.name}</div>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: t.accent }}>{p.price}</div>
                  <button
                    onClick={() => onAdd(p)}
                    className="mt-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{ background: t.accent, color: "#fff" }}
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── About Page ─────────────────────────────────────────────────── */

function AboutPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight mb-6" style={{ color: t.text }}>About us</h2>
        <p className="text-lg leading-relaxed" style={{ color: t.mutedText }}>
          {site.brandName} exists to deliver a clear promise: {site.offer}.
        </p>
        {site.audience && (
          <p className="mt-4 text-base leading-relaxed" style={{ color: t.mutedText }}>
            We serve {site.audience}, delivering {site.firstProductOrService} that makes a real difference.
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Contact Page ───────────────────────────────────────────────── */

function ContactPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="max-w-md">
        <h2 className="text-3xl font-bold tracking-tight mb-6" style={{ color: t.text }}>Get in touch</h2>
        <p className="text-base leading-relaxed mb-8" style={{ color: t.mutedText }}>
          Have a question or want to work together? We&apos;d love to hear from you.
        </p>
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{ borderColor: t.border, background: t.surface || "#fff" }}
        >
          <input
            type="text"
            placeholder="Your name"
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all duration-150"
            style={{ borderColor: t.border, background: "transparent", color: t.text }}
          />
          <input
            type="email"
            placeholder="Email address"
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all duration-150"
            style={{ borderColor: t.border, background: "transparent", color: t.text }}
          />
          <textarea
            placeholder="Your message"
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all duration-150 resize-none"
            style={{ borderColor: t.border, background: "transparent", color: t.text }}
          />
          <button
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-90"
            style={{ background: t.accent, color: "#fff" }}
          >
            Send message
          </button>
        </div>
      </div>
    </div>
  );
}
