const fs = require('fs');

const account = `import type { AccountData } from '$types/account';
import {
  parseSpriteProgress,
  SPRITE_FAMILIES,
  type SpriteProgress,
  type SpriteVariant
} from '$lib/modules/sprites';

export type SpriteGizmo = {
  id: string;
  label: string;
  quantity: number;
  iconUrl?: string;
};

export type SpriteResources = {
  dust: number;
  gizmos: SpriteGizmo[];
};

/** Entry key -> in-collection level (1-5) when Magpie exposes it. */
export type SpriteLevels = Record<string, number>;

export type SpriteAccountState = SpriteProgress & {
  resources: SpriteResources;
  levels: SpriteLevels;
};

type ProfileItem = {
  templateId?: string;
  quantity?: number;
  attributes?: Record<string, unknown>;
};

function profileItems(profile: unknown): ProfileItem[] {
  const changes = (profile as { profileChanges?: { profile?: { items?: Record<string, unknown> } }[] })
    ?.profileChanges;
  return Object.values(changes?.[0]?.profile?.items ?? {}).map((item) => item as ProfileItem);
}

function profileAttrs(profile: unknown): Record<string, unknown> {
  const changes = (profile as {
    profileChanges?: { profile?: { stats?: { attributes?: Record<string, unknown> } } }[];
  })?.profileChanges;
  return changes?.[0]?.profile?.stats?.attributes ?? {};
}

const DUST_RE =
  /spritedust|sprite_dust|sprite\\.dust|currency_sprite|athena_sprite_dust|spritesdust|dust_sprite/i;

const GIZMO_ICON_ROOT = '/resources/elementals/gizmos';

/**
 * Chapter 7 Season 4 (Override) gizmos — same set Fortniters shows on the album card.
 * Matches stay broad so Epic templateId renames still land.
 */
export const SPRITE_GIZMO_CATALOG: { id: string; label: string; match: RegExp; iconUrl: string }[] = [
  {
    id: 'spicy-taco',
    label: 'Spicy Taco',
    match: /spicy.?taco|athenagizmo_spicy|gizmo_spicy|taco.?gizmo|consumable.*taco/i,
    iconUrl: \`\${GIZMO_ICON_ROOT}/spicy-taco.png\`
  },
  {
    id: 'llama-supply-drop',
    label: 'Llama Drop',
    match: /llama.?supply|supply.?llama|llama.?drop|athenagizmo_llama|gizmo_llama|llamallama/i,
    iconUrl: \`\${GIZMO_ICON_ROOT}/llama-supply-drop.png\`
  },
  {
    id: 'extraction-accelerator',
    label: 'Accelerator',
    match: /extraction.?accel|accel.*extract|site.?accel|athenagizmo_extraction|gizmo_accel/i,
    iconUrl: \`\${GIZMO_ICON_ROOT}/extraction-accelerator.png\`
  },
  {
    id: 'cheat-code-locator',
    label: 'Code Locator',
    match:
      /cheat.?code.?locator|code.?locator|cheat.?locator|sprite.?locator|lucky.?locator|athenagizmo_(cheat|sprite.?locator)|gizmo_.*locator/i,
    iconUrl: \`\${GIZMO_ICON_ROOT}/cheat-code-locator.png\`
  },
  {
    id: 'portable-extractor',
    label: 'Extrator',
    match:
      /portable.?extractor|extractor.?portable|athenagizmo_portable|gizmo_portable|gizmo.*extract(?!ion.?accel)/i,
    iconUrl: \`\${GIZMO_ICON_ROOT}/portable-extractor.png\`
  }
];

export const SPRITE_DUST_ICON = \`\${GIZMO_ICON_ROOT}/dust.png\`;

function qty(item: ProfileItem) {
  const q = item.quantity;
  return typeof q === 'number' && Number.isFinite(q) ? Math.max(0, Math.floor(q)) : 0;
}

function digLevel(value: unknown, depth = 0): number | null {
  if (depth > 6 || value == null) return null;
  if (typeof value === 'number' && value >= 1 && value <= 5) return Math.floor(value);
  if (typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  for (const key of ['level', 'Level', 'sprite_level', 'SpriteLevel', 'currentLevel']) {
    const n = digLevel(obj[key], depth + 1);
    if (n != null) return n;
  }
  for (const child of Object.values(obj)) {
    const n = digLevel(child, depth + 1);
    if (n != null) return n;
  }
  return null;
}

function familyFromTemplate(templateId: string): { family: string; variant: SpriteVariant } | null {
  const lower = templateId.toLowerCase();
  if (!/sprite|elemental|magpie|collectible/.test(lower)) return null;

  let variant: SpriteVariant = 'base';
  if (/cheat\\s?master|cheatmaster/.test(lower)) variant = 'cheat-master';
  else if (/\\bgold\\b|dourad/.test(lower)) variant = 'gold';

  for (const family of SPRITE_FAMILIES) {
    const tokens = [family.slug, family.imageSlug, family.slug.replace(/-/g, '')].filter(Boolean) as string[];
    if (tokens.some((token) => lower.includes(token.replace(/-/g, '')))) {
      return { family: family.slug, variant };
    }
  }
  return null;
}

function matchGizmo(templateId: string) {
  // First hit wins — catalog order puts specific S4 names before the portable extractor catch.
  return SPRITE_GIZMO_CATALOG.find((gizmo) => gizmo.match.test(templateId)) ?? null;
}

/** Pull Sprite Dust + S4 gizmos from athena/collections item stacks and stats. */
export function parseSpriteResources(...profiles: unknown[]): SpriteResources {
  let dust = 0;
  const gizmoQty = new Map<string, number>();

  for (const profile of profiles) {
    if (!profile) continue;
    for (const [key, value] of Object.entries(profileAttrs(profile))) {
      if (DUST_RE.test(key) && typeof value === 'number') dust = Math.max(dust, Math.floor(value));
    }
    for (const item of profileItems(profile)) {
      const id = item.templateId ?? '';
      const amount = qty(item);
      if (!id || amount < 1) continue;
      if (DUST_RE.test(id)) {
        dust += amount;
        continue;
      }
      const gizmo = matchGizmo(id);
      if (!gizmo) continue;
      gizmoQty.set(gizmo.id, (gizmoQty.get(gizmo.id) ?? 0) + amount);
    }
  }

  // Always expose the full Override set so the album / UI can show zeros like Fortniters.
  const gizmos = SPRITE_GIZMO_CATALOG.map((gizmo) => ({
    id: gizmo.id,
    label: gizmo.label,
    quantity: gizmoQty.get(gizmo.id) ?? 0,
    iconUrl: gizmo.iconUrl
  }));

  return { dust, gizmos };
}

/** Magpie/collections ownership + level per entry key when Epic exposes it. */
export function parseSpriteLevels(...profiles: unknown[]): SpriteLevels {
  const levels: SpriteLevels = {};
  for (const profile of profiles) {
    if (!profile) continue;
    for (const item of profileItems(profile)) {
      const id = item.templateId ?? '';
      if (!id) continue;
      const parsed = familyFromTemplate(id);
      if (!parsed) continue;
      const level = digLevel(item.attributes) ?? (qty(item) > 0 ? 1 : null);
      if (level == null) continue;
      const key = \`\${parsed.family}:\${parsed.variant}\`;
      levels[key] = Math.max(levels[key] ?? 0, level);
    }
  }
  return levels;
}

/**
 * Athena Mastery + Magpie collections (dust, gizmos, levels) for the logged-in account —
 * the same profiles Discord bots use for Sprite cards.
 */
export async function fetchSpriteAccountState(account: AccountData): Promise<SpriteAccountState> {
  const { queryProfile } = await import('$lib/modules/mcp');
  const athena = await queryProfile(account, 'athena');
  // Magpie stacks live on collections; soft-fail so Mastery still loads if Epic flakes.
  const collections = await queryProfile(account, 'collections').catch(() => null);
  const progress = parseSpriteProgress(athena);
  const levels = parseSpriteLevels(athena, collections);
  for (const key of Object.keys(levels)) {
    const family = key.split(':')[0];
    if (family) progress.extracted.add(family);
  }
  return {
    ...progress,
    resources: parseSpriteResources(athena, collections),
    levels
  };
}
`;

const exp = `import {
  APP_ICON_URL,
  APP_NAME,
  DISPLAY_FONT,
  ensureDisplayFont,
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

const EXPORT_VARIANTS: SpriteVariant[] = ['base', 'cheat-master'];

const RARITY_BAR: Record<SpriteRarity, string> = {
  rare: '#3d9bf7',
  epic: '#9b59d0',
  legendary: '#e67e22',
  mythic: '#f1c40f'
};

/**
 * Logical CSS pixels — canvas is rendered at SCALE so 512² sprite art stays near 1:1.
 * CELL * SCALE ≈ 504 keeps downscale minimal (sources are 512 WebPs).
 */
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
  if (!entry) throw new Error(\`Missing sprite entry \${slug}:\${variant}\`);
  return entry;
}

function isOwned(entry: SpriteEntry, ownedKeys: ReadonlySet<string>) {
  if (ownedKeys.has(entry.key)) return true;
  if (entry.variant === 'base' && ownedKeys.has(entry.slug)) return true;
  return false;
}

/** Fixed 2×12 BASE + CHEAT MASTER grid (24 slots). */
export function buildSpriteExportSlots(
  ownedKeys: ReadonlySet<string>,
  levels: Record<string, number> = {}
): SpriteExportSlot[] {
  const slots: SpriteExportSlot[] = [];
  let slot = 1;
  for (const variant of EXPORT_VARIANTS) {
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
  ctx.font = \`800 18px \${DISPLAY_FONT}\`;
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
  ctx.font = \`700 22px \${UI_FONT}\`;
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
 * Fortniters-style album: username, X/24, dust + gizmos, BASE + CHEAT MASTER rows.
 * Rendered at 3× so 512px sprite art stays sharp on the card.
 */
export async function exportSpriteAlbumWebp(options: SpriteExportOptions): Promise<SpriteExportResult> {
  const { accountLabel, ownedKeys, levels = {}, resources, onProgress } = options;
  await ensureDisplayFont();

  const slots = buildSpriteExportSlots(ownedKeys, levels);
  const ownedCount = slots.filter((slot) => slot.owned).length;

  const cols = SPRITE_EXPORT_ORDER.length;
  const rows = EXPORT_VARIANTS.length;
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
  ctx.font = \`900 64px \${DISPLAY_FONT}\`;
  ctx.fillText(title.toUpperCase(), width / 2, 48, width - PAD * 2 - 220);

  ctx.font = \`900 36px \${DISPLAY_FONT}\`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(\`\${ownedCount}/24 SPRITES\`, width / 2, 96, width - PAD * 2 - 220);

  if (resources) {
    const dustBmp = await loadBitmap(SPRITE_DUST_ICON);
    // Dust alone on the top-right (Fortniters layout).
    ctx.font = \`700 22px \${UI_FONT}\`;
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
      ctx.font = \`700 22px \${UI_FONT}\`;
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

  ctx.font = \`800 16px \${DISPLAY_FONT}\`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  SPRITE_EXPORT_ORDER.forEach((slug, col) => {
    const family = SPRITE_FAMILIES.find((item) => item.slug === slug);
    const label = spriteShortName(family?.name ?? slug).toUpperCase();
    const x = gridLeft + col * (CELL + GAP) + CELL / 2;
    ctx.fillText(fitText(ctx, label, CELL - 6), x, HEADER + PAD + NAME_ROW / 2);
  });

  drawVerticalLabel(ctx, 'BASE', PAD + LABEL_COL / 2, gridTop, CELL);
  drawVerticalLabel(ctx, 'CHEAT MASTER', PAD + LABEL_COL / 2, gridTop + CELL + GAP, CELL);

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
      const pad = 8;
      const box = CELL - pad * 2;
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
    ctx.font = \`700 15px \${UI_FONT}\`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(slot.slot).padStart(2, '0'), x + 8, y + 7);

    if (slot.owned && slot.level != null) {
      ctx.textBaseline = 'bottom';
      ctx.fillText(\`Lvl \${slot.level}\`, x + 8, y + CELL - BAR_H - 8);
    }

    if (slot.entry.variant === 'cheat-master') {
      drawRainbowBar(ctx, x, y + CELL - BAR_H, CELL, BAR_H);
    } else {
      ctx.fillStyle = RARITY_BAR[slot.entry.rarity];
      ctx.fillRect(x, y + CELL - BAR_H, CELL, BAR_H);
    }

    ctx.restore();
  }

  const appIcon = await loadBitmap(APP_ICON_URL);
  const footerY = height - FOOTER / 2;
  const iconSize = 28;
  ctx.font = \`600 22px \${UI_FONT}\`;
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

  const filePath = await saveExportBlob(blob, \`sprites-\${sanitizeFilename(accountLabel || 'account')}.webp\`);
  return { count: slots.length, owned: ownedCount, path: filePath };
}
`;

// Fix template literal escaping - the above used \\` which is wrong for writing files.
// Rebuild without over-escaping using String.raw / array join instead.
function write(path, content) {
  fs.writeFileSync(path, content.replace(/\\\\`/g, '`').replace(/\\\\\$/g, '$').replace(/\\\\\\\\/g, '\\\\'));
}

write('src/lib/modules/sprites-account.ts', account);
write('src/lib/modules/sprites-export.ts', exp);
console.log('wrote account+export', fs.statSync('src/lib/modules/sprites-account.ts').size, fs.statSync('src/lib/modules/sprites-export.ts').size);
