"use client";
import { useEffect, useState } from "react";

export type SetupStatus = {
  stripe: { connected: boolean; onboarded: boolean; accountId: string | null };
  printful: { connected: boolean };
  loading: boolean;
};

const DEFAULT: SetupStatus = {
  stripe: { connected: false, onboarded: false, accountId: null },
  printful: { connected: false },
  loading: true,
};

export function useSetupStatus() {
  const [status, setStatus] = useState<SetupStatus>(DEFAULT);

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((data) => {
        if (data?.stripe) setStatus({ ...data, loading: false });
        else setStatus((s) => ({ ...s, loading: false }));
      })
      .catch(() => setStatus((s) => ({ ...s, loading: false })));
  }, []);

  return status;
}
