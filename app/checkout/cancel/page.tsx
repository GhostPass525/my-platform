export default async function Cancel({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string }>;
}) {
  const { pid = "" } = await searchParams;
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 p-7 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-100 mb-5">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748b"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-lg font-semibold text-slate-900 mb-2 tracking-tight">
          Checkout canceled
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          No worries — you can try again anytime.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {pid && (
            <a
              href={`/s/${pid}`}
              className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors duration-150"
            >
              Back to store
            </a>
          )}
          <a
            href="/dashboard"
            className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors duration-150"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
