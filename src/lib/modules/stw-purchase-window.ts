import type { StwPurchaseLimitPeriod } from '$types/game/stw-store';

/**
 * How long an offer stays marked as bought locally.
 * The llama catalog rotates every few minutes, but a daily limit only frees up at 00:00 UTC —
 * keying the marker on the rotation made free (0 ticket) llamas come back as buyable all day.
 */
export function exhaustedUntil(period: StwPurchaseLimitPeriod, catalogExpiration: string, now: number) {
  const rotationEnd = new Date(catalogExpiration).getTime();
  const rotation = Number.isNaN(rotationEnd) ? 0 : rotationEnd;
  if (period !== 'daily') return rotation;

  const day = new Date(now);
  return Math.max(rotation, Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1));
}

/** Keeps only offers still inside their hide window (also drops the pre-0.1.15 bucket shape). */
export function pruneExhausted(bucket: unknown, now: number): Record<string, number> {
  if (!bucket || typeof bucket !== 'object') return {};

  const kept: Record<string, number> = {};
  for (const [offerId, until] of Object.entries(bucket as Record<string, unknown>)) {
    if (typeof until === 'number' && until > now) kept[offerId] = until;
  }
  return kept;
}
