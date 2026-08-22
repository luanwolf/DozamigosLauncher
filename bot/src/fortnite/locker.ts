import type { AccountData } from '@/fortnite/clients';
import { fetchCosmeticsBr } from '@/fortnite/public';
import { queryProfile } from '@/fortnite/mcp';
import { parseLockerCategory, type LockerCategory, type LockerOwnedItem } from '@/fortnite/locker-parse';

export {
  CATEGORY_LABEL,
  LOCKER_CATEGORIES,
  parseLockerCategory,
  type LockerCategory,
  type LockerOwnedItem
} from '@/fortnite/locker-parse';

export async function fetchLockerCategory(account: AccountData, category: LockerCategory): Promise<LockerOwnedItem[]> {
  const [athena, cosmetics] = await Promise.all([queryProfile(account, 'athena'), fetchCosmeticsBr()]);
  return parseLockerCategory(athena, cosmetics, category);
}
