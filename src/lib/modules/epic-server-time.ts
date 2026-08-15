/** UTC hour bucket key, e.g. `2026-08-15T14` — independent of local timezone. */
export function utcHourBucket(serverMs: number): string {
  const d = new Date(serverMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}`;
}

export function parseServerTimeMs(serverTime: string): number | null {
  const ms = Date.parse(serverTime);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Delay until the next Epic UTC hour boundary + buffer.
 * Uses only the server clock delta — wall-clock of the PC does not decide the target.
 */
export function msUntilNextUtcHour(serverMs: number, bufferMs = 5_000): number {
  const d = new Date(serverMs);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours() + 1, 0, 0, 0);
  return Math.max(1_000, next - serverMs + bufferMs);
}

/** True when this hour bucket has not been claimed yet. */
export function shouldRunHourlyClaim(lastBucket: string | null | undefined, currentBucket: string) {
  return lastBucket !== currentBucket;
}
