"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-900 placeholder:text-slate-400"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white text-slate-900 placeholder:text-slate-400"
          placeholder="Min. 6 characters"
        />
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 animate-fadeIn">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
      >
        {loading && (
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
        )}
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-sm text-center text-slate-500 pt-1">
        Already have an account?{" "}
        <a href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
          Sign in
        </a>
      </p>
    </form>
  );
}
