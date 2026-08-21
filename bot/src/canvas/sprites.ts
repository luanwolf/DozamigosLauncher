import { makeCanvas, encodeWebp, loadLocalOrUrl, fitText, roundRect, DISPLAY_FONT, UI_FONT, APP_NAME } from '@/canvas/grid';
import {
  SPRITE_ENTRIES,
  SPRITE_EXPORT_ORDER,
  SPRITE_FAMILIES,
  spriteShortName,
  type SpriteEntry,
  type SpriteResources
} from '@/fortnite/sprites';

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

const RARITY_BAR: Record<string, string> = {
  rare: '#3d9bf7',
  epic: '#9b59d0',
  legendary: '#e67e22',
  mythic: '#f1c40f'
};

const VARIANTS = ['base', 'cheat-master'] as const;

function entryFor(slug: string, variant: string): SpriteEntry {
  const entry = SPRITE_ENTRIES.find((item) => item.slug === slug && item.variant === variant);
  if (!entry) throw new Error(`Missing sprite ${slug}:${variant}`);
  return entry;
}

export async function renderSpriteAlbum(opts: {
  accountLabel: string;
  ownedKeys: ReadonlySet<string>;
  levels?: Record<string, number>;
  resources?: SpriteResources;
}): Promise<Buffer> {
  const slots: { entry: SpriteEntry; owned: boolean; level?: number; slot: number }[] = [];
  let n = 1;
  for (const variant of VARIANTS) {
    for (const slug of SPRITE_EXPORT_ORDER) {
      const entry = entryFor(slug, variant);
      const owned = opts.ownedKeys.has(entry.key) || (variant === 'base' && opts.ownedKeys.has(entry.slug));
      slots.push({ entry, owned, level: opts.levels?.[entry.key], slot: n++ });
    }
  }

  const ownedCount = slots.filter((s) => s.owned).length;
  const cols = SPRITE_EXPORT_ORDER.length;
  const rows = VARIANTS.length;
  const gridW = cols * CELL + (cols - 1) * GAP;
  const gridH = rows * CELL + (rows - 1) * GAP;
  const width = PAD * 2 + LABEL_COL + gridW;
  const height = HEADER + PAD + NAME_ROW + gridH + PAD + FOOTER;
  const { canvas, ctx } = makeCanvas(width, height, SCALE);

  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 64px ${DISPLAY_FONT}`;
  ctx.fillText(opts.accountLabel.toUpperCase(), width / 2, 48, width - PAD * 2 - 220);
  ctx.font = `900 36px ${DISPLAY_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(`${ownedCount}/24 SPRITES`, width / 2, 96, width - PAD * 2 - 220);

  if (opts.resources) {
    const dustBmp = await loadLocalOrUrl('/elementals/gizmos/dust.png');
    ctx.font = `700 22px ${UI_FONT}`;
    ctx.textAlign = 'left';
    const dustLabel = String(opts.resources.dust);
    const dustW = ctx.measureText(dustLabel).width + 6 + CHIP_ICON;
    const dx = width - PAD - dustW;
    ctx.fillStyle = '#fff';
    ctx.fillText(dustLabel, dx, 16 + CHIP_ICON / 2);
    if (dustBmp) ctx.drawImage(dustBmp, dx + ctx.measureText(dustLabel).width + 6, 16, CHIP_ICON, CHIP_ICON);

    let chipX = width - PAD;
    for (let i = opts.resources.gizmos.length - 1; i >= 0; i--) {
      const gizmo = opts.resources.gizmos[i]!;
      const bmp = await loadLocalOrUrl(`/elementals/gizmos/${gizmo.icon}`);
      ctx.font = `700 22px ${UI_FONT}`;
      const label = String(gizmo.quantity);
      const blockW = ctx.measureText(label).width + 6 + CHIP_ICON;
      chipX -= blockW;
      ctx.fillStyle = '#fff';
      ctx.fillText(label, chipX, 68 + CHIP_ICON / 2);
      if (bmp) ctx.drawImage(bmp, chipX + ctx.measureText(label).width + 6, 68, CHIP_ICON, CHIP_ICON);
      chipX -= 16;
    }
  }

  const bitmaps = await Promise.all(slots.map((s) => loadLocalOrUrl(s.entry.image)));
  const gridLeft = PAD + LABEL_COL;
  const gridTop = HEADER + PAD + NAME_ROW;

  ctx.font = `800 16px ${DISPLAY_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'center';
  SPRITE_EXPORT_ORDER.forEach((slug, col) => {
    const family = SPRITE_FAMILIES.find((f) => f.slug === slug);
    const x = gridLeft + col * (CELL + GAP) + CELL / 2;
    ctx.fillText(fitText(ctx, spriteShortName(family?.name ?? slug).toUpperCase(), CELL - 6), x, HEADER + PAD + NAME_ROW / 2);
  });

  const drawVLabel = (text: string, x: number, y: number, h: number) => {
    ctx.save();
    ctx.translate(x, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `800 18px ${DISPLAY_FONT}`;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  drawVLabel('BASE', PAD + LABEL_COL / 2, gridTop, CELL);
  drawVLabel('CHEAT MASTER', PAD + LABEL_COL / 2, gridTop + CELL + GAP, CELL);

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!;
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
      const inset = 8;
      const box = CELL - inset * 2;
      const scale = Math.min(box / bmp.width, box / bmp.height);
      const w = bmp.width * scale;
      const h = bmp.height * scale;
      if (!slot.owned) ctx.globalAlpha = 0.4;
      ctx.drawImage(bmp, x + (CELL - w) / 2, y + (CELL - h) / 2, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `700 15px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(slot.slot).padStart(2, '0'), x + 8, y + 7);
    if (slot.owned && slot.level != null) {
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Lvl ${slot.level}`, x + 8, y + CELL - BAR_H - 8);
    }
    if (slot.entry.variant === 'cheat-master') {
      const grad = ctx.createLinearGradient(x, y, x + CELL, y);
      const stops = ['#ff0040', '#ff8c00', '#ffef00', '#00e676', '#00b0ff', '#7c4dff'];
      for (let idx = 0; idx < stops.length; idx++) {
        grad.addColorStop(idx / (stops.length - 1), stops[idx]!);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(x, y + CELL - BAR_H, CELL, BAR_H);
    } else {
      ctx.fillStyle = RARITY_BAR[slot.entry.rarity] ?? '#3d9bf7';
      ctx.fillRect(x, y + CELL - BAR_H, CELL, BAR_H);
    }
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `600 22px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(APP_NAME, width / 2, height - FOOTER / 2);

  return encodeWebp(canvas, 95);
}
