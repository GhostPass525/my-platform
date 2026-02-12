"use client";

import { useMemo, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

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
};

export default function Home() {
  // --- chat state ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);

  // --- generation + site state ---
  const [generating, setGenerating] = useState(false);
  const [site, setSite] = useState<SiteSpec | null>(null);

  // Right panel UI state
  const [rightTab, setRightTab] = useState<"edit" | "structure" | "settings">(
    "edit"
  );

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
            content:
              data?.error || "Server issue. Try again in a moment.",
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
          content:
            "Tell me what you’re building first, then I’ll generate the site.",
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
            content:
              data?.error ||
              "Generation failed — try again. We’re close.",
          },
        ]);
        return;
      }

      if (!data.site) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I didn’t receive the site blueprint. Try generating again.",
          },
        ]);
        return;
      }

      setSite(data.site as SiteSpec);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Done. I generated your first site. You can edit on the right, or tell me what to change here.",
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Generation error: ${e?.message || "Unknown error"}`,
        },
      ]);
    } finally {
      setGenerating(false);
    }
  };

  // Helper for “ask AI to change it” (later we’ll implement an /api/patch endpoint)
  const suggestChangeToAI = (hint: string) => {
    sendMessage(
      `Make this change to my generated site: ${hint}\nReturn only the updated text fields I should change.`
    );
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Top bar (Shopify-ish) */}
      <div className="h-14 border-b bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-black" />
          <div className="leading-tight">
            <div className="font-semibold">Inflection Point</div>
            <div className="text-xs text-gray-500">
              Business OS • Chat + Build + Launch
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
            onClick={() => {
              navigator.clipboard.writeText(
                JSON.stringify(site ?? {}, null, 2)
              );
              alert("Copied site JSON (or empty if not generated yet).");
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* 3-pane workspace */}
      <div className="grid grid-cols-12 gap-0 min-h-[calc(100vh-56px)]">
        {/* Left: Base44-style chat */}
        <aside className="col-span-12 md:col-span-3 border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <div className="font-semibold">Chat</div>
            <div className="text-xs text-gray-500">
              Tell it what you want. It remembers context.
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
                    "Summarize what we’ve decided so far in 5 bullets."
                  )
                }
              >
                Summarize
              </button>
              <button
                className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                onClick={() =>
                  sendMessage(
                    "Ask me the single best question to clarify the business."
                  )
                }
              >
                Clarify
              </button>
            </div>
          </div>
        </aside>

        {/* Center: Shopify-style preview */}
        <section className="col-span-12 md:col-span-6 bg-neutral-50 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {!site ? (
              <div className="border rounded-2xl bg-white p-8 shadow-sm">
                <div className="text-sm text-gray-500 mb-2">
                  Preview
                </div>
                <div className="text-2xl font-semibold mb-2">
                  Your site will appear here
                </div>
                <p className="text-gray-600">
                  Chat on the left for a few turns, then click{" "}
                  <span className="font-medium">Generate</span>.
                </p>
              </div>
            ) : (
              <div className="border rounded-2xl bg-white p-8 shadow-sm">
                <div className="text-sm text-gray-500 mb-2">{site.tagline}</div>
                <div className="text-2xl font-semibold">{site.brandName}</div>

                <h2 className="text-3xl font-semibold mt-6 mb-3">
                  {site.heroHeadline}
                </h2>
                <p className="text-gray-700 mb-5 whitespace-pre-line">
                  {site.heroSubheadline}
                </p>

                <button className="bg-indigo-600 text-white px-5 py-3 rounded-lg hover:opacity-90">
                  {site.primaryCTA}
                </button>

                <div className="mt-8 space-y-6">
                  <div className="text-sm text-gray-600">
                    <strong>Audience:</strong> {site.audience}
                    <br />
                    <strong>Offer:</strong> {site.offer}
                    <br />
                    <strong>First Product/Service:</strong>{" "}
                    {site.firstProductOrService}
                  </div>

                  {site.sections.map((s, idx) => (
                    <section key={idx}>
                      <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                      <ul className="list-disc pl-6 text-gray-700">
                        {s.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </section>
                  ))}

                  <section>
                    <h3 className="text-xl font-semibold mb-2">FAQ</h3>
                    <div className="space-y-3">
                      {site.faq.map((f, i) => (
                        <div key={i}>
                          <div className="font-medium">{f.q}</div>
                          <div className="text-gray-700">{f.a}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Shopify-style controls */}
        <aside className="col-span-12 md:col-span-3 border-l bg-white flex flex-col">
          <div className="p-4 border-b">
            <div className="font-semibold">Customize</div>
            <div className="text-xs text-gray-500">
              Edit manually or ask the AI to change things.
            </div>

            <div className="mt-3 flex gap-2">
              {(["edit", "structure", "settings"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRightTab(t)}
                  className={`text-xs px-3 py-1 rounded-lg border transition ${
                    rightTab === t ? "bg-black text-white border-black" : "hover:bg-gray-50"
                  }`}
                >
                  {t === "edit" ? "Content" : t === "structure" ? "Sections" : "Store"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!site ? (
              <div className="text-sm text-gray-500">
                Generate a site first. Then controls will appear here.
              </div>
            ) : (
              <>
                {rightTab === "edit" && (
                  <div className="space-y-3">
                    <Field
                      label="Brand Name"
                      value={site.brandName}
                      onChange={(v) => setSite({ ...site, brandName: v })}
                    />
                    <Field
                      label="Tagline"
                      value={site.tagline}
                      onChange={(v) => setSite({ ...site, tagline: v })}
                    />
                    <Field
                      label="Hero Headline"
                      value={site.heroHeadline}
                      onChange={(v) => setSite({ ...site, heroHeadline: v })}
                    />
                    <TextField
                      label="Hero Subheadline"
                      value={site.heroSubheadline}
                      onChange={(v) => setSite({ ...site, heroSubheadline: v })}
                    />
                    <Field
                      label="Primary CTA"
                      value={site.primaryCTA}
                      onChange={(v) => setSite({ ...site, primaryCTA: v })}
                    />

                    <div className="pt-2">
                      <button
                        className="w-full border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                        onClick={() =>
                          suggestChangeToAI(
                            "Rewrite the hero headline/subheadline to be more motivational and punchy."
                          )
                        }
                      >
                        Ask AI: improve hero copy
                      </button>
                    </div>
                  </div>
                )}

                {rightTab === "structure" && (
                  <div className="space-y-4">
                    <div className="text-sm font-medium">
                      Sections
                    </div>
                    <div className="text-xs text-gray-500">
                      (Next step: add controls to reorder/add/remove. For now you can edit text by asking AI.)
                    </div>

                    <button
                      className="w-full border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() =>
                        suggestChangeToAI(
                          "Add a section for 'Community & Motivation' and a section for 'Materials & Breathability'. Keep it concise."
                        )
                      }
                    >
                      Ask AI: add better sections
                    </button>

                    <button
                      className="w-full border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() =>
                        suggestChangeToAI(
                          "Rewrite all sections to avoid generic wording and make them feel premium and runner-focused."
                        )
                      }
                    >
                      Ask AI: make sections premium
                    </button>
                  </div>
                )}

                {rightTab === "settings" && (
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Store Settings (MVP)</div>
                    <div className="text-xs text-gray-500">
                      We’ll add real money/payment later (Stripe/Shopify-style checkout).
                    </div>

                    <Field
                      label="First Product/Service"
                      value={site.firstProductOrService}
                      onChange={(v) =>
                        setSite({ ...site, firstProductOrService: v })
                      }
                    />

                    <button
                      className="w-full border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() =>
                        suggestChangeToAI(
                          "Suggest 3 starter products for this brand and recommend the best one to launch first."
                        )
                      }
                    >
                      Ask AI: pick first products
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t text-xs text-gray-500">
            Later: payments + checkout + orders (Shopify-like). First we nail the OS experience.
          </div>
        </aside>
      </div>
    </main>
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
