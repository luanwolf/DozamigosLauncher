import { getBalanceForOffer, maxPurchasableQuantity } from '$lib/modules/stw-catalog';
import {
  classifyStwOffer,
  type StwBulkCategory
} from '$lib/modules/stw-store-bulk-classify';
import type { StwStoreData, StwStoreOffer } from '$types/game/stw-store';

export type { StwBulkCategory } from '$lib/modules/stw-store-bulk-classify';
export { STW_BULK_CATEGORIES, classifyStwGrantTemplateId, classifyStwOffer } from '$lib/modules/stw-store-bulk-classify';

export type StwBulkBuyLine = {
  offer: StwStoreOffer;
  quantity: number;
  cost: number;
  category: StwBulkCategory;
};

/** Stackables first so perk/flux/resources fill their full limits before uniques eat gold. */
const BULK_PLAN_ORDER: StwBulkCategory[] = [
  'perkUp',
  'flux',
  'resources',
  'schematics',
  'heroes'
];

function grantQty(offer: StwStoreOffer) {
  return offer.grants[0]?.quantity ?? 1;
}

/** Greedy plan: max remaining qty per offer while gold lasts. */
export function planStwBulkBuys(
  store: StwStoreData,
  selected: ReadonlySet<StwBulkCategory>
): StwBulkBuyLine[] {
  if (!selected.size) return [];

  const candidates: { offer: StwStoreOffer; category: StwBulkCategory }[] = [];
  for (const section of store.sections) {
    for (const offer of section.offers) {
      const category = classifyStwOffer(offer);
      if (!category || !selected.has(category)) continue;
      candidates.push({ offer, category });
    }
  }

  candidates.sort(
    (a, b) => BULK_PLAN_ORDER.indexOf(a.category) - BULK_PLAN_ORDER.indexOf(b.category)
  );

  let gold = store.balances['eventcurrency_scaling'] ?? 0;
  const lines: StwBulkBuyLine[] = [];

  for (const { offer, category } of candidates) {
    const balance = getBalanceForOffer(store.balances, offer.price);
    // Prefer live gold for scaling currency; other currencies use store balance snapshot.
    const available = offer.price.currencySubType.includes('eventcurrency_scaling')
      ? gold
      : balance;
    // Always take the full remaining limit (perk/flux/resources stack).
    const quantity = maxPurchasableQuantity(offer, available);
    if (quantity < 1) continue;

    const cost = offer.price.finalPrice * quantity;
    lines.push({ offer, quantity, cost, category });
    if (offer.price.currencySubType.includes('eventcurrency_scaling')) gold -= cost;
  }

  return lines;
}

export function summarizeStwBulkBuys(lines: StwBulkBuyLine[]) {
  return {
    offers: lines.length,
    purchases: lines.reduce((sum, line) => sum + line.quantity, 0),
    items: lines.reduce((sum, line) => sum + line.quantity * grantQty(line.offer), 0),
    gold: lines.reduce((sum, line) => sum + line.cost, 0)
  };
}
