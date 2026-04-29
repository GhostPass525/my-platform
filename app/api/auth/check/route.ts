import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ loggedIn: false, hasProject: false });
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  return NextResponse.json({
    loggedIn: true,
    hasProject: (projects?.length ?? 0) > 0,
  });
}
