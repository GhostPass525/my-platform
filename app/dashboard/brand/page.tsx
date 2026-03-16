import { Suspense } from "react";
import BrandClient from "./brand-client";

export default function BrandPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}>
      <BrandClient />
    </Suspense>
  );
}
