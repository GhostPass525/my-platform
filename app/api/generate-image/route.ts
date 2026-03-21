import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN not set" }, { status: 500 });
  }

  let prompt: string;
  let style: string;
  try {
    const body = await req.json();
    prompt = (body.prompt ?? "").trim();
    style = body.style ?? "photo";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const styleModifier: Record<string, string> = {
    photo: "photorealistic, professional product photography, clean background",
    illustration: "flat illustration, digital art, clean vector style",
    "3d": "3D render, studio lighting, high quality CGI",
    minimal: "minimalist, white background, clean, simple",
    lifestyle: "lifestyle photography, natural light, authentic, warm",
  };

  const enhancedPrompt = `${prompt}, ${styleModifier[style] ?? styleModifier.photo}`;

  try {
    // Create prediction
    const createRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt: enhancedPrompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "webp",
          output_quality: 80,
        },
      }),
    });

    const prediction = await createRes.json();

    if (!createRes.ok || prediction.error) {
      return NextResponse.json({ error: prediction.error ?? "Replicate API error" }, { status: 500 });
    }

    // If "wait" mode returns output directly
    if (prediction.output && Array.isArray(prediction.output) && prediction.output[0]) {
      return NextResponse.json({ url: prediction.output[0] });
    }

    // Poll for result
    const predictionId = prediction.id;
    if (!predictionId) {
      return NextResponse.json({ error: "No prediction ID" }, { status: 500 });
    }

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const polled = await pollRes.json();
      if (polled.status === "succeeded" && polled.output?.[0]) {
        return NextResponse.json({ url: polled.output[0] });
      }
      if (polled.status === "failed") {
        return NextResponse.json({ error: polled.error ?? "Generation failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Generation timed out" }, { status: 504 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
