"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { computeStageIndex } from "@/app/components/StageTracker";
import FirstSaleWidget from "@/app/components/FirstSaleWidget";
import MentorChat from "@/app/components/MentorChat";
import FirstSaleCelebration from "@/app/components/FirstSaleCelebration";

const STAGE_LABELS = ["Idea", "Setup", "Launch", "First Sale", "Growing"];
const NUDGE_DELAY_MS = 4 * 60 * 60 * 1000;
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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
      if (data?.id) router.push(`/?project=${data.id}`);
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
    <div>
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
            Start building your first store with VentureOS.
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
                    onClick={() => router.push(`/?project=${project.id}`)}
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

      {/* Delete button hover style */}
      <style>{`
        div:hover .delete-btn { opacity: 1 !important; }
      `}</style>

      {/* First Sale Celebration */}
      {firstSaleOrder && (
        <FirstSaleCelebration
          order={firstSaleOrder}
          brandName={brandName}
          onTalkToMentor={handleFirstSaleMentor}
          onClose={() => setFirstSaleOrder(null)}
        />
      )}

      {/* Mentor Chat modal */}
      {mentorMessage && (
        <MentorChat
          openingMessage={mentorMessage}
          brandName={brandName}
          stage={currentStage}
          niche={niche}
          onClose={() => setMentorMessage(null)}
        />
      )}
    </div>
  );
}
