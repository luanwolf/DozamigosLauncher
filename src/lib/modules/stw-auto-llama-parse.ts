export type AutoLlamaCurrency = 'xray' | 'token';

export type AutoLlamaPrefs = {
  buySurvivorLlamas: boolean;
  currency: AutoLlamaCurrency;
  maxBuysPerRun: number;
};

export const DEFAULT_AUTO_LLAMA_PREFS: AutoLlamaPrefs = {
  buySurvivorLlamas: false,
  currency: 'xray',
  maxBuysPerRun: 1
};

/** Matches Aerial/mission-alerts survivor rarity tokens in template IDs. */
export function isLegendaryOrMythicSurvivorTemplate(templateId: string) {
  const id = templateId.toLowerCase();
  const isWorker = id.includes('workerbasic') || id.includes('worker:manager') || id.startsWith('worker:');
  if (!isWorker) return false;
  return /_(?:sr|ur)(?:_|$)/i.test(templateId) || id.includes('_sr') || id.includes('_ur');
}

export function llamaContainsLegendaryMythicSurvivor(templateIds: string[]) {
  return templateIds.some(isLegendaryOrMythicSurvivorTemplate);
}

export function currencyMatchesPreference(currencySubType: string, preference: AutoLlamaCurrency) {
  if (preference === 'xray') return currencySubType.includes('currency_xrayllama');
  return currencySubType.includes('voucher_cardpack_bronze');
}

/** Pull candidate survivor template IDs from preroll CardPack attributes when present. */
export function extractPrerollGrantTemplates(item: { attributes?: Record<string, unknown>; templateId: string }) {
  const attrs = item.attributes ?? {};
  const templates: string[] = [];

  const direct = attrs.items ?? attrs.lootTierGroups;
  if (Array.isArray(direct)) {
    for (const entry of direct) {
      if (typeof entry === 'string') templates.push(entry);
      else if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>;
        if (typeof obj.itemType === 'string') templates.push(obj.itemType);
        if (typeof obj.templateId === 'string') templates.push(obj.templateId);
      }
    }
  }

  for (const [key, value] of Object.entries(attrs)) {
    if (!/survivor|worker|grant|loot|item/i.test(key)) continue;
    if (typeof value === 'string' && value.includes(':')) templates.push(value);
  }

  if (!templates.length) templates.push(item.templateId);
  return templates;
}
