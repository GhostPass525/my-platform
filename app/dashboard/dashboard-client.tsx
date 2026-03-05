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

    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Your Projects</h1>

        {creating ? (
          <form onSubmit={createProject} className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 w-48"
            />
            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewName(""); }}
              className="px-3 py-1.5 rounded-lg text-sm border border-slate-200"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:opacity-90 transition"
          >
            + New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-slate-400 text-lg mb-2">No projects yet</div>
          <p className="text-sm text-slate-400 mb-6">
            Start building your first store with VentureOS AI.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:opacity-90 transition"
          >
            Start building →
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col"
            >
              <div className="flex-1">
                <div className="font-semibold text-slate-900 truncate">
                  {project.name}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Saved {timeAgo(project.updated_at)}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => router.push(`/?project=${project.id}`)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:opacity-90 transition"
                >
                  Open
                </button>
                <button
                  onClick={() => deleteProject(project.id)}
                  className="px-3 py-2 rounded-lg text-sm border border-slate-200 text-red-500 hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
