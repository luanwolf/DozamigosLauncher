import { get, writable } from 'svelte/store';
import type { FreeGame } from '$lib/modules/free-games';

/** Offer ids marked redeemed this session (claim / already_owned). */
export const redeemedFreeGameIds = writable(new Set<string>());

function normalizeTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function markFreeGamesRedeemed(ids: string[]) {
  if (!ids.length) return;
  redeemedFreeGameIds.update((current) => {
    const next = new Set(current);
    for (const id of ids) next.add(id);
    return next;
  });
}

export function isFreeGameRedeemed(
  game: Pick<FreeGame, 'id' | 'title'>,
  ownedApps: Array<{ id: string; title: string }>,
  redeemedIds: Set<string> = get(redeemedFreeGameIds)
): boolean {
  if (redeemedIds.has(game.id)) return true;
  const want = normalizeTitle(game.title);
  return ownedApps.some((app) => app.id === game.id || normalizeTitle(app.title) === want);
}
