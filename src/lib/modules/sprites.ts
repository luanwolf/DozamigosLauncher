import type { AccountData } from '$types/account';

export type SpriteRarity = 'rare' | 'epic' | 'legendary' | 'mythic';
export type SpriteVariant = 'base' | 'gold' | 'gummy' | 'galaxy' | 'holofoil' | 'cube' | 'quack' | 'gem';

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

const IMAGE_ROOT = '/resources/elementals';

export const SPRITE_FAMILIES: SpriteFamily[] = [
  {
    slug: 'water',
    name: 'Elemental de Água',
    rarity: 'rare',
    ability: 'Recupera escudo enquanto você estiver na água.',
    variants: ['gold', 'gummy', 'galaxy', 'gem', 'holofoil', 'quack']
  },
  {
    slug: 'earth',
    name: 'Elemental de Terra',
    rarity: 'rare',
    ability: 'Pode encontrar itens raros adicionais ao abrir baús.',
    variants: ['gold', 'gummy', 'galaxy', 'gem', 'cube', 'quack']
  },
  {
    slug: 'fire',
    name: 'Elemental de Fogo',
    rarity: 'rare',
    ability: 'Cria uma explosão de fogo depois que você causa dano suficiente.',
    variants: ['gold', 'gummy', 'galaxy', 'holofoil', 'cube', 'quack']
  },
  {
    slug: 'fishy',
    name: 'Elemental Peixinho',
    rarity: 'rare',
    ability: 'Aumenta bastante a velocidade ao nadar; sofrer dano também acelera seu movimento por um tempo.',
    variants: ['gold', 'gummy', 'galaxy', 'cube']
  },
  {
    slug: 'air',
    name: 'Elemental de Ar',
    rarity: 'rare',
    ability: 'Aumenta a corrida e o salto, além de anular dano de queda.',
    variants: ['gold', 'gummy', 'galaxy', 'holofoil']
  },
  {
    slug: 'duck',
    name: 'Elemental Pato',
    rarity: 'epic',
    ability: 'Dançar ou fazer uma Jam recupera seu escudo.',
    variants: ['gold', 'gummy', 'galaxy', 'gem']
  },
  {
    slug: 'ghost',
    name: 'Elemental Fantasma',
    rarity: 'epic',
    ability: 'Concede camuflagem por um tempo após recarregar.',
    variants: ['gold', 'gummy', 'galaxy', 'holofoil']
  },
  {
    slug: 'demon',
    name: 'Elemental Demônio',
    rarity: 'epic',
    ability: 'Recupera parte da vida e do escudo ao eliminar um oponente.',
    variants: ['gold', 'gummy', 'galaxy', 'gem']
  },
  {
    slug: 'king',
    name: 'Elemental Rei',
    rarity: 'epic',
    ability: 'Sua picareta causa mais dano.',
    variants: ['gold', 'gummy', 'galaxy', 'holofoil']
  },
  {
    slug: 'striker',
    name: 'Elemental Striker',
    rarity: 'epic',
    ability: 'Ativa Sobrecarga ao escalar, saltar obstáculos ou correr pela parede.',
    variants: ['gold', 'gummy', 'galaxy', 'holofoil']
  },
  {
    slug: 'aura',
    name: 'Elemental Aura',
    rarity: 'epic',
    ability: 'Ganha uma carga de Rocha de Choque ao causar dano suficiente.',
    variants: ['gold', 'gummy', 'galaxy', 'gem']
  },
  {
    slug: 'dream',
    name: 'Elemental do Sonho',
    rarity: 'legendary',
    ability: 'Entrega um item aleatório a cada nível e loot lendário no nível máximo.',
    variants: ['gold', 'gummy', 'galaxy', 'cube']
  },
  {
    slug: 'punk',
    name: 'Elemental Punk',
    rarity: 'legendary',
    ability: 'Talvez nada... ou algo infinitamente especial.',
    variants: ['gold', 'gummy', 'galaxy', 'gem', 'cube']
  },
  {
    slug: 'boss',
    name: 'Elemental Chefe',
    rarity: 'legendary',
    ability: 'Aumenta sua vida e seu escudo máximos.',
    variants: ['gold', 'gummy', 'galaxy', 'cube']
  },
  {
    slug: 'seven',
    name: 'Elemental dos Sete',
    rarity: 'legendary',
    ability: 'Sua equipe consegue enxergar rastros de passos dos inimigos.',
    variants: ['gold', 'gummy', 'galaxy', 'holofoil']
  },
  {
    slug: 'lootin-llama',
    imageSlug: 'llama',
    name: 'Elemental Lhama Saqueadora',
    rarity: 'legendary',
    ability: 'Abrir caixas de munição pode melhorar uma arma.',
    variants: ['gold', 'gummy', 'galaxy', 'gem']
  },
  {
    slug: 'peeky-peely',
    imageSlug: 'peely',
    name: 'Elemental Peeky Peely',
    rarity: 'legendary',
    ability: 'Detecta jogadores com Elementais raros por perto, mas marca você no mapa.',
    variants: ['gold', 'gummy', 'galaxy', 'holofoil']
  },
  {
    slug: 'john-wick',
    name: 'Elemental John Wick',
    rarity: 'mythic',
    ability: 'Derrubar um jogador revela outros inimigos próximos.',
    variants: []
  },
  {
    slug: 'batman',
    name: 'Elemental Batman',
    rarity: 'mythic',
    ability: 'Permite se lançar no ar e abrir a Batcapa.',
    variants: ['gold', 'gummy', 'galaxy', 'holofoil', 'cube']
  },
  {
    slug: 'burnt-peanut',
    name: 'Elemental Amendoim Queimado',
    rarity: 'mythic',
    ability: 'Eliminar jogadores pode entregar mais loot — às vezes até mítico.',
    variants: []
  },
  {
    slug: 'vini-jr',
    name: 'Elemental Vini Jr.',
    rarity: 'mythic',
    ability: 'Correr torna sua deslizada destrutiva; acertar inimigos melhora cadência e recarga.',
    variants: []
  },
  {
    slug: 'zero-point',
    name: 'Elemental do Ponto Zero',
    rarity: 'mythic',
    ability: 'Cria uma Bolha de Escudo Jr. ao usar um item de cura em si mesmo.',
    variants: ['gold', 'gummy', 'galaxy', 'gem', 'holofoil', 'cube', 'quack']
  },
  {
    slug: 'grim-reaper',
    imageSlug: 'grim',
    name: 'Elemental Ceifador',
    rarity: 'mythic',
    ability: 'Jogadores que atacam você ficam marcados por um tempo.',
    variants: ['gold', 'gummy', 'galaxy', 'gem', 'holofoil', 'cube']
  },
  {
    slug: 'pollo',
    name: 'Elemental Pollo',
    rarity: 'mythic',
    ability: 'Após uma eliminação, recupera aos poucos o escudo seu e de aliados próximos.',
    variants: []
  },
  {
    slug: 'ironmouse',
    name: 'Elemental Ironmouse',
    rarity: 'mythic',
    ability: 'Regenera vida quando ela está baixa e concede camuflagem e baixa gravidade durante a cura.',
    variants: []
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

const TROPHY_FAMILIES: Record<string, string> = {
  water: 'water',
  earth: 'earth',
  fire: 'fire',
  duck: 'duck',
  ghost: 'ghost',
  sleepy: 'dream',
  reddemon: 'demon',
  punk: 'punk',
  king: 'king',
  crispynut: 'burnt-peanut',
  zeropoint: 'zero-point',
  fishy: 'fishy',
  soccer: 'striker',
  drifter: 'aura',
  boss: 'boss',
  seven: 'seven',
  air: 'air',
  grimreaper: 'grim-reaper',
  fossilmeal: 'batman',
  companystargazer: 'pollo',
  cokeparmesan: 'vini-jr',
  fillergrunt: 'john-wick',
  llama: 'lootin-llama',
  peely: 'peeky-peely',
  pedicureantacid: 'ironmouse'
};

export type SpriteProgress = {
  /** Entry keys (`family:variant`) whose Mastery reward was already claimed. */
  mastered: Set<string>;
  /** Family slugs with at least one Mastery stage done, which requires extracting the Sprite. */
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

const MASTERY_QUEST = /^Quest:quest_s41_spritemastery_(redeem_)?p\d+_(q\d+)([a-z]?)$/;
const TROPHY_REWARD =
  /^CosmeticVariantToken:vtid_backpack_coldtrophy_([a-z]+?)(?:_(gummy|galaxy|gold|gem|holofoil|cube|quack))?$/;

/**
 * Epic exposes the Sprite collection only through the Battle Pass Mastery track: the `redeem` quests
 * name the Sprite (via the trophy variant they grant) and the plain Mastery quests say which stages
 * are done. The in-match Sprite level lives in the Magpie/SaveFramework collection, which no
 * non-game client can read.
 * ponytail: a Sprite extracted but never advanced on the track stays invisible here — the page keeps
 * manual marks for those.
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
      const family = trophy && TROPHY_FAMILIES[trophy[1]];
      if (!family) continue;

      familyByQuest[questId] = family;
      if (claimed) mastered.add(`${family}:${trophy[2] ?? 'base'}`);
    }
  }

  const extracted = new Set(
    Object.entries(familyByQuest)
      .filter(([questId]) => advanced.has(questId))
      .map(([, family]) => family)
  );

  return { mastered, extracted };
}

export async function fetchSpriteProgress(account: AccountData): Promise<SpriteProgress> {
  const { queryProfile } = await import('$lib/modules/mcp');
  return parseSpriteProgress(await queryProfile(account, 'athena'));
}
