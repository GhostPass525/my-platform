import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.idea) {
      return NextResponse.json(
        { error: "Missing idea input" },
        { status: 400 }
      );
    }

    // TEMP test response (no OpenAI yet)
    return NextResponse.json({
      result: `Your idea is: ${body.idea}`,
    });
  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
