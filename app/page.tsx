"use client";

import { useState } from "react";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);

  const [canGenerate, setCanGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [site, setSite] = useState<SiteSpec | null>(null);

  const sendMessage = async () => {
    if (!input.trim() || loadingChat) return;

    const userMessage: Message = { role: "user", content: input };
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

      const data = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.result }]);

      // After ~3 assistant replies, allow generation
      const assistantCount =
        updatedMessages.filter((m) => m.role === "assistant").length + 1; // +1 because we just added one assistant reply
      if (assistantCount >= 3) setCanGenerate(true);
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
    if (generating || messages.length === 0) return;

    setGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      const data = await res.json();
      if (!data.site) throw new Error("No site returned");

      setSite(data.site);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn’t generate the site that time. Try again — we’re close.",
        },
      ]);
    } finally {
      setGenerating(false);
    }
  };

  // If we generated a site, show the editor + preview
  if (site) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-2">
          {/* Editor */}
          <div>
            <h1 className="text-3xl font-semibold mb-2">Website Generator</h1>
            <p className="text-gray-600 mb-6">
              Edit text on the left, preview updates instantly.
            </p>

            <div className="space-y-4">
              <label className="block">
                <div className="text-sm font-medium mb-1">Brand Name</div>
                <input
                  className="w-full border rounded-lg px-4 py-2"
                  value={site.brandName}
                  onChange={(e) => setSite({ ...site, brandName: e.target.value })}
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Tagline</div>
                <input
                  className="w-full border rounded-lg px-4 py-2"
                  value={site.tagline}
                  onChange={(e) => setSite({ ...site, tagline: e.target.value })}
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Hero Headline</div>
                <input
                  className="w-full border rounded-lg px-4 py-2"
                  value={site.heroHeadline}
                  onChange={(e) =>
                    setSite({ ...site, heroHeadline: e.target.value })
                  }
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Hero Subheadline</div>
                <textarea
                  className="w-full border rounded-lg px-4 py-2"
                  rows={3}
                  value={site.heroSubheadline}
                  onChange={(e) =>
                    setSite({ ...site, heroSubheadline: e.target.value })
                  }
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Primary CTA</div>
                <input
                  className="w-full border rounded-lg px-4 py-2"
                  value={site.primaryCTA}
                  onChange={(e) => setSite({ ...site, primaryCTA: e.target.value })}
                />
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  className="bg-black text-white px-5 py-2 rounded-lg hover:opacity-80"
                  onClick={() => setSite(null)}
                >
                  Back to Chat
                </button>

                <button
                  className="border px-5 py-2 rounded-lg hover:bg-gray-50"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(site, null, 2));
                    alert("Copied website JSON to clipboard.");
                  }}
                >
                  Copy JSON
                </button>
              </div>

              <p className="text-xs text-gray-500 pt-2">
                Deploy + paywall comes next. For now you can edit and copy the blueprint.
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="border rounded-2xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-2">{site.tagline}</div>
            <div className="text-2xl font-semibold mb-2">{site.brandName}</div>

            <h2 className="text-3xl font-semibold mt-6 mb-3">{site.heroHeadline}</h2>
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
                <strong>First Product/Service:</strong> {site.firstProductOrService}
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
        </div>
      </main>
    );
  }

  // Chat view
  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-2xl flex flex-col flex-1">
        <h1 className="text-3xl font-semibold mb-6 text-center">
          Inflection Point
        </h1>

        <div className="flex-1 space-y-6 overflow-y-auto mb-6">
          {messages.length === 0 && (
            <p className="text-center text-gray-500">
              What do you want to build?
            </p>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`whitespace-pre-line ${
                msg.role === "user"
                  ? "text-right font-medium"
                  : "text-left text-gray-800"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {loadingChat && <div className="text-gray-400">Thinking…</div>}
        </div>

        {canGenerate && (
          <button
            onClick={generateSite}
            disabled={generating}
            className={`mb-4 px-6 py-3 rounded-lg font-medium transition ${
              generating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:opacity-90"
            }`}
          >
            {generating ? "Generating…" : "Generate My Business"}
          </button>
        )}

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Continue the conversation…"
            className="flex-1 px-4 py-3 border rounded-lg"
          />
          <button
            onClick={sendMessage}
            disabled={loadingChat}
            className={`px-5 py-3 rounded-lg font-medium transition ${
              loadingChat
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black text-white hover:opacity-80"
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
