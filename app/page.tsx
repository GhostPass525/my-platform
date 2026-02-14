"use client";

import { useMemo, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

type Theme = {
  primary: string; // buttons
  bg: string; // page bg
  text: string; // main text
  card: string; // card bg
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

  // NEW
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
    "content" | "design" | "products" | "structure" | "store"
  >("content");

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
          {
            role: "assistant",
            content: data?.error || "Generation failed — try again.",
          },
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

      // Add defaults for new builder features
      const hydrated: SiteSpec = {
        ...base,
        theme: {
          primary: "#4f46e5", // indigo
          bg: "#f8fafc", // slate-50
          text: "#0f172a", // slate-900
          card: "#ffffff",
        },
        products: [
          { id: uid(), name: "Runner’s Core Shorts", price: "$48" },
          { id: uid(), name: "BreathLite Performance Tee", price: "$36" },
          { id: uid(), name: "NoirStride Training Cap", price: "$28" },
        ],
      };

      setSite(hydrated);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Generated. Now we build it into a real storefront.\n\nStart on the right: add a hero image + 3 products. I’ll tell you what to improve as you go.",
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
      products: [
        ...site.products,
        { id: uid(), name: "New Product", price: "$00" },
      ],
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

  // ---------------- UI ----------------
  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <div className="h-14 border-b bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-black" />
          <div className="leading-tight">
            <div className="font-semibold">Inflection Point</div>
            <div className="text-xs text-gray-500">
              Chat + Build + Launch
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={generateSite}
            disabled={!canGenerate || generating}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              !canGenerate || generating
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:opacity-90"
            }`}
          >
            {generating ? "Generating…" : "Generate"}
          </button>

          <button
            className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-gray-50"
            onClick={exportJson}
          >
            Export
          </button>
        </div>
      </div>

      {/* 3-pane workspace */}
      <div className="grid grid-cols-12 min-h-[calc(100vh-56px)]">
        {/* Left: Chat */}
        <aside className="col-span-12 md:col-span-3 border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <div className="font-semibold">Mentor Chat</div>
            <div className="text-xs text-gray-500">
              I’ll guide strategy + tell you what works.
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-sm text-gray-500">
                Start with: <span className="font-medium">“I want to build…”</span>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="text-sm">
                <div
                  className={`inline-block max-w-[95%] rounded-xl px-3 py-2 whitespace-pre-line ${
                    m.role === "user"
                      ? "bg-black text-white ml-auto"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loadingChat && (
              <div className="text-xs text-gray-400">Thinking…</div>
            )}
          </div>

          <div className="p-3 border-t">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Message Inflection Point…"
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loadingChat}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  loadingChat
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-black text-white hover:opacity-80"
                }`}
              >
                Send
              </button>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                onClick={() =>
                  sendMessage(
                    site
                      ? `Review my current page and give 3 blunt improvements. Here is my site JSON:\n${JSON.stringify(
                          site,
                          null,
                          2
                        )}`
                      : "Give me 3 blunt recommendations to make this business stronger."
                  )
                }
              >
                Mentor review
              </button>

              <button
                className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                onClick={() =>
                  sendMessage(
                    "Stop asking me what I want. Tell me the best next move and why."
                  )
                }
              >
                Take the lead
              </button>
            </div>
          </div>
        </aside>

        {/* Center: Live preview */}
        <section className="col-span-12 md:col-span-6 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            {!site ? (
              <div className="border rounded-2xl bg-white p-8 shadow-sm">
                <div className="text-sm text-gray-500 mb-2">Preview</div>
                <div className="text-2xl font-semibold mb-2">
                  Your storefront will appear here
                </div>
                <p className="text-gray-600">
                  Chat on the left for a few turns, then click{" "}
                  <span className="font-medium">Generate</span>.
                </p>
              </div>
            ) : (
              <Preview site={site} />
            )}
          </div>
        </section>

        {/* Right: Controls */}
        <aside className="col-span-12 md:col-span-3 border-l bg-white flex flex-col">
          <div className="p-4 border-b">
            <div className="font-semibold">Builder Controls</div>
            <div className="text-xs text-gray-500">
              Manual edits like Shopify, plus AI guidance.
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <TabButton label="Content" active={rightTab === "content"} onClick={() => setRightTab("content")} />
              <TabButton label="Design" active={rightTab === "design"} onClick={() => setRightTab("design")} />
              <TabButton label="Products" active={rightTab === "products"} onClick={() => setRightTab("products")} />
              <TabButton label="Sections" active={rightTab === "structure"} onClick={() => setRightTab("structure")} />
              <TabButton label="Store" active={rightTab === "store"} onClick={() => setRightTab("store")} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!site ? (
              <div className="text-sm text-gray-500">
                Generate a site first. Then controls appear here.
              </div>
            ) : (
              <>
                {rightTab === "content" && (
                  <div className="space-y-3">
                    <Field label="Brand Name" value={site.brandName} onChange={(v) => setSite({ ...site, brandName: v })} />
                    <Field label="Tagline" value={site.tagline} onChange={(v) => setSite({ ...site, tagline: v })} />
                    <Field label="Hero Headline" value={site.heroHeadline} onChange={(v) => setSite({ ...site, heroHeadline: v })} />
                    <TextField label="Hero Subheadline" value={site.heroSubheadline} onChange={(v) => setSite({ ...site, heroSubheadline: v })} />
                    <Field label="Primary CTA" value={site.primaryCTA} onChange={(v) => setSite({ ...site, primaryCTA: v })} />
                  </div>
                )}

                {rightTab === "design" && (
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Theme</div>

                    <ColorField
                      label="Primary"
                      value={site.theme.primary}
                      onChange={(v) =>
                        setSite({ ...site, theme: { ...site.theme, primary: v } })
                      }
                    />
                    <ColorField
                      label="Background"
                      value={site.theme.bg}
                      onChange={(v) =>
                        setSite({ ...site, theme: { ...site.theme, bg: v } })
                      }
                    />
                    <ColorField
                      label="Text"
                      value={site.theme.text}
                      onChange={(v) =>
                        setSite({ ...site, theme: { ...site.theme, text: v } })
                      }
                    />
                    <ColorField
                      label="Card"
                      value={site.theme.card}
                      onChange={(v) =>
                        setSite({ ...site, theme: { ...site.theme, card: v } })
                      }
                    />

                    <div className="pt-2">
                      <div className="text-sm font-medium mb-2">Images</div>

                      <input
                        ref={logoPickerRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) =>
                          setLogoFromFile(e.target.files?.[0])
                        }
                      />
                      <input
                        ref={heroPickerRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) =>
                          setHeroImageFromFile(e.target.files?.[0])
                        }
                      />

                      <div className="flex gap-2">
                        <button
                          className="flex-1 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => logoPickerRef.current?.click()}
                        >
                          Upload Logo
                        </button>
                        <button
                          className="flex-1 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => heroPickerRef.current?.click()}
                        >
                          Upload Hero
                        </button>
                      </div>

                      <div className="mt-2 text-xs text-gray-500">
                        (MVP stores images locally in your browser as data URLs. Later we’ll upload to storage.)
                      </div>
                    </div>
                  </div>
                )}

                {rightTab === "products" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Product Catalog</div>
                      <button
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                        onClick={addProduct}
                      >
                        + Add
                      </button>
                    </div>

                    <div className="space-y-3">
                      {site.products.map((p) => (
                        <div key={p.id} className="border rounded-xl p-3 space-y-2">
                          <Field
                            label="Name"
                            value={p.name}
                            onChange={(v) => updateProduct(p.id, { name: v })}
                          />
                          <Field
                            label="Price"
                            value={p.price}
                            onChange={(v) => updateProduct(p.id, { price: v })}
                          />

                          <div>
                            <div className="text-xs font-medium mb-1">Image</div>
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
                          </div>

                          <button
                            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                            onClick={() => removeProduct(p.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      className="w-full border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() =>
                        sendMessage(
                          `Recommend the best 3 products for this brand and rewrite my product names/prices to match a premium positioning. Here is my current product list:\n${JSON.stringify(
                            site.products,
                            null,
                            2
                          )}`
                        )
                      }
                    >
                      Ask Mentor: improve products
                    </button>
                  </div>
                )}

                {rightTab === "structure" && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Sections</div>
                    <div className="text-xs text-gray-500">
                      Next we’ll add reorder/add/remove. For now, use mentor chat to request changes.
                    </div>

                    <button
                      className="w-full border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() =>
                        sendMessage(
                          `Rewrite my sections to be more motivational and runner-focused. Keep them concise. Here are my sections:\n${JSON.stringify(
                            site.sections,
                            null,
                            2
                          )}`
                        )
                      }
                    >
                      Ask Mentor: rewrite sections
                    </button>
                  </div>
                )}

                {rightTab === "store" && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Store (Coming next)</div>
                    <div className="text-xs text-gray-500">
                      Later we’ll add Shopify-like money features:
                      checkout, payments, orders, and product inventory.
                    </div>

                    <div className="border rounded-xl p-3 text-sm">
                      <div className="font-medium mb-1">Planned:</div>
                      <ul className="list-disc pl-5 text-gray-700">
                        <li>Stripe checkout links</li>
                        <li>Order capture + email receipts</li>
                        <li>Save projects + publish</li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t text-xs text-gray-500">
            Mentor stays on the left. Builder stays on the right. Preview stays center.
          </div>
        </aside>
      </div>
    </main>
  );
}

function Preview({ site }: { site: SiteSpec }) {
  const t = site.theme;

  return (
    <div
      className="border rounded-2xl shadow-sm overflow-hidden"
      style={{ background: t.bg, color: t.text }}
    >
      <div className="max-w-3xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {site.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.logoDataUrl}
                alt="Logo"
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <div
                className="h-10 w-10 rounded"
                style={{ background: t.primary }}
              />
            )}
            <div>
              <div className="text-xs opacity-70">{site.tagline}</div>
              <div className="text-xl font-semibold">{site.brandName}</div>
            </div>
          </div>

          <button
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: t.primary, color: "#fff" }}
          >
            {site.primaryCTA}
          </button>
        </div>

        {/* Hero */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 items-center">
          <div>
            <h1 className="text-3xl font-semibold mb-3">{site.heroHeadline}</h1>
            <p className="opacity-80 whitespace-pre-line">{site.heroSubheadline}</p>

            <div className="mt-5 flex gap-2">
              <button
                className="px-5 py-3 rounded-lg font-medium"
                style={{ background: t.primary, color: "#fff" }}
              >
                {site.primaryCTA}
              </button>
              <button
                className="px-5 py-3 rounded-lg font-medium border"
                style={{ borderColor: "rgba(0,0,0,0.15)" }}
              >
                Learn More
              </button>
            </div>

            <div className="mt-6 text-sm opacity-75">
              <strong>Audience:</strong> {site.audience}
              <br />
              <strong>Offer:</strong> {site.offer}
              <br />
              <strong>First Product:</strong> {site.firstProductOrService}
            </div>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: t.card }}
          >
            {site.heroImageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.heroImageDataUrl}
                alt="Hero"
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="h-64 flex items-center justify-center opacity-60 text-sm">
                Upload a hero image (right panel → Design)
              </div>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Products</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {site.products.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl p-4 border"
                style={{ background: t.card, borderColor: "rgba(0,0,0,0.08)" }}
              >
                <div className="rounded-xl overflow-hidden mb-3">
                  {p.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageDataUrl}
                      alt={p.name}
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div className="h-36 flex items-center justify-center text-xs opacity-60">
                      Add product image
                    </div>
                  )}
                </div>
                <div className="font-medium">{p.name}</div>
                <div className="opacity-70 text-sm">{p.price}</div>

                <button
                  className="mt-3 w-full px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ background: t.primary, color: "#fff" }}
                >
                  Add to cart
                </button>
              </div>
            ))}
          </div>
          <div className="text-xs opacity-60 mt-2">
            (Checkout later — this is storefront UX for now.)
          </div>
        </div>

        {/* Sections */}
        <div className="mt-10 space-y-6">
          {site.sections.map((s, idx) => (
            <section key={idx}>
              <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
              <ul className="list-disc pl-6 opacity-80">
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
              <div
                key={i}
                className="rounded-2xl p-4 border"
                style={{ background: t.card, borderColor: "rgba(0,0,0,0.08)" }}
              >
                <div className="font-medium">{f.q}</div>
                <div className="opacity-80">{f.a}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-xs opacity-50">
          © {new Date().getFullYear()} {site.brandName}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-lg border transition ${
        active ? "bg-black text-white border-black" : "hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1">{label}</div>
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1">{label}</div>
      <textarea
        className="w-full border rounded-lg px-3 py-2 text-sm"
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 p-0 border rounded"
        />
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}
