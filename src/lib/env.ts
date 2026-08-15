function readEnv(key: string): string | undefined {
  const value = import.meta.env[key]?.trim();
  return value || undefined;
}

/** fortnite-api.com dashboard key (Authorization header). */
export function getFortniteApiKey(): string | undefined {
  return readEnv('VITE_FORTNITE_API_KEY');
}

/** fnbr.co developer key (x-api-key header). */
export function getFnbrApiKey(): string | undefined {
  return readEnv('VITE_FNBR_API_KEY');
}

/** api-fortnite.com dashboard key (x-api-key header). */
export function getApiFortniteKey(): string | undefined {
  return readEnv('VITE_API_FORTNITE_KEY');
}

export function isFortniteApiConfigured(): boolean {
  return Boolean(getFortniteApiKey());
}

export function isFnbrApiConfigured(): boolean {
  return Boolean(getFnbrApiKey());
}
