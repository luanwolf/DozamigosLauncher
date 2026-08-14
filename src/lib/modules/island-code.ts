/** Shared Creative island helpers. */

export function normalizeIslandCode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  if (digits.length !== 12) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
}

export function fortniteIslandUrl(code: string): string {
  return `https://www.fortnite.com/creative/island?code=${encodeURIComponent(code)}`;
}
