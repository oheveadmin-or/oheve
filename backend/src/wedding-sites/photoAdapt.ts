/**
 * Ré-adaptation IA d'une photo à l'ambiance d'un thème de faire-part.
 *
 * On garde le couple / les personnes intacts et on ne retouche QUE l'ambiance
 * (lumière, colorimétrie, grain, décor) pour coller au thème choisi. Le moteur
 * est Google Gemini 2.5 Flash Image (« Nano Banana »), appelé en REST — aucune
 * dépendance npm supplémentaire (fetch global, Node ≥ 18).
 *
 * Activé uniquement si GEMINI_API_KEY est présent côté serveur (Railway). Sans
 * clé, l'endpoint répond 501 avec un message clair → le front désactive le
 * bouton proprement.
 */

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export function isPhotoAIEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/** Descripteur d'ambiance par thème (les visibles sont soignés ; sinon fallback). */
const THEME_MOOD: Record<string, string> = {
  'voile-ivoire':
    'romantic ivory and cream palette, soft dreamy diffused light, warm golden glow, airy and delicate, veil-like haze, timeless fine-art wedding editorial',
  'vintage-blue':
    'dusty blue and ivory vintage palette, gentle film grain, nostalgic warm tones, soft faded highlights, analog film photography feel',
  'stripes-editorial':
    'high-end fashion editorial look, crisp clean contrast, warm ivory and neutral tones, elegant magazine styling',
  'editorial-cards':
    'modern refined editorial, muted sophisticated neutral palette, clean minimal styling, premium print quality',
  classic:
    'timeless elegant palette, soft neutral tones, refined and understated, classic fine-art wedding photography',
  boho:
    'bohemian warm earthy palette, natural sunlight, pampas and terracotta tones, relaxed organic mood',
  luxury:
    'opulent luxury palette, rich warm highlights, glossy premium editorial finish',
  romantic:
    'soft romantic blush palette, warm gentle light, dreamy and tender atmosphere',
  parisian:
    'chic parisian palette, soft grey and cream tones, elegant understated film look',
  'art-deco':
    'art-deco elegance, warm gold and deep neutral tones, glamorous 1920s editorial finish',
};

const FALLBACK_MOOD =
  'elegant fine-art wedding editorial ambiance, soft natural light, refined harmonious colour grading';

/**
 * Construit l'instruction envoyée au modèle. On insiste lourdement sur la
 * préservation des visages/personnes et de la composition — seul l'habillage
 * change. Une palette optionnelle (hex du thème live) affine la colorimétrie.
 */
export function buildAdaptPrompt(
  style: string,
  palette?: { background?: string; text?: string; accent?: string },
): string {
  const mood = THEME_MOOD[style] ?? FALLBACK_MOOD;
  const paletteHint =
    palette && (palette.background || palette.accent || palette.text)
      ? ` Nudge the overall colour grading toward this palette where it feels natural — background ${palette.background ?? 'n/a'}, accent ${palette.accent ?? 'n/a'}, ink ${palette.text ?? 'n/a'}.`
      : '';
  return [
    'You are a professional wedding photo retoucher and photo editor.',
    'Re-grade the mood and atmosphere of this photograph to match the following aesthetic:',
    mood + '.',
    'Keep the same people, faces, poses, clothing and identities EXACTLY as they are — do not change identities, do not add or remove anyone, do not distort faces.',
    // Recadrage intelligent : détecter le sujet principal et le composer proprement.
    'Detect the main subject (the couple / the people / the most important element) and recompose the framing so it is well balanced and pleasingly centered, with comfortable breathing room around it.',
    'Every face must stay fully visible — never crop faces, heads or the main subject out of frame; if you need more room, extend the background naturally rather than cutting the subject.',
    'Only adjust framing, lighting, colour grading, tone, contrast, texture and background ambiance so the photo feels like it belongs to that theme.',
    'The result must stay photorealistic and natural.' + paletteHint,
    'Return only the edited image.',
  ].join(' ');
}

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

/**
 * Envoie l'image + le prompt à Gemini et renvoie l'image éditée.
 * Lève une erreur avec message lisible en cas d'échec.
 */
export async function adaptPhotoWithGemini(
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<{ data: string; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('IA non configurée (GEMINI_API_KEY manquant)');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }],
          },
        ],
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error("Le service IA n'a pas répondu à temps, réessaie.");
    }
    throw new Error('Connexion au service IA impossible.');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    let detail = '';
    try {
      const j = (await res.json()) as { error?: { message?: string } };
      detail = j.error?.message ? ` — ${j.error.message}` : '';
    } catch { /* ignore */ }
    throw new Error(`Service IA indisponible (${res.status})${detail}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    const data = inline?.data;
    if (data) {
      const mt =
        (part.inlineData?.mimeType || part.inline_data?.mime_type) ?? 'image/png';
      return { data, mimeType: mt };
    }
  }
  throw new Error("L'IA n'a renvoyé aucune image (réessaie ou change de photo).");
}
