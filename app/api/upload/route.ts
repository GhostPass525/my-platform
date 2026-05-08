import { NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log('Upload attempt:', {
      fileName: (file as File).name ?? '(blob)',
      fileSize: file.size,
      fileType: file.type,
    });

    if (file.size === 0) {
      console.error('Upload failed: file/blob is empty (0 bytes)');
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // Canvas output arrives as a Blob (no .name) — fall back to a generated name
    const originalName = (file as File).name ?? `canvas-${Date.now()}.png`;
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const contentType = file.type || "image/png";
    const fileName = `designs/${Date.now()}-${safeName}`;

    // Convert to Buffer — required for Node.js runtime; raw File/Blob may not upload correctly
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storage = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await storage.storage
      .from("designs")
      .upload(fileName, buffer, { contentType, upsert: true });

    if (error) {
      console.error('Supabase Storage upload error:', JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Upload success:', { path: data?.path });

    const { data: { publicUrl } } = storage.storage
      .from("designs")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    console.error('Upload route exception:', e);
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
