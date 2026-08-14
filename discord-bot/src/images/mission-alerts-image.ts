import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { ASSETS } from '@/config/paths';
import {
  canvasFont,
  drawHudHeader,
  drawSectionHeader,
  drawTextShadow,
  registerCanvasFonts
} from '@/images/canvas-theme';
import { TheaterColors, TheaterLetters } from '@/stw/constants/world-info';
import { getMissionDisplayName } from '@/stw/mission-zone-name';
import type { AlertSection } from '@/stw/mission-alerts-data';
import type { ParsedWorldMission } from '@/stw/world-info-parser';
import { drawRoundedRect, loadImageCached } from '@/images/shop-grid';

const WIDTH = 940;
const ROW_H = 42;
const SECTION_HEADER = 38;
const PAD = 16;
const ICON = 24;
const OVERVIEW_H = 56;
const ACCENT = '#f0b232';

type OverviewTotals = {
  totalVbucks: number;
  totalSurvivors: number;
  totalUpgradeLlamas: number;
  totalPerkUp: number;
};

async function drawOverviewBar(ctx: SKRSContext2D, y: number, totals: OverviewTotals) {
  const items = [
    { icon: ASSETS.vbucks, value: String(totals.totalVbucks), label: 'V-Bucks', color: '#57f287' },
    { icon: ASSETS.gold, value: String(totals.totalSurvivors), label: 'Survivors', color: '#f0b232' },
    { icon: ASSETS.gold, value: String(totals.totalUpgradeLlamas), label: 'Llama Tokens', color: '#e67e22' },
    { icon: ASSETS.gold, value: String(totals.totalPerkUp), label: 'Perk-up', color: '#5865f2' }
  ];

  drawRoundedRect(ctx, PAD, y, WIDTH - PAD * 2, OVERVIEW_H, 10);
  ctx.fillStyle = '#25262a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const slotW = (WIDTH - PAD * 2) / items.length;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const img = await loadImageCached(item.icon, true);
    const sx = PAD + i * slotW + 18;
    const cy = y + OVERVIEW_H / 2;

    if (img) ctx.drawImage(img, sx, cy - 14, 28, 28);

    ctx.font = canvasFont(16, true);
    drawTextShadow(ctx, item.value, sx + 36, cy - 2, '#ffffff');

    ctx.font = canvasFont(10);
    ctx.fillStyle = item.color;
    ctx.fillText(item.label, sx + 36, cy + 14);
  }
}

async function drawRewardIcons(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  rewards: { imagePath: string; quantity: number }[],
  maxIcons = 10
) {
  let cx = x;
  for (const r of rewards.slice(0, maxIcons)) {
    drawRoundedRect(ctx, cx - 2, y - 2, ICON + 4, ICON + 4, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    const img = await loadImageCached(r.imagePath, true);
    if (img) ctx.drawImage(img, cx, y, ICON, ICON);

    if (r.quantity > 1) {
      ctx.font = canvasFont(9, true);
      drawTextShadow(ctx, `×${r.quantity}`, cx + ICON + 3, y + ICON - 2, '#b5bac1');
      cx += ICON + 22;
    } else {
      cx += ICON + 8;
    }
  }
}

async function drawMissionRow(ctx: SKRSContext2D, y: number, mission: ParsedWorldMission, alt: boolean) {
  if (alt) {
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(PAD + 4, y, WIDTH - PAD * 2 - 8, ROW_H);
  }

  const theaterColor = TheaterColors[mission.theaterId] ?? TheaterColors.Ventures;
  const letter = TheaterLetters[mission.theaterId] ?? 'V';
  let x = PAD + 10;

  drawRoundedRect(ctx, x, y + 10, 26, 26, 6);
  ctx.fillStyle = theaterColor;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = canvasFont(12, true);
  ctx.fillText(letter, x + 8, y + 28);
  x += 36;

  const zoneImg = await loadImageCached(mission.zone.type.imagePath, true);
  if (zoneImg) {
    drawRoundedRect(ctx, x - 2, y + 8, ICON + 4, ICON + 4, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.drawImage(zoneImg, x, y + 10, ICON, ICON);
  }
  x += ICON + 10;

  ctx.fillStyle = '#f0b232';
  ctx.font = canvasFont(12, true);
  ctx.fillText(`⚡${mission.powerLevel}`, x, y + 28);
  x += 48;

  ctx.fillStyle = '#f2f3f5';
  ctx.font = canvasFont(12);
  const name = getMissionDisplayName(mission);
  const maxNameW = 210;
  const displayName = name.length > 30 ? `${name.slice(0, 29)}…` : name;
  drawTextShadow(ctx, displayName, x, y + 28);
  x += maxNameW;

  if (mission.alert?.rewards.length) {
    await drawRewardIcons(ctx, x, y + 9, mission.alert.rewards);
    x += Math.min(mission.alert.rewards.length, 6) * (ICON + 10) + 8;
  }

  await drawRewardIcons(ctx, x, y + 9, mission.rewards, 6);

  if (mission.modifiers?.length) {
    let mx = WIDTH - PAD - 10 - mission.modifiers.length * (ICON + 6);
    for (const mod of mission.modifiers.slice(0, 5)) {
      const img = await loadImageCached(mod.imagePath, true);
      if (img) ctx.drawImage(img, mx, y + 10, ICON, ICON);
      mx += ICON + 6;
    }
  }
}

export async function renderMissionAlertsImage(
  sections: AlertSection[],
  summary: string,
  totals?: OverviewTotals
): Promise<Buffer> {
  registerCanvasFonts();

  const visibleSections = sections.filter((s) => s.missions.length);
  const headerH = 64;
  let height = PAD + headerH + (totals ? OVERVIEW_H + 12 : 0);
  for (const s of visibleSections) {
    height += SECTION_HEADER + s.missions.length * ROW_H + 14;
  }
  height += PAD;

  const canvas = createCanvas(WIDTH, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#16171a';
  ctx.fillRect(0, 0, WIDTH, height);

  drawHudHeader(ctx, WIDTH, PAD, 'Alertas de Missão — Save the World', summary, ACCENT, headerH);

  let y = PAD + headerH + 8;

  if (totals) {
    await drawOverviewBar(ctx, y, totals);
    y += OVERVIEW_H + 12;
  }

  for (const section of visibleSections) {
    drawSectionHeader(ctx, PAD, y + 4, section.title, ACCENT);
    y += SECTION_HEADER;

    drawRoundedRect(ctx, PAD, y, WIDTH - PAD * 2, section.missions.length * ROW_H, 10);
    ctx.fillStyle = '#1e1f22';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let i = 0; i < section.missions.length; i++) {
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.moveTo(PAD + 12, y);
        ctx.lineTo(WIDTH - PAD - 12, y);
        ctx.stroke();
      }
      await drawMissionRow(ctx, y, section.missions[i], i % 2 === 1);
      y += ROW_H;
    }
    y += 14;
  }

  return canvas.toBuffer('image/png');
}

export async function renderAlertsOverviewBar(totals: OverviewTotals): Promise<Buffer> {
  registerCanvasFonts();
  const w = 880;
  const h = OVERVIEW_H + 8;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#16171a';
  ctx.fillRect(0, 0, w, h);
  await drawOverviewBar(ctx, 4, totals);
  return canvas.toBuffer('image/png');
}
