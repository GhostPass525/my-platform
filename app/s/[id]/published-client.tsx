"use client";

import { useMemo, useState } from "react";

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

  const t = site.theme;

  const pages = site.pages?.length
    ? site.pages
    : [{ id: "home", key: "home", name: "Home" }];

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

  const checkout = async () => {
    if (checkingOut) return;
    if (cart.length === 0) {
      setCartOpen(true);
      return;
    }

    setCheckingOut(true);
    try {
      // publish id is the dynamic route segment in the URL: /s/:id
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
    <main
      className="min-h-screen p-6"
      style={{
        background: t.bg,
        color: t.text,
        fontFamily: fontStack(site.font),
      }}
    >
      <div className="max-w-4xl mx-auto relative">
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
                <div
                  className="h-9 w-9 rounded"
                  style={{ background: t.accent }}
                />
              )}
              <div>
                <div className="text-xs" style={{ color: t.mutedText }}>
                  {site.tagline}
                </div>
                <div className="text-lg font-semibold">{site.brandName}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCartOpen(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: t.border, background: "#fff", color: t.text }}
              >
                Cart {cartCount > 0 ? `(${cartCount})` : ""}
              </button>

              <button
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: t.accent, color: "#fff" }}
              >
                {site.primaryCTA}
              </button>
            </div>
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

          {/* Content */}
          <div className="p-6 md:p-8" style={{ background: t.bg }}>
            {activePage.key === "products" ? (
              <ProductsPage site={site} onAdd={addToCart} />
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

        {/* Cart Drawer */}
        {cartOpen && (
          <div
            className="fixed inset-0 z-50 flex"
            style={{ background: "rgba(0,0,0,0.35)" }}
            onClick={() => setCartOpen(false)}
          >
            <div
              className="ml-auto h-full w-full max-w-md bg-white p-5 border-l"
              style={{ borderColor: t.border }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">Your cart</div>
                <button
                  className="px-3 py-1.5 rounded-lg border text-sm"
                  style={{ borderColor: t.border }}
                  onClick={() => setCartOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="mt-4 space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-sm text-slate-600">
                    Your cart is empty.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.productId}
                      className="rounded-2xl border p-3 flex gap-3"
                      style={{ borderColor: t.border }}
                    >
                      <div className="h-14 w-14 rounded-xl overflow-hidden border" style={{ borderColor: t.border }}>
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full" style={{ background: "rgba(2,6,23,0.04)" }} />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-slate-600">
                          ${item.price.toFixed(2)}
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            className="px-2 py-1 rounded-lg border"
                            style={{ borderColor: t.border }}
                            onClick={() => setQty(item.productId, item.quantity - 1)}
                          >
                            −
                          </button>
                          <div className="text-sm w-6 text-center">
                            {item.quantity}
                          </div>
                          <button
                            className="px-2 py-1 rounded-lg border"
                            style={{ borderColor: t.border }}
                            onClick={() => setQty(item.productId, item.quantity + 1)}
                          >
                            +
                          </button>

                          <button
                            className="ml-auto text-sm text-red-600 hover:opacity-80"
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

              <div className="mt-5 border-t pt-4" style={{ borderColor: t.border }}>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-slate-600">Subtotal</div>
                  <div className="font-semibold">${subtotal.toFixed(2)}</div>
                </div>

                <button
                  onClick={checkout}
                  disabled={checkingOut || cart.length === 0}
                  className="mt-4 w-full px-4 py-3 rounded-xl font-medium transition"
                  style={{
                    background:
                      checkingOut || cart.length === 0 ? "rgba(2,6,23,0.10)" : t.accent,
                    color: checkingOut || cart.length === 0 ? "#334155" : "#fff",
                    cursor:
                      checkingOut || cart.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {checkingOut ? "Redirecting…" : "Checkout"}
                </button>

                <div className="mt-2 text-xs text-slate-500">
                  Payments are processed securely by Stripe.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-xs text-slate-500">Published with VentureOS</div>
      </div>
    </main>
  );
}

/* --- Pages --- */

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

function ProductsPage({ site, onAdd }: { site: SiteSpec; onAdd: (p: Product) => void }) {
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
              <button
                onClick={() => onAdd(p)}
                className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
                style={{ background: t.accent, color: "#fff" }}
              >
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