export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string }>;
}) {
  const { pid = "" } = await searchParams;
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 mb-5">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Payment successful
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Your order is confirmed. You'll receive a confirmation email from
          Stripe shortly.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {pid && (
            <a
              href={`/s/${pid}`}
              className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150"
            >
              Back to store
            </a>
          )}
          <a
            href="/dashboard/orders"
            className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors duration-150"
          >
            View orders dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
