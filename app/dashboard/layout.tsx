import DashboardNav from "./dashboard-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav />
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
