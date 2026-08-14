import {
  APP_ICON_URL,
  APP_NAME,
  DISPLAY_FONT,
  ensureDisplayFont,
  fillRarityBackground,
  fitText,
  loadBitmap,
  roundRect,
  sanitizeFilename,
  saveExportBlob,
  UI_FONT,
  WEBP_QUALITY
} from '$lib/modules/locker-export';
import {
  gridColumns,
  gridPixelSize,
  LOCKER_EXPORT_CELL,
  LOCKER_EXPORT_FOOTER,
  LOCKER_EXPORT_GAP,
  LOCKER_EXPORT_HEADER,
  LOCKER_EXPORT_PAD
} from '$lib/modules/locker-export-layout';
import type { ShopItem } from '$types/shop';

const PRICE_ICON_URL = '/resources/currency_mtxswap.png';
const SHOP_TILE_BAND = 43;

export type ShopExportOptions = {
  items: ShopItem[];
  titleLabel: string;
  dateLabel: string;
  locale: string;
  onProgress?: (progress: { done: number; total: number }) => void;
};

export type ShopExportResult = {
  count: number;
  path: string;
};

function imageUrl(item: ShopItem) {
  return item.assets.featured || item.assets.large || item.assets.small || '';
}

function exportTone(item: ShopItem) {
  return {
    rarity: item.type.id === 'track' ? 'epic' : item.rarity.id || 'common',
    series: item.series?.id
  };
}

function drawContained(ctx: CanvasRenderingContext2D, bitmap: ImageBitmap, x: number, y: number, size: number) {
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  ctx.drawImage(bitmap, x + (size - width) / 2, y + (size - height) / 2, width, height);
}

/** Dense, near-square WebP containing every offer in the current shop rotation. */
export async function exportItemShopWebp(options: ShopExportOptions): Promise<ShopExportResult> {
  const { items, titleLabel, dateLabel, locale, onProgress } = options;
  if (!items.length) return { count: 0, path: '' };

  await ensureDisplayFont();

  const cols = gridColumns(items.length);
  const { width, height } = gridPixelSize(items.length);
  const cell = LOCKER_EXPORT_CELL;
  const gap = LOCKER_EXPORT_GAP;
  const pad = LOCKER_EXPORT_PAD;
  const header = LOCKER_EXPORT_HEADER;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 56px ${DISPLAY_FONT}`;
  ctx.fillText(titleLabel.toUpperCase(), width / 2, header * 0.4, width - pad * 2);
  ctx.font = `900 30px ${DISPLAY_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(dateLabel.toUpperCase(), width / 2, header * 0.78, width - pad * 2);

  const total = items.length;
  onProgress?.({ done: 0, total });
  let done = 0;
  const bitmaps = await Promise.all(
    items.map(async (item) => {
      const bitmap = await loadBitmap(imageUrl(item));
      done += 1;
      onProgress?.({ done, total });
      return bitmap;
    })
  );
  const [priceIcon, appIcon] = await Promise.all([loadBitmap(PRICE_ICON_URL), loadBitmap(APP_ICON_URL)]);
  const priceFormatter = new Intl.NumberFormat(locale);
  const gridTop = header + pad;

  for (let index = 0; index < items.length; index++) {
    const item = items[index]!;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = pad + col * (cell + gap);
    const y = gridTop + row * (cell + gap);

    ctx.save();
    roundRect(ctx, x, y, cell, cell, 8);
    ctx.clip();
    fillRarityBackground(ctx, x, y, cell, cell, exportTone(item));

    const bitmap = bitmaps[index];
    if (bitmap) {
      drawContained(ctx, bitmap, x, y, cell);
      bitmap.close();
    }

    const bandY = y + cell - SHOP_TILE_BAND;
    const fade = ctx.createLinearGradient(x, bandY - 10, x, y + cell);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.3, 'rgba(0,0,0,0.62)');
    fade.addColorStop(1, 'rgba(0,0,0,0.84)');
    ctx.fillStyle = fade;
    ctx.fillRect(x, bandY - 10, cell, SHOP_TILE_BAND + 10);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 12px ${UI_FONT}`;
    ctx.fillText(fitText(ctx, item.name, cell - 10), x + cell / 2, y + cell - 24);

    const price = priceFormatter.format(item.price.final);
    ctx.font = `700 11px ${UI_FONT}`;
    const iconSize = 12;
    const priceGap = 3;
    const priceWidth = ctx.measureText(price).width;
    let priceX = x + (cell - iconSize - priceGap - priceWidth) / 2;
    if (priceIcon) {
      ctx.drawImage(priceIcon, priceX, y + cell - 17, iconSize, iconSize);
      priceX += iconSize + priceGap;
    }
    ctx.textAlign = 'left';
    ctx.fillText(price, priceX, y + cell - 6);
    ctx.restore();
  }

  priceIcon?.close();

  const footerY = height - LOCKER_EXPORT_FOOTER / 2;
  const iconSize = 22;
  ctx.font = `600 20px ${UI_FONT}`;
  const brandGap = 8;
  const brandWidth = ctx.measureText(APP_NAME).width;
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
