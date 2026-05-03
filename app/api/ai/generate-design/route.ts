import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const STYLE_MODIFIERS: Record<string, string> = {
  minimalist: 'minimalist, clean lines, simple geometric shapes, limited color palette, flat vector design',
  vintage: 'vintage retro style, distressed look, aged aesthetic, classic badge design, warm muted tones',
  bold: 'bold graphic design, high contrast, thick outlines, vibrant saturated colors, impactful composition',
  illustrated: 'detailed hand-drawn illustration, artistic linework, painterly or ink style, expressive',
  abstract: 'abstract art, geometric forms, non-representational, dynamic shapes, artistic composition',
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  if (!hasOpenAI) {
    return NextResponse.json({ comingSoon: true });
  }

  let body: { prompt?: string; style?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { prompt, style = 'minimalist' } = body;
  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

  const styleDesc = STYLE_MODIFIERS[style] ?? STYLE_MODIFIERS.minimalist;

  // Use Claude to enhance the prompt — must output ONLY the flat artwork, never a product
  const anthropic = new Anthropic();
  let enhancedPrompt: string;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Create an image generation prompt for a print-ready flat graphic design based on: "${prompt.trim()}"
Style: ${styleDesc}
CRITICAL RULES:
- Output ONLY the artwork/logo/illustration itself on a plain white background
- NEVER include any clothing, t-shirts, hoodies, fabric, product mockups, mannequins, or people wearing anything
- The design must be isolated flat artwork suitable for screen printing
- Centered composition, high contrast, clean edges
Return ONLY the image generation prompt, nothing else. Keep it under 120 words.`,
      }],
    });
    enhancedPrompt = ((msg.content[0] as { type: string; text: string }).text || '').trim();
    console.log('[generate-design] enhanced prompt:', enhancedPrompt);
  } catch (err) {
    console.warn('[generate-design] Claude enhancement failed, using fallback:', err);
    enhancedPrompt = `Flat graphic design artwork: ${prompt.trim()}, ${styleDesc}, isolated on plain white background, print-ready, centered composition, high contrast, clean edges. No clothing, no products, no mockups.`;
  }

  // Wrap in a hard constraint shell that DALL-E always sees
  const buildDallePrompt = (base: string, variant: string) => {
    const variantSuffix = variant === 'alt' ? ' Alternative composition of the same concept.' : '';
    return `Flat print-ready graphic design artwork on a plain white background. ONLY show the design/logo/illustration itself — do NOT show any t-shirt, hoodie, clothing, fabric, product, mockup, mannequin, or person. The image must contain ONLY the isolated artwork centered on white.

Design: ${base}${variantSuffix}

Important: isolated artwork on white background only. No products. No clothing. No mockups.`;
  };

  // Generate 2 images in parallel with DALL-E 3
  const openaiHeaders: Record<string, string> = {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    'Content-Type': 'application/json',
  };

  const generateOne = async (seed: string): Promise<string> => {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: openaiHeaders,
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: buildDallePrompt(enhancedPrompt, seed),
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      }),
    });
    const data = await res.json() as { data?: Array<{ url: string }>; error?: { message: string } };
    if (!res.ok || !data.data?.[0]?.url) {
      throw new Error(data.error?.message || `DALL-E error ${res.status}`);
    }
    return data.data[0].url;
  };

  let dalleUrls: string[];
  try {
    dalleUrls = await Promise.all([generateOne('primary'), generateOne('alt')]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generate-design] DALL-E generation failed:', msg);
    return NextResponse.json({ error: `Image generation failed: ${msg}` }, { status: 502 });
  }

  // Download and re-upload to Supabase Storage for persistence (DALL-E URLs expire)
  const uploadToStorage = async (imageUrl: string): Promise<string> => {
    const resp = await fetch(imageUrl);
    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `ai-design/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error } = await supabase.storage
      .from('product-design')
      .upload(filename, buffer, { contentType: 'image/png', upsert: false });
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabase.storage.from('product-design').getPublicUrl(filename);
    return publicUrl;
  };

  let imageUrls: string[];
  try {
    imageUrls = await Promise.all(dalleUrls.map(uploadToStorage));
  } catch (err) {
    console.warn('[generate-design] Supabase upload failed, using DALL-E URLs:', err);
    imageUrls = dalleUrls;
  }

  // Track usage
  supabase.from('ai_generations').insert({
    user_id: user.id,
    prompt: prompt.trim(),
    image_url: imageUrls[0],
    cost: 0.08,
  }).then(({ error }) => { if (error) console.warn('[generate-design] usage tracking failed:', error.message); });

  return NextResponse.json({ imageUrls });
}
