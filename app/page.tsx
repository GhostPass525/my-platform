import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Nav from "@/components/marketing/Nav";
import Hero from "@/components/marketing/Hero";
import SocialProof from "@/components/marketing/SocialProof";
import ProblemSolution from "@/components/marketing/ProblemSolution";
import HowItWorks from "@/components/marketing/HowItWorks";
import Features from "@/components/marketing/Features";
import Testimonials from "@/components/marketing/Testimonials";
import Pricing from "@/components/marketing/Pricing";
import FAQ from "@/components/marketing/FAQ";
import FinalCTA from "@/components/marketing/FinalCTA";
import Footer from "@/components/marketing/Footer";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div style={{ fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
      <Nav />
      <Hero />
      <SocialProof />
      <ProblemSolution />
      <HowItWorks />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
