"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { computeStageIndex } from "@/app/components/StageTracker";
import FirstSaleWidget from "@/app/components/FirstSaleWidget";
import MentorChat from "@/app/components/MentorChat";
import FirstSaleCelebration from "@/app/components/FirstSaleCelebration";

const STAGE_LABELS = ["Idea", "Setup", "Launch", "First Sale", "Growing"];
const NUDGE_DELAY_MS = 4 * 60 * 60 * 1000;
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type DashMsg = { role: "user" | "assistant"; content: string };

const DASH_PROMPTS: Record<string, string[]> = {
  noProjects:  ["Help me find my business idea", "What sells well online?", "How do I start?"],
  hasProjects: ["How do I get my first sale?", "Review my store", "Help me with marketing"],
  hasSales:    ["How do I scale?", "What should I focus on?", "Help me with content"],
};

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
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function ProjectCardHeader({ name }: { name: string }) {
  const hue = nameToHue(name);
  const letter = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div
      style={{
        height: 120,
        background: `linear-gradient(135deg, hsl(${hue},38%,86%) 0%, hsl(${(hue + 30) % 360},32%,80%) 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: `hsl(${hue},45%,32%)`,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {letter}
      </span>
    </div>
  );
}

export default function DashboardClient({
  initialProjects,
  userId,
  initialOrdersCount,
  initialRevenue,
  brandName,
  niche,
}: {
  initialProjects: Project[];
  userId: string;
  initialOrdersCount: number;
  initialRevenue: number;
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

  // ── Dashboard Mentor Panel ────────────────────────────────────
  const [dashMessages, setDashMessages] = useState<DashMsg[]>([]);
  const [dashInput, setDashInput] = useState("");
  const [dashLoading, setDashLoading] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const dashBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const ids = new Set<string>();
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("launched_")) {
          const id = key.replace("launched_", "");
          ids.add(id);
        }
      }
      setPublishedIds(ids);

      const launchedKey = Object.keys(localStorage).find((k) => k.startsWith("launched_"));
      if (!launchedKey) return;
      setHasPublished(true);

      const publishedAt = parseInt(localStorage.getItem(launchedKey) ?? "0", 10);
      if (!publishedAt) return;

      const lastNudgeAt = parseInt(localStorage.getItem(`nudge_at_${userId}`) ?? "0", 10);
      const now = Date.now();
      const timeSincePublish = now - publishedAt;
      const timeSinceNudge = now - lastNudgeAt;

      if (
        timeSincePublish >= NUDGE_DELAY_MS &&
        timeSinceNudge >= NUDGE_COOLDOWN_MS &&
        initialOrdersCount === 0
      ) {
        const delay = setTimeout(() => {
          localStorage.setItem(`nudge_at_${userId}`, String(Date.now()));
          setMentorMessage(
            `It's been a few hours since you launched${brandName ? ` ${brandName}` : ""}. No sale yet — that's completely normal. Want to talk through what's working and what to try next?`
          );
        }, 2000);
        return () => clearTimeout(delay);
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showFirstSaleWidget = hasPublished && ordersCount === 0 && projects.length > 0;

  const stageIndex = computeStageIndex(
    projects.length > 0,
    true,
    hasPublished,
    ordersCount
  );
  const currentStage = STAGE_LABELS[stageIndex];

  // ── Dashboard Mentor: compute opening message & load history ──
  useEffect(() => {
    // Compute opening message based on user state
    let openingMsg = "";
    try {
      const liveCount = initialProjects.filter(p => {
        try { return !!localStorage.getItem(`launched_${p.id}`); } catch { return false; }
      }).length;
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

    // Load saved chat history from Supabase, fall back to opening message
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
          setDashMessages([{ role: "assistant", content: openingMsg }]);
        }
      } catch {
        setDashMessages([{ role: "assistant", content: openingMsg }]);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll dash mentor to bottom
  useEffect(() => {
    dashBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dashMessages, dashLoading]);

  const dashPromptSet = useMemo(() => {
    if (initialOrdersCount > 0) return DASH_PROMPTS.hasSales;
    if (initialProjects.length > 0) return DASH_PROMPTS.hasProjects;
    return DASH_PROMPTS.noProjects;
  }, [initialProjects.length, initialOrdersCount]);

  const sendDashMentor = async () => {
    const text = dashInput.trim();
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
        body: JSON.stringify({
          messages: updated,
          mentorContext: {
            brandName: brandName || undefined,
            stage: currentStage,
            niche: niche || undefined,
          },
        }),
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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newOrder = payload.new as Order;
          const { data: items } = await supabase
            .from("order_items")
            .select("product_name")
            .eq("order_id", newOrder.id);
          const enriched: Order = { ...newOrder, order_items: items ?? [] };

          if (!hadFirstSaleRef.current) {
            hadFirstSaleRef.current = true;
            setFirstSaleOrder(enriched);
          }
          setOrdersCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
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
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleFirstSaleMentor = () => {
    setFirstSaleOrder(null);
    setMentorMessage(
      `You just made your first sale — that's a real milestone. Let's talk about how to turn this into your next 10 sales for ${brandName || "your store"}. What channel did that first customer come from?`
    );
  };

  const liveCount = projects.filter((p) => publishedIds.has(p.id)).length;

  return (
    <>
      <style>{`
        div:hover .delete-btn { opacity: 1 !important; }
        .dash-mentor-panel { display: flex; }
        .dash-mentor-fab { display: none; }
        @media (max-width: 900px) {
          .dash-mentor-panel { display: none !important; }
          .dash-mentor-fab { display: flex !important; }
        }
        @keyframes dashFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dashDotPulse { 0%, 80%, 100% { transform: scale(0); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* Full-width flex layout: content + mentor sidebar */}
      <div style={{ display: "flex", margin: "-40px -24px", minHeight: "calc(100vh - 60px)" }}>

        {/* ── Left: main content ── */}
        <div style={{ flex: 1, minWidth: 0, padding: "40px 24px", overflowX: "hidden" }}>

          {/* First Sale Funnel Widget */}
          {showFirstSaleWidget && (
            <FirstSaleWidget
              brandName={brandName}
              totalRevenue={initialRevenue}
              userId={userId}
              onStepClick={(msg) => setMentorMessage(msg)}
            />
          )}

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1A1A1A", margin: 0, letterSpacing: "-0.01em" }}>
            Projects
          </h1>
          <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>
            {projects.length} {projects.length === 1 ? "business" : "businesses"}
            {liveCount > 0 ? ` · ${liveCount} live` : ""}
          </p>
        </div>

        {creating ? (
          <form onSubmit={createProject} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #D0CFC9",
                fontSize: 14,
                outline: "none",
                width: 176,
                background: "#fff",
                color: "#1A1A1A",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#D0CFC9"; }}
            />
            <button
              type="submit"
              disabled={loading || !newName.trim()}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                background: "#2563EB",
                color: "#fff",
                border: "none",
                cursor: loading || !newName.trim() ? "not-allowed" : "pointer",
                opacity: loading || !newName.trim() ? 0.6 : 1,
              }}
            >
              {loading ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewName(""); }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
                background: "transparent",
                border: "1px solid #D0CFC9",
                color: "#555",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              background: "transparent",
              border: "1.5px solid #2563EB",
              color: "#2563EB",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#EFF6FF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        /* Empty state */
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 56,
              width: 56,
              borderRadius: 16,
              background: "#EEEDE9",
              marginBottom: 20,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 500, color: "#333", margin: "0 0 6px" }}>No projects yet</p>
          <p style={{ fontSize: 14, color: "#999", margin: "0 0 24px", maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
            Start building your first store with Volcity.
          </p>
          <button
            onClick={() => setCreating(true)}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              background: "#2563EB",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {projects.map((project) => {
            const isLive = publishedIds.has(project.id);
            return (
              <div
                key={project.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  border: "1px solid #E8E8E4",
                  overflow: "hidden",
                  minHeight: 240,
                  display: "flex",
                  flexDirection: "column",
                  transition: "box-shadow 0.18s, border-color 0.18s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#D0CFC9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#E8E8E4";
                }}
              >
                {/* Visual header */}
                <ProjectCardHeader name={project.name} />

                {/* Delete button */}
                <button
                  onClick={() => deleteProject(project.id)}
                  title="Delete project"
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.85)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.15s",
                    color: "#999",
                  }}
                  className="delete-btn"
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>

                {/* Card body */}
                <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.name}
                      </div>
                      {/* Status badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: isLive ? "#22c55e" : "#CBD5E1" }} />
                        <span style={{ fontSize: 12, color: isLive ? "#16a34a" : "#94a3b8", fontWeight: 500 }}>
                          {isLive ? "Live" : "Draft"}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#AAA" }}>
                      Saved {timeAgo(project.updated_at)}
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/builder?project=${project.id}`)}
                    style={{
                      marginTop: "auto",
                      width: "100%",
                      padding: "9px 0",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      background: "#2563EB",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    Open
                  </button>
                </div>
              </div>
            );
          })}

          {/* New project card */}
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              style={{
                minHeight: 240,
                borderRadius: 12,
                border: "2px dashed #D0CFC9",
                background: "transparent",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2563EB";
                e.currentTarget.style.background = "#EFF6FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#D0CFC9";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#EEEDE9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span style={{ fontSize: 14, color: "#999" }}>New project</span>
            </button>
          )}
        </div>
      )}

        </div>{/* end left content */}

        {/* ── Right: Mentor Panel (desktop) ── */}
        <div
          className="dash-mentor-panel"
          style={{
            width: 320,
            flexShrink: 0,
            borderLeft: "1px solid #E8E8E4",
            background: "#F7F6F3",
            flexDirection: "column",
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
            height: "calc(100vh - 60px)",
            overflow: "hidden",
          }}
        >
          {/* Panel header */}
          <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #E8E8E4", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>Your Mentor</div>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.2 }}>Ready to help you build</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
            {dashMessages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "dashFadeIn 0.15s ease-out both" }}>
                <div style={{
                  maxWidth: "88%",
                  padding: "9px 12px",
                  borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: m.role === "user" ? "#1e40af" : "#334155",
                  background: m.role === "user" ? "#eff6ff" : "#ffffff",
                  border: m.role === "user" ? "1px solid #bfdbfe" : "1px solid #E8E8E4",
                  whiteSpace: "pre-line",
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Suggested prompts — shown until first user message */}
            {dashMessages.filter(m => m.role === "user").length === 0 && dashPromptSet.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                {dashPromptSet.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setDashInput(prompt); setTimeout(() => { setDashInput(""); const userMsg: DashMsg = { role: "user", content: prompt }; const updated = [...dashMessages, userMsg]; setDashMessages(updated); setDashLoading(true); const supabase = createClient(); supabase.from("mentor_messages").insert({ user_id: userId, project_id: null, role: "user", content: prompt }).then(() => {}); fetch("/api/idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: updated, mentorContext: { brandName: brandName || undefined, stage: currentStage, niche: niche || undefined } }) }).then(r => r.json().catch(() => ({}))).then(data => { const reply = data?.result || "Something went wrong."; setDashMessages(prev => [...prev, { role: "assistant", content: reply }]); supabase.from("mentor_messages").insert({ user_id: userId, project_id: null, role: "assistant", content: reply }).then(() => {}); }).catch(() => { setDashMessages(prev => [...prev, { role: "assistant", content: "Something went wrong." }]); }).finally(() => setDashLoading(false)); }, 0); }}
                    style={{ textAlign: "left", padding: "8px 12px", borderRadius: 10, border: "1px solid #E8E8E4", background: "#ffffff", color: "#334155", fontSize: 12, cursor: "pointer", lineHeight: 1.4, transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "#2563eb"; (e.target as HTMLButtonElement).style.color = "#1e40af"; (e.target as HTMLButtonElement).style.background = "#eff6ff"; }}
                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "#E8E8E4"; (e.target as HTMLButtonElement).style.color = "#334155"; (e.target as HTMLButtonElement).style.background = "#ffffff"; }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {dashLoading && (
              <div style={{ display: "flex", gap: 4, padding: "4px 4px" }}>
                {[0, 1, 2].map(d => (
                  <span key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#cbd5e1", display: "inline-block", animation: `dashDotPulse 1.4s ease-in-out ${d * 0.16}s infinite` }} />
                ))}
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
              style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid #E8E8E4", fontSize: 13, outline: "none", background: "#ffffff", color: "#0f172a", transition: "border-color 0.15s" }}
              onFocus={e => (e.target.style.borderColor = "#2563eb")}
              onBlur={e => (e.target.style.borderColor = "#E8E8E4")}
            />
            <button
              onClick={sendDashMentor}
              disabled={dashLoading || !dashInput.trim()}
              style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: dashLoading || !dashInput.trim() ? "#e2e8f0" : "#2563eb", color: dashLoading || !dashInput.trim() ? "#94a3b8" : "#fff", fontSize: 13, fontWeight: 600, cursor: dashLoading || !dashInput.trim() ? "default" : "pointer", flexShrink: 0, transition: "all 0.15s" }}
            >
              Send
            </button>
          </div>
        </div>

      </div>{/* end flex layout */}

      {/* Mobile: floating mentor chat button */}
      <button
        className="dash-mentor-fab"
        onClick={() => setShowMobileChat(true)}
        style={{ position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: "#2563eb", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 4px 16px rgba(37,99,235,0.35)", alignItems: "center", justifyContent: "center", zIndex: 50 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </button>

      {/* Mobile: mentor chat modal */}
      {showMobileChat && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "0 16px 80px" }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.35)", backdropFilter: "blur(4px)" }} onClick={() => setShowMobileChat(false)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 380, background: "#F7F6F3", borderRadius: 20, boxShadow: "0 24px 48px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "75vh" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #E8E8E4", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Your Mentor</div>
              <button onClick={() => setShowMobileChat(false)} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #E8E8E4", background: "#fff", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {dashMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "88%", padding: "9px 12px", borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px", fontSize: 13, lineHeight: 1.55, color: m.role === "user" ? "#1e40af" : "#334155", background: m.role === "user" ? "#eff6ff" : "#ffffff", border: m.role === "user" ? "1px solid #bfdbfe" : "1px solid #E8E8E4", whiteSpace: "pre-line" }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {dashLoading && <div style={{ display: "flex", gap: 4 }}>{[0,1,2].map(d => <span key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#cbd5e1", display: "inline-block", animation: `dashDotPulse 1.4s ease-in-out ${d * 0.16}s infinite` }} />)}</div>}
            </div>
            <div style={{ padding: "10px 12px", borderTop: "1px solid #E8E8E4", display: "flex", gap: 8, flexShrink: 0 }}>
              <input value={dashInput} onChange={e => setDashInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDashMentor(); } }} placeholder="Ask your mentor anything..." style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid #E8E8E4", fontSize: 13, outline: "none", background: "#ffffff", color: "#0f172a" }} />
              <button onClick={sendDashMentor} disabled={dashLoading || !dashInput.trim()} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: dashLoading || !dashInput.trim() ? "#e2e8f0" : "#2563eb", color: dashLoading || !dashInput.trim() ? "#94a3b8" : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Send</button>
            </div>
          </div>
        </div>
      )}

      {/* First Sale Celebration */}
      {firstSaleOrder && (
        <FirstSaleCelebration
          order={firstSaleOrder}
          brandName={brandName}
          onTalkToMentor={handleFirstSaleMentor}
          onClose={() => setFirstSaleOrder(null)}
        />
      )}

      {/* Mentor Chat modal (nudge-triggered) */}
      {mentorMessage && (
        <MentorChat
          openingMessage={mentorMessage}
          brandName={brandName}
          stage={currentStage}
          niche={niche}
          onClose={() => setMentorMessage(null)}
        />
      )}
    </>
  );
}
