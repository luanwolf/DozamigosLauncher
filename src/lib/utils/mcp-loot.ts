export type GrantedItem = {
  templateId: string;
  quantity: number;
  itemGuid?: string;
};

type LootItem = { itemType?: string; itemGuid?: string; quantity?: number };
type LootBag = { items?: LootItem[] };
type LootContainer = LootBag | LootItem[];
type ItemAddedChange = {
  changeType?: string;
  itemId?: string;
  item?: { templateId?: string; quantity?: number };
};
type ProfileUpdate = { profileChanges?: ItemAddedChange[] };

function itemsFrom(container?: LootContainer): LootItem[] {
  if (!container) return [];
  return Array.isArray(container) ? container : (container.items ?? []);
}

/** MCP uses both `{ items: [...] }` and bare arrays for loot, depending on the operation. */
export function extractGrantedItems(response: unknown): GrantedItem[] {
  const payload = response as {
    notifications?: { lootResult?: LootContainer; lootGranted?: LootContainer }[];
    profileChanges?: ItemAddedChange[];
    multiUpdate?: ProfileUpdate[];
  };
  const notifications = payload?.notifications ?? [];

  const granted: GrantedItem[] = notifications
    .flatMap((notification) => [
      ...itemsFrom(notification.lootResult),
      ...itemsFrom(notification.lootGranted)
    ])
    .filter((item) => !!item?.itemType)
    .map((item) => ({
      templateId: item.itemType!,
      quantity: item.quantity ?? 1,
      itemGuid: item.itemGuid
    }));

  const profileChanges = [
    ...(payload?.profileChanges ?? []),
    ...(payload?.multiUpdate ?? []).flatMap((update) => update.profileChanges ?? [])
  ];

  for (const change of profileChanges) {
    if (change.changeType?.toLowerCase() !== 'itemadded' || !change.item?.templateId) continue;

    const added: GrantedItem = {
      templateId: change.item.templateId,
      quantity: change.item.quantity ?? 1,
      itemGuid: change.itemId
    };
    if (added.itemGuid && granted.some((item) => item.itemGuid === added.itemGuid)) continue;

    // Profile changes carry the GUID needed to open a sealed CardPack. Replace
    // the notification copy when that copy omitted its GUID.
    const guidlessIndex = granted.findIndex(
      (item) => !item.itemGuid && item.templateId.toLowerCase() === added.templateId.toLowerCase()
    );
    if (guidlessIndex >= 0) granted[guidlessIndex] = added;
    else granted.push(added);
  }

  return granted;
}
