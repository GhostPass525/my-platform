import { Suspense } from "react";
import ConnectClient from "./connect-client";

export default function ConnectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}>
      <ConnectClient />
    </Suspense>
  );
}
