"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { computeStageIndex } from "@/app/components/StageTracker";
import FirstSaleWidget from "@/app/components/FirstSaleWidget";
import MentorChat from "@/app/components/MentorChat";
import FirstSaleCelebration from "@/app/components/FirstSaleCelebration";

const NUDGE_DELAY_MS = 4 * 60 * 60 * 1000;
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const STAGE_LABELS = ["Idea", "Setup", "Launch", "First Sale", "Growing"];
const STAGE_DESCS  = ["Define your business", "Build your store", "Go live", "Get paid", "Scale up"];

const STAGE_ICONS = [
  // Idea: circle with center dot
  <svg key="idea" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/></svg>,
  // Setup: square outline
  <svg key="setup" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>,
  // Launch: upward arrow
  <svg key="launch" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  // First Sale: dollar sign
  <svg key="sale" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  // Growing: trending line
  <svg key="grow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
];

const QUOTES = [
  { text: "The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Chase the vision, not the money. The money will end up following you.", author: "Tony Hsieh, Zappos" },
  { text: "It's not about ideas. It's about making ideas happen.", author: "Scott Belsky, Behance" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg, Facebook" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { text: "If you're not embarrassed by the first version of your product, you've launched too late.", author: "Reid Hoffman, LinkedIn" },
  { text: "The best time to start was yesterday. The next best time is now.", author: "Unknown" },
  { text: "An entrepreneur is someone who jumps off a cliff and builds a plane on the way down.", author: "Reid Hoffman, LinkedIn" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
];

const DASH_PROMPTS: Record<string, string[]> = {
  noProjects:  ["Help me find my business idea", "What sells well online?", "How do I start?"],
  hasProjects: ["How do I get my first sale?", "Review my store", "Help me with marketing"],
  hasSales:    ["How do I scale?", "What should I focus on?", "Help me with content"],
};

type DashMsg = { role: "user" | "assistant"; content: string };

type Project = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type Order = {
  id: string;
  total: number;
  customer_email: string;
  created_at: string;
  order_items?: { product_name: string }[];
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function ProjectCardHeader({ name }: { name: string }) {
  const hue = nameToHue(name);
  return (
    <div style={{ height: 120, background: `linear-gradient(135deg, hsl(${hue},38%,86%) 0%, hsl(${(hue + 30) % 360},32%,80%) 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 48, fontWeight: 700, color: `hsl(${hue},45%,32%)`, lineHeight: 1, userSelect: "none" }}>
        {name.trim()[0]?.toUpperCase() ?? "?"}
      </span>
    </div>
  );
}

function RotatingQuote() {
  const [current, setCurrent] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent(c => (c + 1) % QUOTES.length);
        setVisible(true);
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ marginBottom: 20, padding: "20px 24px", background: "#F0EFE9", borderRadius: 12, borderLeft: "3px solid #2563EB", position: "relative" }}>
      <div style={{ position: "absolute", top: 10, left: 20, fontSize: 48, color: "rgba(37,99,235,0.12)", fontFamily: "Georgia, serif", lineHeight: 1, userSelect: "none" }}>
        "
      </div>
      <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(4px)", transition: "all 400ms ease", paddingLeft: 8 }}>
        <p style={{ fontSize: 14, fontStyle: "italic", color: "#374151", lineHeight: 1.7, marginBottom: 8 }}>
          "{QUOTES[current].text}"
        </p>
        <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>
          — {QUOTES[current].author}
        </p>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
        {[0,1,2,3,4,5,6,7].map(i => (
          <div key={i} style={{ width: i === current % 8 ? 14 : 4, height: 3, borderRadius: 2, background: i === current % 8 ? "#2563EB" : "#D1D5DB", transition: "all 400ms ease" }} />
        ))}
      </div>
    </div>
  );
}

function JourneyProgress({ stageIndex }: { stageIndex: number }) {
  const next = STAGE_LABELS[stageIndex + 1];
  return (
    <div style={{ marginBottom: 20, padding: "20px 24px", background: "white", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>YOUR JOURNEY</p>
          <p style={{ fontSize: 13, color: "#6B7280" }}>
            {STAGE_DESCS[stageIndex]}{next ? ` — next: ${next}` : " — you made it!"}
          </p>
        </div>
        <span style={{ padding: "4px 12px", background: "#EFF6FF", color: "#2563EB", borderRadius: 999, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          Stage {stageIndex + 1} of {STAGE_LABELS.length}
        </span>
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 16, right: 16, height: 2, background: "#E5E7EB", zIndex: 0 }} />
        <div style={{ position: "absolute", left: 16, width: `calc(${(stageIndex / (STAGE_LABELS.length - 1)) * 100}% - 8px)`, height: 2, background: "#2563EB", zIndex: 1, transition: "width 600ms ease" }} />
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", position: "relative", zIndex: 2 }}>
          {STAGE_LABELS.map((label, i) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: i <= stageIndex ? "#2563EB" : "white", border: i <= stageIndex ? "2px solid #2563EB" : "2px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: i === stageIndex ? "0 0 0 4px rgba(37,99,235,0.15)" : "none", transition: "all 300ms ease", color: i <= stageIndex ? "white" : "#D1D5DB" }}>
                {i < stageIndex ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                ) : STAGE_ICONS[i]}
              </div>
              <span style={{ fontSize: 11, fontWeight: i === stageIndex ? 600 : 400, color: i === stageIndex ? "#2563EB" : i < stageIndex ? "#1A1A1A" : "#9CA3AF", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({
  initialProjects,
  userId,
  initialOrdersCount,
  initialRevenue,
  initialMonthRevenue,
  brandName,
  niche,
  firstName,
}: {
  initialProjects: Project[];
  userId: string;
  initialOrdersCount: number;
  initialRevenue: number;
  initialMonthRevenue: number;
  brandName: string;
  niche?: string;
  firstName: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());

  const [ordersCount, setOrdersCount] = useState(initialOrdersCount);
  const hadFirstSaleRef = useRef(initialOrdersCount > 0);
  const [firstSaleOrder, setFirstSaleOrder] = useState<Order | null>(null);
  const [mentorMessage, setMentorMessage] = useState<string | null>(null);
  const [hasPublished, setHasPublished] = useState(false);

  const [dashMessages, setDashMessages] = useState<DashMsg[]>([]);
  const [dashInput, setDashInput] = useState("");
  const [dashLoading, setDashLoading] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const dashBottomRef = useRef<HTMLDivElement>(null);

  const timeOfDay = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  }, []);

  useEffect(() => {
    try {
      const ids = new Set<string>();
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("launched_")) ids.add(key.replace("launched_", ""));
      }
      setPublishedIds(ids);

      const launchedKey = Object.keys(localStorage).find(k => k.startsWith("launched_"));
      if (!launchedKey) return;
      setHasPublished(true);

      const publishedAt = parseInt(localStorage.getItem(launchedKey) ?? "0", 10);
      if (!publishedAt) return;

      const lastNudgeAt = parseInt(localStorage.getItem(`nudge_at_${userId}`) ?? "0", 10);
      const now = Date.now();
      if (now - publishedAt >= NUDGE_DELAY_MS && now - lastNudgeAt >= NUDGE_COOLDOWN_MS && initialOrdersCount === 0) {
        const delay = setTimeout(() => {
          localStorage.setItem(`nudge_at_${userId}`, String(Date.now()));
          setMentorMessage(`It's been a few hours since you launched${brandName ? ` ${brandName}` : ""}. No sale yet — that's completely normal. Want to talk through what's working and what to try next?`);
        }, 2000);
        return () => clearTimeout(delay);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showFirstSaleWidget = hasPublished && ordersCount === 0 && projects.length > 0;

  const stageIndex = computeStageIndex(projects.length > 0, true, hasPublished, ordersCount);
  const currentStage = STAGE_LABELS[stageIndex];

  useEffect(() => {
    let openingMsg = "";
    try {
      const liveCount = initialProjects.filter(p => { try { return !!localStorage.getItem(`launched_${p.id}`); } catch { return false; } }).length;
      const lastVisitKey = `last_dash_visit_${userId}`;
      const lastVisit = parseInt(localStorage.getItem(lastVisitKey) ?? "0", 10);
      const daysSince = lastVisit ? Math.floor((Date.now() - lastVisit) / (1000 * 60 * 60 * 24)) : 0;
      localStorage.setItem(lastVisitKey, String(Date.now()));

      if (daysSince >= 2 && initialProjects.length > 0) {
        openingMsg = `Welcome back! What's your next move with ${initialProjects[0].name}?`;
      } else if (initialProjects.length === 0) {
        openingMsg = "Welcome! What kind of business are you thinking about building?";
      } else if (liveCount > 0 && initialOrdersCount === 0) {
        openingMsg = `You have ${liveCount} ${liveCount === 1 ? "store" : "stores"} live. Let's talk about getting your first sale.`;
      } else if (initialOrdersCount > 0) {
        openingMsg = `You have ${initialOrdersCount} ${initialOrdersCount === 1 ? "sale" : "sales"}. Let's keep the momentum going.`;
      } else {
        openingMsg = "What are you working on today? I'm here to help.";
      }
    } catch {
      openingMsg = "What are you working on today? I'm here to help.";
    }

    const supabase = createClient();
    (async () => {
      try {
        const { data } = await supabase
          .from("mentor_messages")
          .select("role, content")
          .eq("user_id", userId)
          .is("project_id", null)
          .order("created_at", { ascending: true })
          .limit(50);
        setDashMessages(data && data.length > 0 ? (data as DashMsg[]) : [{ role: "assistant", content: openingMsg }]);
      } catch {
        setDashMessages([{ role: "assistant", content: openingMsg }]);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dashBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dashMessages, dashLoading]);

  const dashPromptSet = useMemo(() => {
    if (initialOrdersCount > 0) return DASH_PROMPTS.hasSales;
    if (initialProjects.length > 0) return DASH_PROMPTS.hasProjects;
    return DASH_PROMPTS.noProjects;
  }, [initialProjects.length, initialOrdersCount]);

  const sendDashMentor = async (overrideText?: string) => {
    const text = (overrideText ?? dashInput).trim();
    if (!text || dashLoading) return;

    const userMsg: DashMsg = { role: "user", content: text };
    const updated = [...dashMessages, userMsg];
    setDashMessages(updated);
    setDashInput("");
    setDashLoading(true);

    const supabase = createClient();
    supabase.from("mentor_messages").insert({ user_id: userId, project_id: null, role: "user", content: text }).then(() => {});

    try {
      const res = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, mentorContext: { brandName: brandName || undefined, stage: currentStage, niche: niche || undefined } }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data?.result || "Something went wrong. Try again.";
      setDashMessages(prev => [...prev, { role: "assistant", content: reply }]);
      supabase.from("mentor_messages").insert({ user_id: userId, project_id: null, role: "assistant", content: reply }).then(() => {});
    } catch {
      setDashMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `user_id=eq.${userId}` }, async (payload) => {
        const newOrder = payload.new as Order;
        const { data: items } = await supabase.from("order_items").select("product_name").eq("order_id", newOrder.id);
        const enriched: Order = { ...newOrder, order_items: items ?? [] };
        if (!hadFirstSaleRef.current) { hadFirstSaleRef.current = true; setFirstSaleOrder(enriched); }
        setOrdersCount(c => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (data?.id) router.push(`/builder?project=${data.id}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) { alert("Failed to delete project. Please try again."); return; }
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleFirstSaleMentor = () => {
    setFirstSaleOrder(null);
    setMentorMessage(`You just made your first sale — that's a real milestone. Let's talk about how to turn this into your next 10 sales for ${brandName || "your store"}. What channel did that first customer come from?`);
  };

  const liveCount = projects.filter(p => publishedIds.has(p.id)).length;
  const totalSalesDollars = (initialRevenue / 100).toFixed(2);
  const monthSalesDollars = (initialMonthRevenue / 100).toFixed(2);
  const monthName = new Date().toLocaleString("default", { month: "long" });

  const STATS = [
    { label: "BUSINESSES", value: String(projects.length), sub: projects.length === 1 ? "project" : "projects" },
    { label: "LIVE STORES", value: String(liveCount), sub: "published" },
    { label: "TOTAL SALES", value: `$${totalSalesDollars}`, sub: "all time" },
    { label: "THIS MONTH", value: `$${monthSalesDollars}`, sub: monthName },
  ];

  return (
    <>
      <style>{`
        div:hover .delete-btn { opacity: 1 !important; }
        .dash-mentor-panel { display: flex !important; }
        .dash-mentor-fab   { display: none !important; }
        @media (max-width: 900px) {
          .dash-mentor-panel { display: none !important; }
          .dash-mentor-fab   { display: flex !important; }
          .dash-main-content { margin-left: 0 !important; }
        }
        @keyframes dashFadeIn    { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dashDotPulse  { 0%, 80%, 100% { transform: scale(0); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* ── Fixed Left Mentor Panel ── */}
      <div
        className="dash-mentor-panel"
        style={{ position: "fixed", top: 60, left: 0, bottom: 0, width: 320, borderRight: "1px solid rgba(0,0,0,0.08)", background: "#F7F6F3", flexDirection: "column", overflow: "hidden", zIndex: 20 }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #E8E8E4", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", lineHeight: 1.2 }}>Your Mentor</div>
              <div style={{ fontSize: 12, color: "#AAA", lineHeight: 1.3, marginTop: 1 }}>Ready to help you build</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
          {dashMessages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "dashFadeIn 0.15s ease-out both" }}>
              <div style={{ maxWidth: "88%", padding: "9px 12px", borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px", fontSize: 13, lineHeight: 1.55, color: "#334155", background: m.role === "user" ? "#ffffff" : "#F0EFE9", border: m.role === "user" ? "1px solid #E8E8E4" : "none", whiteSpace: "pre-line" }}>
                {m.content}
              </div>
            </div>
          ))}

          {/* Suggested prompts */}
          {dashMessages.filter(m => m.role === "user").length === 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {dashPromptSet.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendDashMentor(prompt)}
                  style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid #D0CFC9", background: "#ffffff", color: "#555", fontSize: 12, cursor: "pointer", lineHeight: 1.4, transition: "all 0.15s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.color = "#2563EB"; e.currentTarget.style.background = "#EFF6FF"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#D0CFC9"; e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "#ffffff"; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {dashLoading && (
            <div style={{ display: "flex", gap: 4, padding: "4px 4px" }}>
              {[0, 1, 2].map(d => <span key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#CBD5E1", display: "inline-block", animation: `dashDotPulse 1.4s ease-in-out ${d * 0.16}s infinite` }} />)}
            </div>
          )}
          <div ref={dashBottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid #E8E8E4", display: "flex", gap: 8, flexShrink: 0, background: "#F7F6F3" }}>
          <input
            value={dashInput}
            onChange={e => setDashInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDashMentor(); } }}
            placeholder="Ask your mentor anything..."
            style={{ flex: 1, height: 44, padding: "0 12px", borderRadius: 10, border: "1px solid #E8E8E4", fontSize: 13, outline: "none", background: "#ffffff", color: "#0f172a", transition: "border-color 0.15s", boxSizing: "border-box" }}
            onFocus={e => (e.target.style.borderColor = "#2563EB")}
            onBlur={e => (e.target.style.borderColor = "#E8E8E4")}
          />
          <button
            onClick={() => sendDashMentor()}
            disabled={dashLoading || !dashInput.trim()}
            style={{ height: 44, padding: "0 16px", borderRadius: 10, border: "none", background: dashLoading || !dashInput.trim() ? "#E2E8F0" : "#2563EB", color: dashLoading || !dashInput.trim() ? "#94A3B8" : "#fff", fontSize: 13, fontWeight: 600, cursor: dashLoading || !dashInput.trim() ? "default" : "pointer", flexShrink: 0, transition: "all 0.15s" }}
          >
            Send
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div
        className="dash-main-content"
        style={{ marginLeft: 320 }}
      >
        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1A1A1A", marginBottom: 4, letterSpacing: "-0.02em" }}>
            Good {timeOfDay}, {firstName}
          </h1>
          <p style={{ fontSize: 15, color: "#6B7280" }}>
            Here's where your business stands today.
          </p>
        </div>

        {/* Rotating Quote */}
        <RotatingQuote />

        {/* Journey Progress */}
        <JourneyProgress stageIndex={stageIndex} />

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {STATS.map(stat => (
            <div key={stat.label} style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{stat.label}</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", lineHeight: 1, marginBottom: 4 }}>{stat.value}</p>
              <p style={{ fontSize: 12, color: "#9CA3AF" }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Your Businesses */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", marginBottom: 2 }}>Your Businesses</h2>
              <p style={{ fontSize: 13, color: "#9CA3AF" }}>
                {projects.length} {projects.length === 1 ? "business" : "businesses"}{liveCount > 0 ? ` · ${liveCount} live` : ""}
              </p>
            </div>

            {creating ? (
              <form onSubmit={createProject} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Business name"
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #D0CFC9", fontSize: 14, outline: "none", width: 176, background: "#fff", color: "#1A1A1A" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#2563EB"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#D0CFC9"; }}
                />
                <button type="submit" disabled={loading || !newName.trim()} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#2563EB", color: "#fff", border: "none", cursor: loading || !newName.trim() ? "not-allowed" : "pointer", opacity: loading || !newName.trim() ? 0.6 : 1 }}>
                  {loading ? "Creating…" : "Create"}
                </button>
                <button type="button" onClick={() => { setCreating(false); setNewName(""); }} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 13, background: "transparent", border: "1px solid #D0CFC9", color: "#555", cursor: "pointer" }}>
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                style={{ padding: "8px 16px", background: "#2563EB", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                + New Business
              </button>
            )}
          </div>

          {projects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 56, width: 56, borderRadius: 16, background: "#EEEDE9", marginBottom: 20 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <p style={{ fontSize: 16, fontWeight: 500, color: "#333", margin: "0 0 6px" }}>No businesses yet</p>
              <p style={{ fontSize: 14, color: "#999", margin: "0 0 24px", maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>Start building your first store with Volcity.</p>
              <button onClick={() => setCreating(true)} style={{ padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, background: "#2563EB", color: "#fff", border: "none", cursor: "pointer" }}>
                Create your first business
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {projects.map(project => {
                const isLive = publishedIds.has(project.id);
                return (
                  <div
                    key={project.id}
                    style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E8E8E4", overflow: "hidden", minHeight: 240, display: "flex", flexDirection: "column", transition: "box-shadow 0.18s, border-color 0.18s", position: "relative" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#D0CFC9"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "#E8E8E4"; }}
                  >
                    <ProjectCardHeader name={project.name} />
                    <button
                      onClick={() => deleteProject(project.id)}
                      title="Delete project"
                      className="delete-btn"
                      style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 6, background: "rgba(255,255,255,0.85)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s", color: "#999" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#999"; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                    <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? "#22c55e" : "#CBD5E1" }} />
                            <span style={{ fontSize: 12, color: isLive ? "#16a34a" : "#94a3b8", fontWeight: 500 }}>{isLive ? "Live" : "Draft"}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: "#AAA" }}>Saved {timeAgo(project.updated_at)}</div>
                      </div>
                      <button
                        onClick={() => router.push(`/builder?project=${project.id}`)}
                        style={{ marginTop: "auto", width: "100%", padding: "9px 0", borderRadius: 8, fontSize: 14, fontWeight: 500, background: "#2563EB", color: "#fff", border: "none", cursor: "pointer", transition: "opacity 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })}

              {!creating && (
                <button
                  onClick={() => setCreating(true)}
                  style={{ minHeight: 240, borderRadius: 12, border: "2px dashed #D0CFC9", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.background = "#EFF6FF"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#D0CFC9"; e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EEEDE9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 14, color: "#999" }}>New business</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* First Sale Widget */}
        {showFirstSaleWidget && (
          <div style={{ marginBottom: 40 }}>
            <FirstSaleWidget
              brandName={brandName}
              totalRevenue={initialRevenue}
              userId={userId}
              onStepClick={msg => setMentorMessage(msg)}
            />
          </div>
        )}
      </div>

      {/* ── Mobile: floating mentor button ── */}
      <button
        className="dash-mentor-fab"
        onClick={() => setShowMobileChat(true)}
        style={{ position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: "#2563EB", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(37,99,235,0.35)", alignItems: "center", justifyContent: "center", zIndex: 50 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </button>

      {/* ── Mobile: mentor chat modal ── */}
      {showMobileChat && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "0 16px 80px" }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.35)", backdropFilter: "blur(4px)" }} onClick={() => setShowMobileChat(false)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 380, background: "#F7F6F3", borderRadius: 20, boxShadow: "0 24px 48px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "75vh" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #E8E8E4", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Your Mentor</div>
              <button onClick={() => setShowMobileChat(false)} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #E8E8E4", background: "#fff", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {dashMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "88%", padding: "9px 12px", borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px", fontSize: 13, lineHeight: 1.55, color: "#334155", background: m.role === "user" ? "#EFF6FF" : "#ffffff", border: "1px solid #E8E8E4", whiteSpace: "pre-line" }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {dashLoading && <div style={{ display: "flex", gap: 4 }}>{[0,1,2].map(d => <span key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#CBD5E1", display: "inline-block", animation: `dashDotPulse 1.4s ease-in-out ${d * 0.16}s infinite` }} />)}</div>}
            </div>
            <div style={{ padding: "10px 12px", borderTop: "1px solid #E8E8E4", display: "flex", gap: 8, flexShrink: 0 }}>
              <input value={dashInput} onChange={e => setDashInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDashMentor(); } }} placeholder="Ask your mentor anything..." style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid #E8E8E4", fontSize: 13, outline: "none", background: "#ffffff", color: "#0f172a" }} />
              <button onClick={() => sendDashMentor()} disabled={dashLoading || !dashInput.trim()} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: dashLoading || !dashInput.trim() ? "#E2E8F0" : "#2563EB", color: dashLoading || !dashInput.trim() ? "#94A3B8" : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Celebrations / modals */}
      {firstSaleOrder && (
        <FirstSaleCelebration order={firstSaleOrder} brandName={brandName} onTalkToMentor={handleFirstSaleMentor} onClose={() => setFirstSaleOrder(null)} />
      )}
      {mentorMessage && (
        <MentorChat openingMessage={mentorMessage} brandName={brandName} stage={currentStage} niche={niche} onClose={() => setMentorMessage(null)} />
      )}
    </>
  );
}
