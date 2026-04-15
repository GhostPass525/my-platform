import DashboardNav from "./dashboard-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "#F5F4F1" }}>
      <DashboardNav />
      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
