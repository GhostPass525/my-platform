"use client";

import { useState, useEffect } from "react";

type Project = { id: string; name: string; updated_at: string };

type MarketingContent = {
  tiktok:      string[];
  instagram:   string[];
  adCopy:      string[];
  emailIdeas:  string[];
  postTime:    string;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <button
      onClick={copy}
      className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150 border ${
        copied ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ContentSection({ title, icon, items, emptyText }: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h3 className="font-medium text-sm text-slate-900">{title}</h3>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <p className="flex-1 text-sm text-slate-700 leading-relaxed">{item}</p>
              <CopyButton text={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SpinnerSvg = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function MarketingClient() {
  const [projects,          setProjects]          = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [content,           setContent]           = useState<MarketingContent | null>(null);
  const [loading,           setLoading]           = useState(false);
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

  const generateMarketing = async () => {
    if (!selectedProjectId || !siteData) { setError("Please select a project with a generated site first."); return; }
    setLoading(true); setError(null); setContent(null);
    try {
      const res  = await fetch("/api/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: siteData }) });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Failed to generate content. Try again."); return; }
      setContent(data);
    } catch { setError("Network error. Please try again."); }
    finally  { setLoading(false); }
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Marketing Content</h1>
        <p className="text-sm text-slate-500 mt-0.5">AI-generated social media, ad copy, and email ideas for your brand</p>
      </div>

      {/* Control card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Project</label>
            {loadingProjects ? (
              <div className="h-9 bg-slate-100 rounded-lg animate-pulse w-52" />
            ) : projects.length === 0 ? (
              <p className="text-sm text-slate-500">No projects. <a href="/" className="text-blue-600 hover:underline">Create one.</a></p>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => { setSelectedProjectId(e.target.value); setContent(null); setError(null); }}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white text-slate-900 w-52"
              >
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          <button
            onClick={generateMarketing}
            disabled={loading || !selectedProjectId || !siteData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? <SpinnerSvg /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
            {loading ? "Generating…" : "Generate Content"}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 bg-slate-100 rounded-lg" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((j) => <div key={j} className="h-14 bg-slate-50 rounded-lg border border-slate-100" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && content && (
        <div className="space-y-5">
          {content.postTime && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex gap-3">
              <svg className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-blue-800 mb-0.5">Best Post Times</div>
                <div className="text-sm text-blue-700">{content.postTime}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ContentSection
              title="TikTok Ideas"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>}
              items={content.tiktok ?? []}
              emptyText="No TikTok ideas generated."
            />
            <ContentSection
              title="Instagram Captions"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>}
              items={content.instagram ?? []}
              emptyText="No Instagram captions generated."
            />
            <ContentSection
              title="Ad Copy"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>}
              items={content.adCopy ?? []}
              emptyText="No ad copy generated."
            />
            <ContentSection
              title="Email Subject Lines"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
              items={content.emailIdeas ?? []}
              emptyText="No email ideas generated."
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !content && !error && (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 mb-4 mx-auto">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
          <p className="text-base font-medium text-slate-700 mb-1">Ready to generate marketing content</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Select a project to get TikTok ideas, Instagram captions, ad copy, and email subject lines.
          </p>
        </div>
      )}
    </div>
  );
}
