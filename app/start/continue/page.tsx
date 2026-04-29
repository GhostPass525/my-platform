"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ContinueInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "build" ? "build" : "discover";
  const [status, setStatus] = useState("Continuing your session...");

  useEffect(() => {
    async function continueFlow() {
      try {
        // Retrieve the saved answer from sessionStorage
        const storageKey = mode === "build" ? "volcity_initial_intent" : "volcity_discovery_seed";
        const savedAnswer = sessionStorage.getItem(storageKey) ?? "";

        // Verify user is authenticated
        const res = await fetch("/api/auth/check");
        const { loggedIn, hasProject } = await res.json().catch(() => ({ loggedIn: false, hasProject: false }));

        if (!loggedIn) {
          router.replace("/auth/signup");
          return;
        }

        if (hasProject) {
          router.replace("/dashboard");
          return;
        }

        if (mode === "build") {
          if (!savedAnswer) {
            router.replace("/start?mode=build");
            return;
          }
          setStatus("Setting up your project...");
          const createRes = await fetch("/api/projects/create-from-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ intent: savedAnswer }),
          });
          const data = await createRes.json().catch(() => ({}));
          if (data.projectId) {
            sessionStorage.removeItem("volcity_initial_intent");
            sessionStorage.removeItem("volcity_flow_mode");
            router.replace(`/builder?project=${data.projectId}&idea=${encodeURIComponent(savedAnswer)}`);
          } else {
            router.replace("/builder");
          }
        } else {
          if (!savedAnswer) {
            router.replace("/discovery");
            return;
          }
          sessionStorage.removeItem("volcity_discovery_seed");
          sessionStorage.removeItem("volcity_flow_mode");
          router.replace(`/discovery?seed=${encodeURIComponent(savedAnswer)}`);
        }
      } catch {
        router.replace("/dashboard");
      }
    }

    continueFlow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0c0a09",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    }}>
      <div style={{
        width: 36,
        height: 36,
        border: "2px solid rgba(255,255,255,0.1)",
        borderTopColor: "rgba(255,255,255,0.6)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ fontSize: 14, color: "#78716c" }}>{status}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ContinuePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0c0a09" }} />
    }>
      <ContinueInner />
    </Suspense>
  );
}
