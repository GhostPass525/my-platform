import DashboardNav from "./dashboard-nav";
import FeedbackButton from "./feedback-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "#F5F4F1" }}>
      <DashboardNav />
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
      <FeedbackButton />
    </div>
  );
}
