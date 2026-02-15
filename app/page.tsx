"use client";

import { useMemo, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

// Bright default (white + blue)
const LIGHT_THEME: Theme = {
  accent: "#2563eb",
  accent2: "#06b6d4",
  bg: "#ffffff",
  panel: "#ffffff",
  surface: "#ffffff",
  text: "#0b1220",
  mutedText: "#475569",
  border: "rgba(2,6,23,0.10)",
};

const THEME_PRESETS: { name: string; theme: Theme }[] = [
  { name: "Bright (Default)", theme: LIGHT_THEME },
  {
    name: "Warm Bright",
    theme: {
      accent: "#2563eb",
      accent2: "#f97316",
      bg: "#ffffff",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#0b1220",
      mutedText: "#475569",
      border: "rgba(2,6,23,0.12)",
    },
  },
  {
    name: "Soft Gray",
    theme: {
      accent: "#2563eb",
      accent2: "#22c55e",
      bg: "#f8fafc",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#0b1220",
      mutedText: "#475569",
      border: "rgba(2,6,23,0.10)",
    },
  },
];

const FONT_OPTIONS: FontChoice[] = [
  "Inter",
  "Plus Jakarta Sans",
  "Poppins",
  "Montserrat",
  "DM Sans",
  "Georgia",
  "Times New Roman",
];

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

export default function Home() {
  // --- chat ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);

  // --- site ---
  const [generating, setGenerating] = useState(false);
  const [site, setSite] = useState<SiteSpec | null>(null);

  // --- UI ---
  const [rightTab, setRightTab] = useState<
    "quick" | "content" | "design" | "pages" | "products" | "sections"
  >("quick");

  const [activePageId, setActivePageId] = useState<string>("");

  const logoPickerRef = useRef<HTMLInputElement | null>(null);
  const heroPickerRef = useRef<HTMLInputElement | null>(null);

  const assistantCount = useMemo(
    () => messages.filter((m) => m.role === "assistant").length,
    [messages]
  );
  const canGenerate = assistantCount >= 3 && !generating;

  const theme = site?.theme ?? LIGHT_THEME;

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loadingChat) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoadingChat(true);

    try {
      const res = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data?.error || "Server issue. Try again." },
        ]);
        return;
      }

      const reply =
        data?.result ||
        "I got your message — but didn’t generate a reply. Try again.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const generateSite = async () => {
    if (generating) return;

    if (messages.length === 0) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Tell me what you’re building first." },
      ]);
      return;
    }

    setGenerating(true);

    try {
      // Force at least 5 seconds of loading (feels intentional)
      const minDelay = sleep(5000);

      const resPromise = fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      const [res] = await Promise.all([resPromise, minDelay]);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data?.error || "Generation failed — try again." },
        ]);
        return;
      }

      if (!data.site) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "No blueprint returned. Try again." },
        ]);
        return;
      }

      const base = data.site as Omit<
        SiteSpec,
        "theme" | "products" | "logoDataUrl" | "heroImageDataUrl" | "pages" | "font"
      >;

      const pages: Page[] = [
        { id: uid(), key: "home", name: "Home" },
        { id: uid(), key: "products", name: "Products" },
        { id: uid(), key: "about", name: "About" },
        { id: uid(), key: "contact", name: "Contact" },
      ];

      const hydrated: SiteSpec = {
        ...base,
        theme: THEME_PRESETS[0].theme,
        font: "Inter",
        pages,
        products: [
          { id: uid(), name: "Runner’s Core Shorts", price: "$48" },
          { id: uid(), name: "BreathLite Performance Tee", price: "$36" },
          { id: uid(), name: "NoirStride Training Cap", price: "$28" },
        ],
      };

      setSite(hydrated);
      setActivePageId(pages[0].id);
      setRightTab("quick");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Generated.\n\nNext: upload a hero image + make your Products page look real.",
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Generation error: ${e?.message || e}` },
      ]);
    } finally {
      setGenerating(false);
    }
  };

  // ---- products ----
  const addProduct = () => {
    if (!site) return;
    setSite({
      ...site,
      products: [...site.products, { id: uid(), name: "New Product", price: "$00" }],
    });
  };

  const updateProduct = (id: string, patch: Partial<Product>) => {
    if (!site) return;
    setSite({
      ...site,
      products: site.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const removeProduct = (id: string) => {
    if (!site) return;
    setSite({ ...site, products: site.products.filter((p) => p.id !== id) });
  };

  // ---- images ----
  const setLogoFromFile = async (file?: File) => {
    if (!file || !site) return;
    const dataUrl = await fileToDataUrl(file);
    setSite({ ...site, logoDataUrl: dataUrl });
  };

  const setHeroImageFromFile = async (file?: File) => {
    if (!file || !site) return;
    const dataUrl = await fileToDataUrl(file);
    setSite({ ...site, heroImageDataUrl: dataUrl });
  };

  // ---- pages ----
  const addPage = () => {
    if (!site) return;
    const newPage: Page = { id: uid(), key: uid(), name: "New Page" };
    const updated = { ...site, pages: [...site.pages, newPage] };
    setSite(updated);
    setActivePageId(newPage.id);
  };

  const renamePage = (id: string, name: string) => {
    if (!site) return;
    setSite({
      ...site,
      pages: site.pages.map((p) => (p.id === id ? { ...p, name } : p)),
    });
  };

  const removePage = (id: string) => {
    if (!site) return;
    const remaining = site.pages.filter((p) => p.id !== id);
    if (remaining.length === 0) return;
    setSite({ ...site, pages: remaining });
    if (activePageId === id) setActivePageId(remaining[0].id);
  };

  const exportJson = () => {
    navigator.clipboard.writeText(JSON.stringify(site ?? {}, null, 2));
    alert("Copied site JSON to clipboard.");
  };

  return (
    // KEY: h-screen + flex-col + overflow-hidden so panes control their own scroll
    <main className="h-screen flex flex-col overflow-hidden" style={{ background: theme.bg, color: theme.text }}>
      {/* Top bar */}
      <div className="h-14 border-b flex items-center justify-between px-4" style={{ background: theme.panel, borderColor: theme.border }}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded" style={{ background: theme.accent }} />
          <div className="leading-tight">
            <div className="font-semibold">VentureOS</div>
            <div className="text-xs" style={{ color: theme.mutedText }}>
              Build • Launch • Operate
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={generateSite}
            disabled={!canGenerate || generating}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{
              background: !canGenerate || generating ? "rgba(2,6,23,0.08)" : theme.accent,
              color: !canGenerate || generating ? theme.mutedText : "#fff",
              cursor: !canGenerate || generating ? "not-allowed" : "pointer",
            }}
          >
            {generating ? "Generating…" : "Generate"}
          </button>

          <button
            className="px-4 py-2 rounded-lg text-sm font-medium border hover:opacity-90"
            style={{ borderColor: theme.border, background: "transparent", color: theme.text }}
            onClick={exportJson}
          >
            Export
          </button>
        </div>
      </div>

      {/* Workspace (fills remaining height) */}
      <div className="grid grid-cols-12 flex-1 min-h-0">
        {/* Left: chat (scrolls inside itself) */}
        <aside className="col-span-12 md:col-span-3 border-r flex flex-col min-h-0" style={{ background: theme.panel, borderColor: theme.border }}>
          <div className="p-4 border-b" style={{ borderColor: theme.border }}>
            <div className="font-semibold">VentureOS Guide</div>
            <div className="text-xs" style={{ color: theme.mutedText }}>
              Operator-style guidance + execution.
            </div>
          </div>

          {/* IMPORTANT: min-h-0 allows this flex child to actually scroll */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-sm" style={{ color: theme.mutedText }}>
                Start with: <span style={{ color: theme.text, fontWeight: 600 }}>“I want to build…”</span>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="text-sm">
                <div
                  className="inline-block max-w-[95%] rounded-xl px-3 py-2 whitespace-pre-line"
                  style={{
                    background: m.role === "user" ? "rgba(37,99,235,0.10)" : "rgba(2,6,23,0.04)",
                    border: `1px solid ${theme.border}`,
                    marginLeft: m.role === "user" ? "auto" : undefined,
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loadingChat && <div className="text-xs" style={{ color: theme.mutedText }}>Thinking…</div>}
          </div>

          <div className="p-3 border-t" style={{ borderColor: theme.border }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask VentureOS…"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "rgba(2,6,23,0.03)", border: `1px solid ${theme.border}`, color: theme.text }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loadingChat}
                className="px-3 py-2 rounded-lg text-sm font-medium transition"
                style={{
                  background: loadingChat ? "rgba(2,6,23,0.08)" : theme.accent,
                  color: loadingChat ? theme.mutedText : "#fff",
                  cursor: loadingChat ? "not-allowed" : "pointer",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </aside>

        {/* Center: preview (scrolls inside itself) */}
        <section className="col-span-12 md:col-span-6 min-h-0 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {!site ? <EmptyPreview theme={theme} /> : <SitePreview site={site} activePageId={activePageId || site.pages[0]?.id} onSelectPage={setActivePageId} />}
          </div>
        </section>

        {/* Right: builder (scrolls inside itself) */}
        <aside className="col-span-12 md:col-span-3 border-l flex flex-col min-h-0" style={{ background: theme.panel, borderColor: theme.border }}>
          <div className="p-4 border-b" style={{ borderColor: theme.border }}>
            <div className="font-semibold">Builder</div>
            <div className="text-xs" style={{ color: theme.mutedText }}>
              Pages • Design • Fonts • Products
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Tab label="Quick" active={rightTab === "quick"} theme={theme} onClick={() => setRightTab("quick")} />
              <Tab label="Pages" active={rightTab === "pages"} theme={theme} onClick={() => setRightTab("pages")} />
              <Tab label="Design" active={rightTab === "design"} theme={theme} onClick={() => setRightTab("design")} />
              <Tab label="Content" active={rightTab === "content"} theme={theme} onClick={() => setRightTab("content")} />
              <Tab label="Products" active={rightTab === "products"} theme={theme} onClick={() => setRightTab("products")} />
              <Tab label="Sections" active={rightTab === "sections"} theme={theme} onClick={() => setRightTab("sections")} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
            {!site ? (
              <div className="text-sm" style={{ color: theme.mutedText }}>
                Generate a site first. Then customization appears here.
              </div>
            ) : (
              <>
                {/* hidden file pickers */}
                <input ref={logoPickerRef} type="file" accept="image/*" className="hidden" onChange={async (e) => setLogoFromFile(e.target.files?.[0])} />
                <input ref={heroPickerRef} type="file" accept="image/*" className="hidden" onChange={async (e) => setHeroImageFromFile(e.target.files?.[0])} />

                {rightTab === "quick" && (
                  <div className="space-y-3">
                    <Card theme={theme} title="Start here">
                      <div className="text-sm" style={{ color: theme.mutedText }}>
                        These make your site feel real fast.
                      </div>
                      <div className="mt-3 space-y-2">
                        <ActionButton theme={theme} onClick={() => heroPickerRef.current?.click()}>
                          Upload Hero Image
                        </ActionButton>
                        <ActionButton theme={theme} onClick={() => logoPickerRef.current?.click()}>
                          Upload Logo
                        </ActionButton>
                        <ActionButton theme={theme} onClick={() => addProduct()}>
                          + Add Product
                        </ActionButton>
                      </div>
                    </Card>

                    <Card theme={theme} title="Theme presets">
                      <div className="grid gap-2">
                        {THEME_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            className="text-sm px-3 py-2 rounded-lg border text-left transition hover:opacity-90"
                            style={{ borderColor: theme.border, background: "rgba(2,6,23,0.02)" }}
                            onClick={() => setSite({ ...site, theme: { ...p.theme } })}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {rightTab === "pages" && (
                  <Card theme={theme} title="Pages">
                    <div className="text-sm" style={{ color: theme.mutedText }}>
                      Add multiple pages: Products, About, etc.
                    </div>

                    <div className="mt-3 space-y-2">
                      {site.pages.map((p) => (
                        <div key={p.id} className="flex gap-2 items-center">
                          <input
                            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none border"
                            style={{ borderColor: theme.border }}
                            value={p.name}
                            onChange={(e) => renamePage(p.id, e.target.value)}
                          />
                          <button
                            className="px-2 py-2 rounded-lg border text-xs hover:opacity-90"
                            style={{ borderColor: theme.border }}
                            onClick={() => removePage(p.id)}
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3">
                      <ActionButton theme={theme} onClick={addPage}>
                        + Add Page
                      </ActionButton>
                    </div>
                  </Card>
                )}

                {rightTab === "design" && (
                  <div className="space-y-3">
                    <Card theme={theme} title="Fonts">
                      <select
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                        style={{ borderColor: theme.border }}
                        value={site.font}
                        onChange={(e) => setSite({ ...site, font: e.target.value as FontChoice })}
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 text-xs" style={{ color: theme.mutedText }}>
                        (We’ll load real web fonts later. This is MVP.)
                      </div>
                    </Card>

                    <Card theme={theme} title="Colors">
                      <ColorField theme={theme} label="Accent" value={site.theme.accent} onChange={(v) => setSite({ ...site, theme: { ...site.theme, accent: v } })} />
                      <div className="h-2" />
                      <ColorField theme={theme} label="Accent 2" value={site.theme.accent2} onChange={(v) => setSite({ ...site, theme: { ...site.theme, accent2: v } })} />
                      <div className="h-2" />
                      <ColorField theme={theme} label="Background" value={site.theme.bg} onChange={(v) => setSite({ ...site, theme: { ...site.theme, bg: v } })} />
                      <div className="h-2" />
                      <ColorField theme={theme} label="Text" value={site.theme.text} onChange={(v) => setSite({ ...site, theme: { ...site.theme, text: v } })} />
                      <div className="h-2" />
                      <ColorField theme={theme} label="Border" value={site.theme.border} onChange={(v) => setSite({ ...site, theme: { ...site.theme, border: v } })} />
                    </Card>
                  </div>
                )}

                {rightTab === "content" && (
                  <div className="space-y-3">
                    <Field theme={theme} label="Brand Name" value={site.brandName} onChange={(v) => setSite({ ...site, brandName: v })} />
                    <Field theme={theme} label="Tagline" value={site.tagline} onChange={(v) => setSite({ ...site, tagline: v })} />
                    <Field theme={theme} label="Hero Headline" value={site.heroHeadline} onChange={(v) => setSite({ ...site, heroHeadline: v })} />
                    <TextField theme={theme} label="Hero Subheadline" value={site.heroSubheadline} onChange={(v) => setSite({ ...site, heroSubheadline: v })} />
                    <Field theme={theme} label="Primary CTA" value={site.primaryCTA} onChange={(v) => setSite({ ...site, primaryCTA: v })} />
                    <Card theme={theme} title="Images">
                      <div className="space-y-2">
                        <ActionButton theme={theme} onClick={() => logoPickerRef.current?.click()}>Upload Logo</ActionButton>
                        <ActionButton theme={theme} onClick={() => heroPickerRef.current?.click()}>Upload Hero Image</ActionButton>
                      </div>
                    </Card>
                  </div>
                )}

                {rightTab === "products" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Catalog</div>
                      <button className="text-xs px-2 py-1 rounded-lg border hover:opacity-90" style={{ borderColor: theme.border }} onClick={addProduct}>
                        + Add
                      </button>
                    </div>

                    {site.products.map((p) => (
                      <Card key={p.id} theme={theme} title={p.name || "Product"}>
                        <Field theme={theme} label="Name" value={p.name} onChange={(v) => updateProduct(p.id, { name: v })} />
                        <div className="h-2" />
                        <Field theme={theme} label="Price" value={p.price} onChange={(v) => updateProduct(p.id, { price: v })} />
                        <div className="h-3" />
                        <div className="text-xs font-medium" style={{ color: theme.mutedText }}>Image</div>
                        <input
                          type="file"
                          accept="image/*"
                          className="text-xs"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const dataUrl = await fileToDataUrl(file);
                            updateProduct(p.id, { imageDataUrl: dataUrl });
                          }}
                        />
                        <div className="h-3" />
                        <button className="text-xs px-2 py-1 rounded-lg border hover:opacity-90" style={{ borderColor: theme.border }} onClick={() => removeProduct(p.id)}>
                          Remove
                        </button>
                      </Card>
                    ))}
                  </div>
                )}

                {rightTab === "sections" && (
                  <Card theme={theme} title="Sections">
                    <div className="text-sm" style={{ color: theme.mutedText }}>
                      Next: reorder/add/remove controls. For now, ask VentureOS to rewrite.
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t text-xs" style={{ borderColor: theme.border, color: theme.mutedText }}>
            Next: publish flow (share link + custom domain + deploy).
          </div>
        </aside>
      </div>

      {/* Generate Loading Overlay */}
      {generating && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.75)" }}>
          <div className="rounded-2xl border bg-white p-6 w-[320px] shadow-sm" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-3">
              <Spinner color={theme.accent} />
              <div>
                <div className="font-semibold">Generating your site…</div>
                <div className="text-sm" style={{ color: theme.mutedText }}>
                  Building pages, layout, and storefront structure
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full" style={{ background: "rgba(2,6,23,0.08)" }}>
              <div className="h-2 rounded-full animate-pulse" style={{ width: "70%", background: theme.accent }} />
            </div>
            <div className="mt-2 text-xs" style={{ color: theme.mutedText }}>
              This takes a few seconds…
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------------- Preview ---------------- */

function SitePreview({
  site,
  activePageId,
  onSelectPage,
}: {
  site: SiteSpec;
  activePageId: string;
  onSelectPage: (id: string) => void;
}) {
  const t = site.theme;
  const activePage = site.pages.find((p) => p.id === activePageId) ?? site.pages[0];
  const fontFamily = fontStack(site.font);

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: t.border, background: t.surface, color: t.text, fontFamily }}>
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

      <div className="px-5 py-3 border-b flex gap-2 flex-wrap" style={{ borderColor: t.border, background: t.bg }}>
        {site.pages.map((p) => {
          const active = p.id === activePage.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPage(p.id)}
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

      <div className="p-6 md:p-8" style={{ background: t.bg }}>
        {activePage.key === "products" ? (
          <ProductsPage site={site} />
        ) : activePage.key === "about" ? (
          <AboutPage site={site} />
        ) : activePage.key === "contact" ? (
          <ContactPage site={site} />
        ) : (
          <HomePage site={site} />
        )}

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
              Upload a hero image (Builder → Content or Quick)
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-6">
        {site.sections.map((s, idx) => (
          <section key={idx} className="rounded-2xl border p-5" style={{ borderColor: t.border, background: "#fff" }}>
            <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
            <ul className="list-disc pl-6" style={{ color: t.mutedText }}>
              {s.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-3">FAQ</h3>
        <div className="space-y-3">
          {site.faq.map((f, i) => (
            <div key={i} className="rounded-2xl border p-5" style={{ borderColor: t.border, background: "#fff" }}>
              <div className="font-medium">{f.q}</div>
              <div className="mt-1" style={{ color: t.mutedText }}>{f.a}</div>
            </div>
          ))}
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
        <div className="text-sm" style={{ color: t.mutedText }}>
          Curated for performance + trust
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {site.products.map((p) => (
          <div key={p.id} className="rounded-2xl p-4 border" style={{ borderColor: t.border, background: "#fff" }}>
            <div className="rounded-xl overflow-hidden mb-3 border" style={{ borderColor: t.border }}>
              {p.imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageDataUrl} alt={p.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="h-36 flex items-center justify-center text-xs" style={{ color: t.mutedText }}>
                  Add image in Builder → Products
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

      <div className="mt-3 text-xs" style={{ color: t.mutedText }}>
        Checkout later (Stripe). This is storefront UX for now.
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
        {site.brandName} exists to deliver a clear promise: {site.offer}. This page is where your story,
        credibility, and brand philosophy live.
      </p>
      <div className="mt-4 text-sm" style={{ color: t.mutedText }}>
        Tip: add founder story + proof + what makes you different.
      </div>
    </div>
  );
}

function ContactPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border p-6" style={{ borderColor: t.border, background: "#fff" }}>
        <h2 className="text-2xl font-semibold">Contact</h2>
        <p className="mt-2" style={{ color: t.mutedText }}>
          Keep contact simple and professional.
        </p>
        <div className="mt-4 text-sm" style={{ color: t.mutedText }}>
          Email: support@{site.brandName.toLowerCase().replace(/\s+/g, "")}.com
          <br />
          Instagram: @{site.brandName.toLowerCase().replace(/\s+/g, "")}
        </div>
      </div>

      <div className="rounded-2xl border p-6" style={{ borderColor: t.border, background: "#fff" }}>
        <div className="text-sm font-medium">Message</div>
        <input className="mt-2 w-full px-3 py-2 rounded-lg border" style={{ borderColor: t.border }} placeholder="Your email" />
        <textarea className="mt-2 w-full px-3 py-2 rounded-lg border" style={{ borderColor: t.border }} rows={5} placeholder="What can we help with?" />
        <button className="mt-3 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: t.accent, color: "#fff" }}>
          Send
        </button>
      </div>
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

function EmptyPreview({ theme }: { theme: Theme }) {
  return (
    <div className="rounded-2xl border p-8" style={{ borderColor: theme.border, background: "#fff" }}>
      <div className="text-sm" style={{ color: theme.mutedText }}>Preview</div>
      <div className="text-2xl font-semibold mt-2">Your site will appear here</div>
      <p className="mt-2" style={{ color: theme.mutedText }}>
        Chat on the left for a few turns, then click <strong>Generate</strong>.
      </p>
    </div>
  );
}

function Card({ theme, title, children }: { theme: Theme; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: theme.border, background: "#fff" }}>
      <div className="font-semibold text-sm">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Tab({ label, active, theme, onClick }: { label: string; active: boolean; theme: Theme; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-lg border transition"
      style={{
        borderColor: theme.border,
        background: active ? "rgba(37,99,235,0.10)" : "#fff",
        color: theme.text,
      }}
    >
      {label}
    </button>
  );
}

function ActionButton({ theme, children, onClick }: { theme: Theme; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
      style={{ background: theme.accent, color: "#fff" }}
    >
      {children}
    </button>
  );
}

function SmallButton({ theme, children, onClick }: { theme: Theme; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2 py-1 rounded-lg border transition hover:opacity-90"
      style={{ borderColor: theme.border, background: "#fff", color: theme.text }}
    >
      {children}
    </button>
  );
}

function Field({ theme, label, value, onChange }: { theme: Theme; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1" style={{ color: theme.mutedText }}>{label}</div>
      <input className="w-full px-3 py-2 rounded-lg text-sm outline-none border" style={{ borderColor: theme.border }} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function TextField({ theme, label, value, onChange }: { theme: Theme; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1" style={{ color: theme.mutedText }}>{label}</div>
      <textarea className="w-full px-3 py-2 rounded-lg text-sm outline-none border" style={{ borderColor: theme.border }} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ColorField({ theme, label, value, onChange }: { theme: Theme; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1" style={{ color: theme.mutedText }}>{label}</div>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 p-0 border rounded" style={{ borderColor: theme.border }} />
        <input className="flex-1 px-3 py-2 rounded-lg text-sm outline-none border" style={{ borderColor: theme.border }} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </label>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <div
      className="h-6 w-6 rounded-full border-2 animate-spin"
      style={{
        borderColor: "rgba(2,6,23,0.15)",
        borderTopColor: color,
      }}
    />
  );
}
