/** First non-empty URL. Shop display-assets beat catalog thumbs — those 500 on a fresh season. */
export function pickCosmeticImage(...urls: Array<string | undefined | null>): string {
  for (const url of urls) {
    if (url) return url;
  }
  return '';
}

export function fortniteApiCosmeticIconUrl(cosmeticId: string): string {
  return `https://fortnite-api.com/images/cosmetics/br/${cosmeticId}/icon.png`;
}

/** Catalog smallIcon 500s on a fresh season; try icon, then drop the src. */
export function onCosmeticImageError(event: Event) {
  const img = event.currentTarget;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.src.includes('/smallicon.png')) {
    img.src = img.src.replace('/smallicon.png', '/icon.png');
    return;
  }
  img.removeAttribute('src');
}
