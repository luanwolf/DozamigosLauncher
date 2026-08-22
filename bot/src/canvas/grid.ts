import { createCanvas, GlobalFonts, loadImage, type Canvas, type SKRSContext2D, type Image } from '@napi-rs/canvas';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { staticFile } from '@/paths';

export const DISPLAY_FONT = 'Impact';
export const UI_FONT = 'Arial';
export const APP_NAME = 'Dozamigos';
export const DISCORD_MAX = 9_500_000;

const RARITY_BG: Record<string, string> = {
  common: 'common',
  uncommon: 'uncommon',
  rare: 'rare',
  epic: 'epic',
  legendary: 'legendary',
  mythic: 'mythic',
  exotic: 'exotic',
  frozen: 'frozen',
  frozenseries: 'frozen',
  lava: 'lava',
  lavaseries: 'lava',
  marvel: 'marvel',
  marvelseries: 'marvel',
  dc: 'dc',
  dcu: 'dc',
  dcuseries: 'dc',
  slurp: 'slurp',
  slurpseries: 'slurp',
  shadow: 'shadow',
  shadowseries: 'shadow',
  shadowfoil: 'shadowfoil',
  dark: 'dark',
  cube: 'dark',
  cubeseries: 'dark',
  gaminglegends: 'gaminglegends',
  gaminglegendsseries: 'gaminglegends',
  platformseries: 'gaminglegends',
  starwars: 'starwars',
  starwarsseries: 'starwars',
  columbusseries: 'starwars',
  icon: 'icon',
  iconseries: 'icon',
  creatorcollabseries: 'icon',
  lambskin: 'lambskin',
  crew: 'crew',
  crewseries: 'crew'
};

const RARITY_COLOR: Record<string, string> = {
  legendary: '#DA791D',
  epic: '#6C3F9E',
  rare: '#3D9BF7',
  uncommon: '#6ABB1E',
  common: '#8B9399',
  mythic: '#f1c40f'
};

let fontsReady = false;

export function ensureFonts() {
  if (fontsReady) return;
  fontsReady = true;
  for (const file of ['fonts/BurbankBigCondensed-Black.otf', 'fonts/BurbankBigCondensed-Black.ttf']) {
    const p = staticFile(file);
    if (existsSync(p)) {
      GlobalFonts.registerFromPath(p, 'Impact');
      break;
    }
  }
  const win = 'C:\\Windows\\Fonts';
  for (const [file, family] of [
    ['arial.ttf', 'Arial'],
    ['arialbd.ttf', 'Arial'],
    ['impact.ttf', 'Impact']
  ] as const) {
    const p = path.join(win, file);
    if (existsSync(p)) GlobalFonts.registerFromPath(p, family);
  }
}

export function raritySlug(item: { rarity: string; series?: string }) {
  const tone = (item.series || item.rarity || 'common').toLowerCase().replace(/\s+/g, '');
  return RARITY_BG[tone] || RARITY_BG[tone.replace(/series$/, '')] || 'common';
}

const imageCache = new Map<string, Promise<Image | null>>();

export function loadLocalOrUrl(src: string): Promise<Image | null> {
  if (!src) return Promise.resolve(null);
  let pending = imageCache.get(src);
  if (pending) return pending;
  pending = (async () => {
    try {
      if (src.startsWith('/')) {
        const local = staticFile(src.slice(1));
        if (!existsSync(local)) return null;
        return await loadImage(local);
      }
      if (src.startsWith('http')) {
        try {
          return await loadImage(src);
        } catch {
          const res = await fetch(src, { headers: { 'User-Agent': 'DozamigosDiscordBot/0.1.0' } });
          if (!res.ok) return null;
          return await loadImage(Buffer.from(await res.arrayBuffer()));
        }
      }
      if (existsSync(src)) return await loadImage(src);
      const local = staticFile(src);
      if (existsSync(local)) return await loadImage(local);
      return null;
    } catch {
      return null;
    }
  })();
  imageCache.set(src, pending);
  return pending;
}

export function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function fitText(ctx: SKRSContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 1 && ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth) end -= 1;
  return `${text.slice(0, end).trimEnd()}…`;
}

export function fillOutlinedText(ctx: SKRSContext2D, text: string, x: number, y: number, maxWidth?: number) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, x, y, maxWidth);
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

export function fillRarity(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, item: { rarity: string; series?: string }, bg: Image | null) {
  if (bg) {
    const scale = Math.max(w / bg.width, h / bg.height);
    const dw = bg.width * scale;
    const dh = bg.height * scale;
    ctx.drawImage(bg, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    return;
  }
  ctx.fillStyle = RARITY_COLOR[item.rarity] || '#8B9399';
  ctx.fillRect(x, y, w, h);
}

export function drawContained(ctx: SKRSContext2D, img: Image, x: number, y: number, size: number) {
  const scale = Math.min(size / img.width, size / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
}

export function makeCanvas(logicalW: number, logicalH: number, scale = 2) {
  ensureFonts();
  const canvas = createCanvas(Math.round(logicalW * scale), Math.round(logicalH * scale)) as Canvas;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx, logicalW, logicalH };
}

export async function encodeWebp(canvas: Canvas, quality = 90): Promise<Buffer> {
  let q = quality;
  let buf = await canvas.encode('webp', q);
  while (buf.byteLength > DISCORD_MAX && q > 40) {
    q -= 15;
    buf = await canvas.encode('webp', q);
  }
  if (buf.byteLength > DISCORD_MAX) {
    const smaller = createCanvas(Math.round(canvas.width * 0.7), Math.round(canvas.height * 0.7)) as Canvas;
    const sctx = smaller.getContext('2d');
    sctx.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    buf = await smaller.encode('webp', 70);
  }
  return Buffer.from(buf);
}

export async function loadFirst(urls: string[]): Promise<Image | null> {
  for (const url of urls) {
    const img = await loadLocalOrUrl(url);
    if (img) return img;
  }
  return null;
}

export async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function loadRarityBg(item: { rarity: string; series?: string }) {
  return loadLocalOrUrl(`/rarities/${raritySlug(item)}.png`);
}

export async function loadAppIcon() {
  return loadLocalOrUrl('/icons/app.png');
}

export type GridItem = {
  name: string;
  imageUrl: string;
  imageUrls?: string[];
  rarity: string;
  series?: string;
  note?: string;
  faded?: boolean;
  price?: string;
  tag?: string;
};

const GRID_GAP = 10;
const GRID_PAD = 28;
const GRID_HEADER = 110;
const GRID_FOOTER = 48;
/** ponytail: Discord/memory ceiling (~2k). Paginate lockers if they still overflow at min cell. */
const MAX_SIDE = 2200;

function contentWidth(cols: number, cell: number) {
  return GRID_PAD * 2 + cols * cell + Math.max(0, cols - 1) * GRID_GAP;
}

function contentHeight(rows: number, cell: number) {
  return GRID_HEADER + GRID_FOOTER + GRID_PAD * 2 + rows * cell + Math.max(0, rows - 1) * GRID_GAP;
}

export type SquareGridLayout = {
  cols: number;
  rows: number;
  cell: number;
  size: number;
  originX: number;
  originY: number;
};

export function squareGridLayout(count: number, cell: number, maxCols = 40): SquareGridLayout {
  const n = Math.max(count, 1);
  let cols = 1;
  let best = Number.POSITIVE_INFINITY;
  for (let c = 1; c <= Math.min(n, maxCols); c++) {
    const rows = Math.ceil(n / c);
    const diff = Math.abs(contentWidth(c, cell) - contentHeight(rows, cell));
    if (diff < best) {
      best = diff;
      cols = c;
    }
  }
  const rows = Math.ceil(n / cols);
  const contentW = contentWidth(cols, cell);
  const contentH = contentHeight(rows, cell);
  const size = Math.max(contentW, contentH);
  return {
    cols,
    rows,
    cell,
    size,
    originX: Math.round((size - contentW) / 2),
    originY: Math.round((size - contentH) / 2)
  };
}

export async function renderGrid(opts: {
  title: string;
  subtitle: string;
  items: GridItem[];
  cell?: number;
  maxCols?: number;
  footer?: string;
}): Promise<Buffer> {
  const pad = GRID_PAD;
  const header = GRID_HEADER;
  const footer = GRID_FOOTER;
  const layout = squareGridLayout(opts.items.length, opts.cell ?? 140, opts.maxCols ?? 40);
  const { cols, cell, size, originX, originY } = layout;
  const out = Math.min(size, MAX_SIDE);
  const { canvas, ctx } = makeCanvas(out, out);
  if (out < size) ctx.scale(out / size, out / size);

  ctx.fillStyle = '#070b12';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(originX, originY + header - 3, size - originX * 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 48px ${DISPLAY_FONT}`;
  fillOutlinedText(ctx, opts.title.toUpperCase(), size / 2, originY + header * 0.38, size - pad * 2);
  ctx.font = `700 22px ${UI_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  fillOutlinedText(ctx, opts.subtitle.toUpperCase(), size / 2, originY + header * 0.72, size - pad * 2);

  const [bitmaps, backgrounds] = await Promise.all([
    Promise.all(opts.items.map((i) => (i.imageUrls?.length ? loadFirst(i.imageUrls) : loadLocalOrUrl(i.imageUrl)))),
    Promise.all(opts.items.map((i) => loadRarityBg(i)))
  ]);

  const gridTop = originY + header + pad;
  for (let i = 0; i < opts.items.length; i++) {
    const item = opts.items[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = originX + pad + col * (cell + GRID_GAP);
    const y = gridTop + row * (cell + GRID_GAP);
    const bmp = bitmaps[i];
    ctx.save();
    roundRect(ctx, x, y, cell, cell, 12);
    ctx.clip();
    fillRarity(ctx, x, y, cell, cell, item, bmp ? backgrounds[i] ?? null : null);
    if (bmp) {
      if (item.faded) ctx.globalAlpha = 0.35;
      const iconArea = cell - (item.price ? 44 : 32);
      drawContained(ctx, bmp, x + (cell - iconArea) / 2, y, iconArea);
      ctx.globalAlpha = 1;
    }

    const band = item.price ? 44 : 32;
    const bandY = y + cell - band;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(x, bandY, cell, band);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `600 13px ${UI_FONT}`;
    ctx.fillText(fitText(ctx, item.name, cell - 16), x + 8, y + cell - (item.price ? 26 : 10), cell - 16);
    if (item.price) {
      ctx.font = `700 14px ${UI_FONT}`;
      ctx.fillText(item.price, x + 8, y + cell - 8, cell - 16);
    }
    if (item.tag) {
      ctx.fillStyle = '#fcd34d';
      ctx.font = `700 11px ${UI_FONT}`;
      ctx.fillText(item.tag, x + 8, y + 16, cell - 16);
    }
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 14px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(opts.footer ?? APP_NAME, originX + pad, originY + contentHeight(layout.rows, cell) - footer / 2);

  return encodeWebp(canvas);
}
