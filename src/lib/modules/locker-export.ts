import * as path from '@tauri-apps/api/path';
import { mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { ItemColors } from '$lib/constants/item-colors';
import { tauriKy } from '$lib/http';
import { mapPool } from '$lib/modules/map-pool';
import {
  gridColumns,
  gridPixelSize,
  EXPORT_SCALE,
  LOCKER_EXPORT_CELL,
  LOCKER_EXPORT_FOOTER,
  LOCKER_EXPORT_GAP,
  LOCKER_EXPORT_HEADER,
  LOCKER_EXPORT_PAD
} from '$lib/modules/locker-export-layout';
import { rarityBackgroundSlug } from '$lib/modules/locker-export-rarity';
import { sortLockerItemsForExport } from '$lib/modules/locker-export-sort';
import type { LockerOwnedItem } from '$lib/modules/locker-parse';
import { dataDirectory } from '$lib/storage/file-store';

export {
  rarityBackgroundSlug,
  rarityBackgroundStyle,
  rarityBackgroundUrl
} from '$lib/modules/locker-export-rarity';

export const WEBP_QUALITY = 0.85;
const NAME_BAND = 34;
/** Fortnite display face — load from /fonts; falls back to Impact/Teko if missing. */
export const DISPLAY_FONT = '"Burbank Big Condensed Black", Impact, Teko, sans-serif';
/** Item names and footer: the condensed display face is unreadable at tile size. */
export const UI_FONT = 'Barlow, "Segoe UI", system-ui, sans-serif';
const FONT_FAMILY = 'Burbank Big Condensed Black';
const FONT_CANDIDATES = [
  '/fonts/BurbankBigCondensed-Black.otf',
  '/fonts/BurbankBigCondensed-Black.ttf',
  '/fonts/BurbankBigCondensedBlack.otf',
  '/fonts/BurbankBigCondensedBlack.ttf'
];
export const APP_ICON_URL = '/icons/app.png';
export const APP_NAME = 'Dozamigos Launcher';
/** fortnite-api.com mark — loaded at export time (shop/locker/leaks source). */
export const FORTNITE_API_LOGO_URL = 'https://fortnite-api.com/assets/img/logo_128.png';
export const FORTNITE_API_CREDIT = 'fortnite-api.com';

const rarityColors: Record<string, string> = {
  ...ItemColors.rarities,
  ...ItemColors.series
};

const rarityBgCache = new Map<string, Promise<ImageBitmap | null>>();
/** Bytes stay cached so a second export of the same category doesn't re-download. ImageBitmaps are closed after draw. */
const imageBufCache = new Map<string, Promise<ArrayBuffer | null>>();
/** Unlimited parallel tauri HTTP stalls the plugin on big lockers; 12 keeps the pipe full. */
const EXPORT_FETCH_CONCURRENCY = 12;

/** Optional second line (e.g. Sprite status) and dimming for entries the account does not own. */
export type LockerExportItem = LockerOwnedItem & { note?: string; faded?: boolean };

export type LockerExportOptions = {
  items: LockerExportItem[];
  categorySlug: string;
  categoryLabel: string;
  accountLabel?: string;
  onProgress?: (progress: { done: number; total: number }) => void;
};

export type LockerExportResult = {
  count: number;
  path: string;
};

export { gridColumns, gridPixelSize, EXPORT_SCALE } from '$lib/modules/locker-export-layout';
export { sortLockerItemsForExport, lockerSortRank } from '$lib/modules/locker-export-sort';

export function sanitizeFilename(value: string) {
  return (
    value
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'locker'
  );
}

function rarityKey(rarity: string) {
  return rarity.toLowerCase().replace(/\s+/g, '');
}

/** Cached load of `/rarities/{slug}.png` (null if missing). */
export function loadRarityBackground(item: {
  rarity: string;
  series?: string;
}): Promise<ImageBitmap | null> {
  const slug = rarityBackgroundSlug(item);
  let pending = rarityBgCache.get(slug);
  if (!pending) {
    pending = loadBitmap(`/rarities/${slug}.png`);
    rarityBgCache.set(slug, pending);
  }
  return pending;
}

/** Trims to what actually fits, so names never squeeze or spill out of the tile. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let end = text.length;
  while (end > 1 && ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth) end -= 1;
  return `${text.slice(0, end).trimEnd()}…`;
}

/** Thin black outline so header title/subtitle stay readable on any collage bg. */
export function fillOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth?: number
) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, x, y, maxWidth);
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

function shadeHex(hex: string, factor: number): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const n = Number.parseInt(raw, 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * factor)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  bmp: ImageBitmap,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.max(w / bmp.width, h / bmp.height);
  const dw = bmp.width * scale;
  const dh = bmp.height * scale;
  ctx.drawImage(bmp, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Prefer `/rarities/*.png`; solid gradient only if the asset failed to load. */
export function fillRarityBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  item: { rarity: string; series?: string },
  background?: ImageBitmap | null
) {
  if (background) {
    drawCover(ctx, background, x, y, w, h);
    return;
  }

  const tone = item.series || item.rarity;
  const base = rarityColors[rarityKey(tone)] || rarityColors.common;
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, shadeHex(base, 1.15));
  grad.addColorStop(0.55, base);
  grad.addColorStop(1, shadeHex(base, 0.45));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

async function downloadBuffer(url: string): Promise<ArrayBuffer> {
  if (url.startsWith('/') || url.startsWith('blob:')) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  }
  try {
    const res = await fetch(url);
    if (res.ok) return res.arrayBuffer();
  } catch {
    // CORS / cache — Tauri HTTP still reaches fortnite-api.com
  }
  return tauriKy.get(url).arrayBuffer();
}

export async function loadBitmap(url: string): Promise<ImageBitmap | null> {
  if (!url) return null;
  let pending = imageBufCache.get(url);
  if (!pending) {
    pending = downloadBuffer(url).catch(() => null);
    imageBufCache.set(url, pending);
  }
  const buf = await pending;
  if (!buf) return null;
  try {
    return await createImageBitmap(new Blob([buf]));
  } catch {
    return null;
  }
}

export async function loadBitmaps(
  urls: string[],
  onProgress?: (progress: { done: number; total: number }) => void
): Promise<(ImageBitmap | null)[]> {
  const total = urls.length;
  onProgress?.({ done: 0, total });
  let done = 0;
  const settled = await mapPool(
    urls,
    async (url) => {
      const bmp = await loadBitmap(url);
      done += 1;
      onProgress?.({ done, total });
      return bmp;
    },
    EXPORT_FETCH_CONCURRENCY
  );
  return settled.map((result) => (result.status === 'fulfilled' ? result.value : null));
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export async function ensureDisplayFont() {
  if (typeof document === 'undefined') return;

  if (document.fonts.check(`900 56px "${FONT_FAMILY}"`)) return;

  for (const url of FONT_CANDIDATES) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const face = new FontFace(FONT_FAMILY, await res.arrayBuffer(), {
        weight: '900',
        style: 'normal'
      });
      await face.load();
      document.fonts.add(face);
      return;
    } catch {
      // try next candidate
    }
  }

  try {
    await document.fonts.load(`900 56px ${DISPLAY_FONT}`);
  } catch {
    // Impact/Teko fallback still usable
  }
}

export async function saveExportBlob(blob: Blob, filename: string): Promise<string> {
  const dir = await path.join(dataDirectory, 'exports');
  await mkdir(dir, { recursive: true });
  const filePath = await path.join(dir, filename);
  await writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
  return filePath;
}

/** Logical layout coords; bitmap is EXPORT_SCALE× for screen sharpness. */
export function createExportCanvas(logicalWidth: number, logicalHeight: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(logicalWidth * EXPORT_SCALE);
  canvas.height = Math.round(logicalHeight * EXPORT_SCALE);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  return { canvas, ctx };
}

/** Bottom-left fortnite-api credit when the collage is built from that source. */
export async function drawFortniteApiCredit(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  footerHeight: number,
  pad: number
) {
  const footerY = height - footerHeight / 2;
  const iconSize = 26;
  const logo = await loadBitmap(FORTNITE_API_LOGO_URL);
  let x = pad;

  if (logo) {
    ctx.drawImage(logo, x, footerY - iconSize / 2, iconSize, iconSize);
    x += iconSize + 8;
    logo.close();
  }

  ctx.font = `600 16px ${UI_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(FORTNITE_API_CREDIT, x, footerY);

  // Right side: app mark (small), when there is room.
  const appIcon = await loadBitmap(APP_ICON_URL);
  ctx.font = `500 14px ${UI_FONT}`;
  const appW = ctx.measureText(APP_NAME).width;
  const appIconSize = 18;
  const rightBlock = (appIcon ? appIconSize + 6 : 0) + appW;
  let rightX = width - pad - rightBlock;
  if (rightX > x + 120) {
    if (appIcon) {
      ctx.drawImage(appIcon, rightX, footerY - appIconSize / 2, appIconSize, appIconSize);
      rightX += appIconSize + 6;
      appIcon.close();
    } else {
      appIcon?.close();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(APP_NAME, rightX, footerY);
  } else {
    appIcon?.close();
  }
}

/**
 * Sequential WebP collage of one locker category, sorted by series → mythic → …
 * common, with skin names on each tile.
 */
export async function exportLockerCategoryWebp(options: LockerExportOptions): Promise<LockerExportResult> {
  const { items, categorySlug, categoryLabel, accountLabel, onProgress } = options;
  if (!items.length) return { count: 0, path: '' };

  await ensureDisplayFont();

  const ordered = sortLockerItemsForExport(items);
  const cols = gridColumns(ordered.length);
  const cell = LOCKER_EXPORT_CELL;
  const gap = LOCKER_EXPORT_GAP;
  const pad = LOCKER_EXPORT_PAD;
  const header = LOCKER_EXPORT_HEADER;
  const { width, height } = gridPixelSize(ordered.length);

  const { canvas, ctx } = createExportCanvas(width, height);

  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, width, height);

  const title = accountLabel?.trim() || 'Locker';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 56px ${DISPLAY_FONT}`;
  fillOutlinedText(ctx, title.toUpperCase(), width / 2, header * 0.4, width - pad * 2);
  ctx.font = `900 34px ${DISPLAY_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  fillOutlinedText(ctx, `${ordered.length} ${categoryLabel.toUpperCase()}`, width / 2, header * 0.78, width - pad * 2);

  const [bitmaps, backgrounds] = await Promise.all([
    loadBitmaps(
      ordered.map((item) => item.imageUrl),
      onProgress
    ),
    Promise.all(ordered.map((item) => loadRarityBackground(item)))
  ]);

  const gridTop = header + pad;

  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cell + gap);
    const y = gridTop + row * (cell + gap);

    ctx.save();
    roundRect(ctx, x, y, cell, cell, 12);
    ctx.clip();
    fillRarityBackground(ctx, x, y, cell, cell, item, backgrounds[i]);

    const bmp = bitmaps[i];
    if (bmp) {
      // Keep the art at its own aspect inside the square tile instead of stretching it.
      const scale = Math.min(cell / bmp.width, cell / bmp.height);
      const w = bmp.width * scale;
      const h = bmp.height * scale;
      if (item.faded) ctx.globalAlpha = 0.35;
      ctx.drawImage(bmp, x + (cell - w) / 2, y + (cell - h) / 2, w, h);
      ctx.globalAlpha = 1;
      bmp.close();
    }

    const band = item.note ? NAME_BAND + 14 : NAME_BAND;
    const bandY = y + cell - band;
    const fade = ctx.createLinearGradient(x, bandY - 8, x, y + cell);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.35, 'rgba(0,0,0,0.55)');
    fade.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = fade;
    ctx.fillRect(x, bandY - 8, cell, band + 8);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 15px ${UI_FONT}`;
    ctx.fillText(fitText(ctx, item.name, cell - 16), x + 8, y + cell - (item.note ? 26 : 11));

    if (item.note) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `700 12px ${UI_FONT}`;
      ctx.fillText(fitText(ctx, item.note, cell - 16), x + 8, y + cell - 10);
    }

    ctx.restore();
  }

  await drawFortniteApiCredit(ctx, width, height, LOCKER_EXPORT_FOOTER, pad);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('WebP encode failed'))), 'image/webp', WEBP_QUALITY);
  });

  const parts = ['locker', categorySlug];
  if (accountLabel) parts.push(sanitizeFilename(accountLabel));
  const filePath = await saveExportBlob(blob, `${parts.join('-')}.webp`);
  return { count: ordered.length, path: filePath };
}
