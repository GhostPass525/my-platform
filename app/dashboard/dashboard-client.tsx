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
  <svg key="idea" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/></svg>,
  <svg key="setup" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>,
  <svg key="launch" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  <svg key="sale" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  <svg key="grow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
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
  updated_at?: string | null;
  status?: string | null;
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
    <div style={{
      height: 120,
      background: `linear-gradient(135deg, hsl(${hue},35%,88%) 0%, hsl(${(hue + 30) % 360},28%,82%) 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontSize: 56, fontWeight: 700, color: `hsl(${hue},40%,30%)`, lineHeight: 1, userSelect: "none" }}>
        {name.trim()[0]?.toUpperCase() ?? "?"}
      </span>
    </div>
  );
}

type TodayCardData = { suggestion: string; actionLabel: string; actionHref?: string; actionType: "mentor" | "href" };

function TodayCard({ onOpenMentor }: { onOpenMentor: () => void }) {
  const [card, setCard] = useState<TodayCardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/today")
      .then(r => r.json())
      .then(d => { if (d?.suggestion) setCard(d); })
      .catch(() => {});
  }, []);

  if (!card) return null;

  return (
    <div style={{
      marginBottom: 16,
      padding: "18px 22px",
      background: "#ffffff",
      borderRadius: 12,
      border: "1px solid #e7e5e4",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
      animation: "dashFadeIn 0.3s ease-out both",
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>Today</p>
        <p style={{ fontSize: 14, color: "#0c0a09", lineHeight: 1.6, margin: 0 }}>{card.suggestion}</p>
      </div>
      {card.actionType === "href" && card.actionHref ? (
        <a
          href={card.actionHref}
          style={{
            flexShrink: 0, padding: "8px 16px", borderRadius: 8,
            background: "#0f172a", color: "#ffffff", fontSize: 13, fontWeight: 600,
            textDecoration: "none", whiteSpace: "nowrap", alignSelf: "center",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          {card.actionLabel}
        </a>
      ) : (
        <button
          onClick={onOpenMentor}
          style={{
            flexShrink: 0, padding: "8px 16px", borderRadius: 8,
            background: "#0f172a", color: "#ffffff", fontSize: 13, fontWeight: 600,
            border: "none", cursor: "pointer", whiteSpace: "nowrap", alignSelf: "center",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          {card.actionLabel}
        </button>
      )}
    </div>
  );
}

function JourneyProgress({ stageIndex }: { stageIndex: number }) {
  const next = STAGE_LABELS[stageIndex + 1];
  return (
    <div style={{
      marginBottom: 16,
      padding: "20px 24px",
      background: "white",
      borderRadius: 12,
      border: "1px solid #e7e5e4",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>YOUR JOURNEY</p>
          <p style={{ fontSize: 13, color: "#78716c" }}>
            {STAGE_DESCS[stageIndex]}{next ? ` — next: ${next}` : " — you made it!"}
          </p>
        </div>
        <span style={{
          padding: "4px 12px",
          background: "#f5f5f4",
          color: "#57534e",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          flexShrink: 0,
          border: "1px solid #e7e5e4",
        }}>
          Stage {stageIndex + 1} of {STAGE_LABELS.length}
        </span>
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {/* Track */}
        <div style={{ position: "absolute", left: 16, right: 16, height: 2, background: "#e7e5e4", zIndex: 0 }} />
        {/* Fill */}
        <div style={{
          position: "absolute", left: 16,
          width: `calc(${(stageIndex / (STAGE_LABELS.length - 1)) * 100}% - 8px)`,
          height: 2, background: "#0f172a", zIndex: 1, transition: "width 600ms cubic-bezier(0.32,0.72,0,1)",
        }} />
        {/* Nodes */}
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", position: "relative", zIndex: 2 }}>
          {STAGE_LABELS.map((label, i) => {
            const completed = i < stageIndex;
            const active = i === stageIndex;
            return (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: completed || active ? "#0f172a" : "white",
                  border: completed || active ? "2px solid #0f172a" : "2px solid #e7e5e4",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: active ? "stagePulse 2s ease-in-out infinite" : "none",
                  transition: "all 300ms cubic-bezier(0.32,0.72,0,1)",
                  color: completed || active ? "white" : "#d6d3d1",
                }}>
                  {completed ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : STAGE_ICONS[i]}
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#0c0a09" : completed ? "#57534e" : "#a8a29e",
                  whiteSpace: "nowrap",
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SetupBanner() {
  const [status, setStatus] = useState<{ stripe: { connected: boolean; onboarded: boolean } } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((d) => { if (d?.stripe) setStatus(d); })
      .catch(() => {});
  }, []);

  if (!status || dismissed || status.stripe.onboarded) return null;

  return (
    <div style={{
      marginBottom: 16,
      padding: "14px 18px",
      background: "#fffbeb",
      border: "1px solid #fde68a",
      borderRadius: 12,
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 3 }}>Finish setting up to go live</div>
        <p style={{ fontSize: 13, color: "#b45309", margin: "0 0 10px", lineHeight: 1.55 }}>
          {!status.stripe.connected
            ? "Connect Stripe to start accepting payments on your store."
            : "Your Stripe account needs a few more details before it can accept payments."}
        </p>
        <a href="/dashboard/connect" style={{ fontSize: 13, fontWeight: 600, color: "#92400e", textDecoration: "underline" }}>
          {!status.stripe.connected ? "Connect Stripe →" : "Finish Stripe setup →"}
        </a>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#b45309", padding: "2px 4px", flexShrink: 0, lineHeight: 1, fontSize: 16 }}
        aria-label="Dismiss"
      >
        ×
      </button>
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
}: {
  initialProjects: Project[];
  userId: string;
  initialOrdersCount: number;
  initialRevenue: number;
  initialMonthRevenue: number;
  brandName: string;
  niche?: string;
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

  const [timeOfDay, setTimeOfDay] = useState<string | null>(null);
  const [todayLabel, setTodayLabel] = useState<string | null>(null);
  const [monthName, setMonthName] = useState<string | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setTimeOfDay(h < 12 ? "morning" : h < 17 ? "afternoon" : "evening");
    setTodayLabel(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    setMonthName(new Date().toLocaleString("default", { month: "long" }));
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
      const liveCount = initialProjects.filter(p => { try { return p.status === 'live' || !!localStorage.getItem(`launched_${p.id}`); } catch { return false; } }).length;
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

        if (data && data.length > 0) {
          setDashMessages(data as DashMsg[]);
        } else {
          // Fetch context-aware greeting from the server (knows their actual business state)
          try {
            const greetRes = await fetch("/api/mentor/greeting");
            const greetData = await greetRes.json().catch(() => ({}));
            setDashMessages([{ role: "assistant", content: greetData.greeting || openingMsg }]);
          } catch {
            setDashMessages([{ role: "assistant", content: openingMsg }]);
          }
        }
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

  const liveCount = projects.filter(p => p.status === 'live' || publishedIds.has(p.id)).length;
  const totalSalesDollars = (initialRevenue / 100).toFixed(2);
  const monthSalesDollars = (initialMonthRevenue / 100).toFixed(2);

  const STATS = [
    { label: "BUSINESSES", value: String(projects.length), sub: projects.length === 1 ? "project" : "projects" },
    { label: "LIVE STORES", value: String(liveCount), sub: "published" },
    { label: "TOTAL SALES", value: `$${totalSalesDollars}`, sub: "all time" },
    { label: "THIS MONTH", value: `$${monthSalesDollars}`, sub: monthName ?? "this month" },
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
        @keyframes dashFadeIn   { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dashDotPulse { 0%, 80%, 100% { transform: scale(0); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
        @keyframes stagePulse   { 0%, 100% { box-shadow: 0 0 0 0 rgba(15,23,42,0.25); } 50% { box-shadow: 0 0 0 6px rgba(15,23,42,0); } }
      `}</style>

      {/* ── Fixed Left Mentor Panel ── */}
      <div
        className="dash-mentor-panel"
        style={{
          position: "fixed", top: 56, left: 0, bottom: 0, width: 340,
          borderRight: "1px solid #e7e5e4",
          background: "#fafaf9",
          flexDirection: "column", overflow: "hidden", zIndex: 20,
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #e7e5e4", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #4f46e5, #0f172a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0c0a09", lineHeight: 1.2 }}>Your Mentor</div>
              <div style={{ fontSize: 12, color: "#a8a29e", lineHeight: 1.3, marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#15803d", display: "inline-block", flexShrink: 0 }} />
                Ready to help
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
          {dashMessages.map((m, i) => {
            const prevRole = i > 0 ? dashMessages[i - 1].role : null;
            const speakerChange = prevRole !== null && prevRole !== m.role;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  marginTop: speakerChange ? 20 : 8,
                  animation: "dashFadeIn 0.2s ease-out both",
                }}
              >
                {m.role === "user" ? (
                  <div style={{
                    maxWidth: "85%", padding: "9px 14px",
                    borderRadius: "18px 18px 4px 18px",
                    fontSize: 13, lineHeight: 1.55, color: "#ffffff",
                    background: "#0f172a",
                    whiteSpace: "pre-line",
                  }}>
                    {m.content}
                  </div>
                ) : (
                  <div style={{
                    maxWidth: "92%",
                    borderLeft: "2px solid #e7e5e4",
                    paddingLeft: 14,
                    fontSize: 13, lineHeight: 1.65, color: "#57534e",
                    whiteSpace: "pre-line",
                  }}>
                    {m.content}
                  </div>
                )}
              </div>
            );
          })}

          {/* Suggested prompts */}
          {dashMessages.filter(m => m.role === "user").length === 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
              {dashPromptSet.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendDashMentor(prompt)}
                  style={{
                    padding: "6px 12px", borderRadius: 999,
                    border: "1px solid #e7e5e4",
                    background: "#ffffff", color: "#57534e",
                    fontSize: 12, cursor: "pointer", lineHeight: 1.4,
                    transition: "all 0.15s", whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#fafaf9"; e.currentTarget.style.borderColor = "#d6d3d1"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#e7e5e4"; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {dashLoading && (
            <div style={{ display: "flex", gap: 4, padding: "12px 4px", borderLeft: "2px solid #e7e5e4", marginTop: 8, paddingLeft: 14 }}>
              {[0, 1, 2].map(d => (
                <span key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a8a29e", display: "inline-block", animation: `dashDotPulse 1.4s ease-in-out ${d * 0.16}s infinite` }} />
              ))}
            </div>
          )}
          <div ref={dashBottomRef} style={{ height: 8 }} />
        </div>

        {/* Input */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid #e7e5e4", display: "flex", gap: 8, flexShrink: 0, background: "#fafaf9" }}>
          <input
            value={dashInput}
            onChange={e => setDashInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDashMentor(); } }}
            placeholder="Ask your mentor anything..."
            style={{
              flex: 1, height: 40, padding: "0 12px", borderRadius: 8,
              border: "1px solid #e7e5e4", fontSize: 13, outline: "none",
              background: "#ffffff", color: "#0c0a09",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = "#0f172a")}
            onBlur={e => (e.target.style.borderColor = "#e7e5e4")}
          />
          {/* Paper plane send button */}
          <button
            onClick={() => sendDashMentor()}
            disabled={dashLoading || !dashInput.trim()}
            aria-label="Send message"
            style={{
              height: 40, width: 40, borderRadius: 8, border: "none",
              background: dashLoading || !dashInput.trim() ? "#f5f5f4" : "#0f172a",
              color: dashLoading || !dashInput.trim() ? "#a8a29e" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: dashLoading || !dashInput.trim() ? "default" : "pointer",
              flexShrink: 0, transition: "all 0.15s",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div
        className="dash-main-content"
        style={{ marginLeft: 340 }}
      >
        {/* Greeting */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 600, color: "#0c0a09", marginBottom: 4, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Good {timeOfDay ?? "day"}
            </h1>
            <p style={{ fontSize: 14, color: "#78716c", lineHeight: 1.5 }}>
              Here&apos;s where your business stands today.
            </p>
          </div>
          <span style={{ fontSize: 13, color: "#a8a29e", fontWeight: 500, paddingTop: 6, flexShrink: 0, marginLeft: 16 }}>
            {todayLabel}
          </span>
        </div>

        {/* Today Card */}
        <TodayCard onOpenMentor={() => setShowMobileChat(true)} />

        {/* Journey Progress */}
        <JourneyProgress stageIndex={stageIndex} />

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {STATS.map(stat => (
            <div key={stat.label} style={{
              padding: "20px 24px",
              background: "white",
              borderRadius: 12,
              border: "1px solid #e7e5e4",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#d6d3d1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e7e5e4"; }}
            >
              <p style={{ fontSize: 11, fontWeight: 600, color: "#a8a29e", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>{stat.label}</p>
              <p style={{ fontSize: 32, fontWeight: 600, color: "#0c0a09", lineHeight: 1, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{stat.value}</p>
              <p style={{ fontSize: 12, color: "#a8a29e" }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Setup Banner */}
        <SetupBanner />

        {/* Your Businesses */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#0c0a09", marginBottom: 3, letterSpacing: "-0.01em" }}>Your Businesses</h2>
            <p style={{ fontSize: 13, color: "#a8a29e" }}>
              {projects.length} {projects.length === 1 ? "business" : "businesses"}{liveCount > 0 ? ` · ${liveCount} live` : ""}
            </p>
          </div>

          {/* Inline create form */}
          {creating && (
            <form onSubmit={createProject} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Business name"
                style={{
                  padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #e7e5e4", fontSize: 14, outline: "none",
                  width: 200, background: "#fff", color: "#0c0a09",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "#0f172a"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#e7e5e4"; }}
              />
              <button
                type="submit"
                disabled={loading || !newName.trim()}
                style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: "#0f172a", color: "#fff", border: "none",
                  cursor: loading || !newName.trim() ? "not-allowed" : "pointer",
                  opacity: loading || !newName.trim() ? 0.4 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {loading ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName(""); }}
                style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 13,
                  background: "transparent", border: "1px solid #e7e5e4", color: "#57534e", cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#d6d3d1"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e7e5e4"; }}
              >
                Cancel
              </button>
            </form>
          )}

          {projects.length === 0 && !creating ? (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, width: 52, borderRadius: 14, background: "#f5f5f4", marginBottom: 16, border: "1px solid #e7e5e4" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#0c0a09", margin: "0 0 6px" }}>No businesses yet</p>
              <p style={{ fontSize: 13, color: "#a8a29e", margin: "0 0 24px", maxWidth: 260, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>Start building your first store with Volcity.</p>
              <button
                onClick={() => setCreating(true)}
                style={{
                  padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                  background: "#0f172a", color: "#fff", border: "none", cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1e293b"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#0f172a"; }}
              >
                Create your first business
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {projects.map(project => {
                const isLive = project.status === 'live' || publishedIds.has(project.id);
                return (
                  <div
                    key={project.id}
                    style={{
                      background: "#ffffff", borderRadius: 12,
                      border: "1px solid #e7e5e4",
                      overflow: "hidden", minHeight: 240,
                      display: "flex", flexDirection: "column",
                      transition: "border-color 0.2s",
                      position: "relative",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#d6d3d1"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e7e5e4"; }}
                  >
                    <ProjectCardHeader name={project.name} />
                    <button
                      onClick={() => deleteProject(project.id)}
                      title="Delete project"
                      className="delete-btn"
                      style={{
                        position: "absolute", top: 10, right: 10,
                        width: 26, height: 26, borderRadius: 6,
                        background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.08)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0, transition: "opacity 0.15s, color 0.15s", color: "#a8a29e",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#dc2626"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#a8a29e"; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                    <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#0c0a09", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>{project.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? "#15803d" : "#d6d3d1" }} />
                            <span style={{ fontSize: 12, color: isLive ? "#15803d" : "#a8a29e", fontWeight: 500 }}>{isLive ? "Live" : "Draft"}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#a8a29e" }}>Created {timeAgo(project.updated_at ?? project.created_at)}</div>
                      </div>
                      <button
                        onClick={() => router.push(`/builder?project=${project.id}`)}
                        style={{
                          marginTop: "auto", width: "100%", padding: "9px 0",
                          borderRadius: 8, fontSize: 14, fontWeight: 500,
                          background: "#0f172a", color: "#fff", border: "none", cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#1e293b"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#0f172a"; }}
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Ghost "+" card — new business */}
              {!creating && (
                <div
                  onClick={() => setCreating(true)}
                  style={{
                    borderRadius: 12,
                    border: "2px dashed #d6d3d1",
                    minHeight: 240,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    gap: 10, cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s",
                    background: "transparent",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#a8a29e"; (e.currentTarget as HTMLDivElement).style.background = "#fafaf9"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#d6d3d1"; (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid #d6d3d1", display: "flex", alignItems: "center", justifyContent: "center", color: "#a8a29e" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 13, color: "#a8a29e", fontWeight: 500 }}>New business</span>
                </div>
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
        aria-label="Open mentor chat"
        style={{
          position: "fixed", bottom: 24, right: 24, width: 50, height: 50,
          borderRadius: "50%", background: "#0f172a", border: "none",
          color: "#fff", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(15,23,42,0.3)",
          alignItems: "center", justifyContent: "center", zIndex: 50,
        }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </button>

      {/* ── Mobile: mentor chat modal ── */}
      {showMobileChat && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "0 16px 80px" }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(12,10,9,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setShowMobileChat(false)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 380, background: "#fafaf9", borderRadius: 20, boxShadow: "0 24px 48px rgba(12,10,9,0.18)", display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "75vh" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #e7e5e4", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #4f46e5, #0f172a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0c0a09" }}>Your Mentor</div>
              <button
                onClick={() => setShowMobileChat(false)}
                style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e7e5e4", background: "#fff", color: "#a8a29e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}
              >×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 0 }}>
              {dashMessages.map((m, i) => {
                const prevRole = i > 0 ? dashMessages[i - 1].role : null;
                const speakerChange = prevRole !== null && prevRole !== m.role;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginTop: speakerChange ? 16 : 8 }}>
                    {m.role === "user" ? (
                      <div style={{ maxWidth: "85%", padding: "9px 14px", borderRadius: "18px 18px 4px 18px", fontSize: 13, lineHeight: 1.55, color: "#fff", background: "#0f172a", whiteSpace: "pre-line" }}>
                        {m.content}
                      </div>
                    ) : (
                      <div style={{ maxWidth: "92%", borderLeft: "2px solid #e7e5e4", paddingLeft: 12, fontSize: 13, lineHeight: 1.65, color: "#57534e", whiteSpace: "pre-line" }}>
                        {m.content}
                      </div>
                    )}
                  </div>
                );
              })}
              {dashLoading && (
                <div style={{ display: "flex", gap: 4, marginTop: 8, borderLeft: "2px solid #e7e5e4", paddingLeft: 12 }}>
                  {[0,1,2].map(d => <span key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a8a29e", display: "inline-block", animation: `dashDotPulse 1.4s ease-in-out ${d * 0.16}s infinite` }} />)}
                </div>
              )}
            </div>
            <div style={{ padding: "10px 12px", borderTop: "1px solid #e7e5e4", display: "flex", gap: 8, flexShrink: 0 }}>
              <input
                value={dashInput}
                onChange={e => setDashInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDashMentor(); } }}
                placeholder="Ask your mentor anything..."
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 13, outline: "none", background: "#ffffff", color: "#0c0a09" }}
              />
              <button
                onClick={() => sendDashMentor()}
                disabled={dashLoading || !dashInput.trim()}
                style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: dashLoading || !dashInput.trim() ? "#f5f5f4" : "#0f172a", color: dashLoading || !dashInput.trim() ? "#a8a29e" : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
              >
                Send
              </button>
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
