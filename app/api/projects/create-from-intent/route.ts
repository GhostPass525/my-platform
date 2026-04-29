import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { intent } = body as { intent: string };

  if (!intent?.trim()) {
    return NextResponse.json({ error: "Intent is required" }, { status: 400 });
  }

  // Derive a project name from the intent (first few words)
  const name = intent.trim().slice(0, 60) || "My Business";

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name })
    .select("id, name")
    .single();

  if (error || !project) {
    return NextResponse.json({ error: error?.message ?? "Failed to create project" }, { status: 500 });
  }

  // Seed the project chat with the user's intent as the first message
  await supabase.from("mentor_messages").insert({
    user_id: user.id,
    project_id: project.id,
    role: "user",
    content: intent,
  });

  return NextResponse.json({ projectId: project.id, projectName: project.name });
}
