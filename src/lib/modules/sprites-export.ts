import {
  APP_ICON_URL,
  APP_NAME,
  DISPLAY_FONT,
  ensureDisplayFont,
  fillOutlinedText,
  fitText,
  loadBitmap,
  roundRect,
  saveExportBlob,
  sanitizeFilename,
  UI_FONT
} from '$lib/modules/locker-export';
import { SPRITE_DUST_ICON, type SpriteResources } from '$lib/modules/sprites-account';
import {
  SPRITE_ENTRIES,
  SPRITE_EXPORT_VARIANTS,
  SPRITE_FAMILIES,
  spriteShortName,
  type SpriteEntry,
  type SpriteRarity,
  type SpriteVariant
} from '$lib/modules/sprites';

/** Left → right like the Fortniters card: rare → epic → legendary → mythic. */
export const SPRITE_EXPORT_ORDER = [
  'bush',
  'adventure',
  'jonesy',
  'eight-bit',
  'storm-scout',
  'shadow',
  'tails',
  'killswitch',
  'sonic',
  'jackrabbit',
  'klombo',
  'crown'
] as const;

const VARIANT_ROW_LABEL: Record<SpriteVariant, string> = {
  base: 'BASE',
  gold: 'GOLD',
  'cheat-master': 'CHEAT MASTER'
};

const GOLD_BAR = '#f5c542';

const RARITY_BAR: Record<SpriteRarity, string> = {
  rare: '#3d9bf7',
  epic: '#9b59d0',
  legendary: '#e67e22',
  mythic: '#f1c40f'
};

/** Logical CSS px; canvas at SCALE keeps 512 art near 1:1 (CELL*SCALE≈504). */
const SCALE = 3;
const CELL = 168;
const GAP = 12;
const PAD = 32;
const HEADER = 168;
const FOOTER = 56;
const LABEL_COL = 44;
const NAME_ROW = 36;
const BAR_H = 8;
const CHIP_ICON = 40;
const EXPORT_WEBP_QUALITY = 0.98;

export type SpriteExportSlot = {
  entry: SpriteEntry;
  owned: boolean;
  level?: number;
  slot: number;
};

export type SpriteExportOptions = {
  accountLabel: string;
  ownedKeys: ReadonlySet<string>;
  levels?: Record<string, number>;
  resources?: SpriteResources;
  onProgress?: (progress: { done: number; total: number }) => void;
};

export type SpriteExportResult = {
  count: number;
  owned: number;
  path: string;
};

function entryFor(slug: string, variant: SpriteVariant): SpriteEntry {
  const entry = SPRITE_ENTRIES.find((item) => item.slug === slug && item.variant === variant);
  if (!entry) throw new Error('Missing sprite entry ' + slug + ':' + variant);
  return entry;
}

function isOwned(entry: SpriteEntry, ownedKeys: ReadonlySet<string>) {
  if (ownedKeys.has(entry.key)) return true;
  if (entry.variant === 'base' && ownedKeys.has(entry.slug)) return true;
  return false;
}

/** Fixed 3×12 BASE + GOLD + CHEAT MASTER grid (36 slots). */
export function buildSpriteExportSlots(
  ownedKeys: ReadonlySet<string>,
  levels: Record<string, number> = {}
): SpriteExportSlot[] {
  const slots: SpriteExportSlot[] = [];
  let slot = 1;
  for (const variant of SPRITE_EXPORT_VARIANTS) {
    for (const slug of SPRITE_EXPORT_ORDER) {
      const entry = entryFor(slug, variant);
      slots.push({
        entry,
        owned: isOwned(entry, ownedKeys),
        level: levels[entry.key],
        slot: slot++
      });
    }
  }
  return slots;
}

function drawRainbowBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  const stops = ['#ff0040', '#ff8c00', '#ffef00', '#00e676', '#00b0ff', '#7c4dff'];
  stops.forEach((color, i) => grad.addColorStop(i / (stops.length - 1), color));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

function drawVerticalLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  height: number
) {
  ctx.save();
  ctx.translate(x, y + height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '800 18px ' + DISPLAY_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0, height - 8);
  ctx.restore();
}

/** Fortniters chips: quantity then icon. */
function paintChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  icon: ImageBitmap | null,
  value: number,
  fallback: string
) {
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px ' + UI_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const label = String(value);
  ctx.fillText(label, x, y + CHIP_ICON / 2);
  const textW = ctx.measureText(label).width;
  const iconX = x + textW + 6;
  if (icon) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(icon, iconX, y, CHIP_ICON, CHIP_ICON);
  } else {
    ctx.fillStyle = fallback;
    roundRect(ctx, iconX, y, CHIP_ICON, CHIP_ICON, 8);
    ctx.fill();
  }
  return textW + 6 + CHIP_ICON;
}

/**
 * Fortniters-style album: username, X/36, dust + gizmos, BASE + GOLD + CHEAT MASTER rows.
 * Rendered at 3× so 512px sprite art stays sharp on the card.
 */
export async function exportSpriteAlbumWebp(options: SpriteExportOptions): Promise<SpriteExportResult> {
  const { accountLabel, ownedKeys, levels = {}, resources, onProgress } = options;
  await ensureDisplayFont();

  const slots = buildSpriteExportSlots(ownedKeys, levels);
  const ownedCount = slots.filter((slot) => slot.owned).length;

  const cols = SPRITE_EXPORT_ORDER.length;
  const rows = SPRITE_EXPORT_VARIANTS.length;
  const slotCount = cols * rows;
  const gridW = cols * CELL + (cols - 1) * GAP;
  const gridH = rows * CELL + (rows - 1) * GAP;
  const width = PAD * 2 + LABEL_COL + gridW;
  const height = HEADER + PAD + NAME_ROW + gridH + PAD + FOOTER;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * SCALE);
  canvas.height = Math.round(height * SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, width, height);

  const title = accountLabel.trim() || 'Sprites';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 64px ' + DISPLAY_FONT;
  fillOutlinedText(ctx, title.toUpperCase(), width / 2, 48, width - PAD * 2 - 220);

  ctx.font = '900 36px ' + DISPLAY_FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  fillOutlinedText(ctx, ownedCount + '/' + slotCount + ' SPRITES', width / 2, 96, width - PAD * 2 - 220);

  if (resources) {
    const dustBmp = await loadBitmap(SPRITE_DUST_ICON);
    // Dust alone on the top-right (Fortniters layout).
    ctx.font = '700 22px ' + UI_FONT;
    const dustLabel = String(resources.dust);
    const dustBlock = ctx.measureText(dustLabel).width + 6 + CHIP_ICON;
    paintChip(ctx, width - PAD - dustBlock, 16, dustBmp, resources.dust, '#8b5cf6');
    dustBmp?.close();

    // Full S4 gizmo row under dust — always all five, even at 0.
    const gizmoBmps = await Promise.all(
      resources.gizmos.map(async (gizmo) => ({
        value: gizmo.quantity,
        bmp: gizmo.iconUrl ? await loadBitmap(gizmo.iconUrl) : null,
        color: '#5a6a8a'
      }))
    );

    let chipX = width - PAD;
    const gizmoY = 68;
    for (let i = gizmoBmps.length - 1; i >= 0; i--) {
      const chip = gizmoBmps[i];
      ctx.font = '700 22px ' + UI_FONT;
      const blockW = ctx.measureText(String(chip.value)).width + 6 + CHIP_ICON;
      chipX -= blockW;
      paintChip(ctx, chipX, gizmoY, chip.bmp, chip.value, chip.color);
      chip.bmp?.close();
      chipX -= 16;
    }
  }

  const total = slots.length;
  onProgress?.({ done: 0, total });
  let done = 0;
  const bitmaps = await Promise.all(
    slots.map(async (slot) => {
      const bmp = await loadBitmap(slot.entry.image);
      done += 1;
      onProgress?.({ done, total });
      return bmp;
    })
  );

  const gridLeft = PAD + LABEL_COL;
  const gridTop = HEADER + PAD + NAME_ROW;

  ctx.font = '800 16px ' + DISPLAY_FONT;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  SPRITE_EXPORT_ORDER.forEach((slug, col) => {
    const family = SPRITE_FAMILIES.find((item) => item.slug === slug);
    const label = spriteShortName(family?.name ?? slug).toUpperCase();
    const x = gridLeft + col * (CELL + GAP) + CELL / 2;
    ctx.fillText(fitText(ctx, label, CELL - 6), x, HEADER + PAD + NAME_ROW / 2);
  });

  SPRITE_EXPORT_VARIANTS.forEach((variant, row) => {
    drawVerticalLabel(
      ctx,
      VARIANT_ROW_LABEL[variant],
      PAD + LABEL_COL / 2,
      gridTop + row * (CELL + GAP),
      CELL
    );
  });

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gridLeft + col * (CELL + GAP);
    const y = gridTop + row * (CELL + GAP);

    ctx.save();
    roundRect(ctx, x, y, CELL, CELL, 14);
    ctx.clip();

    ctx.fillStyle = '#132238';
    ctx.fillRect(x, y, CELL, CELL);

    const bmp = bitmaps[i];
    if (bmp) {
      // Near 1:1 draw (CELL*SCALE ≈ source). High-quality downsample only when needed.
      const inset = 8;
      const box = CELL - inset * 2;
      const scale = Math.min(box / bmp.width, box / bmp.height);
      const w = bmp.width * scale;
      const h = bmp.height * scale;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (!slot.owned) {
        ctx.filter = 'brightness(0)';
        ctx.globalAlpha = 0.4;
      }
      ctx.drawImage(bmp, x + (CELL - w) / 2, y + (CELL - h) / 2, w, h);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      bmp.close();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 15px ' + UI_FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(slot.slot).padStart(2, '0'), x + 8, y + 7);

    if (slot.owned && slot.level != null) {
      ctx.textBaseline = 'bottom';
      ctx.fillText('Lvl ' + slot.level, x + 8, y + CELL - BAR_H - 8);
    }

    if (slot.entry.variant === 'cheat-master') {
      drawRainbowBar(ctx, x, y + CELL - BAR_H, CELL, BAR_H);
    } else if (slot.entry.variant === 'gold') {
      ctx.fillStyle = GOLD_BAR;
      ctx.fillRect(x, y + CELL - BAR_H, CELL, BAR_H);
    } else {
      ctx.fillStyle = RARITY_BAR[slot.entry.rarity];
      ctx.fillRect(x, y + CELL - BAR_H, CELL, BAR_H);
    }

    ctx.restore();
  }

  const appIcon = await loadBitmap(APP_ICON_URL);
  const footerY = height - FOOTER / 2;
  const iconSize = 28;
  ctx.font = '600 22px ' + UI_FONT;
  const brandWidth = ctx.measureText(APP_NAME).width;
  const brandGap = 8;
  const blockWidth = (appIcon ? iconSize + brandGap : 0) + brandWidth;
  let brandX = (width - blockWidth) / 2;
  if (appIcon) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
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
      (b) => (b ? resolve(b) : reject(new Error('WebP encode failed'))),
      'image/webp',
      EXPORT_WEBP_QUALITY
    );
  });

  const filePath = await saveExportBlob(
    blob,
    'sprites-' + sanitizeFilename(accountLabel || 'account') + '.webp'
  );
  return { count: slots.length, owned: ownedCount, path: filePath };
}
