/**
 * Returns Steam free-game appIds that are newly on sale compared to the last
 * known set. Empty on first baseline (previous === null).
 */
export function findNewSteamFreeAppIds(current: string[], previous: string[] | null): string[] {
  if (previous === null) return [];
  const seen = new Set(previous);
  return current.filter((id) => !seen.has(id));
}
