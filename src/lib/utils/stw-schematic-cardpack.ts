/** CardPack schematic grants (Plano Raro/Épico) use voucher icons, not the bronze llama. */
export function schematicCardPackImage(key: string) {
  const suffix = key.match(/schematic_(c|uc|r|vr|sr|er)(?:_|$)/i)?.[1]?.toLowerCase();
  return suffix ? `/resources/voucher_generic_schematic_${suffix}.png` : null;
}

/** Mini (1 ticket) and free stubs stay in Epic's preroll catalog even when the live llama shop does not sell them. */
export function isGhostLlamaOffer(storefront: string, offer: { price: { finalPrice: number } }) {
  if (storefront !== 'CardPackStorePreroll') return false;
  return offer.price.finalPrice <= 1;
}
