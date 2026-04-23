"use client";

import { useState, useEffect } from "react";

type Project = { id: string; name: string; updated_at: string };

type Insight = {
  category: string;
  issue: string;
  suggestion: string;
  siteUpdate?: Record<string, unknown>;
};

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  conversion: { label: "Conversion", color: "#6d28d9", bg: "rgba(109,40,217,0.08)" },
  homepage:   { label: "Homepage",   color: "#0f172a", bg: "rgba(15,23,42,0.06)"   },
  products:   { label: "Products",   color: "#047857", bg: "rgba(4,120,87,0.08)"   },
  pricing:    { label: "Pricing",    color: "#b45309", bg: "rgba(180,83,9,0.08)"   },
  marketing:  { label: "Marketing",  color: "#be123c", bg: "rgba(190,18,60,0.08)"  },
};

function Badge({ category }: { category: string }) {
  const m = CATEGORY_META[category] ?? { label: category, color: "#475569", bg: "rgba(71,85,105,0.08)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

const SpinnerSvg = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function InsightsClient() {
  const [projects,          setProjects]          = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [insights,          setInsights]          = useState<Insight[]>([]);
  const [loading,           setLoading]           = useState(false);
  const [applyingIdx,       setApplyingIdx]       = useState<number | null>(null);
  const [appliedIdxs,       setAppliedIdxs]       = useState<Set<number>>(new Set());
  const [error,             setError]             = useState<string | null>(null);
  const [siteData,          setSiteData]          = useState<unknown>(null);
  const [loadingProjects,   setLoadingProjects]   = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) { setProjects(data); if (data.length > 0) setSelectedProjectId(data[0].id); } })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetch(`/api/projects/${selectedProjectId}`)
      .then((r) => r.json())
      .then((data) => { if (data?.site) setSiteData(data.site); else setSiteData(null); })
      .catch(() => setSiteData(null));
  }, [selectedProjectId]);

  const generateInsights = async () => {
    if (!selectedProjectId || !siteData) { setError("Please select a project with a generated site first."); return; }
    setLoading(true); setError(null); setInsights([]); setAppliedIdxs(new Set());
    try {
      const res  = await fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: siteData, projectId: selectedProjectId }) });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Failed to generate insights. Try again."); return; }
      setInsights(data.insights ?? []);
    } catch { setError("Network error. Please try again."); }
    finally  { setLoading(false); }
  };

  const applySuggestion = async (insight: Insight, idx: number) => {
    if (!insight.siteUpdate || !selectedProjectId || !siteData) return;
    setApplyingIdx(idx);
    try {
      const currentSite = siteData as Record<string, unknown>;
      const update      = insight.siteUpdate as Record<string, unknown>;
      const updatedSite: Record<string, unknown> = { ...currentSite };
      for (const [key, value] of Object.entries(update)) {
        if (key === "theme" && typeof value === "object" && value !== null && typeof currentSite.theme === "object" && currentSite.theme !== null) {
          updatedSite.theme = { ...(currentSite.theme as Record<string, unknown>), ...(value as Record<string, unknown>) };
        } else {
          updatedSite[key] = value;
        }
      }
      const res = await fetch(`/api/projects/${selectedProjectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: updatedSite }) });
      if (res.ok) { setSiteData(updatedSite); setAppliedIdxs((prev) => new Set(prev).add(idx)); }
      else { const data = await res.json(); alert(data?.error || "Failed to apply suggestion."); }
    } catch { alert("Network error. Could not apply suggestion."); }
    finally  { setApplyingIdx(null); }
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">AI Insights</h1>
        <p className="text-sm text-slate-500 mt-0.5">Conversion tips and optimization suggestions for your store</p>
      </div>

      {/* Control card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Project</label>
            {loadingProjects ? (
              <div className="h-9 bg-slate-100 rounded-lg animate-pulse w-52" />
            ) : projects.length === 0 ? (
              <p className="text-sm text-slate-500">No projects. <a href="/dashboard" className="text-blue-600 hover:underline">Create one.</a></p>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => { setSelectedProjectId(e.target.value); setInsights([]); setAppliedIdxs(new Set()); setError(null); }}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white text-slate-900 w-52"
              >
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          <button
            onClick={generateInsights}
            disabled={loading || !selectedProjectId || !siteData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? <SpinnerSvg /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            )}
            {loading ? "Analyzing…" : "Generate Insights"}
          </button>
        </div>

        {!siteData && selectedProjectId && !loadingProjects && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            This project doesn&apos;t have a generated site yet.{" "}
            <a href={`/?project=${selectedProjectId}`} className="underline font-medium">Open in builder</a> to generate one.
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 w-20 bg-slate-100 rounded-md mb-3" />
              <div className="h-3.5 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3.5 bg-slate-100 rounded w-full mb-1.5" />
              <div className="h-3.5 bg-slate-100 rounded w-5/6" />
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {!loading && insights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-700">{insights.length} suggestions found</p>
            <p className="text-xs text-slate-400">Click Apply to update your site</p>
          </div>

          {insights.map((insight, idx) => {
            const applied  = appliedIdxs.has(idx);
            const applying = applyingIdx === idx;

            return (
              <div
                key={idx}
                className={`bg-white rounded-xl border p-5 transition-all duration-200 ${applied ? "border-emerald-200" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge category={insight.category} />
                      {applied && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Applied
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 mb-1">{insight.issue}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">{insight.suggestion}</p>
                  </div>

                  {insight.siteUpdate && !applied && (
                    <button
                      onClick={() => applySuggestion(insight, idx)}
                      disabled={applying || applyingIdx !== null}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors duration-150 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {applying ? <SpinnerSvg /> : null}
                      {applying ? "Applying…" : "Apply"}
                    </button>
                  )}
                </div>

                {insight.siteUpdate && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-400 mb-1">Changes:</div>
                    <pre className="text-xs font-mono text-slate-500 bg-slate-50 rounded-lg px-3 py-2 overflow-x-auto">
                      {JSON.stringify(insight.siteUpdate, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && insights.length === 0 && !error && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 mb-4 mx-auto">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p className="text-base font-medium text-slate-700 mb-1">Ready to analyze your store</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Select a project and generate AI-powered optimization suggestions.
          </p>
        </div>
      )}
    </div>
  );
}
