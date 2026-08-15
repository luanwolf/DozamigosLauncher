import { composeMCP, queryProfile } from '$lib/modules/mcp';
import {
  classifyXpBoostTemplate,
  listXpBoostStacks,
  preferredStack,
  type XpBoostKind,
  type XpBoostStack
} from '$lib/modules/stw-xp-boosts-parse';
import type { AccountData } from '$types/account';

export type { XpBoostKind, XpBoostStack };
export { classifyXpBoostTemplate, listXpBoostStacks, preferredStack };

export async function fetchXpBoosts(account: AccountData) {
  return listXpBoostStacks(await queryProfile(account, 'campaign'));
}

export async function activateXpBoost(
  account: AccountData,
  stack: XpBoostStack,
  amount: number,
  targetAccountId?: string
) {
  const quantity = Math.min(Math.max(1, Math.floor(amount)), stack.quantity);
  if (quantity < 1) throw new Error('No XP boosts available');

  for (let i = 0; i < quantity; i++) {
    const body: Record<string, string> = { targetItemId: stack.itemId };
    if (stack.kind === 'teammate') {
      if (!targetAccountId) throw new Error('Teammate XP boost requires a target account');
      body.targetAccountId = targetAccountId;
    }
    await composeMCP(account, 'ActivateConsumable', 'campaign', body);
  }

  return quantity;
}
