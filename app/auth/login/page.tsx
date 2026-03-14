import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-slideUp">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-blue-600 mb-5 shadow-md shadow-blue-200/60">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your VentureOS account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
          <Suspense fallback={<div className="h-40 rounded-xl bg-slate-100 animate-pulse" />}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-6">
          By signing in you agree to our{" "}
          <span className="text-slate-500">Terms of Service</span> and{" "}
          <span className="text-slate-500">Privacy Policy</span>.
        </p>
      </div>
    </main>
  );
}
