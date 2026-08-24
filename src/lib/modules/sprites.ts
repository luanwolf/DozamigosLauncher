import type { AccountData } from '$types/account';

export type SpriteRarity = 'rare' | 'epic' | 'legendary' | 'mythic';
export type SpriteVariant = 'base' | 'gold' | 'cheat-master';

export type SpriteFamily = {
  slug: string;
  imageSlug?: string;
  name: string;
  rarity: SpriteRarity;
  ability: string;
  variants: Exclude<SpriteVariant, 'base'>[];
};

export type SpriteEntry = SpriteFamily & {
  key: string;
  variant: SpriteVariant;
  image: string;
};

const IMAGE_ROOT = '/elementals';
const S4_VARIANTS: Exclude<SpriteVariant, 'base'>[] = ['gold', 'cheat-master'];
/** Album rows: common, gold, then cheat. */
export const SPRITE_EXPORT_VARIANTS: SpriteVariant[] = ['base', 'gold', 'cheat-master'];

/** Chapter 7 Season 4 (Override) — season id 42 on fortnite.gg. */
export const SPRITE_FAMILIES: SpriteFamily[] = [
  {
    slug: 'klombo',
    name: 'Elemental Klimbo',
    rarity: 'mythic',
    ability:
      'Concede itens aleatórios a cada nível; só sobe de nível ao consumir itens. A qualidade dos itens aumenta por nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'crown',
    name: 'Elemental Coroa',
    rarity: 'mythic',
    ability:
      'Só sobe de nível ao vencer partidas (mais rápido com Vitórias de Coroa). Novas variantes ao dominar.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'jackrabbit',
    name: 'Elemental Jackrabbit',
    rarity: 'legendary',
    ability: 'Permite um salto extra no ar. O tempo entre saltos diminui a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'sonic',
    name: 'Elemental Sonic',
    rarity: 'epic',
    ability: 'Gotta Go Fast! Corre mais rápido a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'tails',
    name: 'Elemental Tails',
    rarity: 'epic',
    ability: 'Permite pairar com a ajuda do Tails. A velocidade do vôo sobe a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'shadow',
    name: 'Elemental Shadow',
    rarity: 'epic',
    ability:
      'Recarrega armas guardadas com o tempo; no nível máximo, também a equipada. Fica mais rápido a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'killswitch',
    name: 'Elemental Killswitch',
    rarity: 'epic',
    ability:
      'Entra em Hangtime com precisão melhorada ao mirar no salto/queda. A precisão sobe a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'eight-bit',
    name: 'Elemental 8-Bit',
    rarity: 'rare',
    ability: 'Encontra uma Espingarda 8-Bit no primeiro baú e ganha multiplicador de pontuação nela.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'adventure',
    name: 'Elemental Aventura',
    rarity: 'rare',
    ability: 'Melhora um item aleatório do inventário a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'bush',
    name: 'Elemental Arbusto',
    rarity: 'rare',
    ability:
      'Concede um Arbusto após um tempo; no nível máximo, ganha um ao eliminar. O intervalo diminui por nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'jonesy',
    name: 'Elemental Jonesy',
    rarity: 'rare',
    ability:
      'Após sofrer dano, recupera um pouco de vida ou escudo. A cura aumenta a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'storm-scout',
    name: 'Elemental Storm Scout',
    rarity: 'rare',
    ability:
      'Ativa Sobrecarga após dano da tempestade; no nível máximo, revela círculos futuros. O limiar cai por nível.',
    variants: [...S4_VARIANTS]
  }
];

/** Short label for export tiles (drops the leading "Elemental …"). */
export function spriteShortName(name: string) {
  return name.replace(/^Elemental(?: de| da| do| dos)?\s+/i, '').trim() || name;
}

export const SPRITE_ENTRIES: SpriteEntry[] = SPRITE_FAMILIES.flatMap((family) => [
  {
    ...family,
    key: `${family.slug}:base`,
    variant: 'base',
    image: `${IMAGE_ROOT}/${family.slug}-sprite.webp`
  },
  ...family.variants.map((variant) => ({
    ...family,
    key: `${family.slug}:${variant}`,
    variant,
    image: `${IMAGE_ROOT}/variants/${family.imageSlug ?? family.slug}__${variant}.webp`
  }))
]);

export type SpriteCollection = {
  extracted: string[];
  mastered: string[];
};

/** Collection marks live per Epic account (Epic does not expose per-Sprite ownership). */
export function spriteCollectionKey(accountId?: string) {
  return `dozamigos:sprites:${accountId ?? 'local'}`;
}

export function readSpriteCollection(accountId?: string): SpriteCollection {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(spriteCollectionKey(accountId)) ?? '[]');
    const valid = new Set(SPRITE_ENTRIES.map((entry) => entry.key));
    const filter = (keys: unknown) =>
      Array.isArray(keys) ? keys.filter((key): key is string => typeof key === 'string' && valid.has(key)) : [];

    // Migrate the original extracted-only checklist.
    if (Array.isArray(saved)) return { extracted: filter(saved), mastered: [] };
    if (!saved || typeof saved !== 'object') return { extracted: [], mastered: [] };

    const collection = saved as Partial<SpriteCollection>;
    return {
      extracted: filter(collection.extracted),
      mastered: filter(collection.mastered)
    };
  } catch {
    return { extracted: [], mastered: [] };
  }
}

export function writeSpriteCollection(
  accountId: string | undefined,
  extracted: Iterable<string>,
  mastered: Iterable<string>
) {
  localStorage.setItem(
    spriteCollectionKey(accountId),
    JSON.stringify({ extracted: [...extracted], mastered: [...mastered] })
  );
}

/** Epic trophy / Magpie relic ids (season 42). */
export const SPRITE_RELIC_FAMILIES: Record<string, string> = {
  klombo: 'klombo',
  crown: 'crown',
  cosmicthunderdoublejump: 'jackrabbit',
  doublejump: 'jackrabbit',
  narrowflea: 'sonic',
  narrowfleamonkey: 'tails',
  reloadovertime: 'shadow',
  killswitch: 'killswitch',
  '8bitblaster': 'eight-bit',
  eightbitblaster: 'eight-bit',
  '8bit': 'eight-bit',
  dwarf: 'adventure',
  bushranger: 'bush',
  jonesy: 'jonesy',
  stormscout: 'storm-scout',
  jazzjackrabbit: 'jackrabbit',
  jackrabbit: 'jackrabbit',
  sonic: 'sonic',
  tails: 'tails',
  shadow: 'shadow',
  adventure: 'adventure',
  bush: 'bush',
  eightbit: 'eight-bit'
};

const TROPHY_FAMILIES = SPRITE_RELIC_FAMILIES;

export type SpriteProgress = {
  /** Entry keys (`family:variant`) whose Mastery reward was already claimed. */
  mastered: Set<string>;
  /** Family slugs with a mastery token on the profile (quest presence is not ownership). */
  extracted: Set<string>;
};

type QuestItem = {
  templateId?: string;
  attributes?: {
    quest_state?: string;
    rewards?: { templateId?: string }[];
    premium_rewards?: { rewards?: { templateId?: string }[] };
  };
};

// ponytail: s41 kept so old profiles still parse; s42 is Override. Ceiling: bump when Epic rolls s43+.
const MASTERY_QUEST = /^Quest:quest_s4\d_spritemastery_(redeem_)?p\d+_(q\d+)([a-z]?)$/;
const MASTERY_TOKEN = /^Token:athena_s4\d_spritemastery_token_([a-z0-9]+?)(?:_\d+)?$/i;
const TROPHY_REWARD =
  /^CosmeticVariantToken:vtid_backpack_coldtrophy_([a-z0-9]+?)(?:_(gummy|galaxy|gold|gem|holofoil|cube|quack|cheatmaster))?$/;

/**
 * Epic exposes Mastery through athena quests. Dust, gizmos and per-Sprite levels live in Magpie
 * (SaveFramework / MagpieService) — not in MCP athena/collections items. Public EOS Inventory `/br`
 * only has accolades; Magpie HTTP path is undocumented (bots that show dust use a private route).
 */
export function parseSpriteProgress(profile: unknown): SpriteProgress {
  const changes = (profile as { profileChanges?: { profile?: { items?: Record<string, unknown> } }[] })
    ?.profileChanges;
  const quests = Object.values(changes?.[0]?.profile?.items ?? {})
    .map((item) => item as QuestItem)
    .map((quest) => ({ quest, match: quest.templateId?.match(MASTERY_QUEST) }))
    .filter((entry) => entry.match);

  const familyByQuest: Record<string, string> = {};
  const mastered = new Set<string>();
  const advanced = new Set<string>();

  for (const { quest, match } of quests) {
    const [, isRedeem, questId] = match!;
    const claimed = quest.attributes?.quest_state === 'Claimed';

    if (!isRedeem) {
      if (claimed) advanced.add(questId);
      continue;
    }

    const rewards = [...(quest.attributes?.rewards ?? []), ...(quest.attributes?.premium_rewards?.rewards ?? [])];
    for (const reward of rewards) {
      const trophy = reward.templateId?.match(TROPHY_REWARD);
      if (!trophy) continue;
      const family = TROPHY_FAMILIES[trophy[1].toLowerCase()];
      if (!family) continue;

      const variantRaw = trophy[2]?.toLowerCase();
      const variant =
        variantRaw === 'cheatmaster' ? 'cheat-master' : variantRaw === 'gold' ? 'gold' : 'base';

      familyByQuest[questId] = family;
      if (claimed) mastered.add(`${family}:${variant}`);
    }
  }

  const extracted = new Set(
    Object.entries(familyByQuest)
      .filter(([questId]) => advanced.has(questId))
      .map(([, family]) => family)
  );

  // s42 lists every `quest_s42_spritemastery_jonesy` as Active even if you never extracted
  // that Creature Sprite. Owned proof is the mastery token (granted when the stage pays out).
  for (const item of Object.values(changes?.[0]?.profile?.items ?? {})) {
    const tokenMatch = (item as QuestItem).templateId?.match(MASTERY_TOKEN);
    if (!tokenMatch) continue;
    const family = SPRITE_RELIC_FAMILIES[tokenMatch[1].toLowerCase()];
    if (family) extracted.add(family);
  }

  return { mastered, extracted };
}

export async function fetchSpriteProgress(account: AccountData): Promise<SpriteProgress> {
  const { queryProfile } = await import('$lib/modules/mcp');
  return parseSpriteProgress(await queryProfile(account, 'athena'));
}
