import {
  APP_ICON_URL,
  APP_NAME,
  createExportCanvas,
  DISPLAY_FONT,
  ensureDisplayFont,
  fillOutlinedText,
  fillRarityBackground,
  fitText,
  loadBitmap,
  loadRarityBackground,
  roundRect,
  sanitizeFilename,
  saveExportBlob,
  UI_FONT,
  WEBP_QUALITY
} from '$lib/modules/locker-export';
import type { StwResourceRow } from '$lib/modules/stw-resources-parse';

const CELL = 172;
const GAP = 12;
const PAD = 32;
const HEADER = 120;
const FOOTER = 56;
const MAX_COLS = 10;
const TILE_BAND = 52;
const TILE_RADIUS = 12;

export type StwResourcesExportOptions = {
  resources: StwResourceRow[];
  titleLabel: string;
  accountLabel: string;
  powerLabel: string;
  locale: string;
  onProgress?: (progress: { done: number; total: number }) => void;
};

function gridWidth(cols: number) {
  return PAD * 2 + cols * CELL + Math.max(0, cols - 1) * GAP;
}

function gridHeight(rows: number) {
  return HEADER + FOOTER + PAD * 2 + rows * CELL + Math.max(0, rows - 1) * GAP;
}

function columnsFor(count: number) {
  if (count <= 0) return 1;
  let best = 1;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let cols = 1; cols <= Math.min(count, MAX_COLS); cols++) {
    const rows = Math.ceil(count / cols);
    const diff = Math.abs(gridWidth(cols) - gridHeight(rows));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = cols;
    }
  }
  return best;
}

function drawContained(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  x: number,
  y: number,
  size: number
) {
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  ctx.drawImage(bitmap, x + (size - width) / 2, y + (size - height) / 2, width, height);
}

/** WebP collage of STW account resources (icons + quantities). */
export async function exportStwResourcesWebp(
  options: StwResourcesExportOptions
): Promise<{ count: number; path: string }> {
  const { resources, titleLabel, accountLabel, powerLabel, locale, onProgress } = options;
  if (!resources.length) return { count: 0, path: '' };

  await ensureDisplayFont();

  const cols = columnsFor(resources.length);
  const rows = Math.ceil(resources.length / cols);
  const width = gridWidth(cols);
  const height = gridHeight(rows);

  const { canvas, ctx } = createExportCanvas(width, height);

  ctx.fillStyle = '#12100c';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 48px ${DISPLAY_FONT}`;
  fillOutlinedText(ctx, titleLabel.toUpperCase(), width / 2, HEADER * 0.38, width - PAD * 2);
  ctx.font = `700 22px ${UI_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  fillOutlinedText(
    ctx,
    `${accountLabel} · ${powerLabel}`.toUpperCase(),
    width / 2,
    HEADER * 0.72,
    width - PAD * 2
  );

  const total = resources.length;
  onProgress?.({ done: 0, total });
  let done = 0;
  const [bitmaps, backgrounds] = await Promise.all([
    Promise.all(
      resources.map(async (row) => {
        const bitmap = await loadBitmap(row.imageUrl).catch(() => null);
        done += 1;
        onProgress?.({ done, total });
        return bitmap;
      })
    ),
    Promise.all(resources.map((row) => loadRarityBackground({ rarity: row.rarity })))
  ]);
  const appIcon = await loadBitmap(APP_ICON_URL).catch(() => null);
  const qtyFmt = new Intl.NumberFormat(locale);
  const gridTop = HEADER + PAD;

  for (let index = 0; index < resources.length; index++) {
    const row = resources[index]!;
    const col = index % cols;
    const r = Math.floor(index / cols);
    const x = PAD + col * (CELL + GAP);
    const y = gridTop + r * (CELL + GAP);

    ctx.save();
    roundRect(ctx, x, y, CELL, CELL, TILE_RADIUS);
    ctx.clip();
    fillRarityBackground(ctx, x, y, CELL, CELL, { rarity: row.rarity }, backgrounds[index]);

    const bitmap = bitmaps[index];
    if (bitmap) {
      drawContained(ctx, bitmap, x, y + 4, CELL - 32);
      bitmap.close();
    }

    const bandY = y + CELL - TILE_BAND;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(x, bandY, CELL, TILE_BAND);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `700 14px ${UI_FONT}`;
    ctx.fillText(fitText(ctx, row.name, CELL - 14), x + CELL / 2, bandY + 18, CELL - 14);
    ctx.font = `800 17px ${UI_FONT}`;
    ctx.fillText(qtyFmt.format(row.quantity), x + CELL / 2, bandY + 40, CELL - 14);
    ctx.restore();
  }

  // STW icons are local — credit the launcher bottom-left.
  const footerY = height - FOOTER / 2;
  let brandX = PAD;
  if (appIcon) {
    ctx.drawImage(appIcon, brandX, footerY - 14, 28, 28);
    brandX += 36;
    appIcon.close();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `600 15px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(APP_NAME, brandX, footerY);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
  if (!blob) throw new Error('Failed to encode WebP');

  const path = await saveExportBlob(
    blob,
    `stw-resources-${sanitizeFilename(accountLabel || 'account')}.webp`
  );
  return { count: resources.length, path };
}
