"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ProjectInitial({ name }: { name: string }) {
  const letter = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-sm shadow-sm shadow-blue-200 flex-shrink-0">
      {letter}
    </div>
  );
}

export default function DashboardClient({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (data?.id) {
        router.push(`/?project=${data.id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;

    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to delete project. Please try again.");
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Your Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your workspace</p>
        </div>

        {creating ? (
          <form onSubmit={createProject} className="flex items-center gap-2 animate-slideUp">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200 w-48 bg-white"
            />
            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewName(""); }}
              className="px-3 py-2 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors duration-150"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 shadow-sm shadow-blue-200 flex items-center gap-1.5"
          >
            <span className="text-lg leading-none">+</span> New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24 animate-fadeIn">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </div>
          <div className="text-lg font-semibold text-slate-700 mb-2">No projects yet</div>
          <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
            Start building your first AI-powered store with VentureOS.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 shadow-sm shadow-blue-200"
          >
            Start building →
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <button
                onClick={() => deleteProject(project.id)}
                className="absolute top-3 right-3 h-7 w-7 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors duration-150 opacity-0 group-hover:opacity-100 flex items-center justify-center text-base leading-none"
                title="Delete project"
              >
                ×
              </button>

              <div className="flex items-center gap-3 flex-1">
                <ProjectInitial name={project.name} />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {project.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Saved {timeAgo(project.updated_at)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => router.push(`/?project=${project.id}`)}
                  className="w-full px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
