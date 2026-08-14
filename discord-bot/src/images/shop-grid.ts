import { createCanvas, loadImage, type SKRSContext2D, type Image } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { ASSETS } from '@/config/paths';
import {
  canvasFont,
  drawBottomGradient,
  drawCardBackground,
  drawHudHeader,
  drawSectionHeader,
  drawTextShadow,
  registerCanvasFonts
} from '@/images/canvas-theme';

const imageCache = new Map<string, Promise<Image | null>>();

export async function loadImageCached(source: string, local = false): Promise<Image | null> {
  const key = local ? `local:${source}` : source;
  let pending = imageCache.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        if (local) {
          const buffer = readFileSync(source);
          return loadImage(buffer);
        }
        const res = await fetch(source, { signal: AbortSignal.timeout(12_000) });
        if (!res.ok) return null;
        return loadImage(Buffer.from(await res.arrayBuffer()));
      } catch {
        return null;
      }
    })();
    imageCache.set(key, pending);
  }
  return pending;
}

export function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number, maxLines = 2): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current) lines.push(current);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > 3 ? `${last.slice(0, -3)}…` : `${last}…`;
  }
  return lines;
}

export function drawRoundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export type GridCard = {
  name: string;
  priceLabel: string;
  priceIcon?: 'vbucks' | 'gold';
  imageUrl?: string;
  imagePath?: string;
  backgroundColor: string;
  badge?: string;
};

export type ShopGridOptions = {
  title: string;
  subtitle: string;
  items: GridCard[];
  cols?: number;
  rows?: number;
  accentColor?: string;
};

export type ShopSectionRender = {
  title: string;
  items: GridCard[];
};

export type FullShopOptions = {
  title: string;
  subtitle: string;
  sections: ShopSectionRender[];
  accentColor?: string;
  cols?: number;
  width?: number;
  cardHeight?: number;
};

async function drawGridCard(
  ctx: SKRSContext2D,
  item: GridCard,
  x: number,
  y: number,
  cardW: number,
  cardH: number,
  vbucksIcon: Image | null,
  goldIcon: Image | null,
  compact = false
) {
  const r = compact ? 8 : 10;
  drawCardBackground(ctx, x, y, cardW, cardH, r, item.backgroundColor);

  const img =
    (item.imagePath && (await loadImageCached(item.imagePath, true))) ||
    (item.imageUrl && (await loadImageCached(item.imageUrl))) ||
    null;

  const footerH = compact ? 46 : 52;
  const imgPad = compact ? 8 : 10;
  const imgAreaH = cardH - footerH;

  if (img) {
    const scale = Math.min((cardW - imgPad * 2) / img.width, (imgAreaH - imgPad) / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (cardW - dw) / 2, y + imgPad, dw, dh);
  }

  drawBottomGradient(ctx, x, y + cardH - footerH, cardW, footerH, 0.2);

  ctx.font = canvasFont(compact ? 10 : 11, true);
  const nameLines = wrapText(ctx, item.name, cardW - 12, 2);
  nameLines.forEach((line, li) => drawTextShadow(ctx, line, x + 6, y + cardH - footerH + 14 + li * (compact ? 12 : 13)));

  const icon = item.priceIcon === 'gold' ? goldIcon : vbucksIcon;
  const priceY = y + cardH - 8;
  const iconSize = compact ? 12 : 14;
  if (icon) ctx.drawImage(icon, x + 6, priceY - iconSize, iconSize, iconSize);

  ctx.font = canvasFont(compact ? 10 : 11, true);
  const priceColor = item.priceLabel === 'Grátis' ? '#57f287' : '#ffffff';
  drawTextShadow(ctx, item.priceLabel, x + (icon ? 6 + iconSize + 4 : 6), priceY, priceColor);

  if (item.badge) {
    ctx.font = canvasFont(8, true);
    const badgeW = ctx.measureText(item.badge).width + 14;
    drawRoundedRect(ctx, x + 5, y + 5, badgeW, 16, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(item.badge, x + 12, y + 16);
  }
}

export async function renderFullShop(options: FullShopOptions): Promise<Buffer> {
  registerCanvasFonts();

  const cols = options.cols ?? 4;
  const pad = 16;
  const gap = 8;
  const headerH = 64;
  const sectionGap = 22;
  const sectionHeaderH = 32;
  const width = options.width ?? 880;
  const cardH = options.cardHeight ?? 165;
  const compact = cols >= 6;
  const accent = options.accentColor ?? '#5865f2';

  const cardW = Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);

  let totalRows = 0;
  for (const section of options.sections) {
    if (!section.items.length) continue;
    totalRows += sectionHeaderH + Math.ceil(section.items.length / cols) * (cardH + gap) + sectionGap;
  }

  const height = pad + headerH + totalRows + pad;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#16171a';
  ctx.fillRect(0, 0, width, height);

  drawHudHeader(ctx, width, pad, options.title, options.subtitle, accent, headerH);

  const [vbucksIcon, goldIcon] = await Promise.all([
    loadImageCached(ASSETS.vbucks, true),
    loadImageCached(ASSETS.gold, true)
  ]);

  let y = pad + headerH;

  for (const section of options.sections) {
    if (!section.items.length) continue;

    drawSectionHeader(ctx, pad, y + 6, section.title, accent);
    y += sectionHeaderH;

    for (let i = 0; i < section.items.length; i++) {
      const item = section.items[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cardW + gap);
      const cy = y + row * (cardH + gap);

      await drawGridCard(ctx, item, x, cy, cardW, cardH, vbucksIcon, goldIcon, compact);
    }

    const rows = Math.ceil(section.items.length / cols);
    y += rows * (cardH + gap) + sectionGap;
  }

  return canvas.toBuffer('image/png');
}

export async function renderShopGrid(options: ShopGridOptions): Promise<Buffer> {
  registerCanvasFonts();

  const cols = options.cols ?? 3;
  const rows = options.rows ?? 2;
  const pad = 18;
  const gap = 12;
  const headerH = 64;
  const width = 660;
  const cardW = Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);
  const cardH = 210;
  const height = pad + headerH + rows * cardH + gap * (rows - 1) + pad;
  const accent = options.accentColor ?? '#5865f2';

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#16171a';
  ctx.fillRect(0, 0, width, height);

  drawHudHeader(ctx, width, pad, options.title, options.subtitle, accent, headerH);

  const [vbucksIcon, goldIcon] = await Promise.all([
    loadImageCached(ASSETS.vbucks, true),
    loadImageCached(ASSETS.gold, true)
  ]);

  const pageItems = options.items.slice(0, cols * rows);

  for (let i = 0; i < pageItems.length; i++) {
    const item = pageItems[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cardW + gap);
    const yPos = pad + headerH + row * (cardH + gap);
    await drawGridCard(ctx, item, x, yPos, cardW, cardH, vbucksIcon, goldIcon, false);
  }

  return canvas.toBuffer('image/png');
}

export { loadImage, createCanvas };
