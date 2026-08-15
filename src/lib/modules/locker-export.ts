import * as path from '@tauri-apps/api/path';
import { mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { ItemColors } from '$lib/constants/item-colors';
import { tauriKy } from '$lib/http';
import {
  gridColumns,
  gridPixelSize,
  LOCKER_EXPORT_CELL,
  LOCKER_EXPORT_FOOTER,
  LOCKER_EXPORT_GAP,
  LOCKER_EXPORT_HEADER,
  LOCKER_EXPORT_PAD
} from '$lib/modules/locker-export-layout';
import { sortLockerItemsForExport } from '$lib/modules/locker-export-sort';
import type { LockerOwnedItem } from '$lib/modules/locker-parse';
import { dataDirectory } from '$lib/storage/file-store';

export const WEBP_QUALITY = 0.88;
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

const rarityColors: Record<string, string> = {
  ...ItemColors.rarities,
  ...ItemColors.series
};

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

export { gridColumns, gridPixelSize } from '$lib/modules/locker-export-layout';
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

/** Trims to what actually fits, so names never squeeze or spill out of the tile. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let end = text.length;
  while (end > 1 && ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth) end -= 1;
  return `${text.slice(0, end).trimEnd()}…`;
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

export function fillRarityBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  item: { rarity: string; series?: string }
) {
  const tone = item.series || item.rarity;
  const base = rarityColors[rarityKey(tone)] || rarityColors.common;
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, shadeHex(base, 1.15));
  grad.addColorStop(0.55, base);
  grad.addColorStop(1, shadeHex(base, 0.45));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

export async function loadBitmap(url: string): Promise<ImageBitmap | null> {
  if (!url) return null;
  try {
    const buf =
      url.startsWith('/') || url.startsWith('blob:')
        ? await (await fetch(url)).arrayBuffer()
        : await tauriKy.get(url).arrayBuffer();
    return await createImageBitmap(new Blob([buf]));
  } catch {
    return null;
  }
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

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, width, height);

  const title = accountLabel?.trim() || 'Locker';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 56px ${DISPLAY_FONT}`;
  ctx.fillText(title.toUpperCase(), width / 2, header * 0.4, width - pad * 2);
  ctx.font = `900 34px ${DISPLAY_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(`${ordered.length} ${categoryLabel.toUpperCase()}`, width / 2, header * 0.78, width - pad * 2);

  const total = ordered.length;
  onProgress?.({ done: 0, total });

  let done = 0;
  const bitmaps = await Promise.all(
    ordered.map(async (item) => {
      const bmp = await loadBitmap(item.imageUrl);
      done += 1;
      onProgress?.({ done, total });
      return bmp;
    })
  );

  const appIcon = await loadBitmap(APP_ICON_URL);
  const gridTop = header + pad;

  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cell + gap);
    const y = gridTop + row * (cell + gap);

    ctx.save();
    roundRect(ctx, x, y, cell, cell, 10);
    ctx.clip();
    fillRarityBackground(ctx, x, y, cell, cell, item);

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
    ctx.font = `600 14px ${UI_FONT}`;
    ctx.fillText(fitText(ctx, item.name, cell - 14), x + 7, y + cell - (item.note ? 24 : 10));

    if (item.note) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `700 11px ${UI_FONT}`;
      ctx.fillText(fitText(ctx, item.note, cell - 14), x + 7, y + cell - 9);
    }

    ctx.restore();
  }

  const footerY = height - LOCKER_EXPORT_FOOTER / 2;
  const iconSize = 22;
  ctx.font = `600 20px ${UI_FONT}`;
  const brandWidth = ctx.measureText(APP_NAME).width;
  const brandGap = 8;
  const blockWidth = (appIcon ? iconSize + brandGap : 0) + brandWidth;
  let brandX = (width - blockWidth) / 2;

  if (appIcon) {
    ctx.drawImage(appIcon, brandX, footerY - iconSize / 2, iconSize, iconSize);
    brandX += iconSize + brandGap;
    appIcon.close();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(APP_NAME, brandX, footerY);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('WebP encode failed'))), 'image/webp', WEBP_QUALITY);
  });

  const parts = ['locker', categorySlug];
  if (accountLabel) parts.push(sanitizeFilename(accountLabel));
  const filePath = await saveExportBlob(blob, `${parts.join('-')}.webp`);
  return { count: ordered.length, path: filePath };
}
