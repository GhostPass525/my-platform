"use client";

export type LayoutId =
  | "big-hero"
  | "split-screen"
  | "centered-minimal"
  | "editorial-magazine"
  | "classic-shop"
  | "one-page-scroll";

// ─── Local type mirrors (matching page.tsx) ───────────────────────
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

type Page = {
  id: string;
  key: string;
  name: string;
};

type Section = {
  title: string;
  bullets: string[];
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
  sections: Section[];
  faq: { q: string; a: string }[];
  theme: Theme;
  font: FontChoice;
  logoDataUrl?: string;
  heroImageDataUrl?: string;
  products: Product[];
  pages: Page[];
  activeLayout?: LayoutId;
};

type LayoutProps = {
  site: SiteSpec;
  activePageId: string;
  onSelectPage: (id: string) => void;
  onAddToCart: (product: Product) => void;
  cartCount: number;
  onOpenCart: () => void;
};

// ─── Font stack ───────────────────────────────────────────────────
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

// ─── Shared inner page components ────────────────────────────────
function InnerProducts({ site, onAddToCart }: { site: SiteSpec; onAddToCart: (p: Product) => void }) {
  const t = site.theme;
  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: t.text }}>Products</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {site.products.map((p) => (
          <div key={p.id} style={{ borderRadius: 10, border: `1px solid ${t.border}`, overflow: "hidden", background: t.surface || "#fff" }}>
            {p.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageDataUrl} alt={p.name} style={{ width: "100%", height: 100, objectFit: "cover" }} />
            ) : (
              <div style={{ height: 100, background: `${t.accent}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: t.mutedText }}>
                No image
              </div>
            )}
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, marginTop: 2 }}>{p.price}</div>
              <button onClick={() => onAddToCart(p)} style={{ marginTop: 8, width: "100%", padding: "6px 0", borderRadius: 6, border: "none", background: t.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                Add to cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InnerAbout({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ borderRadius: 12, border: `1px solid ${t.border}`, padding: "20px 24px", background: t.surface || "#fff" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: t.text }}>About</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: t.mutedText }}>
          {site.brandName} exists to deliver a clear promise: {site.offer}.
        </p>
        {site.tagline && (
          <p style={{ marginTop: 10, fontSize: 13, color: t.text, fontStyle: "italic" }}>{site.tagline}</p>
        )}
      </div>
    </div>
  );
}

function InnerContact({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ borderRadius: 12, border: `1px solid ${t.border}`, padding: "20px 24px", background: t.surface || "#fff" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14, color: t.text }}>Contact</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input readOnly placeholder="Your name" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, fontSize: 13, color: t.text, background: "transparent", outline: "none" }} />
          <input readOnly placeholder="Your email" style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, fontSize: 13, color: t.text, background: "transparent", outline: "none" }} />
          <textarea readOnly placeholder="Your message" rows={3} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, fontSize: 13, color: t.text, background: "transparent", outline: "none", resize: "none" }} />
          <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
            Send message
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper to get active page key ───────────────────────────────
function getActivePage(site: SiteSpec, activePageId: string) {
  return site.pages.find((p) => p.id === activePageId) ?? site.pages[0];
}

// ─── Placeholder products (shown when store has no products yet) ──
const PLACEHOLDER_PRODUCTS: Product[] = [
  { id: "placeholder-1", name: "Product One", price: "$00" },
  { id: "placeholder-2", name: "Product Two", price: "$00" },
  { id: "placeholder-3", name: "Product Three", price: "$00" },
];

// ─── 1. BigHeroLayout ─────────────────────────────────────────────
function BigHeroLayout({ site, activePageId, onSelectPage, onAddToCart, cartCount, onOpenCart }: LayoutProps) {
  const t = site.theme;
  const font = fontStack(site.font);
  const activePage = getActivePage(site, activePageId);
  const isHome = activePage?.key === "home";
  const productsToShow = site.products.length > 0 ? site.products : PLACEHOLDER_PRODUCTS;

  return (
    <div style={{ fontFamily: font, background: t.bg, minHeight: "100vh", width: "100%", color: t.text }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${t.border}`, background: t.panel || "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {site.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoDataUrl} alt="logo" style={{ height: 28, width: 28, objectFit: "contain", borderRadius: 6 }} />
          ) : (
            <div style={{ height: 28, width: 28, borderRadius: 6, background: t.accent }} />
          )}
          <span style={{ fontWeight: 700, fontSize: 15, color: t.text }}>{site.brandName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {site.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "none",
                background: page.id === activePageId ? `${t.accent}15` : "transparent",
                color: page.id === activePageId ? t.accent : t.mutedText,
                fontSize: 13,
                fontWeight: page.id === activePageId ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {page.name}
            </button>
          ))}
          <button style={{ marginLeft: 8, padding: "6px 14px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {site.primaryCTA}
          </button>
          <button onClick={onOpenCart} style={{ position: "relative", marginLeft: 4, padding: "6px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.mutedText, fontSize: 12, cursor: "pointer" }}>
            {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, height: 15, minWidth: 15, borderRadius: 8, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{cartCount}</span>}
            🛒
          </button>
        </div>
      </nav>

      {isHome ? (
        <>
          {/* Hero */}
          <div
            style={{
              minHeight: "60vh",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: site.heroImageDataUrl
                ? `url(${site.heroImageDataUrl}) center/cover no-repeat`
                : `linear-gradient(135deg, ${t.accent}, ${t.accent2 || t.accent})`,
            }}
          >
            {site.heroImageDataUrl && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.48)" }} />
            )}
            <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 32px", maxWidth: 620 }}>
              <h1 style={{ fontSize: 42, fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-1px", margin: 0 }}>
                {site.heroHeadline}
              </h1>
              <p style={{ marginTop: 14, fontSize: 16, color: "rgba(255,255,255,0.82)", lineHeight: 1.55 }}>
                {site.heroSubheadline}
              </p>
              <button style={{ marginTop: 20, padding: "12px 28px", borderRadius: 8, border: "none", background: "#fff", color: t.accent, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {site.primaryCTA}
              </button>
            </div>
          </div>

          {/* Products section */}
          <div style={{ padding: "32px 24px", minHeight: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: t.mutedText, marginBottom: 16 }}>
              Featured Products
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {productsToShow.map((p) => (
                <div key={p.id} style={{ borderRadius: 10, border: `1px solid ${t.border}`, overflow: "hidden", background: t.surface || "#fff" }}>
                  {p.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageDataUrl} alt={p.name} style={{ width: "100%", height: 120, objectFit: "cover" }} />
                  ) : (
                    <div style={{ height: 120, background: `${t.accent}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: t.mutedText }}>
                      No image
                    </div>
                  )}
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t.accent, marginTop: 2 }}>{p.price}</div>
                    <button onClick={() => onAddToCart(p)} style={{ marginTop: 8, width: "100%", padding: "7px 0", borderRadius: 6, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Add to cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${t.border}`, textAlign: "center", fontSize: 12, color: t.mutedText }}>
            © {new Date().getFullYear()} {site.brandName}. All rights reserved.
          </div>
        </>
      ) : (
        <div style={{ padding: "24px 24px" }}>
          {activePage?.key === "products" && <InnerProducts site={site} onAddToCart={onAddToCart} />}
          {activePage?.key === "about" && <InnerAbout site={site} />}
          {activePage?.key === "contact" && <InnerContact site={site} />}
          {activePage?.key !== "products" && activePage?.key !== "about" && activePage?.key !== "contact" && (
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{activePage?.name}</h2>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", opacity: 0.4 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px dashed #9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 20, color: "#9CA3AF", lineHeight: 1 }}>+</span>
                </div>
                <div style={{ fontSize: 13, color: t.mutedText, textAlign: "center" }}>Add elements from the right panel</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 2. SplitScreenLayout ────────────────────────────────────────
function SplitScreenLayout({ site, activePageId, onSelectPage, onAddToCart, cartCount, onOpenCart }: LayoutProps) {
  const t = site.theme;
  const font = fontStack(site.font);
  const activePage = getActivePage(site, activePageId);
  const isHome = activePage?.key === "home";
  const productsToShow = site.products.length > 0 ? site.products : PLACEHOLDER_PRODUCTS;

  return (
    <div style={{ fontFamily: font, background: t.bg, minHeight: "100vh", width: "100%", color: t.text }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${t.border}`, background: t.panel || "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {site.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoDataUrl} alt="logo" style={{ height: 28, width: 28, objectFit: "contain", borderRadius: 6 }} />
          ) : (
            <div style={{ height: 28, width: 28, borderRadius: 6, background: t.accent }} />
          )}
          <span style={{ fontWeight: 700, fontSize: 15, color: t.text }}>{site.brandName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {site.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "none",
                background: page.id === activePageId ? `${t.accent}15` : "transparent",
                color: page.id === activePageId ? t.accent : t.mutedText,
                fontSize: 13,
                fontWeight: page.id === activePageId ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {page.name}
            </button>
          ))}
          <button style={{ marginLeft: 8, padding: "6px 14px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {site.primaryCTA}
          </button>
          <button onClick={onOpenCart} style={{ position: "relative", marginLeft: 4, padding: "6px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.mutedText, fontSize: 12, cursor: "pointer" }}>
            {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, height: 15, minWidth: 15, borderRadius: 8, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{cartCount}</span>}
            🛒
          </button>
        </div>
      </nav>

      {isHome ? (
        <>
          {/* Split hero */}
          <div style={{ display: "flex", minHeight: "60vh" }}>
            {/* Left: text */}
            <div style={{ flex: 1, background: "#fff", padding: "40px 36px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: t.text, lineHeight: 1.15, letterSpacing: "-0.5px", margin: 0 }}>
                {site.heroHeadline}
              </h1>
              <p style={{ marginTop: 12, fontSize: 14, color: t.mutedText, lineHeight: 1.6 }}>
                {site.heroSubheadline}
              </p>
              <button style={{ marginTop: 20, alignSelf: "flex-start", padding: "10px 22px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {site.primaryCTA}
              </button>
            </div>
            {/* Right: image */}
            <div
              style={{
                flex: 1,
                background: site.heroImageDataUrl
                  ? `url(${site.heroImageDataUrl}) center/cover no-repeat`
                  : `linear-gradient(135deg, ${t.accent}, ${t.accent2 || t.accent})`,
              }}
            />
          </div>

          {/* Product grid - 2 column */}
          <div style={{ padding: "28px 24px", minHeight: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: t.mutedText, marginBottom: 14 }}>
              Our Products
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {productsToShow.map((p) => (
                <div key={p.id} style={{ borderRadius: 10, border: `1px solid ${t.border}`, overflow: "hidden", background: t.surface || "#fff", display: "flex" }}>
                  {p.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageDataUrl} alt={p.name} style={{ width: 110, height: "auto", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 110, background: `${t.accent}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: t.mutedText, flexShrink: 0 }}>
                      No image
                    </div>
                  )}
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{p.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t.accent, marginTop: 4 }}>{p.price}</div>
                    <button onClick={() => onAddToCart(p)} style={{ marginTop: 10, padding: "6px 14px", borderRadius: 6, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                      Add to cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {activePage?.key === "products" && <InnerProducts site={site} onAddToCart={onAddToCart} />}
          {activePage?.key === "about" && <InnerAbout site={site} />}
          {activePage?.key === "contact" && <InnerContact site={site} />}
          {activePage?.key !== "products" && activePage?.key !== "about" && activePage?.key !== "contact" && (
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{activePage?.name}</h2>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", opacity: 0.4 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px dashed #9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 20, color: "#9CA3AF", lineHeight: 1 }}>+</span>
                </div>
                <div style={{ fontSize: 13, color: t.mutedText, textAlign: "center" }}>Add elements from the right panel</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── 3. CenteredMinimalLayout ────────────────────────────────────
function CenteredMinimalLayout({ site, activePageId, onSelectPage, onAddToCart, cartCount, onOpenCart }: LayoutProps) {
  const t = site.theme;
  const font = fontStack(site.font);
  const activePage = getActivePage(site, activePageId);
  const isHome = activePage?.key === "home";
  const productsToShow = site.products.length > 0 ? site.products : PLACEHOLDER_PRODUCTS;

  return (
    <div style={{ fontFamily: font, background: t.bg, minHeight: "100vh", width: "100%", color: t.text }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: `1px solid ${t.border}`, background: t.panel || "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {site.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoDataUrl} alt="logo" style={{ height: 24, width: 24, objectFit: "contain", borderRadius: 5 }} />
          ) : (
            <div style={{ height: 24, width: 24, borderRadius: 5, background: t.accent }} />
          )}
          <span style={{ fontWeight: 600, fontSize: 14, color: t.text }}>{site.brandName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {site.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: page.id === activePageId ? t.text : t.mutedText,
                fontSize: 13,
                fontWeight: page.id === activePageId ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {page.name}
            </button>
          ))}
          <button style={{ marginLeft: 6, padding: "5px 14px", borderRadius: 6, border: `1px solid ${t.accent}`, background: "transparent", color: t.accent, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {site.primaryCTA}
          </button>
          <button onClick={onOpenCart} style={{ position: "relative", marginLeft: 4, padding: "5px 10px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.mutedText, fontSize: 12, cursor: "pointer" }}>
            {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, height: 15, minWidth: 15, borderRadius: 8, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{cartCount}</span>}
            🛒
          </button>
        </div>
      </nav>

      {isHome ? (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
          {/* Hero - centered */}
          <div style={{ textAlign: "center", marginBottom: 48, minHeight: "40vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <h1 style={{ fontSize: 28, fontWeight: 500, color: t.text, lineHeight: 1.3, letterSpacing: "-0.3px", margin: 0 }}>
              {site.heroHeadline}
            </h1>
            <p style={{ marginTop: 12, fontSize: 15, color: t.mutedText, lineHeight: 1.6 }}>
              {site.heroSubheadline}
            </p>
            <button style={{ marginTop: 20, padding: "9px 24px", borderRadius: 7, border: `1px solid ${t.accent}`, background: "transparent", color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {site.primaryCTA}
            </button>
          </div>

          {/* Products */}
          <div style={{ minHeight: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: t.mutedText, marginBottom: 16, textAlign: "center" }}>
              Products
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {productsToShow.map((p) => (
                <div key={p.id} style={{ borderRadius: 12, border: `1px solid ${t.border}`, overflow: "hidden", background: t.surface || "#fff", padding: "0 0 14px" }}>
                  {p.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageDataUrl} alt={p.name} style={{ width: "100%", height: 100, objectFit: "cover" }} />
                  ) : (
                    <div style={{ height: 100, background: `${t.accent}08`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: t.mutedText }}>
                      No image
                    </div>
                  )}
                  <div style={{ padding: "12px 14px 0" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: t.mutedText, marginTop: 2 }}>{p.price}</div>
                    <button onClick={() => onAddToCart(p)} style={{ marginTop: 10, width: "100%", padding: "6px 0", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                      Add to cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {activePage?.key === "products" && <InnerProducts site={site} onAddToCart={onAddToCart} />}
          {activePage?.key === "about" && <InnerAbout site={site} />}
          {activePage?.key === "contact" && <InnerContact site={site} />}
          {activePage?.key !== "products" && activePage?.key !== "about" && activePage?.key !== "contact" && (
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: t.text }}>{activePage?.name}</h2>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", opacity: 0.4 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px dashed #9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 20, color: "#9CA3AF", lineHeight: 1 }}>+</span>
                </div>
                <div style={{ fontSize: 13, color: t.mutedText, textAlign: "center" }}>Add elements from the right panel</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 4. EditorialMagazineLayout ──────────────────────────────────
function EditorialMagazineLayout({ site, activePageId, onSelectPage, onAddToCart, cartCount, onOpenCart }: LayoutProps) {
  const t = site.theme;
  const font = fontStack(site.font);
  const activePage = getActivePage(site, activePageId);
  const isHome = activePage?.key === "home";
  const productsToShow = site.products.length > 0 ? site.products : PLACEHOLDER_PRODUCTS;

  return (
    <div style={{ fontFamily: font, background: t.bg, minHeight: "100vh", width: "100%", color: t.text }}>
      {/* Nav - bold editorial style */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: `2px solid ${t.text}`, background: t.bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {site.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoDataUrl} alt="logo" style={{ height: 24, width: 24, objectFit: "contain", borderRadius: 4 }} />
          ) : (
            <div style={{ height: 24, width: 24, borderRadius: 4, background: t.accent }} />
          )}
          <span style={{ fontWeight: 900, fontSize: 15, color: t.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>{site.brandName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {site.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              style={{
                padding: "4px 0",
                border: "none",
                borderBottom: page.id === activePageId ? `2px solid ${t.accent}` : "2px solid transparent",
                background: "transparent",
                color: page.id === activePageId ? t.accent : t.text,
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              {page.name}
            </button>
          ))}
          <button style={{ padding: "6px 14px", border: `2px solid ${t.accent}`, background: t.accent, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {site.primaryCTA}
          </button>
          <button onClick={onOpenCart} style={{ position: "relative", marginLeft: 4, padding: "6px 10px", border: `2px solid ${t.border}`, background: "transparent", color: t.mutedText, fontSize: 11, cursor: "pointer" }}>
            {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, height: 15, minWidth: 15, borderRadius: 8, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{cartCount}</span>}
            🛒
          </button>
        </div>
      </nav>

      {isHome ? (
        <div style={{ padding: "32px 24px" }}>
          {/* Oversized heading */}
          <h1 style={{ fontSize: 64, fontWeight: 900, color: t.text, lineHeight: 0.95, letterSpacing: "-2px", margin: 0, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
            {site.heroHeadline}
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, color: t.mutedText, maxWidth: 480 }}>{site.heroSubheadline}</p>

          {/* HR divider */}
          <hr style={{ margin: "20px 0", border: "none", borderTop: `2px solid ${t.text}` }} />

          {/* Asymmetric product grid: 2fr 1fr 1fr */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, minHeight: 240 }}>
            {/* First product - large */}
            <div style={{ borderRadius: 4, border: `1px solid ${t.border}`, overflow: "hidden", background: t.surface || "#fff" }}>
              {productsToShow[0].imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={productsToShow[0].imageDataUrl} alt={productsToShow[0].name} style={{ width: "100%", height: 180, objectFit: "cover" }} />
              ) : (
                <div style={{ height: 180, background: `${t.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: t.mutedText }}>
                  No image
                </div>
              )}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: t.text, textTransform: "uppercase", letterSpacing: "0.03em" }}>{productsToShow[0].name}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.accent, marginTop: 4 }}>{productsToShow[0].price}</div>
                <button onClick={() => onAddToCart(productsToShow[0])} style={{ marginTop: 8, padding: "6px 16px", border: `2px solid ${t.accent}`, background: "transparent", color: t.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>
                  Add to cart
                </button>
              </div>
            </div>
            {/* Products 2 & 3 - stacked right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, gridColumn: "2 / 4" }}>
              {[productsToShow[1], productsToShow[2]].filter(Boolean).map((p) => (
                <div key={p.id} style={{ borderRadius: 4, border: `1px solid ${t.border}`, overflow: "hidden", background: t.surface || "#fff", flex: 1, display: "flex" }}>
                  {p.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageDataUrl} alt={p.name} style={{ width: 80, height: "100%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 80, background: `${t.accent}10`, flexShrink: 0 }} />
                  )}
                  <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.text, textTransform: "uppercase", letterSpacing: "0.03em" }}>{p.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, marginTop: 2 }}>{p.price}</div>
                    <button onClick={() => onAddToCart(p)} style={{ marginTop: 6, padding: "4px 10px", border: `1px solid ${t.accent}`, background: "transparent", color: t.accent, fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", alignSelf: "flex-start" }}>
                      Buy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typographic section divider */}
          {site.sections[0] && (
            <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
              <p style={{ fontSize: 22, fontStyle: "italic", color: t.mutedText, fontWeight: 300 }}>
                &ldquo;{site.sections[0].title}&rdquo;
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: "0 24px" }}>
          {activePage?.key === "products" && <InnerProducts site={site} onAddToCart={onAddToCart} />}
          {activePage?.key === "about" && <InnerAbout site={site} />}
          {activePage?.key === "contact" && <InnerContact site={site} />}
          {activePage?.key !== "products" && activePage?.key !== "about" && activePage?.key !== "contact" && (
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: t.text, textTransform: "uppercase", letterSpacing: "-0.5px" }}>{activePage?.name}</h2>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", opacity: 0.4 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px dashed #9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 20, color: "#9CA3AF", lineHeight: 1 }}>+</span>
                </div>
                <div style={{ fontSize: 13, color: t.mutedText, textAlign: "center" }}>Add elements from the right panel</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 5. ClassicShopLayout ────────────────────────────────────────
function ClassicShopLayout({ site, activePageId, onSelectPage, onAddToCart, cartCount, onOpenCart }: LayoutProps) {
  const t = site.theme;
  const font = fontStack(site.font);
  const activePage = getActivePage(site, activePageId);
  const isHome = activePage?.key === "home";
  const productsToShow = site.products.length > 0 ? site.products : PLACEHOLDER_PRODUCTS;

  return (
    <div style={{ fontFamily: font, background: t.bg, minHeight: "100vh", width: "100%", color: t.text }}>
      {/* Nav - logo left, links center, cart right */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", borderBottom: `1px solid ${t.border}`, background: t.panel || "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {site.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoDataUrl} alt="logo" style={{ height: 26, width: 26, objectFit: "contain", borderRadius: 5 }} />
          ) : (
            <div style={{ height: 26, width: 26, borderRadius: 5, background: t.accent }} />
          )}
          <span style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{site.brandName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {site.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              style={{
                padding: "5px 10px",
                borderRadius: 5,
                border: "none",
                background: "transparent",
                color: page.id === activePageId ? t.accent : t.mutedText,
                fontSize: 12,
                fontWeight: page.id === activePageId ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {page.name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {site.primaryCTA}
          </button>
          {/* Cart icon */}
          <button onClick={onOpenCart} style={{ position: "relative", padding: "5px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.mutedText, fontSize: 12, cursor: "pointer" }}>
            {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, height: 15, minWidth: 15, borderRadius: 8, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{cartCount}</span>}
            🛒
          </button>
        </div>
      </nav>

      {isHome ? (
        <>
          {/* Banner */}
          <div
            style={{
              minHeight: "60vh",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: site.heroImageDataUrl
                ? `url(${site.heroImageDataUrl}) center/cover no-repeat`
                : `linear-gradient(135deg, ${t.accent}, ${t.accent2 || t.accent})`,
            }}
          >
            {site.heroImageDataUrl && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />}
            <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>{site.heroHeadline}</h2>
              <button style={{ marginTop: 14, padding: "8px 22px", borderRadius: 6, border: "2px solid #fff", background: "transparent", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Shop Now
              </button>
            </div>
          </div>

          {/* Featured categories row */}
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[site.primaryCTA, "New Arrivals", "Best Sellers"].map((cat) => (
                <div key={cat} style={{ borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface || "#fff", padding: "14px 16px", textAlign: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{cat}</div>
                  <div style={{ fontSize: 11, color: t.mutedText, marginTop: 2 }}>Browse →</div>
                </div>
              ))}
            </div>
          </div>

          {/* Products - 4 column (2 on narrow) */}
          <div style={{ padding: "0 24px 24px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 14 }}>Our Products</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {/* Repeat products to fill 4 columns, cycling if fewer than 4 */}
              {Array.from({ length: Math.max(productsToShow.length, 4) }, (_, i) => productsToShow[i % productsToShow.length]).map((p, idx) => (
                <div key={`${p.id}-${idx}`} style={{ borderRadius: 8, border: `1px solid ${t.border}`, overflow: "hidden", background: t.surface || "#fff" }}>
                  {p.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageDataUrl} alt={p.name} style={{ width: "100%", height: 90, objectFit: "cover" }} />
                  ) : (
                    <div style={{ height: 90, background: `${t.accent}08`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: t.mutedText }}>
                      No image
                    </div>
                  )}
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{p.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, marginTop: 2 }}>{p.price}</div>
                    <button onClick={() => onAddToCart(p)} style={{ marginTop: 6, width: "100%", padding: "5px 0", borderRadius: 5, border: "none", background: t.accent, color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                      Add to cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ padding: "14px 24px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {["Free Shipping", "Easy Returns", "Secure Payment", "24/7 Support"].map((badge) => (
              <div key={badge} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: t.mutedText, padding: "5px 12px", border: `1px solid ${t.border}`, borderRadius: 20 }}>
                <span>✓</span> {badge}
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div style={{ padding: "20px 24px 28px", textAlign: "center", borderTop: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 10 }}>Stay in the loop</div>
            <div style={{ display: "flex", gap: 8, maxWidth: 340, margin: "0 auto" }}>
              <input readOnly placeholder="Your email" style={{ flex: 1, padding: "7px 12px", borderRadius: 7, border: `1px solid ${t.border}`, fontSize: 12, color: t.text, background: "#fff", outline: "none" }} />
              <button style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                Subscribe
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {activePage?.key === "products" && <InnerProducts site={site} onAddToCart={onAddToCart} />}
          {activePage?.key === "about" && <InnerAbout site={site} />}
          {activePage?.key === "contact" && <InnerContact site={site} />}
          {activePage?.key !== "products" && activePage?.key !== "about" && activePage?.key !== "contact" && (
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{activePage?.name}</h2>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", opacity: 0.4 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px dashed #9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 20, color: "#9CA3AF", lineHeight: 1 }}>+</span>
                </div>
                <div style={{ fontSize: 13, color: t.mutedText, textAlign: "center" }}>Add elements from the right panel</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── 6. OnePageScrollLayout ──────────────────────────────────────
function OnePageScrollLayout({ site, activePageId, onSelectPage, onAddToCart, cartCount, onOpenCart }: LayoutProps) {
  const t = site.theme;
  const font = fontStack(site.font);
  const activePage = getActivePage(site, activePageId);
  const isHome = activePage?.key === "home";
  const homePage = site.pages.find((p) => p.key === "home");

  const placeholderFeatures = [
    { title: "Quality First", desc: "We obsess over every detail so you don't have to." },
    { title: "Fast Delivery", desc: "Get your order in days, not weeks." },
    { title: "Backed by Customers", desc: "Thousands of happy customers and counting." },
  ];

  const features = site.sections.slice(0, 3).length > 0
    ? site.sections.slice(0, 3).map((s) => ({ title: s.title, desc: s.bullets[0] || "" }))
    : placeholderFeatures;

  const testimonials = [
    { name: "Alex R.", text: `${site.brandName} completely changed how I think about this.` },
    { name: "Jordan M.", text: "Incredible quality and service. Highly recommend." },
    { name: "Sam T.", text: "I've been a customer for months and won't look back." },
  ];

  if (!isHome) {
    return (
      <div style={{ fontFamily: font, background: t.bg, minHeight: "100vh", width: "100%", color: t.text }}>
        {/* Sticky nav */}
        <nav style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${t.border}`, background: t.panel || "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {site.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logoDataUrl} alt="logo" style={{ height: 26, width: 26, objectFit: "contain", borderRadius: 5 }} />
            ) : (
              <div style={{ height: 26, width: 26, borderRadius: 5, background: t.accent }} />
            )}
            <span style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{site.brandName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {site.pages.map((page) => (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                style={{ padding: "5px 10px", borderRadius: 5, border: "none", background: "transparent", color: t.mutedText, fontSize: 12, cursor: "pointer" }}
              >
                {page.name}
              </button>
            ))}
          </div>
        </nav>
        <div style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: t.mutedText, marginBottom: 12 }}>
            All content is on the main scroll page.
          </div>
          {homePage && (
            <button
              onClick={() => onSelectPage(homePage.id)}
              style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              ← Back to home
            </button>
          )}
        </div>
      </div>
    );
  }

  const productsToShow = site.products.length > 0 ? site.products : PLACEHOLDER_PRODUCTS;

  return (
    <div style={{ fontFamily: font, color: t.text, minHeight: "100vh", width: "100%", background: t.bg }}>
      {/* Sticky nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${t.border}`, background: t.panel || "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {site.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoDataUrl} alt="logo" style={{ height: 26, width: 26, objectFit: "contain", borderRadius: 5 }} />
          ) : (
            <div style={{ height: 26, width: 26, borderRadius: 5, background: t.accent }} />
          )}
          <span style={{ fontWeight: 700, fontSize: 14, color: t.text }}>{site.brandName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {site.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onSelectPage(page.id)}
              style={{ padding: "5px 10px", borderRadius: 5, border: "none", background: "transparent", color: page.id === activePageId ? t.accent : t.mutedText, fontSize: 12, fontWeight: page.id === activePageId ? 600 : 400, cursor: "pointer" }}
            >
              {page.name}
            </button>
          ))}
          <button style={{ marginLeft: 4, padding: "5px 14px", borderRadius: 6, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {site.primaryCTA}
          </button>
          <button onClick={onOpenCart} style={{ position: "relative", marginLeft: 2, padding: "5px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.mutedText, fontSize: 12, cursor: "pointer" }}>
            {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, height: 15, minWidth: 15, borderRadius: 8, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{cartCount}</span>}
            🛒
          </button>
        </div>
      </nav>

      {/* Hero section */}
      <div style={{ minHeight: "60vh", background: `linear-gradient(135deg, ${t.accent}, ${t.accent2 || t.accent})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", textAlign: "center" }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-1px", margin: 0 }}>
          {site.heroHeadline}
        </h1>
        <p style={{ marginTop: 14, fontSize: 16, color: "rgba(255,255,255,0.82)", lineHeight: 1.55, maxWidth: 500 }}>
          {site.heroSubheadline}
        </p>
        <button style={{ marginTop: 22, padding: "12px 28px", borderRadius: 8, border: "none", background: "#fff", color: t.accent, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {site.primaryCTA}
        </button>
      </div>

      {/* Features section */}
      <div style={{ background: "#fff", padding: "36px 24px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", color: t.text, marginBottom: 24 }}>Why choose us</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 700, margin: "0 auto" }}>
          {features.map((f, i) => (
            <div key={i} style={{ borderRadius: 10, border: `1px solid ${t.border}`, padding: "16px", textAlign: "center", background: t.surface || "#fff" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${t.accent}15`, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {["✦", "⚡", "❤"][i]}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{f.title}</div>
              {f.desc && <p style={{ marginTop: 6, fontSize: 12, color: t.mutedText, lineHeight: 1.5 }}>{f.desc}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Products section */}
      <div style={{ background: "#F9FAFB", padding: "36px 24px", minHeight: 200 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", color: t.text, marginBottom: 24 }}>Shop Now</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, maxWidth: 700, margin: "0 auto" }}>
          {productsToShow.map((p) => (
            <div key={p.id} style={{ borderRadius: 10, border: `1px solid #E5E7EB`, overflow: "hidden", background: "#fff" }}>
              {p.imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageDataUrl} alt={p.name} style={{ width: "100%", height: 100, objectFit: "cover" }} />
              ) : (
                <div style={{ height: 100, background: `${t.accent}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: t.mutedText }}>
                  No image
                </div>
              )}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{p.name}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, marginTop: 2 }}>{p.price}</div>
                <button onClick={() => onAddToCart(p)} style={{ marginTop: 8, width: "100%", padding: "6px 0", borderRadius: 6, border: "none", background: t.accent, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div style={{ background: "#fff", padding: "36px 24px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", color: t.text, marginBottom: 24 }}>What people say</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 700, margin: "0 auto" }}>
          {testimonials.map((tm, i) => (
            <div key={i} style={{ borderRadius: 10, border: `1px solid ${t.border}`, padding: "16px", background: t.surface || "#fff" }}>
              <p style={{ fontSize: 13, color: t.text, lineHeight: 1.55, fontStyle: "italic", margin: 0 }}>&ldquo;{tm.text}&rdquo;</p>
              <div style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: t.mutedText }}>— {tm.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA section */}
      <div style={{ background: t.accent, padding: "48px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>Ready to get started?</h2>
        <p style={{ marginTop: 10, fontSize: 14, color: "rgba(255,255,255,0.80)" }}>Join thousands of happy customers today.</p>
        <button style={{ marginTop: 20, padding: "12px 32px", borderRadius: 8, border: "none", background: "#fff", color: t.accent, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          {site.primaryCTA}
        </button>
      </div>

      {/* Footer */}
      <div style={{ background: "#111827", padding: "20px 24px", textAlign: "center" }}>
        <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 600 }}>{site.brandName}</span>
        <span style={{ fontSize: 12, color: "#6B7280", marginLeft: 12 }}>© {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────
export default function StoreLayout({
  layoutId,
  site,
  activePageId,
  onSelectPage,
  onAddToCart,
  cartCount,
  onOpenCart,
}: { layoutId: LayoutId } & LayoutProps) {
  const cartProps = { onAddToCart, cartCount, onOpenCart };
  switch (layoutId) {
    case "big-hero":
      return <BigHeroLayout site={site} activePageId={activePageId} onSelectPage={onSelectPage} {...cartProps} />;
    case "split-screen":
      return <SplitScreenLayout site={site} activePageId={activePageId} onSelectPage={onSelectPage} {...cartProps} />;
    case "centered-minimal":
      return <CenteredMinimalLayout site={site} activePageId={activePageId} onSelectPage={onSelectPage} {...cartProps} />;
    case "editorial-magazine":
      return <EditorialMagazineLayout site={site} activePageId={activePageId} onSelectPage={onSelectPage} {...cartProps} />;
    case "classic-shop":
      return <ClassicShopLayout site={site} activePageId={activePageId} onSelectPage={onSelectPage} {...cartProps} />;
    case "one-page-scroll":
      return <OnePageScrollLayout site={site} activePageId={activePageId} onSelectPage={onSelectPage} {...cartProps} />;
    default:
      return null;
  }
}
