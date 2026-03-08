import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Sanitize filename: strip path separators and non-safe characters
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);

    const blob = await put(`ventureos/${Date.now()}-${safeName}`, file, {
      access: "public",
    });

    return NextResponse.json({ url: blob.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
