import { tauriKy } from '$lib/http';
import { parseSteamFreeGames, type SteamFreeGame } from '$lib/modules/steam-free-games-parse';

export type { SteamFreeGame };
export { parseSteamFreeGames };

type SteamSearchResponse = {
  success: number;
  results_html: string;
};

const STEAM_SEARCH_URL = 'https://store.steampowered.com/search/results/';
const CACHE_TTL = 30 * 60 * 1000;

let cache: { games: SteamFreeGame[]; expiresAt: number } | null = null;

export async function fetchSteamFreeGames(force = false): Promise<SteamFreeGame[]> {
  if (!force && cache && cache.expiresAt > Date.now()) return cache.games;

  const response = await tauriKy
    .get<SteamSearchResponse>(STEAM_SEARCH_URL, {
      searchParams: {
        query: '',
        start: 0,
        count: 50,
        infinite: 1,
        specials: 1,
        maxprice: 'free',
        category1: 998,
        ndl: 1,
        cc: 'BR',
        l: 'brazilian',
        json: 1
      }
    })
    .json();

  const games = response.success === 1 ? parseSteamFreeGames(response.results_html) : [];
  cache = { games, expiresAt: Date.now() + CACHE_TTL };
  return games;
}
