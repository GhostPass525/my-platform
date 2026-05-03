"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StoreLayout, { type LayoutId } from "@/app/components/LayoutTemplates";

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

type PrintfulVariant = { id: number; size: string; color: string; color_code?: string };

type Product = {
  id: string;
  name: string;
  price: string;
  imageDataUrl?: string;
  imageUrl?: string;
  product_type?: string;
  booking_method?: "email" | "calendly" | "custom";
  booking_url?: string;
  description?: string;
  design_url?: string;
  mockup_urls?: string[];
  printful_variant_ids?: number[];
  printful_variants?: PrintfulVariant[];
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
  activeLayout?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  aboutStory?: string;
  founderName?: string;
  founderTitle?: string;
  missionStatement?: string;
  yearFounded?: string;
  value1?: string;
  value2?: string;
  value3?: string;
  generatedHtml?: string;
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  product_type?: string;
  selectedSize?: string;
  selectedColor?: string;
  printful_variant_id?: number;
};

type CustomerData = {
  fullName: string;
  email: string;
  phone: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  preferredDateTime: string;
  notes: string;
  briefDescription: string;
};

function getRequiredCheckoutFields(cartItems: CartItem[]) {
  const types = new Set(cartItems.map((item) => item.product_type || "physical"));
  return {
    shippingAddress: types.has("physical"),
    phoneRequired: types.has("consultation"),
    phoneOptional: types.has("physical") || types.has("service"),
    preferredDateTime: types.has("service"),
    notes: types.has("service") || types.has("consultation"),
    briefDescription: types.has("consultation"),
    digitalNote: types.has("digital") && !types.has("physical") && !types.has("service") && !types.has("consultation"),
  };
}

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

function parsePriceDollars(raw: string): number {
  const cleaned = (raw || "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function buildVariantModalInjection(products: Product[]): string {
  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    description: p.description || '',
    mockup_urls: p.mockup_urls || [],
    printful_variants: p.printful_variants || [],
  }));
  // Escape </script> in serialized JSON so the browser HTML parser doesn't close the tag early
  const dataJson = JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');

  return `<style>
#vc-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;padding:16px;box-sizing:border-box}
#vc-modal{width:100%;max-width:480px;background:#fff;border-radius:20px;box-shadow:0 32px 80px rgba(0,0,0,.22);overflow:hidden;max-height:85vh;display:flex;flex-direction:column}
.vc-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #F0EFED;flex-shrink:0}
.vc-ttl{font-size:15px;font-weight:600;color:#1A1A1A;font-family:system-ui,sans-serif}
.vc-cls{background:none;border:none;cursor:pointer;color:#AAA;font-size:18px;line-height:1;padding:4px}
.vc-body{overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px}
.vc-img{width:100%;max-height:200px;object-fit:contain;border-radius:12px;background:#F5F4F2}
.vc-price{font-size:22px;font-weight:700;color:#1A1A1A;font-family:system-ui,sans-serif}
.vc-desc{font-size:13px;color:#666;line-height:1.6;margin:0;font-family:system-ui,sans-serif}
.vc-lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#AAA;font-family:system-ui,sans-serif;margin-bottom:6px}
.vc-swatches{display:flex;flex-wrap:wrap;gap:8px}
.vc-sw{width:28px;height:28px;border-radius:50%;border:2px solid rgba(0,0,0,.12);cursor:pointer;flex-shrink:0}
.vc-sw.sel{border:3px solid #0f172a!important}
.vc-szs{display:flex;flex-wrap:wrap;gap:6px}
.vc-sz{padding:6px 12px;border-radius:7px;border:1.5px solid #E5E7EB;background:#fff;color:#1A1A1A;font-size:13px;cursor:pointer;font-family:system-ui,sans-serif}
.vc-sz.sel{border-color:#0f172a;background:#0f172a;color:#fff}
.vc-btn{width:100%;padding:12px 0;border-radius:10px;border:none;background:#0f172a;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:system-ui,sans-serif}
.vc-btn:disabled{background:#E5E7EB;color:#9CA3AF;cursor:not-allowed}
</style>
<script>
(function(){
var P=${dataJson};
var skip=false;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function show(btn,prod){
  var vars=prod.printful_variants||[];
  if(!vars.length)return;
  var sizes=[];
  vars.forEach(function(v){if(v.size&&sizes.indexOf(v.size)<0)sizes.push(v.size);});
  var cm=[];
  vars.forEach(function(v){if(v.color&&!cm.find(function(c){return c.color===v.color;}))cm.push(v);});
  var ss=sizes[0]||'',sc=cm[0]?cm[0].color:'';
  var ov=document.createElement('div');ov.id='vc-overlay';
  var can=(!sizes.length||!!ss)&&(!cm.length||!!sc);
  var imgH=prod.mockup_urls&&prod.mockup_urls[0]?'<img src="'+esc(prod.mockup_urls[0])+'" class="vc-img" alt="'+esc(prod.name)+'" />':'';
  var descH=prod.description?'<p class="vc-desc">'+esc(prod.description)+'</p>':'';
  var colH=cm.length?'<div><div class="vc-lbl">Color: <span id="vc-cl">'+esc(sc)+'</span></div><div class="vc-swatches">'+cm.map(function(v){return'<button class="vc-sw'+(v.color===sc?' sel':'')+'" title="'+esc(v.color)+'" style="background:'+(v.color_code||'#ccc')+'" data-c="'+esc(v.color)+'"></button>';}).join('')+'</div></div>':'';
  var szH=sizes.length?'<div><div class="vc-lbl">Size</div><div class="vc-szs">'+sizes.map(function(s){return'<button class="vc-sz'+(s===ss?' sel':'')+'" data-s="'+esc(s)+'">'+esc(s)+'</button>';}).join('')+'</div></div>':'';
  ov.innerHTML='<div id="vc-modal"><div class="vc-hdr"><span class="vc-ttl">'+esc(prod.name)+'</span><button class="vc-cls" id="vc-x">&#10005;</button></div><div class="vc-body">'+imgH+'<div class="vc-price">'+esc(prod.price)+'</div>'+descH+colH+szH+'<button class="vc-btn" id="vc-add"'+(can?'':' disabled')+'>'+(can?'Add to Cart \u2014 '+esc(prod.price):'Select size & color')+'</button></div></div>';
  document.body.appendChild(ov);
  function rm(){ov.remove();}
  ov.addEventListener('click',function(e){if(e.target===ov)rm();});
  document.getElementById('vc-x').addEventListener('click',rm);
  function upd(){
    var ok=(!sizes.length||!!ss)&&(!cm.length||!!sc);
    var ab=document.getElementById('vc-add');
    if(ab){ab.disabled=!ok;ab.textContent=ok?'Add to Cart \u2014 '+prod.price:'Select size & color';}
  }
  ov.querySelectorAll('.vc-sw').forEach(function(sw){
    sw.addEventListener('click',function(){
      sc=sw.getAttribute('data-c');
      ov.querySelectorAll('.vc-sw').forEach(function(x){x.classList.remove('sel');});
      sw.classList.add('sel');
      var cl=document.getElementById('vc-cl');if(cl)cl.textContent=sc;
      upd();
    });
  });
  ov.querySelectorAll('.vc-sz').forEach(function(sb){
    sb.addEventListener('click',function(){
      ss=sb.getAttribute('data-s');
      ov.querySelectorAll('.vc-sz').forEach(function(x){x.classList.remove('sel');});
      sb.classList.add('sel');
      upd();
    });
  });
  document.getElementById('vc-add').addEventListener('click',function(){
    rm();
    var mv=vars.find(function(v){return v.size===ss&&v.color===sc;})
      ||(ss?vars.find(function(v){return v.size===ss;}):null)
      ||(sc?vars.find(function(v){return v.color===sc;}):null)
      ||vars[0];
    var sfx=[ss,sc].filter(Boolean).join(' / ');
    if(sfx)btn.setAttribute('data-product-name',prod.name+' \u2014 '+sfx);
    if(mv)btn.setAttribute('data-variant-id',String(mv.id));
    skip=true;btn.click();
  });
}
document.addEventListener('click',function(e){
  if(skip){skip=false;return;}
  var btn=e.target&&e.target.closest?e.target.closest('[data-add-to-cart]'):null;
  if(!btn)return;
  var pid=btn.getAttribute('data-product-id');
  var prod=P.find(function(p){return p.id===pid;});
  if(!prod||!prod.printful_variants||!prod.printful_variants.length)return;
  e.stopImmediatePropagation();e.preventDefault();
  show(btn,prod);
},true);
})();
</script>`;
}

function IframeStore({ html, title, products }: { html: string; title: string; products?: Product[] }) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    let finalHtml = html;
    const printfulProducts = (products || []).filter(
      (p) => p.printful_variants && p.printful_variants.length > 0
    );
    if (printfulProducts.length > 0) {
      const injection = buildVariantModalInjection(printfulProducts);
      finalHtml = finalHtml.includes('</body>')
        ? finalHtml.replace('</body>', injection + '</body>')
        : finalHtml + injection;
    }

    doc.open();
    doc.write(finalHtml);
    doc.close();
  }, [html, products]);
  return (
    <iframe
      ref={ref}
      title={title}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none", display: "block" }}
    />
  );
}

export default function PublishedClient({ site }: { site: SiteSpec }) {
  if (site.generatedHtml) {
    return <IframeStore html={site.generatedHtml} title={site.brandName || "Store"} products={site.products} />;
  }
  return <FullStoreTemplate site={site} />;
}

function FullStoreTemplate({ site }: { site: SiteSpec }) {
  const [activeKey, setActiveKey]         = useState<PageKey>("home");
  const [cartOpen, setCartOpen]           = useState(false);
  const [checkingOut, setCheckingOut]     = useState(false);
  const [checkoutFormOpen, setCheckoutFormOpen] = useState(false);
  const [cart, setCart]                   = useState<CartItem[]>([]);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

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

  const [activePageId, setActivePageId] = useState<string>(pages[0]?.id ?? "");
  const activePage = pages.find((p) => p.key === activeKey) ?? pages[0];
  const logoSrc    = site.logoUrl || site.logoDataUrl;
  const heroSrc    = site.heroImageUrl || site.heroImageDataUrl;

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const subtotal  = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  const addToCart = (p: Product, opts?: { selectedSize?: string; selectedColor?: string; printful_variant_id?: number }) => {
    const price = parsePriceDollars(p.price);
    const image = p.imageUrl || p.imageDataUrl;
    const variantSuffix = (opts?.selectedSize || opts?.selectedColor)
      ? ` — ${[opts?.selectedSize, opts?.selectedColor].filter(Boolean).join(" / ")}`
      : "";
    // Use composite key so each size/color combo is a separate cart line
    const cartKey = opts ? `${p.id}|${opts.selectedSize || ""}|${opts.selectedColor || ""}` : p.id;
    setCart((prev) => {
      const existing = prev.find((x) => x.productId === cartKey);
      if (existing) return prev.map((x) => x.productId === cartKey ? { ...x, quantity: x.quantity + 1 } : x);
      return [...prev, {
        productId: cartKey,
        name: `${p.name}${variantSuffix}`,
        price,
        quantity: 1,
        image,
        product_type: p.product_type || "physical",
        selectedSize: opts?.selectedSize,
        selectedColor: opts?.selectedColor,
        printful_variant_id: opts?.printful_variant_id,
      }];
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

  // Opens checkout form modal
  const checkout = () => {
    if (cart.length === 0) { setCartOpen(true); return; }
    setCartOpen(false);
    setCheckoutFormOpen(true);
  };

  // Called after the form is submitted with customer data
  const submitCheckout = async (customerData: CustomerData) => {
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
            product_type: i.product_type,
            selectedSize: i.selectedSize,
            selectedColor: i.selectedColor,
            printful_variant_id: i.printful_variant_id,
          })),
          customerData,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) { alert(data?.error || "Checkout failed. Try again."); return; }
      window.location.href = data.url;
    } catch { alert("Checkout failed. Try again."); }
    finally  { setCheckingOut(false); }
  };

  return (
    <>
      <style>{`html, body { min-height: 100%; width: 100%; margin: 0; padding: 0; }`}</style>
      {site.activeLayout ? (
        <StoreLayout
          layoutId={site.activeLayout as LayoutId}
          site={site as any}
          activePageId={activePageId || pages[0]?.id}
          onSelectPage={(id) => {
            setActivePageId(id);
            const pg = pages.find((p) => p.id === id);
            if (pg) setActiveKey(pg.key);
          }}
          onAddToCart={addToCart}
          cartCount={cartCount}
          onOpenCart={() => setCartOpen(true)}
        />
      ) : (
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
          <ProductsPage site={site} onAdd={addToCart} onViewDetail={setDetailProduct} productsTopRef={productsTopRef} />
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
            <a href="/" className="hover:underline" style={{ color: t.mutedText }}>Volcity</a>
          </div>
        </div>
      </footer>

      </div>
      )}
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

      {/* Checkout form modal */}
      {checkoutFormOpen && (
        <CheckoutFormModal
          cart={cart}
          theme={t}
          checkingOut={checkingOut}
          onClose={() => setCheckoutFormOpen(false)}
          onSubmit={submitCheckout}
        />
      )}

      {/* Product detail modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          theme={t}
          onClose={() => setDetailProduct(null)}
          onAddToCart={(opts) => {
            addToCart(detailProduct, opts);
            setDetailProduct(null);
          }}
        />
      )}
    </>
  );
}

/* ─── Checkout Form Modal ────────────────────────────────────────── */

function CheckoutFormModal({
  cart,
  theme: t,
  checkingOut,
  onClose,
  onSubmit,
}: {
  cart: CartItem[];
  theme: Theme;
  checkingOut: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerData) => void;
}) {
  const fields = getRequiredCheckoutFields(cart);
  const [form, setForm] = useState<CustomerData>({
    fullName: "",
    email: "",
    phone: "",
    shippingLine1: "",
    shippingLine2: "",
    shippingCity: "",
    shippingState: "",
    shippingZip: "",
    shippingCountry: "",
    preferredDateTime: "",
    notes: "",
    briefDescription: "",
  });

  function set(key: keyof CustomerData, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) return;
    if (fields.phoneRequired && !form.phone.trim()) return;
    if (fields.briefDescription && !form.briefDescription.trim()) return;
    onSubmit(form);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: t.border }}>
          <div className="font-semibold text-slate-900">Complete your order</div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-md border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Digital product note */}
          {fields.digitalNote && (
            <div className="text-xs px-3 py-2.5 rounded-lg" style={{ background: `${t.accent}10`, color: t.accent }}>
              Your download link will be sent to this email after purchase.
            </div>
          )}

          {/* Full Name */}
          <CheckoutField
            label="Full Name"
            required
            value={form.fullName}
            onChange={(v) => set("fullName", v)}
            placeholder="Jane Smith"
            theme={t}
          />

          {/* Email */}
          <CheckoutField
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(v) => set("email", v)}
            placeholder="jane@example.com"
            theme={t}
          />

          {/* Phone */}
          {(fields.phoneRequired || fields.phoneOptional) && (
            <CheckoutField
              label={`Phone${fields.phoneRequired ? "" : " (optional)"}`}
              type="tel"
              required={fields.phoneRequired}
              value={form.phone}
              onChange={(v) => set("phone", v)}
              placeholder="+1 555-0100"
              theme={t}
            />
          )}

          {/* Shipping address */}
          {fields.shippingAddress && (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 pt-1">Shipping Address</div>
              <CheckoutField
                label="Address Line 1"
                required
                value={form.shippingLine1}
                onChange={(v) => set("shippingLine1", v)}
                placeholder="123 Main St"
                theme={t}
              />
              <CheckoutField
                label="Address Line 2 (optional)"
                value={form.shippingLine2}
                onChange={(v) => set("shippingLine2", v)}
                placeholder="Apt 4B"
                theme={t}
              />
              <div className="grid grid-cols-2 gap-3">
                <CheckoutField
                  label="City"
                  required
                  value={form.shippingCity}
                  onChange={(v) => set("shippingCity", v)}
                  placeholder="Austin"
                  theme={t}
                />
                <CheckoutField
                  label="State"
                  required
                  value={form.shippingState}
                  onChange={(v) => set("shippingState", v)}
                  placeholder="TX"
                  theme={t}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CheckoutField
                  label="ZIP"
                  required
                  value={form.shippingZip}
                  onChange={(v) => set("shippingZip", v)}
                  placeholder="78701"
                  theme={t}
                />
                <CheckoutField
                  label="Country"
                  required
                  value={form.shippingCountry}
                  onChange={(v) => set("shippingCountry", v)}
                  placeholder="US"
                  theme={t}
                />
              </div>
            </>
          )}

          {/* Preferred date/time */}
          {fields.preferredDateTime && (
            <CheckoutField
              label="Preferred Date / Time (optional)"
              value={form.preferredDateTime}
              onChange={(v) => set("preferredDateTime", v)}
              placeholder="e.g. March 28 at 2pm"
              theme={t}
            />
          )}

          {/* Brief description (consultation) */}
          {fields.briefDescription && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: t.mutedText }}>
                Brief Description of Needs <span style={{ color: t.accent }}>*</span>
              </label>
              <textarea
                required
                maxLength={300}
                value={form.briefDescription}
                onChange={(e) => set("briefDescription", e.target.value)}
                placeholder="Describe what you're looking for…"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none"
                style={{ borderColor: t.border, color: t.text, background: "#fff" }}
              />
              <div className="text-xs mt-1 text-right" style={{ color: t.mutedText }}>
                {form.briefDescription.length}/300
              </div>
            </div>
          )}

          {/* Notes (service) */}
          {fields.notes && !fields.briefDescription && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: t.mutedText }}>
                Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Anything we should know…"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none"
                style={{ borderColor: t.border, color: t.text, background: "#fff" }}
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: t.border }}>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={checkingOut}
            className="w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.98] hover:opacity-90"
            style={{
              background: checkingOut ? "#f1f5f9" : t.accent,
              color: checkingOut ? "#94a3b8" : "#fff",
              cursor: checkingOut ? "not-allowed" : "pointer",
            }}
          >
            {checkingOut ? "Redirecting to payment…" : "Proceed to Payment →"}
          </button>
          <p className="mt-2 text-xs text-center flex items-center justify-center gap-1.5" style={{ color: t.mutedText }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Secure payment via Stripe
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckoutField({
  label,
  type = "text",
  required,
  value,
  onChange,
  placeholder,
  theme: t,
}: {
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  theme: Theme;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: t.mutedText }}>
        {label} {required && <span style={{ color: t.accent }}>*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
        style={{ borderColor: t.border, color: t.text, background: "#fff" }}
      />
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

/* ─── Product Detail Modal ───────────────────────────────────────── */

function ProductDetailModal({ product, theme, onClose, onAddToCart }: {
  product: Product;
  theme: Theme;
  onClose: () => void;
  onAddToCart: (opts: { selectedSize?: string; selectedColor?: string; printful_variant_id?: number }) => void;
}) {
  const variants    = product.printful_variants || [];
  const sizes       = [...new Set(variants.map((v) => v.size))].filter(Boolean);
  const colors      = [...new Map(variants.map((v) => [v.color, v])).values()].filter((v) => v.color);
  const mockupUrls  = product.mockup_urls?.length ? product.mockup_urls : null;
  const fallbackImg = product.imageUrl || product.imageDataUrl;

  const [selectedSize,       setSelectedSize]       = useState(sizes[0]   || "");
  const [selectedColor,      setSelectedColor]      = useState(colors[0]?.color || "");
  const [selectedMockupIdx,  setSelectedMockupIdx]  = useState(0);

  const hasVariants = sizes.length > 0 || colors.length > 0;
  const mainImg     = mockupUrls ? mockupUrls[selectedMockupIdx] : fallbackImg;

  // Find the matching Printful variant ID for selected size + color
  const matchingVariant = variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  ) ?? (selectedSize ? variants.find((v) => v.size === selectedSize) : null)
    ?? (selectedColor ? variants.find((v) => v.color === selectedColor) : null);

  // Filter available sizes for the selected color (and vice versa)
  const availableSizes  = selectedColor ? [...new Set(variants.filter((v) => v.color === selectedColor).map((v) => v.size))] : sizes;
  const availableColors = selectedSize  ? [...new Map(variants.filter((v) => v.size === selectedSize).map((v) => [v.color, v])).values()] : colors;

  const canAddToCart = !hasVariants || ((!sizes.length || !!selectedSize) && (!colors.length || !!selectedColor));

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.22)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #F0EFED", flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{product.name}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#AAA", padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* Main image */}
          <div style={{ aspectRatio: "1", background: "#F5F4F2", overflow: "hidden" }}>
            {mainImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImg} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
          </div>

          {/* Mockup thumbnail strip */}
          {mockupUrls && mockupUrls.length > 1 && (
            <div style={{ display: "flex", gap: 8, padding: "10px 16px 0", overflowX: "auto" }}>
              {mockupUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i} src={url} alt={`View ${i + 1}`}
                  onClick={() => setSelectedMockupIdx(i)}
                  style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0, cursor: "pointer", border: selectedMockupIdx === i ? `2px solid ${theme.accent}` : "2px solid transparent", opacity: selectedMockupIdx === i ? 1 : 0.6, transition: "opacity 0.15s" }}
                />
              ))}
            </div>
          )}

          <div style={{ padding: "20px 20px 24px" }}>
            {/* Price */}
            <div style={{ fontSize: 22, fontWeight: 700, color: theme.accent, marginBottom: 10 }}>{product.price}</div>

            {/* Description */}
            {product.description && (
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 16 }}>{product.description}</p>
            )}

            {/* Color selector */}
            {colors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>
                  Color: <span style={{ color: "#1A1A1A", textTransform: "none", letterSpacing: 0 }}>{selectedColor}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {availableColors.map((v) => (
                    <button
                      key={v.color}
                      title={v.color}
                      onClick={() => setSelectedColor(v.color)}
                      style={{ width: 28, height: 28, borderRadius: "50%", background: v.color_code || "#ccc", border: selectedColor === v.color ? `3px solid ${theme.accent}` : "2px solid rgba(0,0,0,0.12)", cursor: "pointer", flexShrink: 0, outline: "none" }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
            {sizes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#AAA", marginBottom: 8 }}>Size</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {availableSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      style={{ padding: "6px 12px", borderRadius: 7, border: `1.5px solid ${selectedSize === s ? theme.accent : "#E5E7EB"}`, background: selectedSize === s ? theme.accent : "#fff", color: selectedSize === s ? "#fff" : "#1A1A1A", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add to cart */}
            <button
              disabled={!canAddToCart}
              onClick={() => onAddToCart({
                selectedSize:       selectedSize  || undefined,
                selectedColor:      selectedColor || undefined,
                printful_variant_id: matchingVariant?.id,
              })}
              style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: canAddToCart ? theme.accent : "#E5E7EB", color: canAddToCart ? "#fff" : "#9CA3AF", fontSize: 14, fontWeight: 600, cursor: canAddToCart ? "pointer" : "not-allowed" }}
            >
              {canAddToCart ? "Add to cart" : "Select size & color"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Products Page ──────────────────────────────────────────────── */

function ProductsPage({ site, onAdd, onViewDetail, productsTopRef }: {
  site: SiteSpec;
  onAdd: (p: Product, opts?: { selectedSize?: string; selectedColor?: string }) => void;
  onViewDetail: (p: Product) => void;
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
                  {p.product_type === "service" ? (
                    <button
                      onClick={() => {
                        if (p.booking_method === "email" || !p.booking_method) {
                          window.location.href = `mailto:${site.contactEmail || ""}`;
                        } else if (p.booking_url) {
                          window.open(p.booking_url, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className="mt-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                      style={{ background: t.accent, color: "#fff" }}
                    >
                      Book Now
                    </button>
                  ) : (p.printful_variants?.length ?? 0) > 0 ? (
                    <button
                      onClick={() => onViewDetail(p)}
                      className="mt-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                      style={{ background: t.accent, color: "#fff" }}
                    >
                      Select options
                    </button>
                  ) : (
                    <button
                      onClick={() => onAdd(p)}
                      className="mt-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                      style={{ background: t.accent, color: "#fff" }}
                    >
                      Add to cart
                    </button>
                  )}
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
  const hasValues = site.value1 || site.value2 || site.value3;
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight mb-6" style={{ color: t.text }}>About us</h2>
        {site.aboutStory ? (
          <p className="text-lg leading-relaxed" style={{ color: t.mutedText }}>{site.aboutStory}</p>
        ) : (
          <>
            <p className="text-lg leading-relaxed" style={{ color: t.mutedText }}>
              {site.brandName} exists to deliver a clear promise: {site.offer}.
            </p>
            {site.audience && (
              <p className="mt-4 text-base leading-relaxed" style={{ color: t.mutedText }}>
                We serve {site.audience}, delivering {site.firstProductOrService} that makes a real difference.
              </p>
            )}
          </>
        )}
        {(site.founderName || site.yearFounded) && (
          <div className="mt-8 pt-8 border-t" style={{ borderColor: t.border }}>
            {site.founderName && (
              <div>
                <div className="font-semibold text-base" style={{ color: t.text }}>{site.founderName}</div>
                {site.founderTitle && <div className="text-sm mt-0.5" style={{ color: t.mutedText }}>{site.founderTitle}</div>}
              </div>
            )}
            {site.yearFounded && (
              <div className="mt-2 text-sm" style={{ color: t.mutedText }}>Founded {site.yearFounded}</div>
            )}
          </div>
        )}
        {site.missionStatement && (
          <div className="mt-8 p-5 rounded-xl" style={{ background: `${t.accent}08`, border: `1px solid ${t.accent}20` }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: t.accent }}>Our Mission</div>
            <p className="text-base font-medium leading-relaxed" style={{ color: t.text, margin: 0 }}>{site.missionStatement}</p>
          </div>
        )}
        {hasValues && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4" style={{ color: t.text }}>What We Stand For</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              {[site.value1, site.value2, site.value3].filter(Boolean).map((v, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 8, padding: "16px 20px" }}>
                  <div className="text-sm font-medium" style={{ color: t.text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Contact Page ───────────────────────────────────────────────── */

function ContactPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  const contactEmail = site.contactEmail;

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="max-w-md">
        <h2 className="text-3xl font-bold tracking-tight mb-4" style={{ color: t.text }}>Get in touch</h2>
        <p className="text-base leading-relaxed mb-8" style={{ color: t.mutedText }}>
          We&apos;d love to hear from you.
        </p>

        {contactEmail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${t.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 11, color: t.mutedText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Reach us here</div>
                <a
                  href={`mailto:${contactEmail}`}
                  style={{ color: t.accent, fontWeight: 500, fontSize: 16, textDecoration: "none" }}
                >
                  {contactEmail}
                </a>
              </div>
            </div>
            {site.contactPhone && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${t.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: t.mutedText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Phone</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: t.text }}>{site.contactPhone}</div>
                </div>
              </div>
            )}
            {site.contactAddress && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${t.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: t.mutedText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Address</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: t.text }}>{site.contactAddress}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "24px", borderRadius: 12, border: `1px solid ${t.border}`, background: t.surface || "#fff" }}>
            <p style={{ fontSize: 14, color: t.mutedText, margin: 0 }}>Contact information coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
