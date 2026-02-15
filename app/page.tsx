"use client";

import { useMemo, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

type Theme = {
  accent: string; // blue accent
  bg: string; // app background
  panel: string; // left/right panels
  surface: string; // cards/surfaces
  text: string; // main text
  mutedText: string; // secondary
  border: string; // borders
};

type Product = {
  id: string;
  name: string;
  price: string;
  imageDataUrl?: string;
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
  logoDataUrl?: string;
  heroImageDataUrl?: string;
  products: Product[];
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

const THEME_PRESETS: { name: string; theme: Theme }[] = [
  {
    name: "VentureOS Dark",
    theme: {
      accent: "#2563eb", // blue-600
      bg: "#0b0f14", // near-black
      panel: "#0f141b", // dark gray
      surface: "#111827", // slate-900-ish
      text: "#f8fafc", // off-white
      mutedText: "#9ca3af", // gray-400
      border: "rgba(255,255,255,0.08)",
    },
  },
  {
    name: "Midnight Blue",
    theme: {
      accent: "#3b82f6", // blue-500
      bg: "#070b10",
      panel: "#0b1220",
      surface: "#0f1b2d",
      text: "#f8fafc",
      mutedText: "#a1a1aa",
      border: "rgba(255,255,255,0.10)",
    },
  },
  {
    name: "Clean Light",
    theme: {
      accent: "#2563eb",
      bg: "#f6f7fb",
      panel: "#ffffff",
      surface: "#ffffff",
      text: "#0b1220",
      mutedText: "#4b5563",
      border: "rgba(0,0,0,0.08)",
    },
  },
];

export default function Home() {
  // --- chat state ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);

  // --- generation + site state ---
  const [generating, setGenerating] = useState(false);
  const [site, setSite] = useState<SiteSpec | null>(null);

  // Right panel UI state
  const [rightTab, setRightTab] = useState<
    "quick" | "content" | "design" | "products" | "sections"
  >("quick");

  const logoPickerRef = useRef<HTMLInputElement | null>(null);
  const heroPickerRef = useRef<HTMLInputElement | null>(null);

  const assistantCount = useMemo(
    () => messages.filter((m) => m.role === "assistant").length,
    [messages]
  );
  const canGenerate = assistantCount >= 3 && !generating;

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
          {
            role: "assistant",
            content: data?.error || "Server issue. Try again in a moment.",
          },
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
        {
          role: "assistant",
          content: "Tell me what you’re building first, then I’ll generate it.",
        },
      ]);
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

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
        "theme" | "products" | "logoDataUrl" | "heroImageDataUrl"
      >;

      const hydrated: SiteSpec = {
        ...base,
        theme: THEME_PRESETS[0].theme,
        products: [
          { id: uid(), name: "Runner’s Core Shorts", price: "$48" },
          { id: uid(), name: "BreathLite Performance Tee", price: "$36" },
          { id: uid(), name: "NoirStride Training Cap", price: "$28" },
        ],
      };

      setSite(hydrated);
      setRightTab("quick");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Generated.\n\nStart here: add a hero image + tighten your headline. Then we’ll refine products and positioning.",
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

  // --- product helpers ---
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

  const exportJson = () => {
    navigator.clipboard.writeText(JSON.stringify(site ?? {}, null, 2));
    alert("Copied site JSON to clipboard.");
  };

  // If no site, still use app theme (dark polished)
  const appTheme = site?.theme ?? THEME_PRESETS[0].theme;

  return (
    <main
      className="min-h-screen"
      style={{ background: appTheme.bg, color: appTheme.text }}
    >
      {/* Top bar */}
      <div
        className="h-14 border-b flex items-center justify-between px-4"
        style={{ background: appTheme.panel, borderColor: appTheme.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded"
            style={{ background: appTheme.accent }}
          />
          <div className="leading-tight">
            <div className="font-semibold">VentureOS</div>
            <div className="text-xs" style={{ color: appTheme.mutedText }}>
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
              background:
                !canGenerate || generating ? "rgba(255,255,255,0.10)" : appTheme.accent,
              color: !canGenerate || generating ? appTheme.mutedText : "#fff",
              cursor: !canGenerate || generating ? "not-allowed" : "pointer",
            }}
          >
            {generating ? "Generating…" : "Generate"}
          </button>

          <button
            className="px-4 py-2 rounded-lg text-sm font-medium border transition hover:opacity-90"
            style={{
              borderColor: appTheme.border,
              background: "transparent",
              color: appTheme.text,
            }}
            onClick={exportJson}
          >
            Export
          </button>
        </div>
      </div>

      {/* 3-pane workspace */}
      <div className="grid grid-cols-12 min-h-[calc(100vh-56px)]">
        {/* Left: Mentor chat */}
        <aside
          className="col-span-12 md:col-span-3 border-r flex flex-col"
          style={{ background: appTheme.panel, borderColor: appTheme.border }}
        >
          <div className="p-4 border-b" style={{ borderColor: appTheme.border }}>
            <div className="font-semibold">VentureOS Guide</div>
            <div className="text-xs" style={{ color: appTheme.mutedText }}>
              Operator-style advice + execution.
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-sm" style={{ color: appTheme.mutedText }}>
                Start with: <span style={{ color: appTheme.text, fontWeight: 600 }}>
                  “I want to build…”
                </span>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="text-sm">
                <div
                  className="inline-block max-w-[95%] rounded-xl px-3 py-2 whitespace-pre-line"
                  style={{
                    background:
                      m.role === "user" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${appTheme.border}`,
                    marginLeft: m.role === "user" ? "auto" : undefined,
                    color: appTheme.text,
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loadingChat && (
              <div className="text-xs" style={{ color: appTheme.mutedText }}>
                Thinking…
              </div>
            )}
          </div>

          <div className="p-3 border-t" style={{ borderColor: appTheme.border }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask VentureOS…"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${appTheme.border}`,
                  color: appTheme.text,
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loadingChat}
                className="px-3 py-2 rounded-lg text-sm font-medium transition"
                style={{
                  background: loadingChat ? "rgba(255,255,255,0.10)" : appTheme.accent,
                  color: loadingChat ? appTheme.mutedText : "#fff",
                  cursor: loadingChat ? "not-allowed" : "pointer",
                }}
              >
                Send
              </button>
            </div>

            <div className="mt-2 flex gap-2">
              <SmallButton
                theme={appTheme}
                onClick={() =>
                  sendMessage(
                    site
                      ? `Act like an operator. Audit my current storefront and give 3 specific changes that will increase trust + conversions. Here is my site JSON:\n${JSON.stringify(
                          site,
                          null,
                          2
                        )}`
                      : "Act like an operator. Give me the best next move to turn this into a real business."
                  )
                }
              >
                Operator Review
              </SmallButton>

              <SmallButton
                theme={appTheme}
                onClick={() =>
                  sendMessage("Stop asking me what I want. Recommend the best next move and why.")
                }
              >
                Take the Lead
              </SmallButton>
            </div>
          </div>
        </aside>

        {/* Center: Preview */}
        <section className="col-span-12 md:col-span-6 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {!site ? (
              <EmptyPreview theme={appTheme} />
            ) : (
              <Preview site={site} />
            )}
          </div>
        </section>

        {/* Right: Builder */}
        <aside
          className="col-span-12 md:col-span-3 border-l flex flex-col"
          style={{ background: appTheme.panel, borderColor: appTheme.border }}
        >
          <div className="p-4 border-b" style={{ borderColor: appTheme.border }}>
            <div className="font-semibold">Builder</div>
            <div className="text-xs" style={{ color: appTheme.mutedText }}>
              Quick actions + manual controls (Shopify vibe).
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Tab label="Quick" active={rightTab === "quick"} theme={appTheme} onClick={() => setRightTab("quick")} />
              <Tab label="Content" active={rightTab === "content"} theme={appTheme} onClick={() => setRightTab("content")} />
              <Tab label="Design" active={rightTab === "design"} theme={appTheme} onClick={() => setRightTab("design")} />
              <Tab label="Products" active={rightTab === "products"} theme={appTheme} onClick={() => setRightTab("products")} />
              <Tab label="Sections" active={rightTab === "sections"} theme={appTheme} onClick={() => setRightTab("sections")} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!site ? (
              <div className="text-sm" style={{ color: appTheme.mutedText }}>
                Generate a site first. Then customization appears here.
              </div>
            ) : (
              <>
                {/* hidden file pickers */}
                <input
                  ref={logoPickerRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => setLogoFromFile(e.target.files?.[0])}
                />
                <input
                  ref={heroPickerRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => setHeroImageFromFile(e.target.files?.[0])}
                />

                {rightTab === "quick" && (
                  <div className="space-y-3">
                    <Card theme={appTheme} title="Start Here (recommended)">
                      <div className="text-sm" style={{ color: appTheme.mutedText }}>
                        Do these 3 things first for a page that looks real.
                      </div>
                      <div className="mt-3 space-y-2">
                        <ActionButton theme={appTheme} onClick={() => heroPickerRef.current?.click()}>
                          Upload Hero Image
                        </ActionButton>
                        <ActionButton theme={appTheme} onClick={() => logoPickerRef.current?.click()}>
                          Upload Logo
                        </ActionButton>
                        <ActionButton
                          theme={appTheme}
                          onClick={() =>
                            sendMessage(
                              `Rewrite my hero headline + subheadline to be sharper, more motivational, and premium. Keep it short. My current hero:\nHeadline: ${site.heroHeadline}\nSubheadline: ${site.heroSubheadline}`
                            )
                          }
                        >
                          Ask Guide: Improve Hero Copy
                        </ActionButton>
                      </div>
                    </Card>

                    <Card theme={appTheme} title="Theme Presets">
                      <div className="grid grid-cols-1 gap-2">
                        {THEME_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            className="text-sm px-3 py-2 rounded-lg border text-left transition hover:opacity-90"
                            style={{
                              borderColor: appTheme.border,
                              background: "rgba(255,255,255,0.04)",
                              color: appTheme.text,
                            }}
                            onClick={() =>
                              setSite({ ...site, theme: { ...p.theme } })
                            }
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {rightTab === "content" && (
                  <div className="space-y-3">
                    <Field theme={appTheme} label="Brand Name" value={site.brandName} onChange={(v) => setSite({ ...site, brandName: v })} />
                    <Field theme={appTheme} label="Tagline" value={site.tagline} onChange={(v) => setSite({ ...site, tagline: v })} />
                    <Field theme={appTheme} label="Hero Headline" value={site.heroHeadline} onChange={(v) => setSite({ ...site, heroHeadline: v })} />
                    <TextField theme={appTheme} label="Hero Subheadline" value={site.heroSubheadline} onChange={(v) => setSite({ ...site, heroSubheadline: v })} />
                    <Field theme={appTheme} label="Primary CTA" value={site.primaryCTA} onChange={(v) => setSite({ ...site, primaryCTA: v })} />
                  </div>
                )}

                {rightTab === "design" && (
                  <div className="space-y-3">
                    <Card theme={appTheme} title="Accent Color">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={site.theme.accent}
                          onChange={(e) =>
                            setSite({ ...site, theme: { ...site.theme, accent: e.target.value } })
                          }
                          className="h-10 w-12 p-0 border rounded"
                          style={{ borderColor: appTheme.border }}
                        />
                        <input
                          value={site.theme.accent}
                          onChange={(e) =>
                            setSite({ ...site, theme: { ...site.theme, accent: e.target.value } })
                          }
                          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: `1px solid ${appTheme.border}`,
                            color: appTheme.text,
                          }}
                        />
                      </div>
                    </Card>

                    <Card theme={appTheme} title="Images">
                      <div className="space-y-2">
                        <ActionButton theme={appTheme} onClick={() => logoPickerRef.current?.click()}>
                          Upload Logo
                        </ActionButton>
                        <ActionButton theme={appTheme} onClick={() => heroPickerRef.current?.click()}>
                          Upload Hero Image
                        </ActionButton>
                        <div className="text-xs" style={{ color: appTheme.mutedText }}>
                          (MVP stores images locally in your browser. Later: upload to storage.)
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {rightTab === "products" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Catalog</div>
                      <button
                        className="text-xs px-2 py-1 rounded-lg border hover:opacity-90"
                        style={{ borderColor: appTheme.border, color: appTheme.text }}
                        onClick={addProduct}
                      >
                        + Add
                      </button>
                    </div>

                    {site.products.map((p) => (
                      <Card key={p.id} theme={appTheme} title={p.name || "Product"}>
                        <Field
                          theme={appTheme}
                          label="Name"
                          value={p.name}
                          onChange={(v) => updateProduct(p.id, { name: v })}
                        />
                        <div className="h-2" />
                        <Field
                          theme={appTheme}
                          label="Price"
                          value={p.price}
                          onChange={(v) => updateProduct(p.id, { price: v })}
                        />
                        <div className="h-3" />

                        <div className="text-xs font-medium" style={{ color: appTheme.mutedText }}>
                          Image
                        </div>
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
                        <button
                          className="text-xs px-2 py-1 rounded-lg border hover:opacity-90"
                          style={{ borderColor: appTheme.border, color: appTheme.text }}
                          onClick={() => removeProduct(p.id)}
                        >
                          Remove
                        </button>
                      </Card>
                    ))}

                    <ActionButton
                      theme={appTheme}
                      onClick={() =>
                        sendMessage(
                          `Act like a premium ecommerce operator. Rename and price my products so they feel premium and consistent. Keep it realistic. Here are my products:\n${JSON.stringify(
                            site.products,
                            null,
                            2
                          )}`
                        )
                      }
                    >
                      Ask Guide: Improve Product Line
                    </ActionButton>
                  </div>
                )}

                {rightTab === "sections" && (
                  <div className="space-y-3">
                    <Card theme={appTheme} title="Sections (content strategy)">
                      <div className="text-sm" style={{ color: appTheme.mutedText }}>
                        Tell VentureOS what you want and it will rewrite these sections.
                        (Next: reorder/add/remove controls.)
                      </div>

                      <div className="mt-3 space-y-2">
                        <ActionButton
                          theme={appTheme}
                          onClick={() =>
                            sendMessage(
                              `Rewrite my sections to be premium, motivational, and conversion-focused. Avoid generic wording.\nSections:\n${JSON.stringify(
                                site.sections,
                                null,
                                2
                              )}`
                            )
                          }
                        >
                          Ask Guide: Rewrite Sections
                        </ActionButton>

                        <ActionButton
                          theme={appTheme}
                          onClick={() =>
                            sendMessage(
                              `Give me a better page structure for this business: suggest 5 sections in the best order, and explain why each matters in one sentence.`
                            )
                          }
                        >
                          Ask Guide: Recommend Structure
                        </ActionButton>
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t text-xs" style={{ borderColor: appTheme.border, color: appTheme.mutedText }}>
            Later: payments + checkout + orders (Shopify-like). First: make the site feel real.
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ---------- Preview ---------- */

function Preview({ site }: { site: SiteSpec }) {
  const t = site.theme;

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ borderColor: t.border, background: t.surface, color: t.text }}
    >
      {/* Site "frame" header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: t.border, background: t.panel }}
      >
        <div className="flex items-center gap-3">
          {site.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={site.logoDataUrl}
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

      <div className="p-6 md:p-8" style={{ background: t.bg }}>
        {/* Hero */}
        <div className="grid gap-6 md:grid-cols-2 items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
              {site.heroHeadline}
            </h1>
            <p className="mt-3 whitespace-pre-line" style={{ color: t.mutedText }}>
              {site.heroSubheadline}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                className="px-5 py-3 rounded-lg font-medium"
                style={{ background: t.accent, color: "#fff" }}
              >
                {site.primaryCTA}
              </button>
              <button
                className="px-5 py-3 rounded-lg font-medium border"
                style={{ borderColor: t.border, background: "rgba(255,255,255,0.02)", color: t.text }}
              >
                Explore
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

          <div
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: t.border, background: t.surface }}
          >
            {site.heroImageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.heroImageDataUrl}
                alt="Hero"
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-sm" style={{ color: t.mutedText }}>
                Upload a hero image (Builder → Quick or Design)
              </div>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold">Catalog</h2>
            <div className="text-xs" style={{ color: t.mutedText }}>
              (Checkout later — storefront UX now)
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {site.products.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl p-4 border"
                style={{ borderColor: t.border, background: t.surface }}
              >
                <div className="rounded-xl overflow-hidden mb-3 border" style={{ borderColor: t.border }}>
                  {p.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageDataUrl} alt={p.name} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="h-36 flex items-center justify-center text-xs" style={{ color: t.mutedText }}>
                      Add product image
                    </div>
                  )}
                </div>

                <div className="font-medium">{p.name}</div>
                <div className="text-sm" style={{ color: t.mutedText }}>
                  {p.price}
                </div>

                <button
                  className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ background: t.accent, color: "#fff" }}
                >
                  Add to cart
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="mt-10 space-y-6">
          {site.sections.map((s, idx) => (
            <section key={idx} className="rounded-2xl border p-5" style={{ borderColor: t.border, background: t.surface }}>
              <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
              <ul className="list-disc pl-6" style={{ color: t.mutedText }}>
                {s.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-3">FAQ</h3>
          <div className="space-y-3">
            {site.faq.map((f, i) => (
              <div key={i} className="rounded-2xl border p-5" style={{ borderColor: t.border, background: t.surface }}>
                <div className="font-medium">{f.q}</div>
                <div className="mt-1" style={{ color: t.mutedText }}>
                  {f.a}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-xs" style={{ color: t.mutedText }}>
          © {new Date().getFullYear()} {site.brandName}
        </div>
      </div>
    </div>
  );
}

/* ---------- Small UI pieces ---------- */

function EmptyPreview({ theme }: { theme: Theme }) {
  return (
    <div
      className="rounded-2xl border p-8"
      style={{ borderColor: theme.border, background: theme.panel }}
    >
      <div className="text-sm" style={{ color: theme.mutedText }}>
        Preview
      </div>
      <div className="text-2xl font-semibold mt-2">
        Your storefront will appear here
      </div>
      <p className="mt-2" style={{ color: theme.mutedText }}>
        Chat on the left for a few turns, then click{" "}
        <span style={{ color: theme.text, fontWeight: 600 }}>Generate</span>.
      </p>
    </div>
  );
}

function Card({
  theme,
  title,
  children,
}: {
  theme: Theme;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: theme.border, background: "rgba(255,255,255,0.03)" }}
    >
      <div className="font-semibold text-sm">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Tab({
  label,
  active,
  theme,
  onClick,
}: {
  label: string;
  active: boolean;
  theme: Theme;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-lg border transition"
      style={{
        borderColor: theme.border,
        background: active ? theme.accent : "rgba(255,255,255,0.04)",
        color: active ? "#fff" : theme.text,
      }}
    >
      {label}
    </button>
  );
}

function ActionButton({
  theme,
  children,
  onClick,
}: {
  theme: Theme;
  children: React.ReactNode;
  onClick: () => void;
}) {
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

function SmallButton({
  theme,
  children,
  onClick,
}: {
  theme: Theme;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2 py-1 rounded-lg border transition hover:opacity-90"
      style={{
        borderColor: theme.border,
        background: "rgba(255,255,255,0.04)",
        color: theme.text,
      }}
    >
      {children}
    </button>
  );
}

function Field({
  theme,
  label,
  value,
  onChange,
}: {
  theme: Theme;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1" style={{ color: theme.mutedText }}>
        {label}
      </div>
      <input
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${theme.border}`,
          color: theme.text,
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextField({
  theme,
  label,
  value,
  onChange,
}: {
  theme: Theme;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1" style={{ color: theme.mutedText }}>
        {label}
      </div>
      <textarea
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${theme.border}`,
          color: theme.text,
        }}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
