import { VBUCKS_PACKS, type VbucksPack } from '$lib/constants/vbucks-packs';

export function getVbucksShortfall(owned: number, price: number): number {
  return Math.max(0, price - owned);
}

/** Smallest official pack that covers the shortfall (or the largest pack). */
export function recommendVbucksPack(shortfall: number): VbucksPack | null {
  if (shortfall <= 0) return null;
  return VBUCKS_PACKS.find((pack) => pack.amount >= shortfall) ?? VBUCKS_PACKS[VBUCKS_PACKS.length - 1];
}
