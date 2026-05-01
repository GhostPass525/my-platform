"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Project = {
  id: string;
  name: string;
  updated_at: string;
  sites?: Array<{ published_at: string | null }> | null;
};

type PublishedStore = { id: string; name: string; url: string };

type MarketingContent = {
  tiktok: string[];
  instagram: string[];
  adCopy: string[];
  emailIdeas: string[];
  postTime: string;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <button
      onClick={copy}
      className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
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
        <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">{icon}</div>
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

const CHECKLIST_ITEMS = [
  { key: "store_generated",  label: "Generate your store",      auto: true },
  { key: "stripe_connected", label: "Set up Stripe payments",   auto: true },
  { key: "store_published",  label: "Publish your store",       auto: true },
  { key: "manual_social",    label: "Share on social media",    auto: false },
  { key: "manual_discount",  label: "Create a discount code",   auto: false },
  { key: "manual_email",     label: "Send to your email list",  auto: false },
  { key: "manual_ad",        label: "Run your first ad",        auto: false },
];

export default function MarketingClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [projects,          setProjects]          = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [content,           setContent]           = useState<MarketingContent | null>(null);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [siteData,          setSiteData]          = useState<unknown>(null);
  const [loadingProjects,   setLoadingProjects]   = useState(true);

  // Published stores (those with a valid share URL)
  const [publishedStores,      setPublishedStores]      = useState<PublishedStore[]>([]);
  const [selectedStoreId,      setSelectedStoreId]      = useState<string>("");
  const [storeUrl,             setStoreUrl]             = useState<string | null>(null);
  const [urlCopied,            setUrlCopied]            = useState(false);

  // Checklist auto-states (per selected published store)
  const [hasGeneratedSite, setHasGeneratedSite] = useState(false);
  const [stripeConnected,  setStripeConnected]  = useState(false);
  const [hasPublished,     setHasPublished]     = useState(false);

  // Manual checklist (localStorage)
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});

  const selectStore = useCallback((store: PublishedStore) => {
    setSelectedStoreId(store.id);
    setStoreUrl(store.url || null);
    setHasPublished(!!store.url);
    // Update URL param without reload
    const params = new URLSearchParams(searchParams.toString());
    params.set("storeId", store.id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    // Check Stripe status
    fetch("/api/connect/status")
      .then((r) => r.json())
      .then((d) => { if (d?.charges_enabled) setStripeConnected(true); })
      .catch(() => {});

    // Load manual checks
    try {
      const checks: Record<string, boolean> = {};
      for (const item of CHECKLIST_ITEMS.filter((i) => !i.auto)) {
        checks[item.key] = localStorage.getItem(item.key) === "1";
      }
      setManualChecks(checks);
    } catch {}

    // Load projects + build published stores list
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: Project[]) => {
        if (!Array.isArray(data)) return;
        setProjects(data);
        if (data.length > 0) {
          setHasGeneratedSite(true);
          setSelectedProjectId(data[0].id);
        }

        // Build list of published stores with their share URLs
        try {
          const stores: PublishedStore[] = [];
          for (const project of data) {
            // A project is published if:
            // - sites table has a published_at (authoritative server-side check), OR
            // - localStorage has launched_${id} (client-side fallback for older entries)
            const sitePublishedAt = Array.isArray(project.sites)
              ? project.sites[0]?.published_at
              : (project.sites as { published_at?: string | null } | null)?.published_at;
            const isPublished = !!sitePublishedAt || !!localStorage.getItem(`launched_${project.id}`);

            if (!isPublished) continue;

            // Get the shareable URL — new-style key first (stores actual publishId-based URL)
            const url = localStorage.getItem(`pub_url_${project.id}`) ?? "";
            stores.push({ id: project.id, name: project.name, url });
          }

          if (stores.length > 0) {
            setPublishedStores(stores);

            // Auto-select from URL param, or pick the first store with a valid URL
            const paramId = searchParams.get("storeId");
            const target =
              (paramId ? stores.find((s) => s.id === paramId) : null) ??
              stores.find((s) => !!s.url) ??
              stores[0];

            if (target) {
              setSelectedStoreId(target.id);
              setStoreUrl(target.url || null);
              setHasPublished(!!target.url);
            }
          }
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetch(`/api/projects/${selectedProjectId}`)
      .then((r) => r.json())
      .then((data) => { setSiteData(data?.site ?? null); })
      .catch(() => setSiteData(null));
  }, [selectedProjectId]);

  // Keep checklist hasPublished in sync with selected store
  useEffect(() => {
    if (!selectedStoreId) return;
    const store = publishedStores.find((s) => s.id === selectedStoreId);
    setHasPublished(!!store?.url);
  }, [selectedStoreId, publishedStores]);

  const toggleManual = (key: string) => {
    const next = !manualChecks[key];
    try { localStorage.setItem(key, next ? "1" : "0"); } catch {}
    setManualChecks((prev) => ({ ...prev, [key]: next }));
  };

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

  const copyStoreUrl = async () => {
    if (!storeUrl) return;
    try { await navigator.clipboard.writeText(storeUrl); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); } catch {}
  };

  const checkedCount = CHECKLIST_ITEMS.filter((item) => {
    if (item.auto) {
      if (item.key === "store_generated") return hasGeneratedSite;
      if (item.key === "stripe_connected") return stripeConnected;
      if (item.key === "store_published")  return hasPublished;
    }
    return manualChecks[item.key] ?? false;
  }).length;

  const isAutoChecked = (key: string) => {
    if (key === "store_generated") return hasGeneratedSite;
    if (key === "stripe_connected") return stripeConnected;
    if (key === "store_published")  return hasPublished;
    return false;
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1A1A1A", margin: 0, letterSpacing: "-0.01em" }}>Marketing</h1>
        <p style={{ fontSize: 14, color: "#888", margin: "4px 0 0" }}>
          Share your store, track your launch checklist, and generate content
        </p>
        <div style={{ marginTop: 20, borderBottom: "1px solid #E8E8E4" }} />
      </div>

      {/* ── Share Your Store ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 16 }}>
          Share Your Store
        </div>

        {loadingProjects ? (
          <div className="h-10 bg-slate-100 rounded-xl animate-pulse w-64" />
        ) : publishedStores.length === 0 ? (
          /* No published stores */
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Publish your store first to get your shareable link</p>
              <p className="text-sm text-slate-400">Once you publish, your store URL will appear here.</p>
              <a href="/dashboard" className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium hover:underline" style={{ color: "#0f172a" }}>
                Go to Dashboard →
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Store selector — only shown when there are multiple published stores */}
            {publishedStores.length > 1 && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Select store</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => {
                    const store = publishedStores.find((s) => s.id === e.target.value);
                    if (store) selectStore(store);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all bg-white text-slate-900 w-full max-w-xs"
                >
                  {publishedStores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* URL display */}
            {storeUrl ? (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    <span className="flex-1 text-sm text-slate-600 truncate">{storeUrl}</span>
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                      title="Open store"
                    >
                      ↗
                    </a>
                  </div>
                  <button
                    onClick={copyStoreUrl}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex-shrink-0 border ${
                      urlCopied ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {urlCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 10 }}>Share on</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        label: "Twitter / X",
                        href: `https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out my new store!")}&url=${encodeURIComponent(storeUrl)}`,
                      },
                      {
                        label: "Facebook",
                        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`,
                      },
                      {
                        label: "LinkedIn",
                        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(storeUrl)}`,
                      },
                    ].map(({ label, href }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        {label}
                      </a>
                    ))}
                    <button
                      onClick={() => { try { navigator.clipboard.writeText(storeUrl); } catch {} }}
                      className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                      title="Copy link — then paste into Instagram"
                    >
                      Instagram (copy link)
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Store is marked live server-side but URL not cached locally — need republish */
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-1">Store URL not found — please republish</p>
                  <p className="text-sm text-amber-700">Your store is marked as live but the share link isn&apos;t stored in this browser. Open it in the builder and publish again to get your link.</p>
                  <a
                    href={`/builder?project=${selectedStoreId}`}
                    className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-800 hover:underline"
                  >
                    Open in Builder →
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Launch Checklist ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8" }}>
            Your Launch Checklist
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {checkedCount} / {CHECKLIST_ITEMS.length} complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-100 mb-5">
          <div
            className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
          />
        </div>

        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const checked = item.auto ? isAutoChecked(item.key) : (manualChecks[item.key] ?? false);
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer"
                style={{
                  borderColor: checked ? "#bbf7d0" : "#f1f5f9",
                  background: checked ? "rgba(240,253,244,0.5)" : "#f8fafc",
                }}
                onClick={() => { if (!item.auto) toggleManual(item.key); }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: checked ? "#16a34a" : "#e2e8f0" }}
                >
                  {checked && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span
                  className="flex-1 text-sm"
                  style={{ color: checked ? "#15803d" : "#374151", textDecoration: checked ? "line-through" : "none", fontWeight: checked ? 400 : 400 }}
                >
                  {item.label}
                </span>
                {item.auto && (
                  <span className="text-xs text-slate-400">auto</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI Content Generation ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 16 }}>
          AI Content Tools
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Project</label>
            {loadingProjects ? (
              <div className="h-9 bg-slate-100 rounded-lg animate-pulse w-52" />
            ) : projects.length === 0 ? (
              <p className="text-sm text-slate-500">No projects. <a href="/dashboard" className="text-blue-600 hover:underline">Create one.</a></p>
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? <SpinnerSvg /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            )}
            {loading ? "Generating…" : "Generate Content"}
          </button>
        </div>

        {!siteData && selectedProjectId && !loadingProjects && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            This project doesn&apos;t have a generated site yet.{" "}
            <a href={`/builder?project=${selectedProjectId}`} className="underline font-medium">Open in builder</a> to generate one.
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
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

      {/* Empty state for content area */}
      {!loading && !content && !error && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 mb-4 mx-auto">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
          <p className="text-base font-medium text-slate-700 mb-1">Generate AI content for your brand</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Get TikTok ideas, Instagram captions, ad copy, and email subject lines tailored to your store.
          </p>
        </div>
      )}
    </div>
  );
}
