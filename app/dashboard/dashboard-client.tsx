"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import FirstSaleWidget from "@/app/components/FirstSaleWidget";
import MentorChat from "@/app/components/MentorChat";
import FirstSaleCelebration from "@/app/components/FirstSaleCelebration";

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

function ProjectInitial({ name }: { name: string }) {
  const letter = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm shadow-blue-200/70">
      {letter}
    </div>
  );
}

export default function DashboardClient({
  initialProjects,
  userId,
  initialOrdersCount,
  initialRevenue,
  brandName,
}: {
  initialProjects: Project[];
  userId: string;
  initialOrdersCount: number;
  initialRevenue: number;
  brandName: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  // First sale state
  const [ordersCount, setOrdersCount] = useState(initialOrdersCount);
  const hadFirstSaleRef = useRef(initialOrdersCount > 0);
  const [firstSaleOrder, setFirstSaleOrder] = useState<Order | null>(null);
  const [mentorMessage, setMentorMessage] = useState<string | null>(null);
  const [hasPublished, setHasPublished] = useState(false);

  // Detect "has published" via localStorage (set by LaunchMoment on first publish)
  useEffect(() => {
    try {
      const launched = Object.keys(localStorage).some((k) => k.startsWith("launched_"));
      setHasPublished(launched);
    } catch {
      // ignore
    }
  }, []);

  // Show widget when: published but no orders yet
  const showFirstSaleWidget = hasPublished && ordersCount === 0 && projects.length > 0;

  // Supabase realtime — listen for new orders
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
          // Fetch order items for celebration details
          const { data: items } = await supabase
            .from("order_items")
            .select("product_name")
            .eq("order_id", newOrder.id);
          const enriched: Order = { ...newOrder, order_items: items ?? [] };

          if (!hadFirstSaleRef.current) {
            // First sale!
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

  return (
    <div>
      {/* First Sale Funnel Widget */}
      {showFirstSaleWidget && (
        <FirstSaleWidget
          brandName={brandName}
          totalRevenue={initialRevenue}
          onStepClick={(msg) => setMentorMessage(msg)}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your workspace</p>
        </div>

        {creating ? (
          <form onSubmit={createProject} className="flex items-center gap-2 animate-slideUp">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-150 w-44 bg-white text-slate-900 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="px-3.5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewName(""); }}
              className="px-3.5 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors duration-150"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150 shadow-sm shadow-blue-200/60"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24 animate-fadeIn">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-slate-100 mb-5 mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </div>
          <p className="text-base font-medium text-slate-700 mb-1">No projects yet</p>
          <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
            Start building your first store with VentureOS.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative bg-white rounded-xl border border-slate-200 p-4 flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-150"
            >
              <button
                onClick={() => deleteProject(project.id)}
                className="absolute top-3 right-3 h-6 w-6 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors duration-150 opacity-0 group-hover:opacity-100 flex items-center justify-center text-sm"
                title="Delete project"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <ProjectInitial name={project.name} />
                <div className="min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate">{project.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Saved {timeAgo(project.updated_at)}</div>
                </div>
              </div>

              <button
                onClick={() => router.push(`/?project=${project.id}`)}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors duration-150 mt-auto"
              >
                Open
              </button>
            </div>
          ))}
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

      {/* Mentor Chat modal */}
      {mentorMessage && (
        <MentorChat
          openingMessage={mentorMessage}
          brandName={brandName}
          stage="Launch"
          onClose={() => setMentorMessage(null)}
        />
      )}
    </div>
  );
}
