"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type ConnectStatus = {
  connected: boolean;
  connected_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
};

export default function ConnectClient() {
  const searchParams = useSearchParams();
  const isConnected = searchParams.get("connected") === "1";
  const isRefresh = searchParams.get("refresh") === "1";

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connect/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const startOnboarding = useCallback(async () => {
    setOnboarding(true);
    setError(null);
    try {
      const res = await fetch("/api/connect/onboard", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        const msg = data?.error || "";
        if (msg.toLowerCase().includes("connect")) {
          setError("CONNECT_NOT_ENABLED");
        } else {
          setError(msg || "Failed to start Stripe onboarding. Please try again.");
        }
        setOnboarding(false);
      }
    } catch (e: any) {
      setError(e?.message || "Network error. Please try again.");
      setOnboarding(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (isConnected) {
      setShowBanner(true);
      const t = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isRefresh && !loading && status && !status.charges_enabled) {
      startOnboarding();
    }
  }, [isRefresh, loading, status, startOnboarding]);

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Stripe Connect</h1>
        <p className="text-sm text-slate-500 mt-0.5">Receive payments directly to your bank account</p>
      </div>

      {/* Error banner */}
      {error && error !== "CONNECT_NOT_ENABLED" && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Success banner */}
      {showBanner && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Your Stripe account is connected!
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <svg
              className="animate-spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            Loading account status…
          </div>
        </div>
      ) : !status?.connected ? (
        /* State 1: Not connected */
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {error === "CONNECT_NOT_ENABLED" ? (
            <div className="flex flex-col items-start gap-5">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Create or connect a Stripe account</h2>
                <p className="text-sm text-slate-500 max-w-sm">
                  You need a Stripe account to receive payments. Sign up for free — it only takes a few minutes.
                </p>
              </div>
              <a
                href="https://dashboard.stripe.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150 flex items-center gap-2"
              >
                Sign up for Stripe
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <p className="text-xs text-slate-400">Already have an account? <button onClick={() => { setError(null); startOnboarding(); }} className="underline text-slate-500 hover:text-slate-700">Try connecting again</button></p>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Connect your Stripe account</h2>
                <p className="text-sm text-slate-500 max-w-sm">
                  Accept payments from your customers directly. VentureOS takes a{" "}
                  <span className="font-medium text-slate-700">1% platform fee</span> per sale.
                </p>
              </div>
              <button
                onClick={startOnboarding}
                disabled={onboarding}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {onboarding ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Redirecting…
                  </>
                ) : (
                  "Connect Stripe Account"
                )}
              </button>
            </div>
          )}
        </div>
      ) : !status.charges_enabled ? (
        /* State 2: Connected but not fully onboarded */
        <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/30 p-6">
          <div className="flex flex-col items-start gap-5">
            <div className="h-12 w-12 rounded-xl bg-yellow-50 flex items-center justify-center">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ca8a04"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Finish setting up your account
              </h2>
              <p className="text-sm text-slate-500 max-w-sm">
                Complete Stripe onboarding to start receiving payments.
              </p>
            </div>
            <button
              onClick={startOnboarding}
              disabled={onboarding}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-yellow-500 hover:bg-yellow-600 text-white transition-colors duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {onboarding ? (
                <>
                  <svg
                    className="animate-spin"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Redirecting…
                </>
              ) : (
                "Complete Setup"
              )}
            </button>
          </div>
        </div>
      ) : (
        /* State 3: Fully connected */
        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Connected to Stripe
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Your account is active and ready to accept payments.
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-sm text-slate-600">Account ID</span>
                <span className="text-sm font-mono font-medium text-slate-800">
                  {status.connected_account_id}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-sm text-slate-600">Payments</span>
                <span className="text-sm font-medium text-emerald-700">Enabled</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-sm text-slate-600">Payouts</span>
                <span
                  className={`text-sm font-medium ${
                    status.payouts_enabled ? "text-emerald-700" : "text-yellow-600"
                  }`}
                >
                  {status.payouts_enabled ? "Enabled" : "Pending"}
                </span>
              </div>
            </div>

            <div>
              <a
                href="https://dashboard.stripe.com/express"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors duration-200 shadow-sm"
              >
                Manage Account
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
