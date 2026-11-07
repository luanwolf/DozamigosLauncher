import type { AccountData } from '$types/account';

export type SpriteRarity = 'rare' | 'epic' | 'legendary' | 'mythic';
export type SpriteVariant =
  'base' | 'gold' | 'cheat-master' | 'loot-hacker' | 'bounty-hunter' | 'trick-or-treat' | 'fortune';

export type SpriteFamily = {
  slug: string;
  imageSlug?: string;
  imageUrl?: string;
  fortuneImageUrl?: string;
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
const S4_VARIANTS: Exclude<SpriteVariant, 'base'>[] = ['gold', 'cheat-master', 'loot-hacker', 'bounty-hunter'];
/** Album rows: base, gold, cheat master, loot hacker, bounty hunter, then trick or treat. */
export const SPRITE_EXPORT_VARIANTS: SpriteVariant[] = ['base', 'fortune'];

/** Left → right: rare → epic → legendary → mythic. */
export const SPRITE_EXPORT_ORDER = [
  'halfpeeld',
  're-pete',
  'barry-o-fish',
  'wayfinder',
  'chester',
  'kelper',
  'exmarks',
  'lil-squibbly',
  'lil-flacko',
  'transponder-snail',
  'plundarrgh',
  'sweet-dreams'
] as const;

export const SPRITE_FAMILIES: SpriteFamily[] = [
  {
    slug: 'halfpeeld',
    name: 'Elemental Halfpeel\'d',
    rarity: 'rare',
    ability: 'Marca eliminações no mapa. O raio aumenta a cada nível.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_PeelyBones_L.webp',
    fortuneImageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_PeelyBones_Jeweled_L.webp',
    variants: ['fortune']
  },
  {
    slug: 're-pete',
    name: 'Elemental Re-Pete',
    rarity: 'rare',
    ability:
      'Recarrega mais rápido e tem chance de recuperar munição ao recarregar. Os dois efeitos aumentam a cada nível.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_Parrot_L.webp',
    fortuneImageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_Parrot_Jeweled_L.webp',
    variants: ['fortune']
  },
  {
    slug: 'barry-o-fish',
    name: 'Elemental Barry O\'Fish',
    rarity: 'rare',
    ability: 'Reduz o gasto de energia da corrida na água. No nível máximo, concede efeito Tapa.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_BarrelOfFish_L.webp',
    fortuneImageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_BarrelOfFish_Jeweled_L.webp',
    variants: ['fortune']
  },
  {
    slug: 'wayfinder',
    name: 'Elemental Wayfinder',
    rarity: 'rare',
    ability: 'Revela Elementais próximos e concede mais itens em baús enterrados. O alcance aumenta a cada nível.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_Compass_L.webp',
    fortuneImageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_Compass_Jeweled_L.webp',
    variants: ['fortune']
  },
  {
    slug: 'chester',
    name: 'Elemental Chester',
    rarity: 'epic',
    ability: 'Anula dano de queda e pode acrescentar itens aos baús de tesouro. A chance aumenta a cada nível.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_TreasureChest_L.webp',
    fortuneImageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_TreasureChest_Jeweled_L.webp',
    variants: ['fortune']
  },
  {
    slug: 'kelper',
    name: 'Elemental Kelper',
    rarity: 'epic',
    ability: 'Recupera vida com o tempo enquanto você está na água. A cura aumenta a cada nível.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_UnbotheredFish_L.webp',
    fortuneImageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_UnbotheredFish_Jeweled_L.webp',
    variants: ['fortune']
  },
  {
    slug: 'exmarks',
    name: 'Elemental Exmarks',
    rarity: 'epic',
    ability: 'Revela mapas do tesouro e cartazes de procurado. No nível máximo, cria um mapa do tesouro.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_TreasureMap_L.webp',
    fortuneImageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_TreasureMap_Jeweled_L.webp',
    variants: ['fortune']
  },
  {
    slug: 'lil-squibbly',
    name: 'Elemental Lil\' Squibbly',
    rarity: 'epic',
    ability:
      'Ao pular em um ponto de pesca, pesca automaticamente e concede itens extras. A quantidade aumenta a cada nível.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_SquibblySprite_L.webp',
    fortuneImageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_SquibblySprite_Jeweled_L.webp',
    variants: ['fortune']
  },
  {
    slug: 'lil-flacko',
    name: 'Elemental Lil\' Flacko',
    rarity: 'legendary',
    ability: 'Cria uma onda de choque ao aterrissar e afasta inimigos. A força aumenta a cada nível.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_PlaymakerBrewery_L.webp',
    fortuneImageUrl:
      'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_PlaymakerBrewery_Jeweled_L.webp',
    variants: ['fortune']
  },
  {
    slug: 'transponder-snail',
    name: 'Elemental Transponder Snail',
    rarity: 'legendary',
    ability:
      'Concede recursos extras ao coletá-los, inclusive para aliados com o mesmo Elemental equipado. A quantidade aumenta a cada nível.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_FeedJet_L.webp',
    variants: []
  },
  {
    slug: 'plundarrgh',
    name: 'Elemental Plundarrgh',
    rarity: 'mythic',
    ability: 'Abrir baús aumenta a velocidade de movimento e de uso da picareta.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_CoinPile_L.webp',
    fortuneImageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_CoinPile_Jeweled_L.webp',
    variants: ['fortune']
  },
  {
    slug: 'sweet-dreams',
    name: 'Elemental Sweet Dreams',
    rarity: 'mythic',
    ability: 'Concede um item aleatório a cada nível. No nível máximo, libera itens míticos.',
    imageUrl: 'https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_StarLight_L.webp',
    variants: []
  },
  {
    slug: 'klombo',
    name: 'Elemental Klimbo',
    rarity: 'mythic',
    ability:
      'Concede itens aleatórios a cada nível; só sobe de nível ao consumir itens. A qualidade dos itens aumenta por nível.',
    variants: [...S4_VARIANTS]
  },
  {
    // ponytail: Trick or Treat icons exist only for Crown. Add the variant to a family when its icon ships.
    slug: 'crown',
    name: 'Elemental Coroa',
    rarity: 'mythic',
    ability: 'Só sobe de nível ao vencer partidas (mais rápido com Vitórias de Coroa). Novas variantes ao dominar.',
    variants: [...S4_VARIANTS, 'trick-or-treat']
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
    rarity: 'legendary',
    ability: 'Entra em Hangtime com precisão melhorada ao mirar no salto/queda. A precisão sobe a cada nível.',
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
    ability: 'Concede um Arbusto após um tempo; no nível máximo, ganha um ao eliminar. O intervalo diminui por nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'jonesy',
    name: 'Elemental Jonesy',
    rarity: 'rare',
    ability: 'Após sofrer dano, recupera um pouco de vida ou escudo. A cura aumenta a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'storm-scout',
    name: 'Elemental Storm Scout',
    rarity: 'rare',
    ability:
      'Ativa Sobrecarga após dano da tempestade; no nível máximo, revela círculos futuros. O limiar cai por nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'x-ray',
    name: 'Elemental X-Ray',
    rarity: 'legendary',
    ability: 'Marca inimigos próximos periodicamente. O raio de detecção aumenta a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'onigiri',
    name: 'Elemental Onigiri',
    rarity: 'rare',
    ability: 'Ativa Sobrecarga ao comer ou beber um consumível. A duração aumenta a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'mega-man',
    name: 'Elemental Mega Man',
    rarity: 'rare',
    ability: 'Reduz o atrito ao deslizar ou nadar. Você desliza cada vez mais longe a cada nível.',
    variants: []
  },
  {
    slug: 'overshield',
    name: 'Elemental Sobrescudo',
    rarity: 'rare',
    ability: 'Concede Sobrescudo. A quantidade aumenta a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'pond',
    name: 'Elemental Pond',
    rarity: 'epic',
    ability: 'Jump shortly after landing to launch a Super Jump. It goes higher and more often with each level.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'blinky',
    name: 'Elemental Blinky',
    rarity: 'legendary',
    ability: 'Taking damage cloaks you for a short time. The cloak lasts longer with each level.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'crash',
    name: 'Elemental Crash Bandicoot',
    rarity: 'legendary',
    ability:
      'Spin attack in midair, damaging and knocking back nearby opponents. Damage rises and the cooldown drops with each level.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'birthday',
    name: 'Elemental Aniversário',
    rarity: 'rare',
    ability:
      'Baú solta um pedaço de bolo de vez em quando. No nível máximo, eliminação também. A chance sobe a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'morgana',
    name: 'Elemental Morgana',
    rarity: 'epic',
    ability: 'Item de cura rende mais a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'dumpster-dive',
    name: 'Elemental Dumpster Dive',
    rarity: 'epic',
    ability:
      'Comida cura mais, e aparece ao sair de um esconderijo. Raramente, num baú também. A comida melhora a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'vampire',
    name: 'Elemental Vampiro',
    rarity: 'legendary',
    ability: 'Dano em inimigo devolve vida, e a fatia devolvida sobe a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'the-deer',
    name: 'Elemental Cervo',
    rarity: 'legendary',
    ability: 'Ataque corpo a corpo dá mais dano a cada nível.',
    variants: [...S4_VARIANTS]
  },
  {
    slug: 'spooky-dash',
    name: 'Elemental Spooky Dash',
    rarity: 'mythic',
    ability: 'No ar, a disparada atravessa alguns objetos. As cargas voltam com o tempo, mais rápido a cada nível.',
    variants: [...S4_VARIANTS]
  }
];

/** Short label for export tiles (drops the leading "Elemental …"). */
export function spriteShortName(name: string) {
  return name.replace(/^Elemental(?: de| da| do| dos)?\s+/i, '').trim() || name;
}

const FAMILY_BY_COMPACT: Record<string, string> = Object.fromEntries(
  SPRITE_FAMILIES.map((family) => [family.slug.replace(/-/g, ''), family.slug])
);

function lookupSpriteStem(stem: string): string | null {
  return SPRITE_RELIC_FAMILIES[stem] ?? FAMILY_BY_COMPACT[stem] ?? null;
}

/** Map Epic / api-fortnite ids (`KlomboSprite`, `Mega_Man`, `ESD_WinnerDSprite`, tokens) onto launcher slugs. */
export function mapApiSpriteFamilyId(id: string): string | null {
  const stem = id
    .replace(/Sprite$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!stem) return null;
  const direct = lookupSpriteStem(stem);
  if (direct) return direct;
  // ponytail: wiki item ids are ESD_<Name>Sprite. Ceiling: a family whose compact name starts with "esd" needs an explicit alias.
  if (stem.startsWith('esd')) return lookupSpriteStem(stem.slice(3));
  return null;
}

export const SPRITE_ENTRIES: SpriteEntry[] = SPRITE_FAMILIES.flatMap((family) => [
  {
    ...family,
    key: `${family.slug}:base`,
    variant: 'base',
    image: family.imageUrl ?? `${IMAGE_ROOT}/${family.slug}-sprite.webp`
  },
  ...family.variants.map((variant) => ({
    ...family,
    key: `${family.slug}:${variant}`,
    variant,
    image:
      variant === 'fortune' && family.fortuneImageUrl
        ? family.fortuneImageUrl
        : `${IMAGE_ROOT}/variants/${family.imageSlug ?? family.slug}__${variant}.webp`
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

/** Ability-code aliases. Slug match is automatic from SPRITE_FAMILIES. */
export const SPRITE_RELIC_FAMILIES: Record<string, string> = {
  peelybones: 'halfpeeld',
  parrot: 're-pete',
  barreloffish: 'barry-o-fish',
  compass: 'wayfinder',
  treasurechest: 'chester',
  unbotheredfish: 'kelper',
  treasuremap: 'exmarks',
  squibbly: 'lil-squibbly',
  squibblysprite: 'lil-squibbly',
  playmakerbrewery: 'lil-flacko',
  feedjet: 'transponder-snail',
  coinpile: 'plundarrgh',
  starlight: 'sweet-dreams',
  cosmicthunderdoublejump: 'jackrabbit',
  doublejump: 'jackrabbit',
  jazzjackrabbit: 'jackrabbit',
  narrowflea: 'sonic',
  narrowfleamonkey: 'tails',
  reloadovertime: 'shadow',
  '8bitblaster': 'eight-bit',
  eightbitblaster: 'eight-bit',
  '8bit': 'eight-bit',
  dwarf: 'adventure',
  bushranger: 'bush',
  bullet: 'onigiri',
  // FortniteGame.log SpriteLibrary + Athena_S42_SpriteMastery_Token_* (v42.10).
  winnerb: 'x-ray',
  winnerc: 'onigiri',
  improvedslide: 'mega-man',
  rockman: 'mega-man',
  crashbandicoot: 'crash',
  bodyslam: 'crash',
  ghostdamage: 'blinky',
  winnera: 'pond',
  increaseheals: 'morgana',
  phasedash: 'spooky-dash',
  healthsiphon: 'vampire',
  increasedmelee: 'the-deer',
  winnerd: 'dumpster-dive'
};

/** Magpie / trophy suffix → album variant. Unknown tokens stay base. */
export function spriteVariantFromToken(raw: string): SpriteVariant {
  const token = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (token === 'cheatmaster') return 'cheat-master';
  if (token === 'gold') return 'gold';
  if (token === 'loothacker' || token === 'galaxy') return 'loot-hacker';
  if (token === 'bountyhunter' || token === 'bounty' || token === 'reaper') return 'bounty-hunter';
  if (token === 'tricktreat' || token === 'trickortreat') return 'trick-or-treat';
  if (token === 'fortune' || token === 'jeweled') return 'fortune';
  return 'base';
}

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
const MASTERY_TOKEN = /^Token:athena_s4\d_spritemastery_token_([a-z0-9_]+)$/i;
const TROPHY_REWARD =
  /^CosmeticVariantToken:vtid_backpack_coldtrophy_([a-z0-9_]+?)(?:_(gummy|galaxy|gold|gem|holofoil|cube|quack|cheatmaster|loothacker|bountyhunter|bounty|reaper|tricktreat|trickortreat|fortune|jeweled))?$/i;

/**
 * Epic exposes Mastery through athena quests. Dust, gizmos and per-Sprite levels live in Magpie
 * (SaveFramework / MagpieService) — not in MCP athena/collections items. Public EOS Inventory `/br`
 * only has accolades; Magpie HTTP path is undocumented (bots that show dust use a private route).
 */
export function parseSpriteProgress(profile: unknown): SpriteProgress {
  const changes = (profile as { profileChanges?: { profile?: { items?: Record<string, unknown> } }[] })?.profileChanges;
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
      const family = mapApiSpriteFamilyId(trophy[1]);
      if (!family) continue;

      const variant = spriteVariantFromToken(trophy[2] ?? '');

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
    const family = mapApiSpriteFamilyId(tokenMatch[1].replace(/_\d+$/, ''));
    if (family) extracted.add(family);
  }

  return { mastered, extracted };
}

export async function fetchSpriteProgress(account: AccountData): Promise<SpriteProgress> {
  const { queryProfile } = await import('$lib/modules/mcp');
  return parseSpriteProgress(await queryProfile(account, 'athena'));
}
