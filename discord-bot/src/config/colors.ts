export const ItemColors = {
  series: {
    icon: '#2EB3B7',
    creatorcollabseries: '#2EB3B7',
    platformseries: '#75449F',
    frozenseries: '#B1D3E8',
    lavaseries: '#EB8521',
    marvelseries: '#FF0000',
    cubeseries: '#BA25C0',
    dcuseries: '#285EAD',
    slurpseries: '#0CB9E7',
    shadowseries: '#FFFFFF'
  },
  rarities: {
    legendary: '#DA791D',
    epic: '#6C3F9E',
    rare: '#3D9BF7',
    uncommon: '#6ABB1E',
    common: '#8B9399',
    mythic: '#D1AE49'
  }
} as const;

export const StwRarityColors: Record<string, string> = {
  c: '#8B9399',
  uc: '#6ABB1E',
  r: '#3D9BF7',
  vr: '#6C3F9E',
  sr: '#DA791D',
  ur: '#D1AE49'
};

export const EmbedColors = {
  br: 0x5865f2,
  stw: 0xe67e22,
  success: 0x57f287,
  error: 0xed4245,
  warning: 0xfee75c,
  info: 0x3498db
} as const;

export function brItemColor(rarityId?: string, seriesId?: string): string {
  const series = seriesId?.toLowerCase();
  if (series && series in ItemColors.series) {
    return ItemColors.series[series as keyof typeof ItemColors.series];
  }
  const rarity = rarityId?.toLowerCase();
  if (rarity && rarity in ItemColors.rarities) {
    return ItemColors.rarities[rarity as keyof typeof ItemColors.rarities];
  }
  return ItemColors.rarities.common;
}
