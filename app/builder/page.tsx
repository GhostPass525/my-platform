"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import LaunchMoment from "@/app/components/LaunchMoment";
import StageTracker, { computeStageIndex } from "@/app/components/StageTracker";
import FloatingPanel from "@/app/components/FloatingPanel";
import TemplateModal from "@/app/components/TemplateModal";
import LayoutPickerModal from "@/app/components/LayoutPickerModal";
import StoreLayout, { type LayoutId } from "@/app/components/LayoutTemplates";
import Moveable from "react-moveable";

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
  product_type?: string;
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
  activeLayout?: LayoutId;
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
};

type TextBoxItem = {
  id: string;
  type?: "text" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  imageUrl?: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  fontStyle: string;
  textDecoration: string;
  textAlign: string;
  color: string;
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
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [showLaunchMoment, setShowLaunchMoment] = useState(false);
  const [projectCreatedAt, setProjectCreatedAt] = useState<string | null>(null);
  const [aiEditMode, setAiEditMode] = useState(false);
  const [recentActions, setRecentActions] = useState<string[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [chatLoaded, setChatLoaded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const openingShownRef = useRef(false);

  // Free-floating draggable text boxes
  const [pageElements, setPageElements] = useState<Record<string, TextBoxItem[]>>({});
  const [selectedTextBoxId, setSelectedTextBoxId] = useState<string | null>(null);

  // Drag-and-drop state for sections
  const [dragSec, setDragSec] = useState<number | null>(null);
  const [hoverSec, setHoverSec] = useState<number | null>(null);

  // Inline text editing panels
  const [openPanels, setOpenPanels] = useState<{ id: string; field: string; label: string; value: string }[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<LayoutId | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const logoPickerRef = useRef<HTMLInputElement | null>(null);
  const heroPickerRef = useRef<HTMLInputElement | null>(null);
  const canvasImagePickerRef = useRef<HTMLInputElement | null>(null);
  const canvasImageReplaceTargetRef = useRef<string | null>(null);

  const assistantCount = useMemo(() => messages.filter((m) => m.role === "assistant").length, [messages]);
  const canGenerate = assistantCount >= 3 && !generating;
  // Builder UI always uses this fixed theme — store preview reads site.theme directly
  const theme = LIGHT_THEME;

  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "failed">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load project + chat history on mount
  useEffect(() => {
    const pid = searchParams.get("project");
    const supabase = createClient();

    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });

    if (!pid) { setChatLoaded(true); return; }

    // Load project and history in parallel
    Promise.all([
      fetch(`/api/projects/${pid}`).then((r) => r.json()).catch(() => ({})),
      supabase
        .from("mentor_messages")
        .select("role, content, created_at")
        .eq("project_id", pid)
        .order("created_at", { ascending: true })
        .then(({ data }) => data ?? []),
    ]).then(([projectData, historyRows]) => {
      if (projectData?.site) {
        setSite(projectData.site as SiteSpec);
        setProjectId(pid);
        setProjectName(projectData.name ?? "");
        setProjectCreatedAt(projectData.createdAt ?? null);
        setActivePageId(projectData.site.pages?.[0]?.id ?? "");
        setRightTab("quick");
      }
      if (Array.isArray(historyRows) && historyRows.length > 0) {
        setMessages(
          historyRows.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      }
      setChatLoaded(true);
    }).catch(() => { setChatLoaded(true); });
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

  // Fetch order count once on mount for stage computation
  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => { if (d?.stats?.totalOrders) setOrdersCount(d.stats.totalOrders); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track recent builder actions (max 3)
  const trackAction = (label: string) => {
    setRecentActions((prev) => [label, ...prev].slice(0, 3));
  };

  // ── Opening message ───────────────────────────────────────────
  function buildOpeningMessage(
    s: SiteSpec | null,
    published: string | null,
    orders: number,
    pid: string
  ): string {
    const brand = s?.brandName ? `**${s.brandName}**` : "your store";
    const daysSince = (() => {
      const key = `project_first_visit_${pid}`;
      const stored = localStorage.getItem(key);
      if (!stored) { localStorage.setItem(key, Date.now().toString()); return 0; }
      return Math.floor((Date.now() - parseInt(stored)) / (1000 * 60 * 60 * 24));
    })();

    if (orders > 0) {
      return `You've got ${orders} order${orders > 1 ? "s" : ""}. What's your biggest bottleneck right now — getting more traffic, converting better, or fulfilling faster?`;
    }
    if (published) {
      return `${brand} is live but you haven't made a sale yet. Let's fix that. Who are you going to tell about it today — got a specific person or channel in mind?`;
    }
    if (s && daysSince > 3) {
      return `You've been building ${brand} for a few days. What's actually stopping you from launching today?`;
    }
    if (s) {
      return `You just started building ${brand}. Before you touch anything else — who's the first real person you'd call and say "I built this for you"?`;
    }
    return "What are you building? Give me the one-sentence version.";
  }

  // ── Suggestion chips ─────────────────────────────────────────
  function getSuggestions(stageIdx: number): string[] {
    if (stageIdx <= 1) {
      return [
        "Help me define my target customer",
        "What should I price this at?",
        "How do I validate this fast?",
      ];
    }
    if (stageIdx === 2) {
      return [
        "How do I get my first 10 customers?",
        "Help me write a launch message",
        "What platforms should I be on?",
      ];
    }
    return [
      "How do I get more repeat buyers?",
      "Help me improve my offer",
      "What's killing my conversion?",
    ];
  }

  // Show opening message once history is loaded and site is known
  useEffect(() => {
    if (!chatLoaded || openingShownRef.current) return;
    setMessages((prev) => {
      if (prev.length > 0) return prev; // History exists — don't overwrite
      openingShownRef.current = true;
      const pid = projectId ?? searchParams.get("project") ?? "";
      const opening = buildOpeningMessage(site, publishedUrl, ordersCount, pid);
      return [{ role: "assistant", content: opening }];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatLoaded, site]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingChat]);

  // ── Inline text editing ────────────────────────────────────────
  const openTextPanel = (field: string, label: string, value: string) => {
    if (openPanels.some((p) => p.field === field)) return;
    setOpenPanels((prev) => [...prev, { id: uid(), field, label, value }]);
  };
  const closePanel = (panelId: string) => {
    setOpenPanels((prev) => prev.filter((p) => p.id !== panelId));
  };
  const applyTextEdit = (field: string, value: string) => {
    setSite((prev) => (prev ? { ...prev, [field]: value } : prev));
    trackAction(`Edited ${field}`);
  };


  // ── Save ──────────────────────────────────────────────────────
  const save = async () => {
    if (!site) { alert("Generate a site first."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const next = projectId ? encodeURIComponent(`/builder?project=${projectId}`) : encodeURIComponent("/dashboard");
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
          router.replace(`/builder?project=${data.id}`, { scroll: false });
        }
      }
      trackAction("Saved project");
      setSaveStatus("saved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("failed");
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
      if (aiEditMode && site) {
        // AI Edit Mode: call /api/ai-edit and apply siteUpdate if present
        const res = await fetch("/api/ai-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages, site }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessages((prev) => [...prev, { role: "assistant", content: data?.error || "Server issue. Try again." }]);
          return;
        }
        const reply = data?.result || "No reply. Try again.";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        // Apply site updates if present
        if (data?.siteUpdate && typeof data.siteUpdate === "object" && Object.keys(data.siteUpdate).length > 0) {
          setSite((prev) => {
            if (!prev) return prev;
            const update = data.siteUpdate as Record<string, unknown>;
            const merged: SiteSpec = { ...prev };
            for (const [key, value] of Object.entries(update)) {
              if (key === "theme" && typeof value === "object" && value !== null) {
                merged.theme = { ...prev.theme, ...(value as Partial<Theme>) };
              } else {
                (merged as Record<string, unknown>)[key] = value;
              }
            }
            return merged;
          });
        }
      } else {
        // Normal mode: call /api/idea with mentor context
        const stageIdx = computeStageIndex(!!site, (site?.products?.length ?? 0) > 0, !!publishedUrl, ordersCount);
        const stageLabels = ["Idea", "Setup", "Launch", "First Sale", "Growing"];
        const mentorContext = {
          brandName: site?.brandName || undefined,
          niche: [site?.audience, site?.firstProductOrService].filter(Boolean).join(", ") || undefined,
          stage: stageLabels[stageIdx],
          recentActions: recentActions.length > 0 ? recentActions : undefined,
          productList: site?.products?.map((p) => p.name).filter(Boolean),
          revenue: undefined as number | undefined,
          isPublished: !!publishedUrl,
          daysSinceCreated: projectCreatedAt
            ? Math.floor((Date.now() - new Date(projectCreatedAt).getTime()) / (1000 * 60 * 60 * 24))
            : undefined,
        };
        const res = await fetch("/api/idea", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages, mentorContext }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessages((prev) => [...prev, { role: "assistant", content: data?.error || "Server issue. Try again." }]);
          return;
        }
        const assistantReply = data?.result || "No reply. Try again.";
        setMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);
        // Save both messages to DB (fire-and-forget)
        if (projectId && userId) {
          const supabase = createClient();
          void supabase.from("mentor_messages").insert([
            { project_id: projectId, user_id: userId, role: "user", content: text },
            { project_id: projectId, user_id: userId, role: "assistant", content: assistantReply },
          ]);
        }
      }
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
      trackAction("Generated site blueprint");
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
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setPublishing(true);
    try {
      // Strip base64 data URLs before publishing (they inflate payload past Vercel's 4.5MB limit)
      const siteToPublish: SiteSpec = {
        ...site,
        heroImageDataUrl: site.heroImageDataUrl?.startsWith("data:") ? undefined : site.heroImageDataUrl,
        logoDataUrl: site.logoDataUrl?.startsWith("data:") ? undefined : site.logoDataUrl,
        products: site.products.map((p) => ({
          ...p,
          imageDataUrl: p.imageDataUrl?.startsWith("data:") ? undefined : p.imageDataUrl,
        })),
      };

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: siteToPublish }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.id) {
        alert(data?.error || "Publish failed. Try again.");
        return;
      }

      const url = `${window.location.origin}/s/${data.id}`;
      trackAction("Published store");
      const isFirstPublish = !publishedUrl && !localStorage.getItem(`launched_${projectId ?? data.id}`);
      setPublishedUrl(url);
      if (isFirstPublish) {
        localStorage.setItem(`launched_${projectId ?? data.id}`, String(Date.now()));
        setShowLaunchMoment(true);
      }
    } catch (e: any) {
      alert(`Publish error: ${e?.message || String(e)}`);
    } finally {
      setPublishing(false);
    }
  };

  // ── Products ──────────────────────────────────────────────────
  const addProduct = () => {
    if (!site) return;
    setSite({ ...site, products: [...site.products, { id: uid(), name: "New Product", price: "$00", product_type: "physical" }] });
    trackAction("Added a product");
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
    trackAction("Uploaded brand logo");
  };
  const setHeroImageFromFile = async (file?: File) => {
    if (!file || !site) return;
    setSite({ ...site, heroImageDataUrl: await fileToDataUrl(file) });
  };

  // ── Canvas image upload ────────────────────────────────────────
  const handleCanvasImageFile = async (file?: File) => {
    if (!file || !activePageId) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "anon";
      const pid = projectId ?? "draft";
      const ext = file.name.split(".").pop() ?? "jpg";
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `project-images/${userId}/${pid}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Fall back to local data URL if bucket missing or upload fails
        const dataUrl = await fileToDataUrl(file);
        if (canvasImageReplaceTargetRef.current) {
          setPageElements((prev) => ({
            ...prev,
            [activePageId]: (prev[activePageId] ?? []).map((b) =>
              b.id === canvasImageReplaceTargetRef.current ? { ...b, imageUrl: dataUrl } : b
            ),
          }));
          canvasImageReplaceTargetRef.current = null;
        } else {
          const newBox: TextBoxItem = {
            id: uid(), type: "image", x: 80, y: 80, width: 300, height: 200,
            content: "", imageUrl: dataUrl,
            fontSize: 14, fontWeight: "400", fontFamily: "Inter, sans-serif",
            fontStyle: "normal", textDecoration: "none", textAlign: "left", color: "#1A1A1A",
          };
          setPageElements((prev) => ({ ...prev, [activePageId]: [...(prev[activePageId] ?? []), newBox] }));
          setSelectedTextBoxId(newBox.id);
        }
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("project-assets")
        .getPublicUrl(filePath);

      if (canvasImageReplaceTargetRef.current) {
        setPageElements((prev) => ({
          ...prev,
          [activePageId]: (prev[activePageId] ?? []).map((b) =>
            b.id === canvasImageReplaceTargetRef.current ? { ...b, imageUrl: publicUrl } : b
          ),
        }));
        canvasImageReplaceTargetRef.current = null;
      } else {
        const newBox: TextBoxItem = {
          id: uid(), type: "image", x: 80, y: 80, width: 300, height: 200,
          content: "", imageUrl: publicUrl,
          fontSize: 14, fontWeight: "400", fontFamily: "Inter, sans-serif",
          fontStyle: "normal", textDecoration: "none", textAlign: "left", color: "#1A1A1A",
        };
        setPageElements((prev) => ({ ...prev, [activePageId]: [...(prev[activePageId] ?? []), newBox] }));
        setSelectedTextBoxId(newBox.id);
      }
    } catch {
      alert("Image upload failed. Please try again.");
    }
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

  const addElement = (overrides: Partial<TextBoxItem> = {}) => {
    if (!activePageId) return;
    const newBox: TextBoxItem = {
      id: uid(), x: 80, y: 80, width: 300, height: 60,
      content: "Click to edit text...", fontSize: 16, fontWeight: "400",
      fontFamily: "Inter", fontStyle: "normal", textDecoration: "none",
      textAlign: "left", color: "#1A1A1A",
      ...overrides,
    };
    setPageElements((prev) => ({ ...prev, [activePageId]: [...(prev[activePageId] ?? []), newBox] }));
    setSelectedTextBoxId(newBox.id);
  };

  const exportJson = () => {
    navigator.clipboard.writeText(JSON.stringify(site ?? {}, null, 2));
    alert("Copied site JSON to clipboard.");
  };

  // ─────────────────────────────────────────────────────────────
  const LAYOUT_NAMES: Record<string, string> = {
    "big-hero": "Big Hero",
    "split-screen": "Split Screen",
    "centered-minimal": "Centered Minimal",
    "editorial-magazine": "Editorial Magazine",
    "classic-shop": "Classic Shop",
    "one-page-scroll": "One Page Scroll",
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden" style={{ background: "#F0EFE9", color: theme.text }}>
      {/* Top bar */}
      <div className="h-14 border-b flex items-center justify-between px-4" style={{ background: "#FFFFFF", borderColor: "#EBEBEB" }}>
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: theme.accent }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm" style={{ color: theme.text }}>VentureOS</div>
            {projectName && <div className="text-xs truncate max-w-[140px]" style={{ color: theme.mutedText }}>{projectName}</div>}
          </div>
          <a href="/dashboard" className="hidden md:inline-block px-2.5 py-1 rounded-lg text-xs border hover:opacity-80 transition-all duration-150" style={{ borderColor: theme.border, color: theme.mutedText }}>
            ← Dashboard
          </a>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={generateSite}
            disabled={!canGenerate || generating}
            className="px-3.5 rounded-lg font-medium transition-all duration-150 border"
            style={{
              height: 32,
              fontSize: 13,
              borderColor: !canGenerate || generating ? theme.border : "#2563EB",
              background: "transparent",
              color: !canGenerate || generating ? theme.mutedText : "#2563EB",
              cursor: !canGenerate || generating ? "not-allowed" : "pointer",
              opacity: !canGenerate && !generating ? 0.55 : 1,
            }}
          >
            {generating ? "Generating…" : "Generate"}
          </button>

          <button
            onClick={() => setShowLayoutModal(true)}
            className="px-3.5 rounded-lg font-medium transition-all duration-150 hover:opacity-80 flex items-center gap-1.5"
            style={{ height: 32, fontSize: 13, background: "transparent", border: `1px solid ${theme.border}`, color: theme.mutedText, cursor: "pointer", borderRadius: 8 }}
          >
            <span style={{ fontSize: 14 }}>⊞</span>
            Templates
          </button>

          {saveStatus === "saved" && (
            <span style={{ fontSize: 12, color: "#059669", flexShrink: 0 }}>Saved ✓</span>
          )}
          {saveStatus === "failed" && (
            <span style={{ fontSize: 12, color: "#dc2626", flexShrink: 0 }}>Save failed</span>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="px-3.5 rounded-lg font-medium transition-all duration-150 hover:opacity-70"
            style={{ height: 32, fontSize: 13, background: "transparent", border: "none", color: theme.mutedText, cursor: "pointer" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>

          <div style={{ width: 1, height: 20, background: theme.border, margin: "0 2px", flexShrink: 0, alignSelf: "center" }} />

          <button
            onClick={publish}
            disabled={publishing}
            className="px-3.5 rounded-lg font-medium transition-all duration-150 hover:opacity-90"
            style={{ height: 32, fontSize: 13, background: "#2563EB", color: "#fff", border: "none", opacity: publishing ? 0.7 : 1, cursor: "pointer" }}
          >
            {publishing ? "Checking…" : "Publish"}
          </button>

          {publishedUrl && (
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 rounded-lg font-medium transition-all duration-150 flex items-center gap-1 hover:opacity-70"
              style={{ height: 32, fontSize: 13, border: "none", background: "transparent", color: theme.accent }}
            >
              View ↗
            </a>
          )}

          <button
            onClick={() => setAiEditMode((v) => !v)}
            title={aiEditMode ? "AI Edit Mode ON — chat edits your site directly" : "Turn on AI Edit Mode"}
            className="px-3 rounded-lg font-medium transition-all duration-150 flex items-center gap-1.5 hover:opacity-70"
            style={{
              height: 32,
              fontSize: 13,
              border: "none",
              background: aiEditMode ? `${theme.accent}12` : "transparent",
              color: aiEditMode ? theme.accent : theme.mutedText,
              cursor: "pointer",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
            {aiEditMode ? "AI Edit: ON" : "AI Edit"}
          </button>

          <button
            onClick={exportJson}
            className="px-3 rounded-lg font-medium hover:opacity-70 transition-all duration-150"
            style={{ height: 32, fontSize: 13, border: "none", background: "transparent", color: theme.mutedText, cursor: "pointer" }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-12 flex-1 min-h-0">
        {/* Left: chat */}
        <aside className="col-span-12 md:col-span-3 flex flex-col min-h-0" style={{ background: "#F7F6F3", borderRight: "1px solid rgba(0,0,0,0.07)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", margin: 0, lineHeight: 1.3 }}>Your Mentor</p>
                <p style={{ fontSize: 12, color: "#888", margin: 0, lineHeight: 1.3 }}>
                  {aiEditMode ? "AI Edit: editing your site live" : "Ready to help you build"}
                </p>
              </div>
              {site && (
                <button
                  onClick={() => setAiEditMode((v) => !v)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors duration-150 flex-shrink-0"
                  style={{
                    borderColor: aiEditMode ? theme.accent : theme.border,
                    background: aiEditMode ? `${theme.accent}12` : "transparent",
                    color: aiEditMode ? theme.accent : theme.mutedText,
                  }}
                >
                  {aiEditMode ? "ON" : "OFF"}
                </button>
              )}
            </div>
          </div>

          {/* Business stage tracker */}
          <div className="border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <StageTracker
              activeIndex={computeStageIndex(!!site, (site?.products?.length ?? 0) > 0, !!publishedUrl, ordersCount)}
              accent={theme.accent}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-4" style={{ padding: "20px 18px" }}>
            {messages.map((m, i) => (
              <div key={i} className="animate-fadeIn" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 8 }}>
                {m.role === "assistant" && (
                  <div style={{
                    flexShrink: 0,
                    width: 20, height: 20,
                    borderRadius: 6,
                    background: "#2563EB",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: 2,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                )}
                {m.role === "assistant" ? (
                  <div style={{ flex: 1, fontSize: 15, fontWeight: 500, lineHeight: 1.7, color: "#1A1A1A", whiteSpace: "pre-line" }}>
                    {m.content}
                  </div>
                ) : (
                  <div style={{
                    maxWidth: "88%",
                    fontSize: 14,
                    fontWeight: 400,
                    lineHeight: 1.65,
                    color: "#1A1A1A",
                    background: "#F0F0F0",
                    padding: "8px 12px",
                    borderRadius: "12px 12px 2px 12px",
                    whiteSpace: "pre-line",
                  }}>
                    {m.content}
                  </div>
                )}
              </div>
            ))}
            {loadingChat && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div className="flex gap-1 py-2">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-2 w-2 rounded-full inline-block" style={{ background: "#9CA3AF", animation: `dotPulse 1.4s ease-in-out ${d * 0.16}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: "10px 16px 14px", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
            {/* Suggestion chips */}
            {!aiEditMode && (() => {
              const stageIdx = computeStageIndex(!!site, (site?.products?.length ?? 0) > 0, !!publishedUrl, ordersCount);
              const chips = getSuggestions(stageIdx);
              return (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {chips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => { setInput(chip); textareaRef.current?.focus(); }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #E5E7EB",
                        background: "#FAFAFA",
                        fontSize: 12,
                        color: "#6B7280",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#BFDBFE";
                        e.currentTarget.style.color = "#2563EB";
                        e.currentTarget.style.background = "#EFF6FF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#E5E7EB";
                        e.currentTarget.style.color = "#6B7280";
                        e.currentTarget.style.background = "#FAFAFA";
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-grow
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  aiEditMode
                    ? 'e.g. "Change tagline to…"'
                    : (() => {
                        const stageIdx = computeStageIndex(!!site, (site?.products?.length ?? 0) > 0, !!publishedUrl, ordersCount);
                        if (stageIdx <= 1) return "What are you building?";
                        if (stageIdx === 2) return "How's the launch going?";
                        return "What's your biggest challenge right now?";
                      })()
                }
                rows={1}
                style={{
                  flex: 1,
                  minHeight: 44,
                  maxHeight: 120,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `1px solid ${aiEditMode ? theme.accent + "35" : "#D0CFC9"}`,
                  fontSize: 14,
                  outline: "none",
                  background: aiEditMode ? `${theme.accent}06` : "#FFFFFF",
                  color: theme.text,
                  resize: "none",
                  lineHeight: 1.5,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  overflowY: "auto",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)";
                  e.currentTarget.style.borderColor = "#2563EB60";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = aiEditMode ? theme.accent + "35" : "#D0CFC9";
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loadingChat}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  background: loadingChat ? "#E5E7EB" : "#2563EB",
                  color: loadingChat ? "#9CA3AF" : "#fff",
                  flexShrink: 0,
                  cursor: loadingChat ? "default" : "pointer",
                  transition: "opacity 0.15s",
                  alignSelf: "flex-end",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </aside>

        {/* Center: preview */}
        <section
          className="col-span-12 md:col-span-6 min-h-0 overflow-y-auto"
          style={{ background: "#F0EFE9", position: "relative" }}
          onClick={() => setSelectedTextBoxId(null)}
        >
          {!site ? (
            <EmptyPreview theme={theme} />
          ) : (
            <div className="store-preview" style={{ background: "#FFFFFF", minHeight: "100%", position: "relative" }}>
              {/* Preview banner */}
              {previewLayout && (
                <div style={{
                  position: "sticky", top: 0, zIndex: 50,
                  background: "#1E40AF", color: "#fff",
                  padding: "8px 16px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  fontSize: 13, fontWeight: 500,
                }}>
                  <span>Previewing: <strong>{LAYOUT_NAMES[previewLayout]}</strong> layout</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        setSite(prev => prev ? { ...prev, activeLayout: previewLayout } : prev);
                        setPreviewLayout(null);
                        setShowLayoutModal(false);
                      }}
                      style={{ height: 28, padding: "0 12px", borderRadius: 6, background: "#fff", color: "#1E40AF", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >Use This Layout</button>
                    <button
                      onClick={() => setPreviewLayout(null)}
                      style={{ height: 28, padding: "0 12px", borderRadius: 6, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}
                    >Cancel</button>
                  </div>
                </div>
              )}
              {/* Layout or default preview */}
              {(previewLayout || site.activeLayout) ? (
                <StoreLayout
                  layoutId={(previewLayout || site.activeLayout)!}
                  site={site}
                  activePageId={activePageId || site.pages[0]?.id}
                  onSelectPage={setActivePageId}
                  onAddToCart={() => {}}
                  cartCount={0}
                  onOpenCart={() => {}}
                />
              ) : (
                <SitePreview site={site} activePageId={activePageId || site.pages[0]?.id} onSelectPage={setActivePageId} onTextClick={openTextPanel} />
              )}
              <DraggableTextLayer
                boxes={pageElements[activePageId || site.pages[0]?.id] ?? []}
                selectedId={selectedTextBoxId}
                onSelect={setSelectedTextBoxId}
                onChange={(newBoxes) => {
                  const pid = activePageId || site.pages[0]?.id;
                  setPageElements((prev) => ({ ...prev, [pid]: newBoxes }));
                }}
                isBlankPage={!!(site && site.pages.find(p => p.id === (activePageId || site.pages[0]?.id)) && !["home","products","about","contact"].includes(site.pages.find(p => p.id === (activePageId || site.pages[0]?.id))?.key ?? "home"))}
                onAddElement={addElement}
                onReplaceImage={(id) => {
                  canvasImageReplaceTargetRef.current = id;
                  canvasImagePickerRef.current?.click();
                }}
              />
            </div>
          )}
        </section>

        {/* Right: builder */}
        <aside className="col-span-12 md:col-span-3 flex flex-col min-h-0" style={{ background: "#F7F6F3", borderLeft: "1px solid rgba(0,0,0,0.07)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: theme.text, marginBottom: 10 }}>Customize</div>
            <div className="flex flex-wrap gap-1">
              {(["quick", "sections", "design", "content", "products", "pages"] as const).map((tab) => (
                <Tab key={tab} label={tab.charAt(0).toUpperCase() + tab.slice(1)} active={rightTab === tab} theme={theme} onClick={() => setRightTab(tab)} />
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
            {!site ? (
              <LockedControlsPreview theme={theme} />
            ) : (
              <>
                <input ref={logoPickerRef} type="file" accept="image/*" className="hidden" onChange={async (e) => setLogoFromFile(e.target.files?.[0])} />
                <input ref={heroPickerRef} type="file" accept="image/*" className="hidden" onChange={async (e) => setHeroImageFromFile(e.target.files?.[0])} />
                <input ref={canvasImagePickerRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { await handleCanvasImageFile(e.target.files?.[0]); e.target.value = ""; }} />

                {/* ── Quick tab ── */}
                {rightTab === "quick" && (
                  <div className="space-y-3">
                    <Card theme={theme} title="Start here">
                      <div className="text-sm" style={{ color: theme.mutedText }}>These make your site feel real fast.</div>
                      <div className="mt-3 space-y-2">
                        <ActionButton theme={theme} onClick={() => heroPickerRef.current?.click()}>Upload Hero Image</ActionButton>
                        <ActionButton theme={theme} onClick={() => logoPickerRef.current?.click()}>Upload Logo</ActionButton>
                        <ActionButton theme={theme} onClick={() => addProduct()}>+ Add Product</ActionButton>
                        <ActionButton theme={theme} onClick={() => addElement()}>+ Add Text Box</ActionButton>
                        <ActionButton theme={theme} onClick={() => addElement({ content: "Your Heading Here", fontSize: 32, fontWeight: "700", width: 400, height: 56 })}>+ Add Heading</ActionButton>
                        <ActionButton theme={theme} onClick={() => canvasImagePickerRef.current?.click()}>+ Add Image</ActionButton>
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
                              className="flex items-center justify-center group"
                              style={{ padding: 4 }}
                            >
                              <div
                                className="h-9 w-9 rounded-full transition-all duration-150 group-hover:scale-110"
                                style={{
                                  background: p.accent,
                                  boxShadow: isActive
                                    ? "0 0 0 2px #fff, 0 0 0 4px #2563EB"
                                    : "0 1px 3px rgba(0,0,0,0.18)",
                                }}
                              />
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
                              className="flex items-center justify-center group"
                              style={{ padding: 4 }}
                            >
                              <div
                                className="relative h-10 w-10 rounded-full transition-all duration-150 group-hover:scale-110 overflow-hidden"
                                style={{
                                  boxShadow: isActive
                                    ? "0 0 0 2px #fff, 0 0 0 4px #2563EB"
                                    : "0 1px 3px rgba(0,0,0,0.18)",
                                }}
                              >
                                <div className="absolute inset-0" style={{ background: p.bg }} />
                                <div className="absolute bottom-0 left-0 right-0 h-5" style={{ background: p.accent }} />
                              </div>
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
                              className="px-3 py-2 rounded-xl text-sm text-left border transition-all duration-150 flex items-center justify-between"
                              style={{
                                borderColor: active ? "#2563EB" : theme.border,
                                background: active ? "#2563EB10" : "#fff",
                                color: active ? "#2563EB" : theme.text,
                              }}
                            >
                              <span style={{ fontFamily: fontStack(f), fontWeight: active ? 600 : 400 }}>{f}</span>
                              <span style={{ fontFamily: fontStack(f), fontSize: 13, color: active ? "#2563EB99" : "#9CA3AF", fontWeight: 400 }}>Aa</span>
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

                    {/* Contact page fields */}
                    {(() => {
                      const pid = activePageId || site.pages[0]?.id;
                      const pg = site.pages.find((p) => p.id === pid);
                      return pg?.key === "contact" ? (
                        <Card theme={theme} title="Contact Info">
                          <div className="space-y-3">
                            <Field theme={theme} label="Business Email" value={site.contactEmail ?? ""} onChange={(v) => setSite({ ...site, contactEmail: v })} />
                            <Field theme={theme} label="Phone Number" value={site.contactPhone ?? ""} onChange={(v) => setSite({ ...site, contactPhone: v })} />
                            <Field theme={theme} label="Address / City" value={site.contactAddress ?? ""} onChange={(v) => setSite({ ...site, contactAddress: v })} />
                          </div>
                        </Card>
                      ) : null;
                    })()}

                    {/* About page fields */}
                    {(() => {
                      const pid = activePageId || site.pages[0]?.id;
                      const pg = site.pages.find((p) => p.id === pid);
                      return pg?.key === "about" ? (
                        <Card theme={theme} title="About Page">
                          <div className="space-y-3">
                            <TextField theme={theme} label="Brand Story" value={site.aboutStory ?? ""} onChange={(v) => setSite({ ...site, aboutStory: v })} />
                            <Field theme={theme} label="Founder Name" value={site.founderName ?? ""} onChange={(v) => setSite({ ...site, founderName: v })} />
                            <Field theme={theme} label="Founder Title" value={site.founderTitle ?? ""} onChange={(v) => setSite({ ...site, founderTitle: v })} />
                            <TextField theme={theme} label="Mission Statement" value={site.missionStatement ?? ""} onChange={(v) => setSite({ ...site, missionStatement: v })} />
                            <Field theme={theme} label="Year Founded" value={site.yearFounded ?? ""} onChange={(v) => setSite({ ...site, yearFounded: v })} />
                            <div className="text-xs font-semibold uppercase tracking-wide mt-2" style={{ color: theme.mutedText }}>Core Values</div>
                            <Field theme={theme} label="Value 1" value={site.value1 ?? ""} onChange={(v) => setSite({ ...site, value1: v })} />
                            <Field theme={theme} label="Value 2" value={site.value2 ?? ""} onChange={(v) => setSite({ ...site, value2: v })} />
                            <Field theme={theme} label="Value 3" value={site.value3 ?? ""} onChange={(v) => setSite({ ...site, value3: v })} />
                          </div>
                        </Card>
                      ) : null;
                    })()}
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
                        <div className="text-xs font-medium mb-1.5" style={{ color: theme.mutedText }}>Product Type</div>
                        <div className="grid grid-cols-2 gap-1 mb-2">
                          {(["physical", "digital", "service", "consultation"] as const).map((type) => {
                            const active = (p.product_type || "physical") === type;
                            return (
                              <label
                                key={type}
                                className="flex items-center gap-1.5 cursor-pointer px-2 py-1.5 rounded-lg border text-xs transition-all"
                                style={{
                                  borderColor: active ? theme.accent : theme.border,
                                  background: active ? `${theme.accent}14` : "transparent",
                                  color: active ? theme.accent : theme.mutedText,
                                  fontWeight: active ? 600 : 400,
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`ptype_${p.id}`}
                                  value={type}
                                  checked={active}
                                  onChange={() => updateProduct(p.id, { product_type: type })}
                                  className="sr-only"
                                />
                                {type === "physical" ? "Physical" : type === "digital" ? "Digital" : type === "service" ? "Service" : "Consult"}
                              </label>
                            );
                          })}
                        </div>
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
                      {site.pages.map((p) => {
                        const isActive = p.id === (activePageId || site.pages[0]?.id);
                        return (
                        <div key={p.id} className="flex gap-2 items-center">
                          <button
                            onClick={() => setActivePageId(p.id)}
                            className="flex-1 px-3 py-2 rounded-xl text-sm text-left font-medium transition-all duration-150 border"
                            style={{
                              borderColor: isActive ? theme.accent : theme.border,
                              background: isActive ? `${theme.accent}10` : "#fff",
                              color: isActive ? theme.accent : theme.text,
                            }}
                          >
                            {p.name}
                          </button>
                          <button
                            className="px-2 py-2 rounded-lg border text-xs hover:text-red-500 hover:border-red-200 transition"
                            style={{ borderColor: theme.border }}
                            onClick={() => removePage(p.id)}
                          >
                            ×
                          </button>
                        </div>
                        );
                      })}
                    </div>
                    <div className="mt-3">
                      <ActionButton theme={theme} onClick={addPage}>+ Add Page</ActionButton>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>

          <div className="px-4 py-2.5 border-t text-[10px] text-center" style={{ borderColor: theme.border, color: theme.mutedText }}>
            VentureOS Builder
          </div>
        </aside>
      </div>

      {/* Generate loading overlay */}
      {generating && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]" style={{ background: "rgba(255,255,255,0.65)" }}>
          <div className="rounded-2xl border bg-white p-6 w-72 shadow-xl animate-slideUp" style={{ borderColor: theme.border }}>
            <div className="flex items-center gap-3.5">
              <Spinner color={theme.accent} />
              <div>
                <div className="font-semibold text-sm" style={{ color: theme.text }}>Generating your site…</div>
                <div className="text-xs mt-0.5" style={{ color: theme.mutedText }}>This takes a few seconds</div>
              </div>
            </div>
            <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: "rgba(2,6,23,0.06)" }}>
              <div className="h-full rounded-full animate-pulse" style={{ width: "65%", background: theme.accent }} />
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: Paywall modal */}
      {showPaywall && <PaywallModal theme={theme} onClose={() => setShowPaywall(false)} />}

      {/* Launch Moment — first publish celebration */}
      {showLaunchMoment && site && publishedUrl && (
        <LaunchMoment
          storeUrl={publishedUrl}
          site={site}
          projectCreatedAt={projectCreatedAt}
          onContinue={() => setShowLaunchMoment(false)}
        />
      )}

      {/* Floating text edit panels */}
      {openPanels.map((panel, idx) => (
        <FloatingPanel
          key={panel.id}
          title={`Edit: ${panel.label}`}
          onClose={() => closePanel(panel.id)}
          initialX={80 + idx * 24}
          initialY={120 + idx * 24}
          width={320}
        >
          <TextEditPanelBody
            panel={panel}
            theme={theme}
            onApply={(val) => { applyTextEdit(panel.field, val); closePanel(panel.id); }}
          />
        </FloatingPanel>
      ))}

      {/* Template picker modal */}
      {showTemplateModal && (
        <TemplateModal
          onApply={(newTheme, newFont) => {
            setSite((prev) => (prev ? { ...prev, theme: newTheme, font: newFont } : prev));
            setShowTemplateModal(false);
            trackAction("Applied template");
          }}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {/* Layout picker modal */}
      {showLayoutModal && (
        <LayoutPickerModal
          activeLayout={site?.activeLayout}
          onPreview={(id) => setPreviewLayout(id)}
          onApply={(id) => {
            setSite(prev => prev ? { ...prev, activeLayout: id } : prev);
            setPreviewLayout(null);
            setShowLayoutModal(false);
          }}
          onClose={() => {
            setPreviewLayout(null);
            setShowLayoutModal(false);
          }}
        />
      )}
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
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error || `Checkout failed (HTTP ${res.status}). Check that STRIPE_SECRET_KEY and VENTUREOS_PRICE_ID are set in your environment.`);
      }
    } catch (err: any) {
      alert(`Checkout failed: ${err?.message || err}. Check your Vercel environment variables and function logs.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-7 animate-slideUp shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex items-center justify-center h-11 w-11 rounded-xl mb-5 mx-auto" style={{ background: `${theme.accent}10` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-center text-slate-900 tracking-tight">Publish your store</h2>
        <p className="mt-1.5 text-center text-slate-500 text-sm">
          Subscribe to go live and start selling.
        </p>

        {/* Price */}
        <div className="mt-5 rounded-xl border border-slate-200 p-4 text-center bg-slate-50">
          <div className="text-3xl font-bold text-slate-900 tracking-tight">$14.99</div>
          <div className="text-xs text-slate-500 mt-0.5">per month · cancel anytime</div>
          <div className="mt-2.5 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: `${theme.accent}12`, color: theme.accent }}>
            7-day free trial
          </div>
        </div>

        {/* Features */}
        <ul className="mt-4 space-y-2">
          {[
            "Live storefront with custom URL",
            "Stripe payments for your customers",
            "Unlimited publishes & updates",
            "AI site builder access",
            "Order dashboard & analytics",
          ].map((feat) => (
            <li key={feat} className="flex items-center gap-2.5 text-sm text-slate-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {feat}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={startSubscription}
          disabled={loading}
          className="mt-5 w-full py-3 rounded-lg font-semibold text-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          style={{ background: theme.accent, color: "#fff", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Loading…" : "Start free trial — then $14.99/mo"}
        </button>

        <button
          onClick={onClose}
          className="mt-2 w-full py-2 rounded-lg text-sm text-slate-400 hover:text-slate-600 transition-colors duration-150"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

/* ─── Preview ─────────────────────────────────────────────────────── */

type OnTextClick = (field: string, label: string, value: string) => void;

function EditableText({
  field,
  label,
  value,
  onTextClick,
  style,
  className,
  tag: Tag = "span",
}: {
  field: string;
  label: string;
  value: string;
  onTextClick?: OnTextClick;
  style?: React.CSSProperties;
  className?: string;
  tag?: React.ElementType;
}) {
  const [hovered, setHovered] = useState(false);
  if (!onTextClick) {
    return <Tag className={className} style={style}>{value}</Tag>;
  }
  return (
    <Tag
      className={className}
      style={{
        ...style,
        outline: hovered ? "2px solid #2563EB" : "none",
        outlineOffset: 3,
        borderRadius: 3,
        cursor: "text",
        transition: "outline 0.1s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onTextClick(field, label, value)}
      title={`Click to edit: ${label}`}
    >
      {value}
    </Tag>
  );
}

function SitePreview({ site, activePageId, onSelectPage, onTextClick }: { site: SiteSpec; activePageId: string; onSelectPage: (id: string) => void; onTextClick?: OnTextClick }) {
  const t = site.theme;
  const activePage = site.pages.find((p) => p.id === activePageId) ?? site.pages[0];
  const fontFamily = fontStack(site.font);

  return (
    <div style={{ background: t.surface, color: t.text, fontFamily }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: t.border, background: t.panel || "#fff" }}>
        <div className="flex items-center gap-2.5">
          {site.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logoDataUrl} alt="Logo" className="h-7 w-7 rounded-lg object-cover" />
          ) : (
            <div className="h-7 w-7 rounded-lg flex-shrink-0" style={{ background: t.accent }} />
          )}
          <div>
            <EditableText tag="div" field="brandName" label="Brand Name" value={site.brandName} onTextClick={onTextClick} className="font-semibold text-sm leading-tight" />
            {site.tagline && (
              <EditableText tag="div" field="tagline" label="Tagline" value={site.tagline} onTextClick={onTextClick} className="text-xs leading-tight" style={{ color: t.mutedText }} />
            )}
          </div>
        </div>
        <EditableText
          tag="button"
          field="primaryCTA"
          label="CTA Button"
          value={site.primaryCTA}
          onTextClick={onTextClick}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: t.accent, color: "#fff", border: "none" }}
        />
      </div>

      <div className="px-4 py-2 border-b flex gap-0.5 flex-wrap" style={{ borderColor: t.border, background: t.bg }}>
        {site.pages.map((p) => {
          const active = p.id === activePage.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPage(p.id)}
              className="px-2.5 py-1.5 rounded-md text-xs transition-all duration-150"
              style={{ background: active ? `${t.accent}14` : "transparent", color: active ? t.accent : t.mutedText, fontWeight: active ? 600 : 400 }}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <div className={activePage.key !== "home" && activePage.key !== "products" && activePage.key !== "about" && activePage.key !== "contact" ? "" : "p-5 md:p-7"} style={{ background: t.bg }}>
        {activePage.key === "products" ? <ProductsPage site={site} onTextClick={onTextClick} />
          : activePage.key === "about" ? <AboutPage site={site} onTextClick={onTextClick} />
          : activePage.key === "contact" ? <ContactPage site={site} />
          : activePage.key === "home" ? <HomePage site={site} onTextClick={onTextClick} />
          : null}
        {(activePage.key === "home" || activePage.key === "products" || activePage.key === "about" || activePage.key === "contact") && (
          <div className="mt-10 text-xs" style={{ color: t.mutedText }}>© {new Date().getFullYear()} {site.brandName}</div>
        )}
      </div>
    </div>
  );
}

function HomePage({ site, onTextClick }: { site: SiteSpec; onTextClick?: OnTextClick }) {
  const t = site.theme;
  return (
    <>
      <div className="grid gap-8 md:grid-cols-2 items-center">
        <div>
          <EditableText tag="h1" field="heroHeadline" label="Hero Headline" value={site.heroHeadline} onTextClick={onTextClick} className="text-2xl md:text-3xl font-bold leading-tight tracking-tight" />
          <EditableText tag="p" field="heroSubheadline" label="Hero Subheadline" value={site.heroSubheadline} onTextClick={onTextClick} className="mt-3 text-sm leading-relaxed" style={{ color: t.mutedText }} />
          <div className="mt-5 flex gap-2">
            <button className="px-4 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90 active:scale-[0.98]" style={{ background: t.accent, color: "#fff" }}>{site.primaryCTA}</button>
            <button className="px-4 py-2.5 rounded-lg text-sm font-medium border transition hover:opacity-80" style={{ borderColor: t.border, background: "transparent", color: t.text }}>Learn more</button>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: t.border }}>
          {site.heroImageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.heroImageDataUrl} alt="Hero" className="w-full h-52 object-cover" />
          ) : (
            <div className="h-52 flex items-center justify-center text-xs text-center px-4" style={{ background: `${t.accent}08`, color: t.mutedText }}>
              <span>Upload a hero image in<br />Builder → Content</span>
            </div>
          )}
        </div>
      </div>

      {site.sections.length > 0 && (
        <div className="mt-8 space-y-3">
          {site.sections.map((s, idx) => (
            <section key={idx} className="rounded-xl border p-4" style={{ borderColor: t.border, background: t.surface || "#fff" }}>
              <h3 className="text-sm font-semibold mb-2">{s.title}</h3>
              <ul className="space-y-1.5" style={{ color: t.mutedText }}>
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-xs items-start">
                    <span className="mt-1.5 h-1 w-1 rounded-full flex-shrink-0" style={{ background: t.accent }} />
                    {b}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {site.faq.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold mb-2.5">FAQ</h3>
          <div className="space-y-2">
            {site.faq.map((f, i) => (
              <details key={i} className="group rounded-xl border p-3" style={{ borderColor: t.border, background: t.surface || "#fff" }}>
                <summary className="cursor-pointer font-medium flex items-center justify-between list-none text-xs" style={{ color: t.text }}>
                  {f.q}
                  <span className="ml-3 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: t.mutedText }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </summary>
                <div className="mt-2 text-xs leading-relaxed" style={{ color: t.mutedText }}>{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ProductsPage({ site, onTextClick: _onTextClick }: { site: SiteSpec; onTextClick?: OnTextClick }) {
  const t = site.theme;
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight">Products</h2>
        <span className="text-xs" style={{ color: t.mutedText }}>{site.products.length} items</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {site.products.map((p) => (
          <div key={p.id} className="group rounded-xl border overflow-hidden hover:shadow-md transition-all duration-200" style={{ borderColor: t.border, background: t.surface || "#fff" }}>
            <div className="overflow-hidden">
              {p.imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageDataUrl} alt={p.name} className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="h-28 flex items-center justify-center text-[10px] text-center" style={{ background: `${t.accent}08`, color: t.mutedText }}>Add image</div>
              )}
            </div>
            <div className="p-3">
              <div className="font-medium text-xs">{p.name}</div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: t.accent }}>{p.price}</div>
              <button className="mt-2.5 w-full px-2 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-90" style={{ background: t.accent, color: "#fff" }}>Add to cart</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AboutPage({ site, onTextClick: _onTextClick }: { site: SiteSpec; onTextClick?: OnTextClick }) {
  const t = site.theme;
  const hasValues = site.value1 || site.value2 || site.value3;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Story section */}
      <div style={{ background: t.surface || "#fff", border: `1px solid ${t.border}`, borderRadius: 12, padding: "24px 28px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: t.text }}>Our Story</h2>
        {site.aboutStory ? (
          <p style={{ fontSize: 14, color: t.mutedText, lineHeight: 1.75 }}>{site.aboutStory}</p>
        ) : (
          <p style={{ fontSize: 14, color: t.mutedText, lineHeight: 1.75 }}>
            {site.brandName} was built to deliver one clear promise: {site.offer}.
            We serve {site.audience} who deserve better.
          </p>
        )}
        {(site.founderName || site.yearFounded) && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${t.border}`, display: "flex", gap: 24, flexWrap: "wrap" }}>
            {site.founderName && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{site.founderName}</div>
                {site.founderTitle && <div style={{ fontSize: 13, color: t.mutedText }}>{site.founderTitle}</div>}
              </div>
            )}
            {site.yearFounded && (
              <div>
                <div style={{ fontSize: 13, color: t.mutedText }}>Founded</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{site.yearFounded}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mission */}
      {site.missionStatement && (
        <div style={{ background: `${t.accent}08`, border: `1px solid ${t.accent}20`, borderRadius: 12, padding: "20px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Our Mission</div>
          <p style={{ fontSize: 16, fontWeight: 500, color: t.text, lineHeight: 1.6, margin: 0 }}>{site.missionStatement}</p>
        </div>
      )}

      {/* Values */}
      {hasValues && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 12 }}>What We Stand For</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {[site.value1, site.value2, site.value3].filter(Boolean).map((v, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.text, lineHeight: 1.5 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContactPage({ site }: { site: SiteSpec }) {
  const t = site.theme;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
      {/* Left: contact info */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: t.text }}>Get in Touch</h2>
        <p style={{ fontSize: 14, color: t.mutedText, marginBottom: 24, lineHeight: 1.6 }}>
          We&apos;d love to hear from you. Reach out and we&apos;ll get back to you as soon as possible.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {site.contactEmail && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${t.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 11, color: t.mutedText, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</div>
                <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>{site.contactEmail}</div>
              </div>
            </div>
          )}
          {site.contactPhone && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${t.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 11, color: t.mutedText, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone</div>
                <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>{site.contactPhone}</div>
              </div>
            </div>
          )}
          {site.contactAddress && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${t.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 11, color: t.mutedText, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Address</div>
                <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>{site.contactAddress}</div>
              </div>
            </div>
          )}
          {!site.contactEmail && !site.contactPhone && !site.contactAddress && (
            <div style={{ fontSize: 13, color: t.mutedText, fontStyle: "italic" }}>
              Add your contact info in the Content tab →
            </div>
          )}
        </div>
      </div>
      {/* Right: contact form */}
      <div style={{ background: t.surface || "#fff", border: `1px solid ${t.border}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 16 }}>Send a message</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}`, fontSize: 13, color: t.text, background: "transparent", boxSizing: "border-box" }} placeholder="Your name" readOnly />
          <input style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}`, fontSize: 13, color: t.text, background: "transparent", boxSizing: "border-box" }} placeholder="Your email" readOnly />
          <textarea style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border}`, fontSize: 13, color: t.text, background: "transparent", resize: "none", boxSizing: "border-box" }} rows={4} placeholder="Your message" readOnly />
          <button style={{ width: "100%", padding: "10px 16px", borderRadius: 8, background: t.accent, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Send Message</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Draggable text boxes ────────────────────────────────────────── */

const ELEMENT_FONT_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Lora", value: "Lora, serif" },
  { label: "Oswald", value: "Oswald, sans-serif" },
  { label: "Pacifico", value: "Pacifico, cursive" },
  { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { label: "Merriweather", value: "Merriweather, serif" },
];

const ELEMENT_FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 80];

const PRESET_COLORS = [
  "#1A1A1A", "#FFFFFF", "#374151", "#6B7280", "#D1D5DB",
  "#2563EB", "#DC2626", "#EA580C", "#16A34A", "#7C3AED",
];

function CanvasElement({
  box,
  isSelected,
  editingId,
  onSelect,
  onEditStart,
  onEditEnd,
  onUpdate,
  onDelete,
}: {
  box: TextBoxItem;
  isSelected: boolean;
  editingId: string | null;
  onSelect: (id: string) => void;
  onEditStart: (id: string) => void;
  onEditEnd: () => void;
  onUpdate: (id: string, patch: Partial<TextBoxItem>) => void;
  onDelete: (id: string) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ w: number; h: number } | null>(null);
  const isEditing = editingId === box.id;

  return (
    <>
      <div
        ref={elRef}
        style={{
          position: "absolute",
          left: box.x,
          top: box.y,
          width: Math.max(80, box.width),
          height: Math.max(30, box.height),
          pointerEvents: "all",
          cursor: isEditing ? "text" : "default",
          border: isSelected ? "2px solid #2563EB" : "1px dashed rgba(0,0,0,0.15)",
          boxShadow: isSelected ? "0 0 0 3px rgba(37,99,235,0.15)" : "none",
          borderRadius: 3,
          boxSizing: "border-box",
          background: "transparent",
          minWidth: 80,
          minHeight: 30,
        }}
        onClick={(e) => { e.stopPropagation(); onSelect(box.id); }}
        onDoubleClick={(e) => { e.stopPropagation(); if (box.type !== "image") { onEditStart(box.id); onSelect(box.id); } }}
      >
        {box.type === "image" ? (
          <img
            src={box.imageUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3, display: "block", userSelect: "none", pointerEvents: "none" }}
            draggable={false}
          />
        ) : isEditing ? (
          <textarea
            autoFocus
            value={box.content}
            onChange={(e) => onUpdate(box.id, { content: e.target.value })}
            onBlur={onEditEnd}
            placeholder="Click to edit text..."
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              resize: "none",
              fontSize: box.fontSize,
              fontWeight: box.fontWeight,
              fontFamily: box.fontFamily || "Inter, sans-serif",
              fontStyle: box.fontStyle || "normal",
              textDecoration: box.textDecoration || "none",
              textAlign: (box.textAlign || "left") as React.CSSProperties["textAlign"],
              color: box.color,
              padding: "8px 12px",
              boxSizing: "border-box",
              lineHeight: 1.4,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              fontSize: box.fontSize,
              fontWeight: box.fontWeight,
              fontFamily: box.fontFamily || "Inter, sans-serif",
              fontStyle: box.fontStyle || "normal",
              textDecoration: box.textDecoration || "none",
              textAlign: (box.textAlign || "left") as React.CSSProperties["textAlign"],
              color: box.content ? box.color : "#9CA3AF",
              padding: "8px 12px",
              boxSizing: "border-box",
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              userSelect: "none",
              wordBreak: "break-word",
            }}
          >
            {box.content || "Click to edit text..."}
          </div>
        )}
      </div>
      {tooltip && isSelected && (
        <div style={{ position: "absolute", left: box.x + box.width + 8, top: box.y + box.height / 2 - 12, background: "#1F2937", color: "#fff", fontSize: 11, padding: "3px 8px", borderRadius: 4, pointerEvents: "none", zIndex: 300, whiteSpace: "nowrap" }}>
          {tooltip.w} × {tooltip.h}px
        </div>
      )}
      {isSelected && !isEditing && (
        <Moveable
          target={elRef}
          draggable
          resizable
          keepRatio={false}
          throttleDrag={0}
          throttleResize={0}
          renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
          snappable={false}
          onDrag={({ target, left, top }) => {
            target.style.left = `${Math.round(left)}px`;
            target.style.top = `${Math.round(top)}px`;
          }}
          onDragEnd={({ lastEvent }) => {
            if (lastEvent) onUpdate(box.id, { x: Math.round(lastEvent.left), y: Math.round(lastEvent.top) });
          }}
          onResize={({ target, width, height, drag }) => {
            const w = Math.max(80, Math.round(width));
            const h = Math.max(30, Math.round(height));
            target.style.width = `${w}px`;
            target.style.height = `${h}px`;
            target.style.left = `${Math.round(drag.left)}px`;
            target.style.top = `${Math.round(drag.top)}px`;
            setTooltip({ w, h });
          }}
          onResizeEnd={({ lastEvent }) => {
            setTooltip(null);
            if (!lastEvent) return;
            onUpdate(box.id, {
              width: Math.max(80, Math.round(lastEvent.width)),
              height: Math.max(30, Math.round(lastEvent.height)),
              x: Math.round(lastEvent.drag.left),
              y: Math.round(lastEvent.drag.top),
            });
          }}
        />
      )}
    </>
  );
}

function DraggableTextLayer({
  boxes,
  selectedId,
  onSelect,
  onChange,
  isBlankPage,
  onAddElement,
  onReplaceImage,
}: {
  boxes: TextBoxItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (newBoxes: TextBoxItem[]) => void;
  isBlankPage?: boolean;
  onAddElement?: (overrides?: Partial<TextBoxItem>) => void;
  onReplaceImage?: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hexInput, setHexInput] = useState("");

  const selectedBox = boxes.find((b) => b.id === selectedId) ?? null;

  const updateBox = (id: string, patch: Partial<TextBoxItem>) => {
    onChange(boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const showEmpty = isBlankPage && boxes.length === 0;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>

      {/* Empty canvas state */}
      {showEmpty && (
        <div
          style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", pointerEvents: "all",
            background: "#fff",
          }}
          onClick={() => onSelect(null)}
        >
          <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2px dashed #D1D5DB", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 24, color: "#9CA3AF", lineHeight: 1 }}>+</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#374151", marginBottom: 6 }}>This page is empty</div>
          <div style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>
            Add elements from the panel on the right
          </div>
        </div>
      )}

      {/* Floating toolbar above selected box */}
      {selectedBox && !editingId && (
        <div
          style={{
            position: "absolute",
            left: Math.max(0, selectedBox.x),
            top: Math.max(0, selectedBox.y - 46),
            zIndex: 200,
            pointerEvents: "all",
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "#1F2937",
            borderRadius: 8,
            padding: "5px 8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            whiteSpace: "nowrap",
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image element toolbar */}
          {selectedBox.type === "image" && (
            <>
              <button
                onClick={() => onReplaceImage?.(selectedBox.id)}
                style={{ height: 26, padding: "0 10px", borderRadius: 4, border: "none", background: "#374151", color: "#fff", fontSize: 11, fontWeight: 500, cursor: "pointer" }}
              >Replace image</button>
              <div style={{ width: 1, height: 18, background: "#4B5563", margin: "0 3px" }} />
              <button
                onClick={() => { onChange(boxes.filter((b) => b.id !== selectedBox.id)); onSelect(null); }}
                style={{ width: 26, height: 26, borderRadius: 4, border: "none", background: "transparent", color: "#EF4444", fontSize: 14, cursor: "pointer", fontWeight: 700 }}
                title="Delete"
              >×</button>
            </>
          )}
          {/* Text element toolbar */}
          {selectedBox.type !== "image" && (<>
          <select
            value={selectedBox.fontFamily || "Inter, sans-serif"}
            onChange={(e) => updateBox(selectedBox.id, { fontFamily: e.target.value })}
            style={{ height: 26, padding: "0 4px", borderRadius: 4, border: "none", background: "#374151", color: "#fff", fontSize: 11, cursor: "pointer", maxWidth: 110 }}
          >
            {ELEMENT_FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
            ))}
          </select>
          <select
            value={selectedBox.fontSize}
            onChange={(e) => updateBox(selectedBox.id, { fontSize: Number(e.target.value) })}
            style={{ height: 26, width: 50, padding: "0 2px", borderRadius: 4, border: "none", background: "#374151", color: "#fff", fontSize: 11, cursor: "pointer" }}
          >
            {ELEMENT_FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div style={{ width: 1, height: 18, background: "#4B5563", margin: "0 3px" }} />
          <button
            onClick={() => updateBox(selectedBox.id, { fontWeight: selectedBox.fontWeight === "700" ? "400" : "700" })}
            style={{ width: 26, height: 26, borderRadius: 4, border: "none", background: selectedBox.fontWeight === "700" ? "#4B5563" : "transparent", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >B</button>
          <button
            onClick={() => updateBox(selectedBox.id, { fontStyle: selectedBox.fontStyle === "italic" ? "normal" : "italic" })}
            style={{ width: 26, height: 26, borderRadius: 4, border: "none", background: selectedBox.fontStyle === "italic" ? "#4B5563" : "transparent", color: "#fff", fontSize: 13, fontStyle: "italic", cursor: "pointer" }}
          >I</button>
          <button
            onClick={() => updateBox(selectedBox.id, { textDecoration: selectedBox.textDecoration === "underline" ? "none" : "underline" })}
            style={{ width: 26, height: 26, borderRadius: 4, border: "none", background: selectedBox.textDecoration === "underline" ? "#4B5563" : "transparent", color: "#fff", fontSize: 13, textDecoration: "underline", cursor: "pointer" }}
          >U</button>
          <div style={{ width: 1, height: 18, background: "#4B5563", margin: "0 3px" }} />
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setShowColorPicker((v) => !v); setHexInput(selectedBox.color); }}
              style={{ width: 26, height: 26, borderRadius: 4, border: "2px solid #4B5563", background: selectedBox.color, cursor: "pointer", padding: 0 }}
              title="Text color"
            />
            {showColorPicker && (
              <div
                style={{ position: "absolute", top: 32, left: 0, background: "#1F2937", borderRadius: 8, padding: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 300, width: 180 }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { updateBox(selectedBox.id, { color: c }); setShowColorPicker(false); }}
                      style={{ width: 22, height: 22, borderRadius: 4, border: c === "#FFFFFF" ? "1px solid #4B5563" : "none", background: c, cursor: "pointer", padding: 0 }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <input
                    value={hexInput}
                    onChange={(e) => setHexInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
                        updateBox(selectedBox.id, { color: val });
                        setShowColorPicker(false);
                      }
                    }}
                    placeholder="#000000"
                    style={{ flex: 1, height: 26, padding: "0 6px", borderRadius: 4, border: "1px solid #4B5563", background: "#374151", color: "#fff", fontSize: 11, outline: "none" }}
                  />
                  <button
                    onClick={() => { const val = hexInput.startsWith("#") ? hexInput : `#${hexInput}`; updateBox(selectedBox.id, { color: val }); setShowColorPicker(false); }}
                    style={{ height: 26, padding: "0 8px", borderRadius: 4, border: "none", background: "#2563EB", color: "#fff", fontSize: 11, cursor: "pointer" }}
                  >OK</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ width: 1, height: 18, background: "#4B5563", margin: "0 3px" }} />
          <select
            value={selectedBox.textAlign || "left"}
            onChange={(e) => updateBox(selectedBox.id, { textAlign: e.target.value })}
            style={{ height: 26, padding: "0 4px", borderRadius: 4, border: "none", background: "#374151", color: "#fff", fontSize: 11, cursor: "pointer" }}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="justify">Justify</option>
          </select>
          <div style={{ width: 1, height: 18, background: "#4B5563", margin: "0 3px" }} />
          <button
            onClick={() => { onChange(boxes.filter((b) => b.id !== selectedBox.id)); onSelect(null); }}
            style={{ width: 26, height: 26, borderRadius: 4, border: "none", background: "transparent", color: "#EF4444", fontSize: 14, cursor: "pointer", fontWeight: 700 }}
            title="Delete"
          >×</button>
          </>)}
        </div>
      )}

      {/* Canvas elements — each manages its own Moveable */}
      {boxes.map((box) => (
        <CanvasElement
          key={box.id}
          box={box}
          isSelected={box.id === selectedId}
          editingId={editingId}
          onSelect={onSelect}
          onEditStart={(id) => setEditingId(id)}
          onEditEnd={() => setEditingId(null)}
          onUpdate={updateBox}
          onDelete={(id) => { onChange(boxes.filter((b) => b.id !== id)); onSelect(null); }}
        />
      ))}
    </div>
  );
}

/* ─── UI helpers ──────────────────────────────────────────────────── */

function EmptyPreview({ theme }: { theme: Theme }) {
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", background: "#F0EFE9" }}>
      {/* Ghost wireframe storefront */}
      <svg width="260" height="172" viewBox="0 0 260 172" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Header bar */}
        <rect x="0" y="0" width="260" height="30" rx="4" fill="#E8E8E8" />
        <rect x="12" y="9" width="44" height="12" rx="3" fill="#D4D4D4" />
        <rect x="204" y="9" width="44" height="12" rx="3" fill="#D4D4D4" />
        {/* Hero block */}
        <rect x="0" y="38" width="260" height="60" rx="4" fill="#F0F0F0" />
        <rect x="70" y="54" width="120" height="10" rx="3" fill="#E0E0E0" />
        <rect x="90" y="70" width="80" height="8" rx="3" fill="#EAEAEA" />
        {/* Product cards */}
        <rect x="0" y="108" width="80" height="60" rx="4" fill="#F0F0F0" />
        <rect x="90" y="108" width="80" height="60" rx="4" fill="#F0F0F0" />
        <rect x="180" y="108" width="80" height="60" rx="4" fill="#F0F0F0" />
        {/* Card content lines */}
        <rect x="8" y="152" width="64" height="6" rx="2" fill="#E0E0E0" />
        <rect x="98" y="152" width="64" height="6" rx="2" fill="#E0E0E0" />
        <rect x="188" y="152" width="64" height="6" rx="2" fill="#E0E0E0" />
      </svg>
      <div style={{ marginTop: 28, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: theme.text }}>Your store will appear here</div>
        <p style={{ marginTop: 6, fontSize: 13, color: theme.mutedText, lineHeight: 1.55, maxWidth: 260 }}>
          Describe your business in the chat to get started
        </p>
      </div>
    </div>
  );
}

function LockedControlsPreview({ theme }: { theme: Theme }) {
  return (
    <div style={{ opacity: 1 }}>
      {/* Colors section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.mutedText }}>Colors</div>
          <div title="Generate your site to unlock" style={{ display: "flex", alignItems: "center", gap: 4, color: theme.mutedText, opacity: 0.6 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, pointerEvents: "none", opacity: 0.35 }}>
          {["#E5E7EB", "#E5E7EB", "#E5E7EB", "#E5E7EB"].map((c, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: "1px solid #D1D5DB" }} />
          ))}
        </div>
      </div>

      {/* Font section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.mutedText }}>Font</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: theme.mutedText, opacity: 0.6 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>
        <div style={{ height: 32, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB", pointerEvents: "none", opacity: 0.35 }} />
      </div>

      {/* Layout section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.mutedText }}>Layout</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: theme.mutedText, opacity: 0.6 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, pointerEvents: "none", opacity: 0.35 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 44, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB" }} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: theme.mutedText, lineHeight: 1.5 }}>
        Generate your site to unlock customization
      </div>
    </div>
  );
}

function Card({ theme, title, children }: { theme: Theme; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: theme.border, background: "#fff" }}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: theme.mutedText }}>{title}</div>
      {children}
    </div>
  );
}

function Tab({ label, active, theme, onClick }: { label: string; active: boolean; theme: Theme; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2.5 py-1.5 rounded-lg transition-all duration-150"
      style={{
        background: active ? theme.accent : "transparent",
        color: active ? "#fff" : theme.mutedText,
        fontWeight: active ? 500 : 400,
      }}
    >
      {label}
    </button>
  );
}

function ActionButton({ theme, children, onClick }: { theme: Theme; children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98]"
      style={{
        background: "#fff",
        border: `1px solid ${hovered ? theme.accent : "#E0E0E0"}`,
        color: hovered ? theme.accent : "#374151",
        borderRadius: 8,
      }}
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
        className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-all duration-150"
        style={{ borderColor: theme.border, background: "#fff", color: theme.text }}
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
        className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-all duration-150 resize-none"
        style={{ borderColor: theme.border, background: "#fff", color: theme.text }}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ColorField({ theme, label, value, onChange }: { theme: Theme; label: string; value: string; onChange: (v: string) => void }) {
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
            className="h-8 w-9 p-0.5 border rounded-lg cursor-pointer flex-shrink-0"
            style={{ borderColor: theme.border }}
          />
        ) : (
          <div className="h-8 w-9 rounded-lg border flex-shrink-0" style={{ background: value, borderColor: theme.border }} />
        )}
        <input
          className="flex-1 px-3 py-2 rounded-lg text-xs outline-none border transition-all duration-150 font-mono"
          style={{ borderColor: theme.border, background: "#fff", color: theme.text }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <div className="h-5 w-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(2,6,23,0.10)", borderTopColor: color }} />
  );
}

function TextEditPanelBody({
  panel,
  theme,
  onApply,
}: {
  panel: { field: string; label: string; value: string };
  theme: Theme;
  onApply: (val: string) => void;
}) {
  const [val, setVal] = useState(panel.value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <textarea
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 7,
          border: "1px solid #D0CFC9",
          fontSize: 13,
          lineHeight: 1.5,
          color: "#1A1A1A",
          background: "#FAFAF8",
          resize: "vertical",
          outline: "none",
          boxSizing: "border-box",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = theme.accent + "60"; e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.accent}15`; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#D0CFC9"; e.currentTarget.style.boxShadow = "none"; }}
      />
      <button
        onClick={() => onApply(val)}
        style={{
          height: 32,
          border: "none",
          borderRadius: 7,
          background: theme.accent,
          color: "#fff",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      >
        Apply
      </button>
    </div>
  );
}
