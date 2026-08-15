import type { FullQueryProfile } from '$types/game/mcp';

export type XpBoostKind = 'personal' | 'teammate';

export type XpBoostStack = {
  kind: XpBoostKind;
  templateId: string;
  itemId: string;
  quantity: number;
};

const PERSONAL = 'AccountResource:smallxpboost';
const TEAMMATE = 'AccountResource:smallxpboost_gift';

export function classifyXpBoostTemplate(templateId: string): XpBoostKind | null {
  const id = templateId.toLowerCase();
  if (id.includes('smallxpboost_gift')) return 'teammate';
  if (id.includes('smallxpboost')) return 'personal';
  return null;
}

export function listXpBoostStacks(profile: FullQueryProfile<'campaign'>): XpBoostStack[] {
  const items = profile.profileChanges[0]?.profile?.items ?? {};
  const stacks: XpBoostStack[] = [];

  for (const [itemId, item] of Object.entries(items)) {
    const kind = classifyXpBoostTemplate(item.templateId);
    if (!kind) continue;
    stacks.push({
      kind,
      templateId: item.templateId,
      itemId,
      quantity: item.quantity ?? 0
    });
  }

  return stacks.filter((stack) => stack.quantity > 0);
}

export function preferredStack(stacks: XpBoostStack[], kind: XpBoostKind) {
  return (
    stacks.find((stack) => stack.kind === kind && stack.templateId === (kind === 'personal' ? PERSONAL : TEAMMATE)) ??
    stacks.find((stack) => stack.kind === kind) ??
    null
  );
}
