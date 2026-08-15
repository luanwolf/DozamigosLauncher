export type GrantedItem = {
  templateId: string;
  quantity: number;
  itemGuid?: string;
};

type LootBag = {
  items?: { itemType?: string; itemGuid?: string; quantity?: number }[];
};

/** MCP hides grants in notifications: purchases use `lootResult`, card packs use `lootGranted`. */
export function extractGrantedItems(response: unknown): GrantedItem[] {
  const notifications =
    (response as { notifications?: { lootResult?: LootBag; lootGranted?: LootBag }[] })?.notifications ?? [];

  return notifications
    .flatMap((notification) => [...(notification.lootResult?.items ?? []), ...(notification.lootGranted?.items ?? [])])
    .filter((item) => !!item?.itemType)
    .map((item) => ({
      templateId: item.itemType!,
      quantity: item.quantity ?? 1,
      itemGuid: item.itemGuid
    }));
}
