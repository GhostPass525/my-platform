"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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

// ─── Theme presets ───────────────────────────────────────────────
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

type ThemePreset = { name: string; accent: string; bg: string; text: string; theme: Theme };

const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Ocean",
    accent: "#2563eb",
    bg: "#ffffff",
    text: "#0b1220",
    theme: LIGHT_THEME,
  },
  {
    name: "Forest",
    accent: "#16a34a",
    bg: "#f0fdf4",
    text: "#14532d",
    theme: { accent: "#16a34a", accent2: "#065f46", bg: "#f0fdf4", panel: "#ffffff", surface: "#ffffff", text: "#14532d", mutedText: "#4b7a5e", border: "rgba(20,83,45,0.12)" },
  },
  {
    name: "Sunset",
    accent: "#ea580c",
    bg: "#fff7ed",
    text: "#431407",
    theme: { accent: "#ea580c", accent2: "#f59e0b", bg: "#fff7ed", panel: "#ffffff", surface: "#ffffff", text: "#431407", mutedText: "#92400e", border: "rgba(67,20,7,0.10)" },
  },
  {
    name: "Violet",
    accent: "#7c3aed",
    bg: "#faf5ff",
    text: "#2e1065",
    theme: { accent: "#7c3aed", accent2: "#c026d3", bg: "#faf5ff", panel: "#ffffff", surface: "#ffffff", text: "#2e1065", mutedText: "#6b21a8", border: "rgba(46,16,101,0.10)" },
  },
  {
    name: "Rose",
    accent: "#e11d48",
    bg: "#fff1f2",
    text: "#881337",
    theme: { accent: "#e11d48", accent2: "#db2777", bg: "#fff1f2", panel: "#ffffff", surface: "#ffffff", text: "#881337", mutedText: "#9f1239", border: "rgba(136,19,55,0.10)" },
  },
  {
    name: "Teal",
    accent: "#0d9488",
    bg: "#f0fdfa",
    text: "#134e4a",
    theme: { accent: "#0d9488", accent2: "#0284c7", bg: "#f0fdfa", panel: "#ffffff", surface: "#ffffff", text: "#134e4a", mutedText: "#0f766e", border: "rgba(19,78,74,0.10)" },
  },
  {
    name: "Gold",
    accent: "#d97706",
    bg: "#fffbeb",
    text: "#78350f",
    theme: { accent: "#d97706", accent2: "#b45309", bg: "#fffbeb", panel: "#ffffff", surface: "#ffffff", text: "#78350f", mutedText: "#92400e", border: "rgba(120,53,15,0.10)" },
  },
  {
    name: "Slate",
    accent: "#475569",
    bg: "#f8fafc",
    text: "#0f172a",
    theme: { accent: "#475569", accent2: "#64748b", bg: "#f8fafc", panel: "#ffffff", surface: "#ffffff", text: "#0f172a", mutedText: "#64748b", border: "rgba(15,23,42,0.10)" },
  },
  {
    name: "Dark",
    accent: "#818cf8",
    bg: "#09090b",
    text: "#fafafa",
    theme: { accent: "#818cf8", accent2: "#34d399", bg: "#09090b", panel: "#18181b", surface: "#18181b", text: "#fafafa", mutedText: "#a1a1aa", border: "rgba(255,255,255,0.10)" },
  },
  {
    name: "Minimal",
    accent: "#171717",
    bg: "#ffffff",
    text: "#171717",
    theme: { accent: "#171717", accent2: "#404040", bg: "#ffffff", panel: "#ffffff", surface: "#f9f9f9", text: "#171717", mutedText: "#737373", border: "rgba(0,0,0,0.10)" },
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
    case "Georgia": return `Georgia, "Times New Roman", Times, serif`;
    case "Times New Roman": return `"Times New Roman", Times, serif`;
    default: return `${font}, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
  }
}

// ─── Main builder ─────────────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [site, setSite] = useState<SiteSpec | null>(null);
  const [rightTab, setRightTab] = useState<"quick" | "content" | "design" | "pages" | "products" | "sections">("quick");
  const [activePageId, setActivePageId] = useState<string>("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Drag-and-drop state for sections
  const [dragSec, setDragSec] = useState<number | null>(null);
  const [hoverSec, setHoverSec] = useState<number | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const logoPickerRef = useRef<HTMLInputElement | null>(null);
  const heroPickerRef = useRef<HTMLInputElement | null>(null);

  const assistantCount = useMemo(() => messages.filter((m) => m.role === "assistant").length, [messages]);
  const canGenerate = assistantCount >= 3 && !generating;
  const theme = site?.theme ?? LIGHT_THEME;

  // Load project on mount
  useEffect(() => {
    const pid = searchParams.get("project");
    if (!pid) return;
    fetch(`/api/projects/${pid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.site) {
          setSite(data.site as SiteSpec);
          setProjectId(pid);
          setProjectName(data.name ?? "");
          setActivePageId(data.site.pages?.[0]?.id ?? "");
          setRightTab("quick");
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle ?subscribed=1 redirect from Stripe
  useEffect(() => {
    if (searchParams.get("subscribed") === "1") {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Welcome to VentureOS Pro! You can now publish your site." },
      ]);
      router.replace("/", { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save ──────────────────────────────────────────────────────
  const save = async () => {
    if (!site) { alert("Generate a site first."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const next = projectId ? encodeURIComponent(`/?project=${projectId}`) : encodeURIComponent("/");
      router.push(`/auth/login?next=${next}`);
      return;
    }

    setSaving(true);
    try {
      if (projectId) {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site }),
        });
      } else {
        const name = window.prompt("Project name?", site.brandName || "My Project");
        if (!name) return;
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, site }),
        });
        const data = await res.json();
        if (data?.id) {
          setProjectId(data.id);
          setProjectName(name);
          router.replace(`/?project=${data.id}`, { scroll: false });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Chat ──────────────────────────────────────────────────────
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
        setMessages((prev) => [...prev, { role: "assistant", content: data?.error || "Server issue. Try again." }]);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data?.result || "No reply. Try again." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setLoadingChat(false);
    }
  };

  // ── Generate ──────────────────────────────────────────────────
  const generateSite = async () => {
    if (generating) return;
    if (messages.length === 0) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Tell me what you're building first." }]);
      return;
    }

    setGenerating(true);
    try {
      const minDelay = sleep(5000);
      const resPromise = fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      const [res] = await Promise.all([resPromise, minDelay]);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data?.error || "Generation failed -- try again." }]);
        return;
      }
      if (!data.site) {
        setMessages((prev) => [...prev, { role: "assistant", content: "No blueprint returned. Try again." }]);
        return;
      }

      const base = data.site as Omit<SiteSpec, "theme" | "products" | "logoDataUrl" | "heroImageDataUrl" | "pages" | "font">;
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
          { id: uid(), name: "Product One", price: "$49" },
          { id: uid(), name: "Product Two", price: "$36" },
          { id: uid(), name: "Product Three", price: "$28" },
        ],
      };

      setSite(hydrated);
      setActivePageId(pages[0].id);
      setRightTab("quick");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Generated.\n\nNext: upload a hero image + fill in your Products." },
      ]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Generation error: ${e?.message || e}` }]);
    } finally {
      setGenerating(false);
    }
  };

  // ── Publish (with subscription check) ─────────────────────────
  const publish = async () => {
    if (!site) { alert("Generate a site first."); return; }
    if (publishing) return;

    // Must be logged in
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setPublishing(true);
    try {
      // Check subscription
      const subRes = await fetch("/api/subscription");
      const subData = await subRes.json();

      if (!subData.active) {
        setShowPaywall(true);
        return;
      }

      // Proceed with publish
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.id) {
        alert(data?.error || "Publish failed. Try again.");
        return;
      }

      const url = `${window.location.origin}/s/${data.id}`;
      try { await navigator.clipboard.writeText(url); } catch { /* ok */ }
      window.open(url, "_blank");
      alert("Published! Link copied and opened.");
    } catch {
      alert("Publish failed. Try again.");
    } finally {
      setPublishing(false);
    }
  };

  // ── Products ──────────────────────────────────────────────────
  const addProduct = () => {
    if (!site) return;
    setSite({ ...site, products: [...site.products, { id: uid(), name: "New Product", price: "$00" }] });
  };
  const updateProduct = (id: string, patch: Partial<Product>) => {
    if (!site) return;
    setSite({ ...site, products: site.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };
  const removeProduct = (id: string) => {
    if (!site) return;
    setSite({ ...site, products: site.products.filter((p) => p.id !== id) });
  };

  // ── Sections ──────────────────────────────────────────────────
  const addSection = () => {
    if (!site) return;
    setSite({ ...site, sections: [...site.sections, { title: "New Section", bullets: ["Key point here"] }] });
  };
  const updateSection = (idx: number, patch: Partial<Section>) => {
    if (!site) return;
    const next = site.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    setSite({ ...site, sections: next });
  };
  const removeSection = (idx: number) => {
    if (!site) return;
    setSite({ ...site, sections: site.sections.filter((_, i) => i !== idx) });
  };
  const addBullet = (secIdx: number) => {
    if (!site) return;
    const next = site.sections.map((s, i) =>
      i === secIdx ? { ...s, bullets: [...s.bullets, "New bullet"] } : s
    );
    setSite({ ...site, sections: next });
  };
  const updateBullet = (secIdx: number, bIdx: number, val: string) => {
    if (!site) return;
    const next = site.sections.map((s, i) =>
      i === secIdx
        ? { ...s, bullets: s.bullets.map((b, j) => (j === bIdx ? val : b)) }
        : s
    );
    setSite({ ...site, sections: next });
  };
  const removeBullet = (secIdx: number, bIdx: number) => {
    if (!site) return;
    const next = site.sections.map((s, i) =>
      i === secIdx ? { ...s, bullets: s.bullets.filter((_, j) => j !== bIdx) } : s
    );
    setSite({ ...site, sections: next });
  };
  const dropSection = (toIdx: number) => {
    if (!site || dragSec === null || dragSec === toIdx) return;
    const next = [...site.sections];
    const [moved] = next.splice(dragSec, 1);
    next.splice(toIdx, 0, moved);
    setSite({ ...site, sections: next });
    setDragSec(null);
    setHoverSec(null);
  };

  // ── Images ────────────────────────────────────────────────────
  const setLogoFromFile = async (file?: File) => {
    if (!file || !site) return;
    setSite({ ...site, logoDataUrl: await fileToDataUrl(file) });
  };
  const setHeroImageFromFile = async (file?: File) => {
    if (!file || !site) return;
    setSite({ ...site, heroImageDataUrl: await fileToDataUrl(file) });
  };

  // ── Pages ─────────────────────────────────────────────────────
  const addPage = () => {
    if (!site) return;
    const newPage: Page = { id: uid(), key: uid(), name: "New Page" };
    setSite({ ...site, pages: [...site.pages, newPage] });
    setActivePageId(newPage.id);
  };
  const renamePage = (id: string, name: string) => {
    if (!site) return;
    setSite({ ...site, pages: site.pages.map((p) => (p.id === id ? { ...p, name } : p)) });
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

  // ─────────────────────────────────────────────────────────────
  return (
    <main className="h-screen flex flex-col overflow-hidden" style={{ background: theme.bg, color: theme.text }}>
      {/* Top bar */}
      <div className="h-16 border-b flex items-center justify-between px-4 shadow-sm" style={{ background: theme.panel, borderColor: theme.border }}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)` }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">VentureOS</div>
            <div className="text-xs" style={{ color: theme.mutedText }}>{projectName || "Build • Launch • Operate"}</div>
          </div>
          <a href="/dashboard" className="hidden md:inline-block px-2.5 py-1 rounded-lg text-xs border hover:opacity-80 transition" style={{ borderColor: theme.border, color: theme.mutedText }}>
            Dashboard
          </a>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={generateSite}
            disabled={!canGenerate || generating}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              background: !canGenerate || generating ? "rgba(2,6,23,0.08)" : theme.accent,
              color: !canGenerate || generating ? theme.mutedText : "#fff",
              cursor: !canGenerate || generating ? "not-allowed" : "pointer",
            }}
          >
            {generating ? "Generating..." : "Generate"}
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-medium border hover:opacity-90 transition-all duration-150"
            style={{ borderColor: theme.border, background: saving ? "rgba(2,6,23,0.05)" : theme.surface, color: theme.text }}
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={publish}
            disabled={publishing}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"
            style={{ background: theme.accent, color: "#fff", opacity: publishing ? 0.7 : 1 }}
          >
            {publishing ? "Checking..." : "Publish"}
          </button>

          <button
            onClick={exportJson}
            className="px-4 py-2 rounded-xl text-sm font-medium border hover:opacity-90 transition-all duration-150"
            style={{ borderColor: theme.border, background: "transparent", color: theme.text }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-12 flex-1 min-h-0">
        {/* Left: chat */}
        <aside className="col-span-12 md:col-span-3 border-r flex flex-col min-h-0" style={{ background: theme.panel, borderColor: theme.border }}>
          <div className="p-4 border-b" style={{ borderColor: theme.border }}>
            <div className="font-semibold text-sm">VentureOS Guide</div>
            <div className="text-xs" style={{ color: theme.mutedText }}>Operator-style guidance + execution.</div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm mt-2" style={{ color: theme.mutedText }}>
                Start with: <span style={{ color: theme.text, fontWeight: 600 }}>&quot;I want to build...&quot;</span>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="flex text-sm animate-fadeIn" style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div
                  className="max-w-[92%] px-3 py-2.5 whitespace-pre-line shadow-sm"
                  style={{
                    background: m.role === "user" ? "rgba(37,99,235,0.10)" : "rgba(2,6,23,0.04)",
                    border: `1px solid ${m.role === "user" ? "rgba(37,99,235,0.15)" : theme.border}`,
                    borderRadius: m.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
                    color: theme.text,
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loadingChat && (
              <div className="flex gap-1 px-2 py-2">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 rounded-full inline-block" style={{ background: theme.mutedText, animation: `dotPulse 1.4s ease-in-out ${d * 0.16}s infinite` }} />
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t" style={{ borderColor: theme.border }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask VentureOS..."
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none transition-all duration-200"
                style={{ background: "rgba(2,6,23,0.03)", border: `1px solid ${theme.border}`, color: theme.text }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loadingChat}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                style={{ background: loadingChat ? "rgba(2,6,23,0.08)" : theme.accent, color: loadingChat ? theme.mutedText : "#fff" }}
              >
                Send
              </button>
            </div>
          </div>
        </aside>

        {/* Center: preview */}
        <section className="col-span-12 md:col-span-6 min-h-0 overflow-y-auto p-6 bg-slate-50/40">
          <div className="max-w-4xl mx-auto">
            {!site ? (
              <EmptyPreview theme={theme} />
            ) : (
              <div className="rounded-2xl shadow-lg overflow-hidden border" style={{ borderColor: theme.border }}>
                <SitePreview site={site} activePageId={activePageId || site.pages[0]?.id} onSelectPage={setActivePageId} />
              </div>
            )}
          </div>
        </section>

        {/* Right: builder */}
        <aside className="col-span-12 md:col-span-3 border-l flex flex-col min-h-0" style={{ background: theme.panel, borderColor: theme.border }}>
          <div className="p-4 border-b" style={{ borderColor: theme.border }}>
            <div className="font-semibold text-sm">Builder</div>
            <div className="text-xs" style={{ color: theme.mutedText }}>Pages • Design • Content • Sections</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["quick", "sections", "design", "content", "products", "pages"] as const).map((tab) => (
                <Tab key={tab} label={tab.charAt(0).toUpperCase() + tab.slice(1)} active={rightTab === tab} theme={theme} onClick={() => setRightTab(tab)} />
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
            {!site ? (
              <div className="text-sm" style={{ color: theme.mutedText }}>Generate a site first. Customization appears here.</div>
            ) : (
              <>
                <input ref={logoPickerRef} type="file" accept="image/*" className="hidden" onChange={async (e) => setLogoFromFile(e.target.files?.[0])} />
                <input ref={heroPickerRef} type="file" accept="image/*" className="hidden" onChange={async (e) => setHeroImageFromFile(e.target.files?.[0])} />

                {/* ── Quick tab ── */}
                {rightTab === "quick" && (
                  <div className="space-y-3">
                    <Card theme={theme} title="Start here">
                      <div className="text-sm" style={{ color: theme.mutedText }}>These make your site feel real fast.</div>
                      <div className="mt-3 space-y-2">
                        <ActionButton theme={theme} onClick={() => heroPickerRef.current?.click()}>Upload Hero Image</ActionButton>
                        <ActionButton theme={theme} onClick={() => logoPickerRef.current?.click()}>Upload Logo</ActionButton>
                        <ActionButton theme={theme} onClick={() => addProduct()}>+ Add Product</ActionButton>
                      </div>
                    </Card>

                    <Card theme={theme} title="Color palette">
                      <div className="grid grid-cols-5 gap-2">
                        {THEME_PRESETS.map((p) => {
                          const isActive = site.theme.accent === p.theme.accent && site.theme.bg === p.theme.bg;
                          return (
                            <button
                              key={p.name}
                              title={p.name}
                              onClick={() => setSite({ ...site, theme: { ...p.theme } })}
                              className="flex flex-col items-center gap-1 group"
                            >
                              <div
                                className="h-9 w-9 rounded-xl border-2 transition-all duration-150 shadow-sm group-hover:scale-110"
                                style={{
                                  background: p.accent,
                                  borderColor: isActive ? p.accent : "transparent",
                                  outline: isActive ? `3px solid ${p.accent}40` : "none",
                                }}
                              />
                              <div className="text-[10px] text-center truncate w-full" style={{ color: theme.mutedText }}>{p.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── Sections tab (Phase 1: drag-and-drop) ── */}
                {rightTab === "sections" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sm">Sections</div>
                      <button
                        onClick={addSection}
                        className="text-xs px-2.5 py-1 rounded-lg border hover:opacity-90 transition"
                        style={{ borderColor: theme.border, color: theme.accent }}
                      >
                        + Add
                      </button>
                    </div>
                    <div className="text-xs mb-2" style={{ color: theme.mutedText }}>Drag ⠿ to reorder sections.</div>

                    {site.sections.map((sec, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={() => setDragSec(idx)}
                        onDragOver={(e) => { e.preventDefault(); setHoverSec(idx); }}
                        onDrop={() => dropSection(idx)}
                        onDragEnd={() => { setDragSec(null); setHoverSec(null); }}
                        className="rounded-xl border p-3 transition-all duration-150"
                        style={{
                          borderColor: hoverSec === idx && dragSec !== idx ? theme.accent : theme.border,
                          background: dragSec === idx ? `${theme.accent}08` : "#fff",
                          opacity: dragSec === idx ? 0.5 : 1,
                          boxShadow: hoverSec === idx && dragSec !== idx ? `0 0 0 2px ${theme.accent}40` : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {/* drag handle */}
                          <span
                            className="cursor-grab text-lg select-none flex-shrink-0"
                            style={{ color: theme.mutedText }}
                            title="Drag to reorder"
                          >
                            ⠿
                          </span>
                          <input
                            className="flex-1 px-2 py-1.5 rounded-lg text-sm font-semibold outline-none border transition"
                            style={{ borderColor: theme.border, background: "rgba(2,6,23,0.02)", color: theme.text }}
                            value={sec.title}
                            onChange={(e) => updateSection(idx, { title: e.target.value })}
                            placeholder="Section title"
                          />
                          <button
                            onClick={() => removeSection(idx)}
                            className="h-7 w-7 rounded-lg border flex items-center justify-center text-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition flex-shrink-0"
                            style={{ borderColor: theme.border, color: theme.mutedText }}
                            title="Remove section"
                          >
                            ×
                          </button>
                        </div>

                        {/* Bullets */}
                        <div className="space-y-1.5 ml-6">
                          {sec.bullets.map((b, bi) => (
                            <div key={bi} className="flex gap-1.5 items-center">
                              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: theme.accent }} />
                              <input
                                className="flex-1 px-2 py-1 rounded-lg text-xs outline-none border transition"
                                style={{ borderColor: theme.border, background: "rgba(2,6,23,0.02)", color: theme.text }}
                                value={b}
                                onChange={(e) => updateBullet(idx, bi, e.target.value)}
                                placeholder="Bullet point"
                              />
                              <button
                                onClick={() => removeBullet(idx, bi)}
                                className="text-slate-300 hover:text-red-400 transition text-xs flex-shrink-0"
                                title="Remove bullet"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addBullet(idx)}
                            className="text-xs mt-1 hover:opacity-80 transition"
                            style={{ color: theme.accent }}
                          >
                            + bullet
                          </button>
                        </div>
                      </div>
                    ))}

                    {site.sections.length === 0 && (
                      <div className="text-sm py-4 text-center" style={{ color: theme.mutedText }}>No sections yet. Click + Add.</div>
                    )}
                  </div>
                )}

                {/* ── Design tab (Phase 2: visual color UI) ── */}
                {rightTab === "design" && (
                  <div className="space-y-3">
                    {/* Palette grid */}
                    <Card theme={theme} title="Theme palette">
                      <div className="grid grid-cols-5 gap-2 mb-1">
                        {THEME_PRESETS.map((p) => {
                          const isActive = site.theme.accent === p.theme.accent && site.theme.bg === p.theme.bg;
                          return (
                            <button
                              key={p.name}
                              title={p.name}
                              onClick={() => setSite({ ...site, theme: { ...p.theme } })}
                              className="flex flex-col items-center gap-1 group"
                            >
                              <div
                                className="relative h-10 w-10 rounded-xl border-2 shadow-sm transition-all duration-150 group-hover:scale-110 overflow-hidden"
                                style={{ borderColor: isActive ? p.accent : "transparent", outline: isActive ? `3px solid ${p.accent}40` : "none" }}
                              >
                                <div className="absolute inset-0" style={{ background: p.bg }} />
                                <div className="absolute bottom-0 left-0 right-0 h-5" style={{ background: p.accent }} />
                              </div>
                              <div className="text-[10px] text-center truncate w-full" style={{ color: theme.mutedText }}>{p.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    </Card>

                    {/* Custom colors */}
                    <Card theme={theme} title="Custom colors">
                      <div className="space-y-3">
                        <ColorField theme={theme} label="Primary / Accent" value={site.theme.accent} onChange={(v) => setSite({ ...site, theme: { ...site.theme, accent: v } })} />
                        <ColorField theme={theme} label="Secondary Accent" value={site.theme.accent2} onChange={(v) => setSite({ ...site, theme: { ...site.theme, accent2: v } })} />
                        <ColorField theme={theme} label="Background" value={site.theme.bg} onChange={(v) => setSite({ ...site, theme: { ...site.theme, bg: v } })} />
                        <ColorField theme={theme} label="Text" value={site.theme.text} onChange={(v) => setSite({ ...site, theme: { ...site.theme, text: v } })} />
                        <ColorField theme={theme} label="Muted Text" value={site.theme.mutedText} onChange={(v) => setSite({ ...site, theme: { ...site.theme, mutedText: v } })} />
                      </div>
                    </Card>

                    {/* Font */}
                    <Card theme={theme} title="Font">
                      <div className="grid grid-cols-1 gap-1.5">
                        {FONT_OPTIONS.map((f) => {
                          const active = site.font === f;
                          return (
                            <button
                              key={f}
                              onClick={() => setSite({ ...site, font: f })}
                              className="px-3 py-2 rounded-xl text-sm text-left border transition-all duration-150"
                              style={{
                                borderColor: active ? theme.accent : theme.border,
                                background: active ? `${theme.accent}10` : "#fff",
                                color: active ? theme.accent : theme.text,
                                fontFamily: fontStack(f),
                                fontWeight: active ? 600 : 400,
                              }}
                            >
                              {f}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── Content tab ── */}
                {rightTab === "content" && (
                  <div className="space-y-3">
                    <Field theme={theme} label="Brand Name" value={site.brandName} onChange={(v) => setSite({ ...site, brandName: v })} />
                    <Field theme={theme} label="Tagline" value={site.tagline} onChange={(v) => setSite({ ...site, tagline: v })} />
                    <Field theme={theme} label="Hero Headline" value={site.heroHeadline} onChange={(v) => setSite({ ...site, heroHeadline: v })} />
                    <TextField theme={theme} label="Hero Subheadline" value={site.heroSubheadline} onChange={(v) => setSite({ ...site, heroSubheadline: v })} />
                    <Field theme={theme} label="Primary CTA" value={site.primaryCTA} onChange={(v) => setSite({ ...site, primaryCTA: v })} />
                    <Field theme={theme} label="Audience" value={site.audience} onChange={(v) => setSite({ ...site, audience: v })} />
                    <Field theme={theme} label="Offer" value={site.offer} onChange={(v) => setSite({ ...site, offer: v })} />

                    <Card theme={theme} title="Images">
                      <div className="space-y-2">
                        {site.heroImageDataUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={site.heroImageDataUrl} alt="Hero" className="w-full h-24 object-cover rounded-xl mb-1" />
                        )}
                        <ActionButton theme={theme} onClick={() => heroPickerRef.current?.click()}>
                          {site.heroImageDataUrl ? "Replace Hero Image" : "Upload Hero Image"}
                        </ActionButton>
                        {site.logoDataUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={site.logoDataUrl} alt="Logo" className="h-10 object-contain rounded-lg mb-1" />
                        )}
                        <ActionButton theme={theme} onClick={() => logoPickerRef.current?.click()}>
                          {site.logoDataUrl ? "Replace Logo" : "Upload Logo"}
                        </ActionButton>
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── Products tab ── */}
                {rightTab === "products" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">Catalog</div>
                      <button className="text-xs px-2 py-1 rounded-lg border hover:opacity-90" style={{ borderColor: theme.border, color: theme.accent }} onClick={addProduct}>
                        + Add
                      </button>
                    </div>

                    {site.products.map((p) => (
                      <Card key={p.id} theme={theme} title={p.name || "Product"}>
                        {p.imageDataUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageDataUrl} alt={p.name} className="w-full h-24 object-cover rounded-xl mb-2" />
                        )}
                        <Field theme={theme} label="Name" value={p.name} onChange={(v) => updateProduct(p.id, { name: v })} />
                        <div className="h-2" />
                        <Field theme={theme} label="Price" value={p.price} onChange={(v) => updateProduct(p.id, { price: v })} />
                        <div className="h-2" />
                        <div className="text-xs font-medium mb-1" style={{ color: theme.mutedText }}>Image</div>
                        <input
                          type="file"
                          accept="image/*"
                          className="text-xs w-full"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            updateProduct(p.id, { imageDataUrl: await fileToDataUrl(file) });
                          }}
                        />
                        <div className="h-2" />
                        <button className="text-xs px-2 py-1 rounded-lg border hover:text-red-500 hover:border-red-200 transition" style={{ borderColor: theme.border }} onClick={() => removeProduct(p.id)}>
                          Remove
                        </button>
                      </Card>
                    ))}
                  </div>
                )}

                {/* ── Pages tab ── */}
                {rightTab === "pages" && (
                  <Card theme={theme} title="Pages">
                    <div className="mt-0 space-y-2">
                      {site.pages.map((p) => (
                        <div key={p.id} className="flex gap-2 items-center">
                          <input
                            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border"
                            style={{ borderColor: theme.border }}
                            value={p.name}
                            onChange={(e) => renamePage(p.id, e.target.value)}
                          />
                          <button
                            className="px-2 py-2 rounded-lg border text-xs hover:text-red-500 hover:border-red-200 transition"
                            style={{ borderColor: theme.border }}
                            onClick={() => removePage(p.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <ActionButton theme={theme} onClick={addPage}>+ Add Page</ActionButton>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>

          <div className="p-3 border-t text-xs text-center" style={{ borderColor: theme.border, color: theme.mutedText }}>
            VentureOS Builder
          </div>
        </aside>
      </div>

      {/* Generate loading overlay */}
      {generating && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.70)" }}>
          <div className="rounded-2xl border bg-white p-6 w-[320px] shadow-xl animate-slideUp" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-4">
              <Spinner color={theme.accent} />
              <div>
                <div className="font-semibold">Generating your site...</div>
                <div className="text-sm mt-0.5" style={{ color: theme.mutedText }}>Building pages, layout, and storefront</div>
              </div>
            </div>
            <div className="mt-5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(2,6,23,0.08)" }}>
              <div className="h-full rounded-full animate-pulse" style={{ width: "70%", background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2 || theme.accent})` }} />
            </div>
            <div className="mt-2 text-xs" style={{ color: theme.mutedText }}>This takes a few seconds...</div>
          </div>
        </div>
      )}

      {/* Phase 3: Paywall modal */}
      {showPaywall && <PaywallModal theme={theme} onClose={() => setShowPaywall(false)} />}
    </main>
  );
}

// ─── Paywall Modal (Phase 3) ──────────────────────────────────────
function PaywallModal({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const startSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/checkout", { method: "POST" });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error || "Failed to start checkout. Try again.");
      }
    } catch (err: any) {
      alert(`Something went wrong: ${err?.message || err}. Check Vercel function logs for details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex items-center justify-center h-14 w-14 rounded-2xl mb-5 mx-auto" style={{ background: `${theme.accent}12` }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-900">Publish your store</h2>
        <p className="mt-2 text-center text-slate-500 text-sm">
          Subscribe to VentureOS to go live and start selling.
        </p>

        {/* Price */}
        <div className="mt-6 rounded-2xl border border-slate-200 p-5 text-center bg-slate-50">
          <div className="text-4xl font-bold text-slate-900">$14.99</div>
          <div className="text-sm text-slate-500 mt-1">per month · cancel anytime</div>
          <div
            className="mt-3 inline-block px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: `${theme.accent}14`, color: theme.accent }}
          >
            7-day free trial included
          </div>
        </div>

        {/* Features */}
        <ul className="mt-5 space-y-2.5">
          {[
            "Live storefront with custom URL",
            "Stripe payments for your customers",
            "Unlimited publishes & updates",
            "AI site builder access",
            "Order dashboard & analytics",
          ].map((feat) => (
            <li key={feat} className="flex items-center gap-2.5 text-sm text-slate-700">
              <span className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${theme.accent}14` }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke={theme.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {feat}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={startSubscription}
          disabled={loading}
          className="mt-6 w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          style={{ background: theme.accent, color: "#fff", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Loading..." : "Start free trial — then $14.99/mo"}
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

/* ─── Preview ─────────────────────────────────────────────────────── */

function SitePreview({ site, activePageId, onSelectPage }: { site: SiteSpec; activePageId: string; onSelectPage: (id: string) => void }) {
  const t = site.theme;
  const activePage = site.pages.find((p) => p.id === activePageId) ?? site.pages[0];
  const fontFamily = fontStack(site.font);

  return (
    <div style={{ background: t.surface, color: t.text, fontFamily }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: t.border, background: "#fff" }}>
        <div className="flex items-center gap-3">
          {site.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoDataUrl} alt="Logo" className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-xl" style={{ background: t.accent }} />
          )}
          <div>
            <div className="text-xs" style={{ color: t.mutedText }}>{site.tagline}</div>
            <div className="text-lg font-semibold">{site.brandName}</div>
          </div>
        </div>
        <button className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: t.accent, color: "#fff" }}>
          {site.primaryCTA}
        </button>
      </div>

      <div className="px-5 py-2.5 border-b flex gap-1 flex-wrap" style={{ borderColor: t.border, background: t.bg }}>
        {site.pages.map((p) => {
          const active = p.id === activePage.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPage(p.id)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150"
              style={{ background: active ? `${t.accent}18` : "transparent", color: active ? t.accent : t.mutedText, fontWeight: active ? 600 : 400 }}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="p-6 md:p-8" style={{ background: t.bg }}>
        {activePage.key === "products" ? <ProductsPage site={site} />
          : activePage.key === "about" ? <AboutPage site={site} />
          : activePage.key === "contact" ? <ContactPage site={site} />
          : <HomePage site={site} />}
        <div className="mt-10 text-xs" style={{ color: t.mutedText }}>© {new Date().getFullYear()} {site.brandName}</div>
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
            <button className="px-5 py-3 rounded-xl font-medium transition hover:opacity-90" style={{ background: t.accent, color: "#fff" }}>{site.primaryCTA}</button>
            <button className="px-5 py-3 rounded-xl font-medium border transition hover:opacity-90" style={{ borderColor: t.border, background: "#fff" }}>Learn more</button>
          </div>
          <div className="mt-6 text-sm space-y-1" style={{ color: t.mutedText }}>
            <div><strong style={{ color: t.text }}>Audience:</strong> {site.audience}</div>
            <div><strong style={{ color: t.text }}>Offer:</strong> {site.offer}</div>
            <div><strong style={{ color: t.text }}>First Product:</strong> {site.firstProductOrService}</div>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border shadow-lg" style={{ borderColor: t.border, background: "#fff" }}>
          {site.heroImageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.heroImageDataUrl} alt="Hero" className="w-full h-64 object-cover" />
          ) : (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: t.mutedText }}>Upload a hero image in Builder → Content</div>
          )}
        </div>
      </div>

      {/* Sections */}
      {site.sections.length > 0 && (
        <div className="mt-10 space-y-4">
          {site.sections.map((s, idx) => (
            <section key={idx} className="rounded-2xl border p-5 flex gap-4 hover:shadow-md transition-shadow duration-200" style={{ borderColor: t.border, background: "#fff" }}>
              <div className="w-1 h-8 rounded-full flex-shrink-0 mt-0.5" style={{ background: t.accent }} />
              <div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <ul className="space-y-1.5" style={{ color: t.mutedText }}>
                  {s.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm items-start">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: t.accent }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* FAQ */}
      {site.faq.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-3">FAQ</h3>
          <div className="space-y-3">
            {site.faq.map((f, i) => (
              <details key={i} className="group rounded-2xl border p-4 bg-white transition-all duration-200" style={{ borderColor: t.border }}>
                <summary className="cursor-pointer font-medium flex items-center justify-between list-none text-sm" style={{ color: t.text }}>
                  {f.q}
                  <span className="ml-4 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: t.mutedText }}>↓</span>
                </summary>
                <div className="mt-2 text-sm" style={{ color: t.mutedText }}>{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ProductsPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <>
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-2xl font-semibold">Products</h2>
        <div className="text-sm" style={{ color: t.mutedText }}>Curated for performance + trust</div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {site.products.map((p) => (
          <div key={p.id} className="group rounded-2xl border overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" style={{ borderColor: t.border, background: "#fff" }}>
            <div className="overflow-hidden">
              {p.imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageDataUrl} alt={p.name} className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="h-36 flex items-center justify-center text-xs" style={{ background: `${t.accent}08`, color: t.mutedText }}>Add image in Builder → Products</div>
              )}
            </div>
            <div className="p-4">
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-sm font-medium mt-0.5" style={{ color: t.accent }}>{p.price}</div>
              <button className="mt-3 w-full px-3 py-2 rounded-xl text-sm font-medium transition hover:opacity-90 active:scale-[0.98]" style={{ background: t.accent, color: "#fff" }}>Add to cart</button>
            </div>
          </div>
        ))}
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
        {site.brandName} exists to deliver a clear promise: {site.offer}. This page is where your story, credibility, and brand philosophy live.
      </p>
    </div>
  );
}

function ContactPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border p-6" style={{ borderColor: t.border, background: "#fff" }}>
        <h2 className="text-2xl font-semibold">Contact</h2>
        <p className="mt-2" style={{ color: t.mutedText }}>Keep contact simple and professional.</p>
      </div>
      <div className="rounded-2xl border p-6" style={{ borderColor: t.border, background: "#fff" }}>
        <div className="text-sm font-medium">Message</div>
        <input className="mt-2 w-full px-3 py-2 rounded-xl border text-sm" style={{ borderColor: t.border }} placeholder="Your email" />
        <textarea className="mt-2 w-full px-3 py-2 rounded-xl border text-sm" style={{ borderColor: t.border }} rows={5} placeholder="What can we help with?" />
        <button className="mt-3 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: t.accent, color: "#fff" }}>Send</button>
      </div>
    </div>
  );
}

/* ─── UI helpers ──────────────────────────────────────────────────── */

function EmptyPreview({ theme }: { theme: Theme }) {
  return (
    <div className="rounded-2xl border p-10 text-center" style={{ borderColor: theme.border, background: "#fff" }}>
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4" style={{ background: `${theme.accent}12` }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" />
        </svg>
      </div>
      <div className="text-xl font-semibold mt-1">Your site will appear here</div>
      <p className="mt-2 text-sm max-w-xs mx-auto" style={{ color: theme.mutedText }}>
        Chat on the left for a few turns, then click <strong>Generate</strong>.
      </p>
    </div>
  );
}

function Card({ theme, title, children }: { theme: Theme; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: theme.border, background: "#fff" }}>
      <div className="font-semibold text-sm mb-3">{title}</div>
      {children}
    </div>
  );
}

function Tab({ label, active, theme, onClick }: { label: string; active: boolean; theme: Theme; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-lg border transition-all duration-150"
      style={{
        borderColor: active ? "transparent" : theme.border,
        background: active ? `${theme.accent}14` : "#fff",
        color: active ? theme.accent : theme.text,
        fontWeight: active ? 600 : 400,
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
      className="w-full px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
      style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}dd)`, color: "#fff" }}
    >
      {children}
    </button>
  );
}

function Field({ theme, label, value, onChange }: { theme: Theme; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1" style={{ color: theme.mutedText }}>{label}</div>
      <input
        className="w-full px-3 py-2 rounded-xl text-sm outline-none border transition-all duration-200"
        style={{ borderColor: theme.border, background: "#fff" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextField({ theme, label, value, onChange }: { theme: Theme; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1" style={{ color: theme.mutedText }}>{label}</div>
      <textarea
        className="w-full px-3 py-2 rounded-xl text-sm outline-none border transition-all duration-200"
        style={{ borderColor: theme.border, background: "#fff" }}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ColorField({ theme, label, value, onChange }: { theme: Theme; label: string; value: string; onChange: (v: string) => void }) {
  // Only show color picker for hex/rgb values (not rgba strings)
  const isPickable = /^#[0-9a-fA-F]{3,6}$/.test(value.trim());

  return (
    <label className="block">
      <div className="text-xs font-medium mb-1.5" style={{ color: theme.mutedText }}>{label}</div>
      <div className="flex items-center gap-2">
        {isPickable ? (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-10 p-0.5 border rounded-lg cursor-pointer flex-shrink-0"
            style={{ borderColor: theme.border }}
          />
        ) : (
          <div className="h-9 w-10 rounded-lg border flex-shrink-0" style={{ background: value, borderColor: theme.border }} />
        )}
        <input
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border transition-all duration-200 font-mono"
          style={{ borderColor: theme.border, background: "#fff" }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <div className="h-6 w-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(2,6,23,0.15)", borderTopColor: color }} />
  );
}
