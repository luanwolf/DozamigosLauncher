/**
 * Maps rarity / series ids → `static/rarities/{slug}.png` stem.
 * Series backend values usually end in `series`; a few file names diverge.
 */
const RARITY_BG_SLUG: Record<string, string> = {
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
  serieicones: 'icon',
  lambskin: 'lambskin',
  crew: 'crew',
  crewseries: 'crew',
  seriedoclube: 'crew',
  serielendasdosjogos: 'gaminglegends',
  seriemarvel: 'marvel',
  seriedc: 'dc',
  serieslurp: 'slurp',
  seriesombra: 'shadow',
  seriecubo: 'dark',
  seriedark: 'dark',
  serielava: 'lava',
  seriecongelada: 'frozen',
  seriestarwars: 'starwars'
};

function rarityKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Stem under `/rarities/` for the Fortnite tile backdrop. */
export function rarityBackgroundSlug(item: { rarity: string; series?: string }): string {
  const tone = rarityKey(item.series || item.rarity || 'common');
  if (RARITY_BG_SLUG[tone]) return RARITY_BG_SLUG[tone];
  const stripped = tone.replace(/series$/, '');
  return RARITY_BG_SLUG[stripped] || stripped || 'common';
}

/** Public URL for the rarity/series PNG tile backdrop. */
export function rarityBackgroundUrl(item: { rarity: string; series?: string }): string {
  return `/rarities/${rarityBackgroundSlug(item)}.png`;
}

/** Inline CSS for cards: cover PNG over a dark fallback. */
export function rarityBackgroundStyle(item: { rarity: string; series?: string }): string {
  return `background-color:#1a1a22;background-image:url('${rarityBackgroundUrl(item)}');background-size:cover;background-position:center`;
}
