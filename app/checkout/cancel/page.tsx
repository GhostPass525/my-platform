export default function Cancel({
  searchParams,
}: {
  searchParams: { pid?: string };
}) {
  const pid = searchParams?.pid || "";
  return (
    <main className="min-h-screen bg-white p-10">
      <div className="max-w-xl mx-auto border rounded-2xl p-6">
        <div className="text-2xl font-semibold">Checkout canceled</div>
        <p className="text-slate-600 mt-2">
          No worries — you can try again anytime.
        </p>

        {pid && (
          <a
            className="inline-block mt-5 px-4 py-2 rounded-lg bg-black text-white"
            href={`/s/${pid}`}
          >
            Back to store
          </a>
        )}
      </div>
    </main>
  );
}