"use client";

import { useState, useEffect } from "react";

type Project = { id: string; name: string; updated_at: string };

type BrandKit = {
  brandVoice: string;
  logoConceptDescription: string;
  brandStory: string;
  taglineVariations: string[];
  colorRationale: string;
};

type SiteSpec = {
  brandName?: string;
  tagline?: string;
  theme?: { accent?: string; bg?: string; text?: string; mutedText?: string };
  font?: string;
};

function ColorSwatch({ color, label }: { color: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(color); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  return (
    <div className="flex items-center gap-3 group cursor-pointer" onClick={copy}>
      <div className="h-8 w-8 rounded-lg border border-slate-200 flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800">{label}</div>
        <div className="text-xs text-slate-400 font-mono">{color}</div>
      </div>
      <span className={`text-xs transition-colors flex-shrink-0 ${copied ? "text-emerald-600" : "text-slate-300 group-hover:text-slate-500"}`}>
        {copied ? "copied" : "copy"}
      </span>
    </div>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">{icon}</div>
        <h3 className="font-medium text-sm text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const SpinnerSvg = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const KIT_FEATURES = [
  "Brand name & tagline variations",
  "Color palette with psychology notes",
  "Typography recommendations",
  "Brand voice & tone guidelines",
  "About story & mission statement",
];

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-xl animate-slideUp"
    >
      {message}
    </div>
  );
}

export default function BrandClient() {
  const [projects,          setProjects]          = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [brandKit,          setBrandKit]          = useState<BrandKit | null>(null);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [siteData,          setSiteData]          = useState<SiteSpec | null>(null);
  const [loadingProjects,   setLoadingProjects]   = useState(true);
  const [confirmRegen,      setConfirmRegen]      = useState(false);
  const [toast,             setToast]             = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) { setProjects(data); if (data.length > 0) setSelectedProjectId(data[0].id); }
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    setBrandKit(null);
    fetch(`/api/projects/${selectedProjectId}`)
      .then((r) => r.json())
      .then((data) => { setSiteData(data?.site ? data.site as SiteSpec : null); })
      .catch(() => setSiteData(null));
  }, [selectedProjectId]);

  const generateBrandKit = async () => {
    if (!selectedProjectId || !siteData) { setError("Please select a project with a generated site first."); return; }
    setLoading(true); setError(null); setBrandKit(null); setConfirmRegen(false);
    try {
      const res  = await fetch("/api/brand", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: siteData }) });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Failed to generate brand kit. Try again."); return; }
      setBrandKit(data);
    } catch { setError("Network error. Please try again."); }
    finally  { setLoading(false); }
  };

  const copyBrandColors = async () => {
    if (!siteData?.theme) return;
    const { accent, bg, text, mutedText } = siteData.theme;
    const text_ = `/* Brand Colors */\n--color-accent: ${accent ?? ""};\n--color-bg: ${bg ?? ""};\n--color-text: ${text ?? ""};\n--color-muted: ${mutedText ?? ""};`;
    try { await navigator.clipboard.writeText(text_); setToast("Brand colors copied to clipboard"); } catch {}
  };

  const copyTagline = async () => {
    const tagline = siteData?.tagline;
    if (!tagline) return;
    try { await navigator.clipboard.writeText(tagline); setToast("Tagline copied to clipboard"); } catch {}
  };

  return (
    <div>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1A1A1A", margin: 0, letterSpacing: "-0.01em" }}>Brand Kit</h1>
        <p style={{ fontSize: 14, color: "#888", margin: "4px 0 0" }}>
          AI-powered brand identity — voice, story, logo concept, and tagline variations
        </p>
        <div style={{ marginTop: 20, borderBottom: "1px solid #E8E8E4" }} />
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
                onChange={(e) => { setSelectedProjectId(e.target.value); setBrandKit(null); setError(null); setConfirmRegen(false); }}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white text-slate-900 w-52"
              >
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          <button
            onClick={generateBrandKit}
            disabled={loading || !selectedProjectId || !siteData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? <SpinnerSvg /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            )}
            {loading ? "Generating…" : "Generate Brand Kit"}
          </button>
        </div>

        {!siteData && selectedProjectId && !loadingProjects && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            This project doesn&apos;t have a generated site yet.{" "}
            <a href={`/builder?project=${selectedProjectId}`} className="underline font-medium">Open in builder</a> to generate one.
          </div>
        )}
      </div>

      {/* Current brand overview */}
      {siteData && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 16 }}>
            Current Brand
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              {[
                { label: "Brand Name", value: siteData.brandName || "—" },
                { label: "Tagline",    value: siteData.tagline   || "—" },
                { label: "Font",       value: siteData.font      || "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
                  <div className="text-sm font-medium text-slate-800">{value}</div>
                </div>
              ))}
            </div>

            {siteData.theme && (
              <div className="space-y-2.5">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Colors <span className="normal-case font-normal">(click to copy)</span></div>
                {siteData.theme.accent  && <ColorSwatch color={siteData.theme.accent}   label="Accent" />}
                {siteData.theme.bg      && <ColorSwatch color={siteData.theme.bg}        label="Background" />}
                {siteData.theme.text    && <ColorSwatch color={siteData.theme.text}      label="Text" />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 bg-slate-100 rounded-lg" />
                <div className="h-4 w-28 bg-slate-100 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
                <div className="h-3 bg-slate-100 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brand Kit Results */}
      {!loading && brandKit && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Your Brand Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              {
                title: "Brand Voice",
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
                body: brandKit.brandVoice,
              },
              {
                title: "Logo Concept",
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>,
                body: brandKit.logoConceptDescription,
              },
              {
                title: "Brand Story",
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
                body: brandKit.brandStory,
              },
              {
                title: "Color Psychology",
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="10.5" r="2.5" /><circle cx="8.5" cy="7.5" r="2.5" /><circle cx="6.5" cy="12.5" r="2.5" /></svg>,
                body: brandKit.colorRationale,
              },
            ] as const).map((card) => (
              <InfoCard key={card.title} title={card.title} icon={card.icon}>
                <p className="text-sm text-slate-600 leading-relaxed">{card.body}</p>
              </InfoCard>
            ))}
          </div>

          {/* Taglines */}
          {brandKit.taglineVariations?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <h3 className="font-medium text-sm text-slate-900">Tagline Variations</h3>
              </div>
              <div className="space-y-2">
                {brandKit.taglineVariations.map((tagline, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-sm text-slate-700 flex-1">&quot;{tagline}&quot;</p>
                    <button
                      onClick={async () => { try { await navigator.clipboard.writeText(tagline); setToast("Tagline copied"); } catch {} }}
                      className="flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export options */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: 14 }}>
              Export Your Brand Kit
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setToast("PDF export coming soon")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download as PDF
              </button>
              <button
                onClick={copyBrandColors}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="10.5" r="2.5" /><circle cx="8.5" cy="7.5" r="2.5" /><circle cx="6.5" cy="12.5" r="2.5" />
                </svg>
                Copy Brand Colors
              </button>
              {siteData?.tagline && (
                <button
                  onClick={copyTagline}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                  Copy Tagline
                </button>
              )}
            </div>
          </div>

          {/* Regenerate */}
          <div className="text-center pb-2">
            {confirmRegen ? (
              <div className="inline-flex items-center gap-3 text-sm">
                <span className="text-slate-500">Replace your current brand kit?</span>
                <button onClick={generateBrandKit} className="text-red-500 font-medium hover:underline">Yes, regenerate</button>
                <button onClick={() => setConfirmRegen(false)} className="text-slate-400 hover:underline">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRegen(true)}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors hover:underline"
              >
                Not happy with it? Regenerate brand kit →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !brandKit && !error && siteData && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-5 mx-auto" style={{ background: "rgba(37,99,235,0.07)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-2">Generate Your Brand Kit</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
            Your AI mentor will create a complete brand identity for your business.
          </p>
          <ul className="text-left inline-block space-y-2.5 mb-8">
            {KIT_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={generateBrandKit}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          >
            Generate Brand Kit →
          </button>
        </div>
      )}

      {/* No site yet */}
      {!loading && !brandKit && !error && !siteData && selectedProjectId && !loadingProjects && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 mb-4 mx-auto">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8l3 4-3 4M9 8l-3 4 3 4" />
            </svg>
          </div>
          <p className="text-base font-medium text-slate-700 mb-1">Ready to build your brand identity</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Select a project and generate your brand voice, logo concept, story, and tagline variations.
          </p>
        </div>
      )}
    </div>
  );
}
