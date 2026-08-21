import { SvelteMap } from 'svelte/reactivity';

export type CacheEntry<T> = {
  data: T | null;
  /** First load for this key — there is nothing to show yet. */
  loading: boolean;
  /** Reload over data that is already on screen. */
  refreshing: boolean;
  error: unknown;
  /** Epoch ms when `data` was last successfully loaded; omitted until then. */
  fetchedAt?: number;
};

const EMPTY: CacheEntry<never> = { data: null, loading: false, refreshing: false, error: null };

export type CacheOptions = {
  /**
   * When set, `ensure` refetches once the cached value is older than this.
   * Stale data stays on screen (`refreshing`) until the new load finishes.
   */
  maxAgeMs?: number;
};

export type Cache<Ctx, T> = {
  get(ctx: Ctx | null | undefined): CacheEntry<T>;
  ensure(ctx: Ctx | null | undefined, options?: { force?: boolean }): Promise<T | null>;
  refresh(ctx: Ctx | null | undefined): Promise<T | null>;
  set(ctx: Ctx, data: T): void;
  clear(ctx?: Ctx): void;
};

/**
 * Keyed read-through cache shared by every page that renders the same data, so
 * navigating away and back reuses what was already fetched instead of showing a
 * loading screen again. Concurrent `ensure` calls for one key share a request.
 *
 * Without `maxAgeMs`, entries never expire — call `refresh` / `clear` yourself.
 * With `maxAgeMs`, a later `ensure` (or background warm) refetches when stale.
 * A failed load keeps whatever was cached and exposes `error`; the next
 * `ensure` retries.
 */
export function createCache<Ctx, T>(
  keyOf: (ctx: Ctx) => string,
  loader: (ctx: Ctx) => Promise<T>,
  options: CacheOptions = {}
): Cache<Ctx, T> {
  const { maxAgeMs } = options;
  const entries = new SvelteMap<string, CacheEntry<T>>();
  const inflight = new SvelteMap<string, Promise<T | null>>();

  function get(ctx: Ctx | null | undefined): CacheEntry<T> {
    if (ctx == null) return EMPTY;
    return entries.get(keyOf(ctx)) ?? EMPTY;
  }

  function isFresh(entry: CacheEntry<T> | undefined): boolean {
    if (!entry?.data) return false;
    if (maxAgeMs == null) return true;
    if (entry.fetchedAt == null) return false;
    return Date.now() - entry.fetchedAt < maxAgeMs;
  }

  function ensure(ctx: Ctx | null | undefined, { force = false } = {}): Promise<T | null> {
    if (ctx == null) return Promise.resolve(null);

    const key = keyOf(ctx);
    const entry = entries.get(key);
    const cached = entry?.data ?? null;
    if (cached !== null && !force && isFresh(entry)) return Promise.resolve(cached);

    const running = inflight.get(key);
    if (running) return running;

    entries.set(key, {
      data: cached,
      loading: cached === null,
      refreshing: cached !== null,
      error: null,
      fetchedAt: entry?.fetchedAt
    });

    const promise = loader(ctx)
      .then((data) => {
        entries.set(key, { data, loading: false, refreshing: false, error: null, fetchedAt: Date.now() });
        return data;
      })
      .catch((error) => {
        entries.set(key, {
          data: cached,
          loading: false,
          refreshing: false,
          error,
          fetchedAt: entry?.fetchedAt
        });
        return null;
      })
      .finally(() => {
        inflight.delete(key);
      });

    inflight.set(key, promise);
    return promise;
  }

  return {
    get,
    ensure,
    refresh: (ctx) => ensure(ctx, { force: true }),
    set(ctx, data) {
      entries.set(keyOf(ctx), {
        data,
        loading: false,
        refreshing: false,
        error: null,
        fetchedAt: Date.now()
      });
    },
    clear(ctx) {
      if (ctx == null) entries.clear();
      else entries.delete(keyOf(ctx));
    }
  };
}
