import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { idea, messages } = body as {
    idea: {
      name: string;
      tagline: string;
      target: string;
      products: { name: string; price: number }[];
      positioning: string;
      whyFits: string;
    };
    messages: Array<{ role: string; content: string }>;
  };

  if (!idea?.name) {
    return NextResponse.json({ error: "No idea provided" }, { status: 400 });
  }

  // Save discovery answers to profile
  const discoveryAnswers = {
    conversation: messages,
    chosenIdea: idea,
    completedAt: new Date().toISOString(),
  };

  await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      discovery_answers: discoveryAnswers,
      discovery_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  // Create a project with the idea pre-filled
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name: idea.name })
    .select("id, name")
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: projectError?.message ?? "Failed to create project" },
      { status: 500 }
    );
  }

  // Seed the project's mentor messages with context about why they chose this
  const seedMessage = `I just helped you discover your business idea through our conversation. You chose to build "${idea.name}" — ${idea.tagline}. Target customer: ${idea.target}. ${idea.whyFits} Your initial products: ${idea.products.map((p) => `${p.name} ($${p.price})`).join(", ")}.`;

  await supabase.from("mentor_messages").insert({
    user_id: user.id,
    project_id: project.id,
    role: "assistant",
    content: seedMessage,
  });

  return NextResponse.json({ projectId: project.id, projectName: project.name });
}
