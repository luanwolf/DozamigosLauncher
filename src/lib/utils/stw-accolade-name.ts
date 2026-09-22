import type { Locale } from '$lib/paraglide/runtime';

/** STW accolade ids (`accoladeid_stw_endurance_w06`) → in-game name. */
export function accoladeDisplayName(templateId: string, locale: Locale = 'pt-br'): string | null {
  const body = (templateId.includes(':') ? (templateId.split(':').pop() ?? templateId) : templateId).toLowerCase();
  const wave = body.match(/^accoladeid_stw_endurance_w0*(\d+)$/);
  if (!wave) return null;
  const n = String(Number(wave[1]));
  return locale === 'pt-br' ? `Resistência: Onda ${n}` : `Endurance: Wave ${n}`;
}
