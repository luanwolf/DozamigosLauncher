export type SteamFreeGame = {
  appId: string;
  title: string;
  image: string;
  /** Wide store art for the home hero. Steam serves it next to the capsule. */
  banner: string;
  originalPrice: string;
  storeUrl: string;
};

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function attribute(html: string, name: string) {
  return html.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))?.[1] ?? '';
}

export function parseSteamFreeGames(html: string): SteamFreeGame[] {
  const games: SteamFreeGame[] = [];
  const rows = html.match(/<a\b[^>]*class=["'][^"']*search_result_row[^"']*["'][^>]*>[\s\S]*?<\/a>/gi) ?? [];

  for (const row of rows) {
    if (!/data-discount=["']100["']/i.test(row) || !/data-price-final=["']0["']/i.test(row)) continue;

    const appId = attribute(row, 'data-ds-appid');
    const title = decodeHtml(row.match(/<span\b[^>]*class=["']title["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? '');
    const image = attribute(row.match(/<img\b[^>]*>/i)?.[0] ?? '', 'src');
    const originalPrice = decodeHtml(
      row.match(/class=["']discount_original_price["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? ''
    );

    if (!appId || !title || !image) continue;
    games.push({
      appId,
      title,
      image,
      banner: image.replace(/capsule_\d+x\d+/, 'header'),
      originalPrice,
      storeUrl: `https://store.steampowered.com/app/${appId}/`
    });
  }

  return games;
}
