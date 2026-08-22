import type { AccountData } from '$types/account';
import {
  parseSpriteProgress,
  SPRITE_FAMILIES,
  SPRITE_RELIC_FAMILIES,
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
  quantity?: number | string;
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

/** Coerce Epic quantity fields (number or numeric string). */
function asQty(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  return 0;
}

function qty(item: ProfileItem) {
  const fromTop = asQty(item.quantity);
  if (fromTop > 0) return fromTop;
  const attrs = item.attributes ?? {};
  for (const key of ['quantity', 'Quantity', 'charges', 'Count', 'count', 'level_count']) {
    const n = asQty(attrs[key]);
    if (n > 0) return n;
  }
  return 0;
}

// Keep focused on Sprite Dust — avoid loose `currency_sprite` which matched unrelated stacks.
const DUST_RE = /sprite[_\s.-]?dust|athenaspritedust|extractionpoints/i;

const EOS_DEPLOYMENT_ID = '62a9473a2dca46b29ccf17577fcf42d7';
const SPRITE_MAGPIE_MODULE = '828c9446-3eb8-497e-a282-d95b92243c14';
const GIZMO_MAGPIE_MODULE = '039e7691-eb2a-4ce2-99c5-63c831917870';
const EOS_MAGPIE_UA =
  'EOS-SDK/1.19.4200.0-56705564@Fortnite (Windows/10.0.26100.8972.64bit) Fortnite/++Fortnite+Release-42.00-CL-56878558';
const RELIC_ID_RE = /^([A-Za-z0-9]+?)(?:Sprite)?_Variant_(A|Gold|CheatMaster)$/i;

const GIZMO_ICON_ROOT = '/elementals/gizmos';

/**
 * Override (Ch7S4) gizmos — match Epic plugin / WID names from the live inventory.
 * Order matches the in-game Dispositivos row / Magpie Item00–04.
 * ponytail: Magpie keys are slot paths, not item names. Ceiling: remap magpieKey if Epic reshuffles the wheel.
 */
export const SPRITE_GIZMO_CATALOG: {
  id: string;
  label: string;
  match: RegExp;
  iconUrl: string;
  magpieKey: string;
}[] = [
  {
    id: 'portable-extractor',
    label: 'Extrator Portátil',
    match: /relic.?extractor|portable.?extractor|extractionrelic|wid_relicextractor|magpiereward_morningbell_relicextractor/i,
    iconUrl: GIZMO_ICON_ROOT + '/portable-extractor.png',
    magpieKey: '/MorningBell/CosmicThunder/Item00'
  },
  {
    id: 'llama-supply-drop',
    label: 'Entrega de Suprimentos da Lhama',
    match: /llama.?supply|supply.?drop.?caller|llamasupplydrop|llama.?drop.?radio|magpiereward_morningbell_llamasupply/i,
    iconUrl: GIZMO_ICON_ROOT + '/llama-supply-drop.png',
    magpieKey: '/MorningBell/CosmicThunder/Item01'
  },
  {
    id: 'extraction-accelerator',
    label: 'Acelerador de Extração',
    match:
      /smuggler|extraction.?key|extraction.?accel|smugglers.?key|site.?accel|extractionaccelerator|magpiereward_morningbell_smugglerextraction/i,
    iconUrl: GIZMO_ICON_ROOT + '/extraction-accelerator.png',
    magpieKey: '/MorningBell/CosmicThunder/Item02'
  },
  {
    id: 'cheat-code-locator',
    label: 'Localizador de Códigos',
    match:
      /cheat.?code.?(finder|locator)|code.?(finder|locator)|cheatcodefinder|sprite.?locator|lucky.?locator|magpiereward_morningbell_cheatcode/i,
    iconUrl: GIZMO_ICON_ROOT + '/cheat-code-locator.png',
    magpieKey: '/MorningBell/CosmicThunder/Item03'
  },
  {
    id: 'spicy-taco',
    label: 'Taco Apimentado',
    match: /spicy.?taco|taco.?tuesday|tacotuesday|spicytaco|magpiereward_morningbell_spicytaco/i,
    iconUrl: GIZMO_ICON_ROOT + '/spicy-taco.png',
    magpieKey: '/MorningBell/CosmicThunder/Item04'
  }
];

export const SPRITE_DUST_ICON = GIZMO_ICON_ROOT + '/dust.png';

function digLevel(value: unknown, depth = 0): number | null {
  if (depth > 6 || value == null) return null;
  if (typeof value === 'number' && value >= 1 && value <= 5) return Math.floor(value);
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 1 && n <= 5) return Math.floor(n);
  }
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

function lookupRelicFamily(token: string): string | null {
  const relic = token.toLowerCase().replace(/sprite$/i, '');
  return SPRITE_RELIC_FAMILIES[relic] ?? SPRITE_RELIC_FAMILIES[relic.replace(/-/g, '')] ?? null;
}

export function parseRelicId(id: string): { family: string; variant: SpriteVariant } | null {
  const match = id.match(RELIC_ID_RE);
  if (!match) return null;
  const family = lookupRelicFamily(match[1]);
  if (!family) return null;
  const raw = match[2].toLowerCase();
  const variant: SpriteVariant = raw === 'cheatmaster' ? 'cheat-master' : raw === 'gold' ? 'gold' : 'base';
  return { family, variant };
}

/** MCP collections / catalog ids: CollectableCreature:Jonesy, BR_Creature_Sprite_BushRanger_Gold. */
const CREATURE_SPRITE_RE =
  /^(?:CollectableCreatureSprite|CollectableCreature|CreatureSprite|CollectableSprite|BR_Creature_Sprite)[:._-]+(.+)$/i;

export function parseCreatureSpriteId(id: string): { family: string; variant: SpriteVariant } | null {
  const relic = parseRelicId(id);
  if (relic) return relic;
  const match = id.match(CREATURE_SPRITE_RE);
  if (!match) return null;
  let name = match[1];
  let variant: SpriteVariant = 'base';
  if (/cheatmaster$/i.test(name)) {
    variant = 'cheat-master';
    name = name.replace(/[_-]?cheatmaster$/i, '');
  } else if (/_gold$|gold$/i.test(name) && !/cheatmaster/i.test(name)) {
    variant = 'gold';
    name = name.replace(/[_-]?gold$/i, '');
  }
  const family = lookupRelicFamily(name.replace(/[_-]/g, ''));
  return family ? { family, variant } : null;
}

function familyFromTemplate(templateId: string): { family: string; variant: SpriteVariant } | null {
  const creature = parseCreatureSpriteId(templateId);
  if (creature) return creature;

  const lower = templateId.toLowerCase();
  // MagpieReward_* entitlement names contain family words (CrownSprite) without meaning ownership.
  if (/^magpiereward_/i.test(templateId) && !/_variant_/i.test(templateId)) return null;
  if (!/sprite|elemental|magpie|collectible|collectable|creature/.test(lower)) return null;

  let variant: SpriteVariant = 'base';
  if (/cheat\s?master|cheatmaster/.test(lower)) variant = 'cheat-master';
  else if (/\bgold\b|dourad/.test(lower)) variant = 'gold';

  for (const family of SPRITE_FAMILIES) {
    const tokens = [family.slug, family.imageSlug, family.slug.replace(/-/g, '')].filter(Boolean) as string[];
    if (tokens.some((token) => lower.includes(token.replace(/-/g, '')))) {
      return { family: family.slug, variant };
    }
  }
  return null;
}

function matchGizmo(templateId: string) {
  const byKey = SPRITE_GIZMO_CATALOG.find((gizmo) => gizmo.magpieKey === templateId);
  if (byKey) return byKey;
  // First hit wins — more specific Override names first (portable before generic "extractor").
  return SPRITE_GIZMO_CATALOG.find((gizmo) => gizmo.match.test(templateId)) ?? null;
}

function parseJsonish(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/** Walk Magpie / SaveFramework JSON into MCP-shaped items so the parsers stay shared. */
export function flattenMagpie(value: unknown, path = 'root', depth = 0): ProfileItem[] {
  if (depth > 8 || value == null) return [];
  const parsed = parseJsonish(value);

  if (Array.isArray(parsed)) {
    return parsed.flatMap((child, i) => flattenMagpie(child, `${path}.${i}`, depth + 1));
  }

  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    // ponytail: Magpie catalogs unused relics at 0 — 0 is not ownership. Ceiling: if Epic stores
    // "owned but unlevelled" as 0, switch this to a presence check and read level from a sibling key.
    if (parsed <= 0) return [];
    if (parseRelicId(path.split('.').at(-1) ?? '') || DUST_RE.test(path) || matchGizmo(path)) {
      return [{ templateId: path.split('.').at(-1), quantity: parsed, attributes: { level: parsed } }];
    }
    return [];
  }

  if (typeof parsed !== 'object') return [];
  const obj = parsed as Record<string, unknown>;
  const items: ProfileItem[] = [];

  const templateId =
    (typeof obj.templateId === 'string' && obj.templateId) ||
    (typeof obj.TemplateId === 'string' && obj.TemplateId) ||
    (typeof obj.itemId === 'string' && obj.itemId) ||
    (typeof obj.relicId === 'string' && obj.relicId) ||
    (parseRelicId(path.split('.').at(-1) ?? '') ? path.split('.').at(-1) : undefined);

  if (templateId) {
    items.push({
      templateId,
      quantity: obj.quantity ?? obj.Quantity ?? obj.count ?? 1,
      attributes: obj.attributes && typeof obj.attributes === 'object' ? (obj.attributes as Record<string, unknown>) : obj
    });
  }

  for (const [key, child] of Object.entries(obj)) {
    if (key === 'attributes' || key === 'templateId') continue;
    items.push(...flattenMagpie(child, `${path}.${key}`, depth + 1));
  }
  return items;
}

function itemsAsProfile(list: ProfileItem[]): unknown {
  const items: Record<string, ProfileItem> = {};
  list.forEach((item, i) => {
    items[`magpie-${i}`] = item;
  });
  return { profileChanges: [{ profile: { items, stats: { attributes: {} } } }] };
}

/** ponytail: XP curve guessed from live metadata (ml at 4000). Ceiling: read SpriteBoons table if Epic retunes. */
export function spriteXpToLevel(xp: number, mastered = false): number {
  if (mastered || xp >= 4000) return 5;
  if (xp >= 2000) return 4;
  if (xp >= 1000) return 3;
  if (xp >= 500) return 2;
  return 1;
}

/** Magpie v2 GET inventory (`counts` + `entitlementMetadata` xp/ml). */
export function parseMagpieV2Inventory(json: unknown): ProfileItem[] {
  const bags = (json as { inventory?: unknown })?.inventory;
  if (!Array.isArray(bags)) return [];
  const items: ProfileItem[] = [];
  for (const bag of bags) {
    if (!bag || typeof bag !== 'object') continue;
    const counts = (bag as { counts?: Record<string, unknown> }).counts ?? {};
    const meta = (bag as { entitlementMetadata?: Record<string, string> }).entitlementMetadata ?? {};
    for (const [id, rawQty] of Object.entries(counts)) {
      if (/UnseenStatus$/i.test(id)) continue;
      const quantity = asQty(rawQty);
      if (quantity <= 0) continue;
      let xp = 0;
      let mastered = false;
      const raw = meta[id];
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw) as { xp?: unknown; ml?: unknown };
          if (typeof parsed.xp === 'number' && Number.isFinite(parsed.xp)) xp = parsed.xp;
          mastered = parsed.ml === true;
        } catch {
          /* ignore */
        }
      }
      items.push({ templateId: id, quantity, attributes: { xp, ml: mastered, level: spriteXpToLevel(xp, mastered) } });
    }
  }
  return items;
}

export type FortniteEosSession = {
  accessToken: string;
  productUserId: string;
};

export async function getFortniteEosSession(account: AccountData): Promise<FortniteEosSession | null> {
  const { getCachedToken } = await import('$lib/modules/auth-session');
  const { getExchangeCodeUsingAccessToken } = await import('$lib/modules/authentication');
  const { fortnitePCGameClient } = await import('$lib/constants/clients');
  const { epicService } = await import('$lib/http');

  // Fortnite's EOS ClientId is the PC game client (see FortniteGame.log EOSSDK boot).
  // Android EG1 tokens are not JWTs — Magpie/inventory reject them. Exchange into EAS v2 JWT.
  const epicToken = await getCachedToken(account);
  const { code } = await getExchangeCodeUsingAccessToken(epicToken);
  const eas = await epicService
    .post<{ access_token?: string }>('https://api.epicgames.dev/epic/oauth/v2/token', {
      headers: {
        Authorization: `Basic ${fortnitePCGameClient.base64}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'exchange_code',
        exchange_code: code,
        deployment_id: EOS_DEPLOYMENT_ID
      }).toString()
    })
    .json()
    .catch(() => null);

  const easJwt = eas?.access_token;
  if (!easJwt) return null;

  for (const externalAuthType of ['epicgames_access_token', 'epicgames_id_token'] as const) {
    const eos = await epicService
      .post<{ access_token?: string; product_user_id?: string }>('https://api.epicgames.dev/auth/v1/oauth/token', {
        headers: {
          Authorization: `Basic ${fortnitePCGameClient.base64}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'external_auth',
          external_auth_type: externalAuthType,
          external_auth_token: easJwt,
          deployment_id: EOS_DEPLOYMENT_ID,
          nonce: crypto.randomUUID()
        }).toString()
      })
      .json()
      .catch(() => null);

    if (eos?.access_token && eos.product_user_id) {
      return { accessToken: eos.access_token, productUserId: eos.product_user_id };
    }
  }

  return null;
}

async function fetchMagpieBag(
  magpieV2Service: Awaited<typeof import('$lib/http')>['magpieV2Service'],
  session: FortniteEosSession,
  accountId: string,
  moduleId: string
) {
  return magpieV2Service
    .get(`deployment/${EOS_DEPLOYMENT_ID}/domain/FN1/account/${accountId}/workspace/default/linkMode/live/inventory`, {
      searchParams: {
        moduleFilters: `${moduleId}:*`,
        includeMetadata: 'true'
      },
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'X-User-Agent': EOS_MAGPIE_UA
      }
    })
    .json()
    .catch(() => null);
}

async function fetchMagpieProfile(account: AccountData): Promise<unknown | null> {
  const session = await getFortniteEosSession(account).catch(() => null);
  if (!session) return null;

  const { magpieV2Service } = await import('$lib/http');
  const [sprites, gizmos] = await Promise.all([
    fetchMagpieBag(magpieV2Service, session, account.accountId, SPRITE_MAGPIE_MODULE),
    fetchMagpieBag(magpieV2Service, session, account.accountId, GIZMO_MAGPIE_MODULE)
  ]);

  const items = [...parseMagpieV2Inventory(sprites), ...parseMagpieV2Inventory(gizmos)];
  return items.length ? itemsAsProfile(items) : null;
}

/**
 * Pull Sprite Dust + Override gizmos from athena / collections / common_core.
 * Same stacks can appear on more than one profile — take max per id, never sum across profiles.
 */
export function parseSpriteResources(...profiles: unknown[]): SpriteResources {
  let dust = 0;
  const gizmoQty = new Map<string, number>();

  for (const profile of profiles) {
    if (!profile) continue;

    let profileDust = 0;
    const profileGizmos = new Map<string, number>();

    for (const [key, value] of Object.entries(profileAttrs(profile))) {
      if (DUST_RE.test(key)) {
        profileDust = Math.max(profileDust, asQty(value));
      }
    }

    for (const item of profileItems(profile)) {
      const id = item.templateId ?? '';
      if (!id) continue;
      const amount = qty(item);
      if (amount < 1) continue;
      // Quest/Challenge templateIds can contain "spritedust" in the name without being currency.
      if (/^(Quest|ChallengeBundle|ChallengeBundleSchedule):/i.test(id)) continue;
      if (DUST_RE.test(id)) {
        profileDust = Math.max(profileDust, amount);
        continue;
      }
      const gizmo = matchGizmo(id);
      if (!gizmo) continue;
      profileGizmos.set(gizmo.id, (profileGizmos.get(gizmo.id) ?? 0) + amount);
    }

    dust = Math.max(dust, profileDust);
    for (const [id, amount] of profileGizmos) {
      gizmoQty.set(id, Math.max(gizmoQty.get(id) ?? 0, amount));
    }
  }

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
      // Quest/token `level` is schema level (almost always 1), not Sprite in-collection level.
      if (/^(Quest|ChallengeBundle|ChallengeBundleSchedule|ConditionalAction|Token):/i.test(id)) continue;
      const parsed = familyFromTemplate(id);
      if (!parsed) continue;
      const level = digLevel(item.attributes) ?? (qty(item) > 0 ? 1 : null);
      if (level == null) continue;
      const key = parsed.family + ':' + parsed.variant;
      levels[key] = Math.max(levels[key] ?? 0, level);
    }
  }
  return levels;
}

/**
 * Athena Mastery quests + Magpie v2 inventory (gc.svc …/api/magpie/v2, EOS user token).
 */
export async function fetchSpriteAccountState(account: AccountData): Promise<SpriteAccountState> {
  const { clientQuestLogin, queryProfile } = await import('$lib/modules/mcp');
  // Soft refresh so seasonal Device / Dust stacks land before we read them.
  await clientQuestLogin(account, 'athena').catch(() => null);
  const athena = await queryProfile(account, 'athena');
  const collections = await queryProfile(account, 'collections')
    .then((p) => p)
    .catch(() => null);
  const commonCore = await queryProfile(account, 'common_core')
    .then((p) => p)
    .catch(() => null);
  const magpie = await fetchMagpieProfile(account).catch(() => null);

  const progress = parseSpriteProgress(athena);
  const levels = parseSpriteLevels(athena, collections, commonCore, magpie);
  for (const key of Object.keys(levels)) {
    const family = key.split(':')[0];
    if (family) progress.extracted.add(family);
  }

  const resources = parseSpriteResources(athena, collections, commonCore, magpie);

  return {
    ...progress,
    resources,
    levels
  };
}
