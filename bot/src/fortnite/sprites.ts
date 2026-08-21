export type SpriteRarity = 'rare' | 'epic' | 'legendary' | 'mythic';
export type SpriteVariant = 'base' | 'gold' | 'cheat-master';

export type SpriteFamily = {
  slug: string;
  name: string;
  rarity: SpriteRarity;
  variants: Exclude<SpriteVariant, 'base'>[];
};

const S4: Exclude<SpriteVariant, 'base'>[] = ['gold', 'cheat-master'];

export const SPRITE_FAMILIES: SpriteFamily[] = [
  { slug: 'klombo', name: 'Elemental Klimbo', rarity: 'mythic', variants: [...S4] },
  { slug: 'crown', name: 'Elemental Coroa', rarity: 'mythic', variants: [...S4] },
  { slug: 'jackrabbit', name: 'Elemental Jackrabbit', rarity: 'legendary', variants: [...S4] },
  { slug: 'sonic', name: 'Elemental Sonic', rarity: 'epic', variants: [...S4] },
  { slug: 'tails', name: 'Elemental Tails', rarity: 'epic', variants: [...S4] },
  { slug: 'shadow', name: 'Elemental Shadow', rarity: 'epic', variants: [...S4] },
  { slug: 'killswitch', name: 'Elemental Killswitch', rarity: 'epic', variants: [...S4] },
  { slug: 'eight-bit', name: 'Elemental 8-Bit', rarity: 'rare', variants: [...S4] },
  { slug: 'adventure', name: 'Elemental Aventura', rarity: 'rare', variants: [...S4] },
  { slug: 'bush', name: 'Elemental Arbusto', rarity: 'rare', variants: [...S4] },
  { slug: 'jonesy', name: 'Elemental Jonesy', rarity: 'rare', variants: [...S4] },
  { slug: 'storm-scout', name: 'Elemental Storm Scout', rarity: 'rare', variants: [...S4] }
];

export function spriteShortName(name: string) {
  return name.replace(/^Elemental(?: de| da| do| dos)?\s+/i, '').trim() || name;
}

export type SpriteEntry = SpriteFamily & { key: string; variant: SpriteVariant; image: string };

export const SPRITE_ENTRIES: SpriteEntry[] = SPRITE_FAMILIES.flatMap((family) => [
  { ...family, key: `${family.slug}:base`, variant: 'base' as const, image: `/elementals/${family.slug}-sprite.webp` },
  ...family.variants.map((variant) => ({
    ...family,
    key: `${family.slug}:${variant}`,
    variant,
    image: `/elementals/variants/${family.slug}__${variant}.webp`
  }))
]);

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

export const SPRITE_RELIC_FAMILIES: Record<string, string> = {
  klombo: 'klombo',
  crown: 'crown',
  cosmicthunderdoublejump: 'jackrabbit',
  doublejump: 'jackrabbit',
  jazzjackrabbit: 'jackrabbit',
  jackrabbit: 'jackrabbit',
  narrowflea: 'sonic',
  sonic: 'sonic',
  narrowfleamonkey: 'tails',
  tails: 'tails',
  reloadovertime: 'shadow',
  shadow: 'shadow',
  killswitch: 'killswitch',
  '8bitblaster': 'eight-bit',
  eightbitblaster: 'eight-bit',
  '8bit': 'eight-bit',
  eightbit: 'eight-bit',
  dwarf: 'adventure',
  adventure: 'adventure',
  bushranger: 'bush',
  bush: 'bush',
  jonesy: 'jonesy',
  stormscout: 'storm-scout'
};

export type SpriteProgress = { mastered: Set<string>; extracted: Set<string> };

const MASTERY_QUEST = /^Quest:quest_s4\d_spritemastery_(redeem_)?p\d+_(q\d+)([a-z]?)$/;
const MASTERY_TOKEN = /^Token:athena_s4\d_spritemastery_token_([a-z0-9]+?)(?:_\d+)?$/i;
const TROPHY_REWARD =
  /^CosmeticVariantToken:vtid_backpack_coldtrophy_([a-z0-9]+?)(?:_(gummy|galaxy|gold|gem|holofoil|cube|quack|cheatmaster))?$/;

export function parseSpriteProgress(profile: unknown): SpriteProgress {
  const changes = (profile as { profileChanges?: { profile?: { items?: Record<string, unknown> } }[] })?.profileChanges;
  const items = Object.values(changes?.[0]?.profile?.items ?? {});
  const mastered = new Set<string>();
  const extracted = new Set<string>();
  const familyByQuest: Record<string, string> = {};
  const advanced = new Set<string>();

  for (const raw of items) {
    const quest = raw as {
      templateId?: string;
      attributes?: { quest_state?: string; rewards?: { templateId?: string }[]; premium_rewards?: { rewards?: { templateId?: string }[] } };
    };
    const match = quest.templateId?.match(MASTERY_QUEST);
    if (!match) continue;
    const claimed = quest.attributes?.quest_state === 'Claimed';
    if (!match[1]) {
      if (claimed) advanced.add(match[2]!);
      continue;
    }
    const rewards = [...(quest.attributes?.rewards ?? []), ...(quest.attributes?.premium_rewards?.rewards ?? [])];
    for (const reward of rewards) {
      const trophy = reward.templateId?.match(TROPHY_REWARD);
      if (!trophy) continue;
      const family = SPRITE_RELIC_FAMILIES[trophy[1]!.toLowerCase()];
      if (!family) continue;
      const variantRaw = trophy[2]?.toLowerCase();
      const variant = variantRaw === 'cheatmaster' ? 'cheat-master' : variantRaw === 'gold' ? 'gold' : 'base';
      familyByQuest[match[2]!] = family;
      if (claimed) mastered.add(`${family}:${variant}`);
    }
  }

  for (const [questId, family] of Object.entries(familyByQuest)) {
    if (advanced.has(questId)) extracted.add(family);
  }
  for (const raw of items) {
    const tokenMatch = (raw as { templateId?: string }).templateId?.match(MASTERY_TOKEN);
    if (!tokenMatch) continue;
    const family = SPRITE_RELIC_FAMILIES[tokenMatch[1]!.toLowerCase()];
    if (family) extracted.add(family);
  }
  return { mastered, extracted };
}

export const SPRITE_GIZMO_CATALOG = [
  { id: 'portable-extractor', label: 'Extrator Portátil', match: /portable.?extractor|relic.?extractor/i, icon: 'portable-extractor.png' },
  { id: 'llama-supply-drop', label: 'Entrega da Lhama', match: /llama.?supply|llamasupply/i, icon: 'llama-supply-drop.png' },
  { id: 'extraction-accelerator', label: 'Acelerador', match: /extraction.?accel|smuggler/i, icon: 'extraction-accelerator.png' },
  { id: 'cheat-code-locator', label: 'Localizador', match: /cheat.?code|code.?locator/i, icon: 'cheat-code-locator.png' },
  { id: 'spicy-taco', label: 'Taco Apimentado', match: /spicy.?taco|spicytaco/i, icon: 'spicy-taco.png' }
] as const;

export type SpriteResources = { dust: number; gizmos: { id: string; label: string; quantity: number; icon: string }[] };
export type SpriteLevels = Record<string, number>;

function profileItems(profile: unknown) {
  const changes = (profile as { profileChanges?: { profile?: { items?: Record<string, { templateId?: string; quantity?: number; attributes?: Record<string, unknown> }> } }[] })
    ?.profileChanges;
  return Object.values(changes?.[0]?.profile?.items ?? {});
}

const DUST_RE = /sprite[_\s.-]?dust|athenaspritedust|extractionpoints/i;

export function parseSpriteResources(...profiles: unknown[]): SpriteResources {
  let dust = 0;
  const gizmoQty = new Map<string, number>();
  for (const profile of profiles) {
    if (!profile) continue;
    for (const item of profileItems(profile)) {
      const id = item.templateId ?? '';
      const amount = typeof item.quantity === 'number' ? item.quantity : 0;
      if (amount < 1) continue;
      if (/^(Quest|ChallengeBundle):/i.test(id)) continue;
      if (DUST_RE.test(id)) {
        dust = Math.max(dust, amount);
        continue;
      }
      const gizmo = SPRITE_GIZMO_CATALOG.find((g) => g.match.test(id));
      if (gizmo) gizmoQty.set(gizmo.id, Math.max(gizmoQty.get(gizmo.id) ?? 0, amount));
    }
  }
  return {
    dust,
    gizmos: SPRITE_GIZMO_CATALOG.map((g) => ({
      id: g.id,
      label: g.label,
      quantity: gizmoQty.get(g.id) ?? 0,
      icon: g.icon
    }))
  };
}

export function parseSpriteLevels(...profiles: unknown[]): SpriteLevels {
  const levels: SpriteLevels = {};
  for (const profile of profiles) {
    if (!profile) continue;
    for (const item of profileItems(profile)) {
      const id = item.templateId ?? '';
      if (/^(Quest|Token):/i.test(id)) continue;
      for (const family of SPRITE_FAMILIES) {
        if (!id.toLowerCase().includes(family.slug.replace('-', ''))) continue;
        const variant = /cheatmaster/i.test(id) ? 'cheat-master' : /gold/i.test(id) ? 'gold' : 'base';
        const level = Number(item.attributes?.level ?? 1);
        if (level >= 1 && level <= 5) levels[`${family.slug}:${variant}`] = Math.max(levels[`${family.slug}:${variant}`] ?? 0, level);
      }
    }
  }
  return levels;
}

export async function fetchSpriteAccountState(account: import('@/fortnite/clients').AccountData) {
  const { clientQuestLogin, queryProfile } = await import('@/fortnite/mcp');
  await clientQuestLogin(account, 'athena').catch(() => null);
  const athena = await queryProfile(account, 'athena');
  const collections = await queryProfile(account, 'collections').catch(() => null);
  const commonCore = await queryProfile(account, 'common_core').catch(() => null);
  const progress = parseSpriteProgress(athena);
  const levels = parseSpriteLevels(athena, collections, commonCore);
  for (const key of Object.keys(levels)) {
    const family = key.split(':')[0];
    if (family) progress.extracted.add(family);
  }
  return { ...progress, levels, resources: parseSpriteResources(athena, collections, commonCore) };
}

export function ownedKeysFromState(state: { extracted: Set<string>; mastered: Set<string>; levels: SpriteLevels }) {
  const keys = new Set<string>([...state.mastered, ...Object.keys(state.levels)]);
  for (const slug of state.extracted) keys.add(`${slug}:base`);
  return keys;
}
