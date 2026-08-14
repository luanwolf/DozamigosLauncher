import { existsSync } from 'node:fs';
import { GlobalFonts, type CanvasRenderingContext2D } from '@napi-rs/canvas';

let fontsReady = false;

const FONT_CANDIDATES = [
  { path: 'C:/Windows/Fonts/segoeui.ttf', family: 'Segoe UI' },
  { path: 'C:/Windows/Fonts/segoeuib.ttf', family: 'Segoe UI Bold' },
  { path: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', family: 'DejaVu Sans' },
  { path: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', family: 'DejaVu Sans Bold' }
];

export function registerCanvasFonts() {
  if (fontsReady) return;
  for (const font of FONT_CANDIDATES) {
    if (existsSync(font.path)) {
      try {
        GlobalFonts.registerFromPath(font.path, font.family);
      } catch {
        /* ignore */
      }
    }
  }
  fontsReady = true;
}

export function canvasFont(size: number, bold = false): string {
  const family = bold ? 'Segoe UI Bold, DejaVu Sans Bold, sans-serif' : 'Segoe UI, DejaVu Sans, sans-serif';
  return `${bold ? 'bold ' : ''}${size}px ${family}`;
}

export function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function lighten(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function drawTextShadow(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color = '#ffffff'
) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawBottomGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  startRatio = 0.45
) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(startRatio, 'rgba(0,0,0,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

export function drawCardBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string
) {
  const { r: cr, g: cg, b: cb } = hexToRgb(color);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, lighten(color, 0.18));
  grad.addColorStop(0.55, color);
  grad.addColorStop(1, `rgb(${Math.max(0, cr - 28)}, ${Math.max(0, cg - 28)}, ${Math.max(0, cb - 28)})`);
  ctx.fillStyle = grad;
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
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawHudHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  pad: number,
  title: string,
  subtitle: string,
  accentColor: string,
  headerH: number
) {
  const grad = ctx.createLinearGradient(0, 0, 0, headerH + pad);
  grad.addColorStop(0, '#25262a');
  grad.addColorStop(1, '#1a1b1e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, headerH + pad);

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, width, 4);

  ctx.fillStyle = accentColor;
  ctx.fillRect(pad, pad + 8, 4, 28);

  ctx.fillStyle = '#ffffff';
  ctx.font = canvasFont(24, true);
  ctx.fillText(title, pad + 14, pad + 28);

  ctx.fillStyle = '#b5bac1';
  ctx.font = canvasFont(13);
  ctx.fillText(subtitle, pad + 14, pad + 50);
}

export function drawSectionHeader(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  title: string,
  accentColor: string
) {
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y + 4, 3, 20);

  ctx.fillStyle = '#f2f3f5';
  ctx.font = canvasFont(15, true);
  ctx.fillText(title, x + 12, y + 20);
}

export function drawStatPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  accent: string
) {
  ctx.font = canvasFont(11, true);
  const text = `${label}: ${value}`;
  const w = ctx.measureText(text).width + 20;

  drawRoundedRect(ctx, x, y, w, 24, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + 10, y + 16);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
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
