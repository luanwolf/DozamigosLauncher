/** Bot UA gets the full cosmetics page; normal browsers hit Cloudflare. */
const FNGG_PAGE_UA = 'facebookexternalhit/1.1';
const VIDEO_TAG_RE = /class='item-video'[^>]*data-id='(\d+)'[^>]*data-v='([^']*)'/i;
const STYLE_RE = /data-idx='(\d+)'\s+onclick='item(?:One)?Style\(this,"([^"]*)"\)'><img src='([^']+)'/gi;

export type CosmeticStylePreview = {
  name: string;
  image: string;
  video: string;
};

export type CosmeticPreview = {
  /** Turntable of the default style, or null when fortnite.gg has no clip. */
  video: string | null;
  styles: CosmeticStylePreview[];
};

const EMPTY: CosmeticPreview = { video: null, styles: [] };
const cache = new Map<string, CosmeticPreview>();

function cosmeticsPageUrl(cosmeticId: string) {
  return `https://fortnite.gg/cosmetics?id=${encodeURIComponent(cosmeticId)}`;
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Reads the turntable and its per-style clips out of a fortnite.gg item page.
 *
 * Styles come grouped per channel (outfit, scarf, glasses…) and each group
 * restarts at index 1, so the clip of one selection is the whole index vector
 * with every other channel left on its default: video-2-1-1.mp4.
 */
export function parseCosmeticPreview(html: string): CosmeticPreview {
  const tag = html.match(VIDEO_TAG_RE);
  if (!tag) return EMPTY;

  const [, id, version] = tag;
  const query = version ? `?${version}` : '';
  const base = `https://fnggcdn.com/items/${id}`;
  const video = `${base}/video.mp4${query}`;

  const entries = [...html.matchAll(STYLE_RE)].map(([, idx, name, image]) => ({
    idx: Number(idx),
    name: decodeEntities(name!),
    image: image!.startsWith('http') ? image! : `https://fortnite.gg${image}`
  }));

  let groups = 0;
  const channelOf = entries.map((entry) => (entry.idx === 1 ? groups++ : groups - 1));

  const styles = entries.map((entry, position) => {
    const vector = Array.from({ length: groups }, (_, channel) =>
      channel === channelOf[position] ? entry.idx : 1
    );
    return {
      name: entry.name,
      image: entry.image,
      video: vector.every((index) => index === 1) ? video : `${base}/video-${vector.join('-')}.mp4${query}`
    };
  });

  return { video, styles };
}

/**
 * fortnite.gg refuses cross-site image requests, so the thumbnails come from
 * Epic's catalog (also localised) and only the clips come from fortnite.gg.
 * Both lists follow the same channel order, so they pair up by position.
 */
export function mergeStyles(
  catalogStyles: { name: string; image: string }[],
  preview: CosmeticPreview
): { name: string; image: string; video?: string }[] {
  if (!catalogStyles.length) return preview.styles;
  if (catalogStyles.length !== preview.styles.length) return catalogStyles;

  return catalogStyles.map((style, index) => ({ ...style, video: preview.styles[index]!.video }));
}

export async function resolveCosmeticPreview(cosmeticId: string): Promise<CosmeticPreview> {
  const id = cosmeticId.trim();
  if (!id) return EMPTY;

  const cached = cache.get(id);
  if (cached) return cached;

  try {
    // Keeps the pure parser runnable in Bun selfchecks without a Tauri runtime.
    const { tauriKy } = await import('$lib/http');
    const html = await tauriKy
      .get(cosmeticsPageUrl(id), {
        headers: { 'X-User-Agent': FNGG_PAGE_UA },
        timeout: 12_000
      })
      .text();

    const preview = parseCosmeticPreview(html);
    // Don't cache a Cloudflare challenge as "this item has no video".
    if (!preview.video && /challenge-platform|cf-challenge|Just a moment/i.test(html)) return EMPTY;

    cache.set(id, preview);
    return preview;
  } catch {
    return EMPTY;
  }
}
