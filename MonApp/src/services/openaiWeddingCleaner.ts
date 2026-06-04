import * as LegacyFileSystem from 'expo-file-system/legacy';
import type { WeddingOverlay } from '@/src/types/weddingCard';

// gpt-image-1 is the OpenAI model for image editing.
const OPENAI_EDITS_ENDPOINT = 'https://api.openai.com/v1/images/edits';

type CleanerParams = {
  apiKey: string;
  imageBase64: string;
  imageMimeType: string;
  overlays: WeddingOverlay[];
};

export async function cleanWeddingCardWithOpenAI(params: CleanerParams): Promise<string> {
  const { apiKey, imageBase64, imageMimeType, overlays } = params;
  const key = apiKey.trim();
  if (!key) return imageBase64;

  let imageFileUri = '';
  try {
    imageFileUri = await writeBase64ImageToCache(imageBase64, imageMimeType);

    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('image', {
      uri: imageFileUri,
      name: `card.${getFileExtension(imageMimeType)}`,
      type: imageMimeType,
    } as unknown as Blob);
    formData.append('prompt', buildCleanPrompt(overlays));
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('response_format', 'b64_json');

    const response = await fetch(OPENAI_EDITS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
      },
      body: formData,
    });

    if (!response.ok) {
      console.warn('[OpenAI cleaner] Erreur:', response.status, await response.text());
      return imageBase64;
    }

    const json = (await response.json()) as { data?: Array<{ b64_json?: string }> };
    const cleaned = json.data?.[0]?.b64_json;
    return cleaned || imageBase64;
  } catch (err) {
    console.warn('[OpenAI cleaner] Exception:', err);
    return imageBase64;
  } finally {
    if (imageFileUri) {
      try {
        await LegacyFileSystem.deleteAsync(imageFileUri, { idempotent: true });
      } catch {
        // Ignore cache cleanup errors.
      }
    }
  }
}

function buildCleanPrompt(overlays: WeddingOverlay[]): string {
  const zones = overlays.map((ov) => ({
    id: ov.id,
    source_box: ov.source_box || {
      x_pct: ov.x_pct,
      y_pct: ov.y_pct,
      width_pct: ov.width_pct,
      height_pct: ov.height_pct,
    },
    original_text: ov.original_text || ov.text || '',
  }));

  return `Remove only the old text from this wedding card and keep the original design intact.
Keep ornaments, flourishes, Hebrew decorations, borders, paper texture, envelope, shadows, and colors unchanged.
Do not add any new text. Do not redesign. Do not alter layout.

Text zones to clean (percent coordinates):
${JSON.stringify(zones, null, 2)}

Result: same card, but with clean empty areas where old text existed.`;
}

async function writeBase64ImageToCache(base64: string, mimeType: string): Promise<string> {
  const dir = LegacyFileSystem.cacheDirectory || LegacyFileSystem.documentDirectory;
  if (!dir) throw new Error('File system directory unavailable');
  const ext = getFileExtension(mimeType);
  const fileUri = `${dir}openai_card_${Date.now()}.${ext}`;
  await LegacyFileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: LegacyFileSystem.EncodingType.Base64,
  });
  return fileUri;
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}
