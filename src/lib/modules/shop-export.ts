import {
  createExportCanvas,
  DISPLAY_FONT,
  drawFortniteApiCredit,
  ensureDisplayFont,
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
import { isLeavingToday } from '$lib/modules/shop-history';
import type { ShopItem } from '$types/shop';

const PRICE_ICON_URL = '/resources/currency_mtxswap.png';
const ONLY_TODAY_COLOR = '#fcd34d';

/** Shop collage uses a larger tile than the locker export so tags stay readable. */
const CELL = 200;
const GAP = 12;
const PAD = 32;
const HEADER = 128;
const FOOTER = 60;
const MAX_COLS = 24;
const TILE_BAND = 64;
const TILE_RADIUS = 12;

export type ShopExportOptions = {
  items: ShopItem[];
  titleLabel: string;
  dateLabel: string;
  onlyTodayLabel: string;
  locale: string;
  onProgress?: (progress: { done: number; total: number }) => void;
};

export type ShopExportResult = {
  count: number;
  path: string;
};

function gridWidth(cols: number) {
  return PAD * 2 + cols * CELL + Math.max(0, cols - 1) * GAP;
}

function gridHeight(rows: number) {
  return HEADER + FOOTER + PAD * 2 + rows * CELL + Math.max(0, rows - 1) * GAP;
}

function shopGridColumns(count: number) {
  if (count <= 0) return 1;

  let best = 1;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let cols = 1; cols <= Math.min(count, MAX_COLS); cols++) {
    const diff = Math.abs(gridWidth(cols) - gridHeight(Math.ceil(count / cols)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = cols;
    }
  }

  return best;
}

function shopGridPixelSize(count: number) {
  const cols = shopGridColumns(count);
  const rows = Math.max(1, Math.ceil(Math.max(count, 1) / cols));
  return { cols, rows, width: gridWidth(cols), height: gridHeight(rows) };
}

function imageUrl(item: ShopItem) {
  return item.assets.featured || item.assets.large || item.assets.small || '';
}

function exportTone(item: ShopItem) {
  return {
    rarity: item.type.id === 'track' ? 'epic' : item.rarity.id || 'common',
    series: item.series?.id
  };
}

/** Corner pill mirroring the "Só até hoje" tag on the shop cards. */
function drawTag(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, color: string) {
  ctx.font = `700 13px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const padX = 6;
  const tagHeight = 20;
  const tagWidth = ctx.measureText(label).width + padX * 2;

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  roundRect(ctx, x, y, tagWidth, tagHeight, 4);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillText(label, x + padX, y + tagHeight / 2 + 0.5);
}

function drawContained(ctx: CanvasRenderingContext2D, bitmap: ImageBitmap, x: number, y: number, size: number) {
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  ctx.drawImage(bitmap, x + (size - width) / 2, y + (size - height) / 2, width, height);
}

/** Near-square WebP of the current shop rotation, with room for corner tags. */
export async function exportItemShopWebp(options: ShopExportOptions): Promise<ShopExportResult> {
  const { items, titleLabel, dateLabel, onlyTodayLabel, locale, onProgress } = options;
  if (!items.length) return { count: 0, path: '' };

  await ensureDisplayFont();

  const { cols, width, height } = shopGridPixelSize(items.length);

  const { canvas, ctx } = createExportCanvas(width, height);

  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 56px ${DISPLAY_FONT}`;
  ctx.fillText(titleLabel.toUpperCase(), width / 2, HEADER * 0.4, width - PAD * 2);
  ctx.font = `900 30px ${DISPLAY_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(dateLabel.toUpperCase(), width / 2, HEADER * 0.78, width - PAD * 2);

  const total = items.length;
  onProgress?.({ done: 0, total });
  let done = 0;
  const [bitmaps, backgrounds] = await Promise.all([
    Promise.all(
      items.map(async (item) => {
        const bitmap = await loadBitmap(imageUrl(item));
        done += 1;
        onProgress?.({ done, total });
        return bitmap;
      })
    ),
    Promise.all(items.map((item) => loadRarityBackground(exportTone(item))))
  ]);
  const [priceIcon] = await Promise.all([loadBitmap(PRICE_ICON_URL)]);
  const priceFormatter = new Intl.NumberFormat(locale);
  const gridTop = HEADER + PAD;

  for (let index = 0; index < items.length; index++) {
    const item = items[index]!;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = PAD + col * (CELL + GAP);
    const y = gridTop + row * (CELL + GAP);

    ctx.save();
    roundRect(ctx, x, y, CELL, CELL, TILE_RADIUS);
    ctx.clip();
    fillRarityBackground(ctx, x, y, CELL, CELL, exportTone(item), backgrounds[index]);

    const bitmap = bitmaps[index];
    if (bitmap) {
      drawContained(ctx, bitmap, x, y, CELL);
      bitmap.close();
    }

    const bandY = y + CELL - TILE_BAND;
    const fade = ctx.createLinearGradient(x, bandY - 14, x, y + CELL);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.3, 'rgba(0,0,0,0.62)');
    fade.addColorStop(1, 'rgba(0,0,0,0.84)');
    ctx.fillStyle = fade;
    ctx.fillRect(x, bandY - 14, CELL, TILE_BAND + 14);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 16px ${UI_FONT}`;
    ctx.fillText(fitText(ctx, item.name, CELL - 16), x + CELL / 2, y + CELL - 30);

    const price = priceFormatter.format(item.price.final);
    ctx.font = `700 14px ${UI_FONT}`;
    const iconSize = 16;
    const priceGap = 4;
    const priceWidth = ctx.measureText(price).width;
    let priceX = x + (CELL - iconSize - priceGap - priceWidth) / 2;
    if (priceIcon) {
      ctx.drawImage(priceIcon, priceX, y + CELL - 22, iconSize, iconSize);
      priceX += iconSize + priceGap;
    }
    ctx.textAlign = 'left';
    ctx.fillText(price, priceX, y + CELL - 8);

    if (isLeavingToday(item)) {
      drawTag(ctx, onlyTodayLabel.toUpperCase(), x + 8, y + 8, ONLY_TODAY_COLOR);
    }

    ctx.restore();
  }

  priceIcon?.close();

  await drawFortniteApiCredit(ctx, width, height, FOOTER, PAD);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('WebP encode failed'))),
      'image/webp',
      WEBP_QUALITY
    );
  });
  const day = new Date().toISOString().slice(0, 10);
  const filePath = await saveExportBlob(blob, `${sanitizeFilename(`item-shop-${day}`)}.webp`);
  return { count: items.length, path: filePath };
}
