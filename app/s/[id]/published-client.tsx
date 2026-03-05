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
  price: string; // "$49" or "49" etc
  imageDataUrl?: string; // legacy
  imageUrl?: string; // preferred
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
  price: number; // dollars
  quantity: number;
  image?: string;
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

// Turns "$49", "49", "49.99" into 49.99
function parsePriceDollars(raw: string): number {
  const cleaned = (raw || "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export default function PublishedClient({ site }: { site: SiteSpec }) {
  const [activeKey, setActiveKey] = useState<PageKey>("home");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // scrolling targets
  const productsTopRef = useRef<HTMLDivElement | null>(null);
  const [pendingScrollToProducts, setPendingScrollToProducts] = useState(false);

  const t = site.theme;

  const pages = site.pages?.length
    ? site.pages
    : [
        { id: "home", key: "home", name: "Home" },
        { id: "products", key: "products", name: "Products" },
        { id: "about", key: "about", name: "About" },
        { id: "contact", key: "contact", name: "Contact" },
      ];

  const activePage = pages.find((p) => p.key === activeKey) ?? pages[0];

  const logoSrc = site.logoUrl || site.logoDataUrl;
  const heroSrc = site.heroImageUrl || site.heroImageDataUrl;

  const cartCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity, 0),
    [cart]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart]
  );

  const addToCart = (p: Product) => {
    const price = parsePriceDollars(p.price);
    const image = p.imageUrl || p.imageDataUrl;

    setCart((prev) => {
      const existing = prev.find((x) => x.productId === p.id);
      if (existing) {
        return prev.map((x) =>
          x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x
        );
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, price, quantity: 1, image },
      ];
    });

    setCartOpen(true);
  };

  const setQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((x) =>
          x.productId === productId ? { ...x, quantity: Math.max(1, qty) } : x
        )
        .filter((x) => x.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((x) => x.productId !== productId));
  };

  const goProducts = () => {
    setActiveKey("products");
    setPendingScrollToProducts(true);
  };

  const goAbout = () => {
    setActiveKey("about");
  };

  // When we switch to Products, scroll to the product grid anchor
  useEffect(() => {
    if (activeKey !== "products") return;
    if (!pendingScrollToProducts) return;

    const tId = window.setTimeout(() => {
      productsTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setPendingScrollToProducts(false);
    }, 50);

    return () => window.clearTimeout(tId);
  }, [activeKey, pendingScrollToProducts]);

  const checkout = async () => {
    if (checkingOut) return;
    if (cart.length === 0) {
      setCartOpen(true);
      return;
    }

    setCheckingOut(true);
    try {
      const publishId = window.location.pathname.split("/").pop() || "";

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publishId,
          cart: cart.map((i) => ({
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        alert(data?.error || "Checkout failed. Try again.");
        return;
      }

      window.location.href = data.url;
    } catch {
      alert("Checkout failed. Try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: t.bg,
        color: t.text,
        fontFamily: fontStack(site.font),
      }}
    >
      {/* Sticky Header */}
      <header
        className="sticky top-0 z-30 w-full border-b backdrop-blur-md"
        style={{ background: `${t.bg}e6`, borderColor: t.border }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt="Logo"
                className="h-9 w-9 rounded-xl object-cover"
              />
            ) : (
              <div
                className="h-9 w-9 rounded-xl flex-shrink-0"
                style={{ background: t.accent }}
              />
            )}
            <div>
              <div className="font-bold text-base leading-tight">{site.brandName}</div>
              <div className="text-xs leading-tight" style={{ color: t.mutedText }}>
                {site.tagline}
              </div>
            </div>
          </div>

          {/* Nav tabs — pill style */}
          <nav className="hidden md:flex items-center gap-1">
            {pages.map((p) => {
              const active = p.key === activePage.key;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveKey(p.key)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: active ? `${t.accent}18` : "transparent",
                    color: active ? t.accent : t.mutedText,
                    fontWeight: active ? 600 : 400,
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
              className="px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-150 hover:shadow-sm"
              style={{
                borderColor: t.border,
                background: "transparent",
                color: t.text,
              }}
            >
              Cart{cartCount > 0 ? ` (${cartCount})` : ""}
            </button>

            <button
              onClick={goProducts}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ background: t.accent, color: "#fff" }}
            >
              {site.primaryCTA}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div
          className="md:hidden px-4 pb-2 flex gap-1 overflow-x-auto"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          {pages.map((p) => {
            const active = p.key === activePage.key;
            return (
              <button
                key={p.id}
                onClick={() => setActiveKey(p.key)}
                className="px-3 py-1.5 rounded-lg text-sm flex-shrink-0 transition-all duration-150"
                style={{
                  background: active ? `${t.accent}18` : "transparent",
                  color: active ? t.accent : t.mutedText,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </header>

      {/* Page content */}
      <main className="animate-fadeIn">
        {activePage.key === "products" ? (
          <ProductsPage
            site={site}
            onAdd={addToCart}
            productsTopRef={productsTopRef}
          />
        ) : activePage.key === "about" ? (
          <AboutPage site={site} />
        ) : activePage.key === "contact" ? (
          <ContactPage site={site} />
        ) : (
          <HomePage
            site={site}
            heroSrc={heroSrc}
            onPrimaryCTA={goProducts}
            onLearnMore={goAbout}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t py-10" style={{ borderColor: t.border }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-lg flex-shrink-0"
              style={{ background: t.accent }}
            />
            <span className="font-semibold text-sm">{site.brandName}</span>
            {site.tagline && (
              <span className="text-sm" style={{ color: t.mutedText }}>
                — {site.tagline}
              </span>
            )}
          </div>
          <div className="text-xs" style={{ color: t.mutedText }}>
            © {new Date().getFullYear()} {site.brandName} · Powered by VentureOS
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          style={{ background: "rgba(0,0,0,0.40)" }}
          onClick={() => setCartOpen(false)}
        >
          <div
            className="ml-auto h-full w-full max-w-md bg-white border-l flex flex-col animate-slideUp"
            style={{ borderColor: t.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: t.border }}>
              <div className="text-lg font-semibold">Your cart</div>
              <button
                className="h-8 w-8 rounded-lg border text-slate-500 hover:bg-slate-50 transition-colors flex items-center justify-center text-base"
                style={{ borderColor: t.border }}
                onClick={() => setCartOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-3xl mb-3">🛒</div>
                  <div className="text-sm text-slate-500">Your cart is empty.</div>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="rounded-2xl border p-3 flex gap-3"
                    style={{ borderColor: t.border }}
                  >
                    <div
                      className="h-16 w-16 rounded-xl overflow-hidden border flex-shrink-0"
                      style={{ borderColor: t.border }}
                    >
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{ background: "rgba(2,6,23,0.04)" }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        ${item.price.toFixed(2)}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          className="h-7 w-7 rounded-lg border flex items-center justify-center text-sm transition hover:bg-slate-50"
                          style={{ borderColor: t.border }}
                          onClick={() => setQty(item.productId, item.quantity - 1)}
                        >
                          −
                        </button>
                        <div className="text-sm w-5 text-center font-medium">
                          {item.quantity}
                        </div>
                        <button
                          className="h-7 w-7 rounded-lg border flex items-center justify-center text-sm transition hover:bg-slate-50"
                          style={{ borderColor: t.border }}
                          onClick={() => setQty(item.productId, item.quantity + 1)}
                        >
                          +
                        </button>

                        <button
                          className="ml-auto text-xs text-red-500 hover:text-red-700 transition-colors"
                          onClick={() => removeItem(item.productId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-4 border-t" style={{ borderColor: t.border }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-600">Subtotal</div>
                <div className="font-semibold">${subtotal.toFixed(2)}</div>
              </div>

              <button
                onClick={checkout}
                disabled={checkingOut || cart.length === 0}
                className="w-full px-4 py-3 rounded-xl font-medium transition-all duration-150 active:scale-[0.98]"
                style={{
                  background:
                    checkingOut || cart.length === 0
                      ? "rgba(2,6,23,0.10)"
                      : t.accent,
                  color:
                    checkingOut || cart.length === 0 ? "#334155" : "#fff",
                  cursor:
                    checkingOut || cart.length === 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {checkingOut ? "Redirecting…" : "Checkout"}
              </button>

              <div className="mt-2 text-xs text-slate-400 text-center">
                Payments processed securely by Stripe
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Pages --- */

function HomePage({
  site,
  heroSrc,
  onPrimaryCTA,
  onLearnMore,
}: {
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
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight"
              style={{ color: t.text }}
            >
              {site.heroHeadline}
            </h1>
            <p
              className="mt-5 text-lg leading-relaxed whitespace-pre-line"
              style={{ color: t.mutedText }}
            >
              {site.heroSubheadline}
            </p>

            <div className="mt-7 flex gap-3 flex-wrap">
              <button
                onClick={onPrimaryCTA}
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98] shadow-md"
                style={{ background: t.accent, color: "#fff", boxShadow: `0 4px 14px ${t.accent}40` }}
              >
                {site.primaryCTA}
              </button>
              <button
                onClick={onLearnMore}
                className="px-6 py-3 rounded-xl font-semibold text-sm border transition-all duration-150 hover:shadow-sm"
                style={{ borderColor: t.border, background: "#fff", color: t.text }}
              >
                Learn more
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-2 text-sm" style={{ color: t.mutedText }}>
              <div><strong style={{ color: t.text }}>Audience:</strong> {site.audience}</div>
              <div><strong style={{ color: t.text }}>Offer:</strong> {site.offer}</div>
              <div><strong style={{ color: t.text }}>Featured:</strong> {site.firstProductOrService}</div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-2xl border" style={{ borderColor: t.border }}>
            {heroSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroSrc}
                alt="Hero"
                className="w-full h-72 md:h-96 object-cover"
              />
            ) : (
              <div
                className="h-72 md:h-96 flex items-center justify-center text-sm"
                style={{ background: `${t.accent}10`, color: t.mutedText }}
              >
                No hero image set
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTIONS */}
      {Array.isArray(site.sections) && site.sections.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 space-y-4 pb-12">
          {site.sections.map((sec, idx) => (
            <div
              key={`${sec.title}-${idx}`}
              className="rounded-2xl border p-6 hover:shadow-md transition-shadow duration-200 flex gap-4"
              style={{ borderColor: t.border, background: "#fff" }}
            >
              <div
                className="w-1 h-8 rounded-full flex-shrink-0 mt-1"
                style={{ background: t.accent }}
              />
              <div className="flex-1">
                <div className="text-xl font-semibold" style={{ color: t.text }}>{sec.title}</div>
                {Array.isArray(sec.bullets) && sec.bullets.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {sec.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2 text-sm items-start">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ background: t.accent }}
                        />
                        <span style={{ color: t.mutedText }}>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAQ */}
      {Array.isArray(site.faq) && site.faq.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 pb-16">
          <h2 className="text-2xl font-bold mb-5" style={{ color: t.text }}>FAQ</h2>
          <div className="space-y-3">
            {site.faq.map((item, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border p-4 transition-all duration-200"
                style={{ borderColor: t.border, background: "#fff" }}
              >
                <summary
                  className="cursor-pointer font-medium flex items-center justify-between list-none text-sm"
                  style={{ color: t.text }}
                >
                  {item.q}
                  <span className="text-base ml-4 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: t.mutedText }}>
                    ↓
                  </span>
                </summary>
                <div className="mt-3 text-sm leading-relaxed" style={{ color: t.mutedText }}>
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

function ProductsPage({
  site,
  onAdd,
  productsTopRef,
}: {
  site: SiteSpec;
  onAdd: (p: Product) => void;
  productsTopRef: React.RefObject<HTMLDivElement | null>;
}) {
  const t = site.theme;

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* scroll anchor */}
      <div ref={productsTopRef} />

      <div className="flex items-end justify-between mb-8">
        <h2 className="text-3xl font-bold" style={{ color: t.text }}>Products</h2>
        <div className="text-sm" style={{ color: t.mutedText }}>Catalog</div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {(site.products || []).map((p) => {
          const img = p.imageUrl || p.imageDataUrl;
          return (
            <div
              key={p.id}
              className="group rounded-2xl border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              style={{ borderColor: t.border, background: "#fff" }}
            >
              <div className="overflow-hidden">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={p.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div
                    className="h-48 flex items-center justify-center text-xs"
                    style={{ background: `${t.accent}08`, color: t.mutedText }}
                  >
                    No image
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="font-semibold text-sm" style={{ color: t.text }}>{p.name}</div>
                <div className="text-sm mt-0.5 font-medium" style={{ color: t.accent }}>{p.price}</div>
                <button
                  onClick={() => onAdd(p)}
                  className="mt-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                  style={{ background: t.accent, color: "#fff" }}
                >
                  Add to cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AboutPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div
        className="rounded-2xl border p-8"
        style={{ borderColor: t.border, background: "#fff" }}
      >
        <h2 className="text-3xl font-bold mb-4" style={{ color: t.text }}>About</h2>
        <p className="text-lg leading-relaxed" style={{ color: t.mutedText }}>
          {site.brandName} exists to deliver a clear promise: {site.offer}.
        </p>
      </div>
    </div>
  );
}

function ContactPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div
        className="rounded-2xl border p-8"
        style={{ borderColor: t.border, background: "#fff" }}
      >
        <h2 className="text-3xl font-bold mb-4" style={{ color: t.text }}>Contact</h2>
        <p className="leading-relaxed" style={{ color: t.mutedText }}>
          Keep contact simple and professional.
        </p>
      </div>
    </div>
  );
}
