import { fetchCosmeticsBr } from '$lib/modules/fortnite-api';
import {
  CATEGORY_META,
  parseLockerData,
  type LockerCategory,
  type LockerData
} from '$lib/modules/locker-parse';
import { composeMCP, queryProfile } from '$lib/modules/mcp';
import type { AccountData } from '$types/account';

export {
  LOCKER_CATEGORIES,
  parseLockerData,
  slotCategoryFor,
  slotCountFor,
  type LockerCategory,
  type LockerData,
  type LockerLoadout,
  type LockerOwnedItem
} from '$lib/modules/locker-parse';

export async function fetchLocker(account: AccountData, locale?: string): Promise<LockerData> {
  const [athena, cosmetics] = await Promise.all([
    queryProfile(account, 'athena'),
    fetchCosmeticsBr(locale)
  ]);
  return parseLockerData(athena, cosmetics);
}

export async function equipLockerItem(
  account: AccountData,
  lockerItemId: string,
  category: LockerCategory,
  templateId: string,
  slotIndex = 0
) {
  await composeMCP(account, 'SetCosmeticLockerSlot', 'athena', {
    lockerItem: lockerItemId,
    category: CATEGORY_META[category].slotCategory,
    itemToSlot: templateId,
    slotIndex,
    variantUpdates: [],
    optResortCategory: false
  });
}

export async function unequipLockerSlot(
  account: AccountData,
  lockerItemId: string,
  category: LockerCategory,
  slotIndex = 0
) {
  await equipLockerItem(account, lockerItemId, category, '', slotIndex);
}
