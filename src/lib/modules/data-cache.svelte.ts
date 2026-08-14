import { SvelteMap } from 'svelte/reactivity';

export type CacheEntry<T> = {
  data: T | null;
  /** First load for this key — there is nothing to show yet. */
  loading: boolean;
  /** Reload over data that is already on screen. */
  refreshing: boolean;
  error: unknown;
};

const EMPTY: CacheEntry<never> = { data: null, loading: false, refreshing: false, error: null };

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
 * Entries never expire on their own — call `refresh` for data that goes stale
 * (shop rotations, balances) and `clear` when it becomes invalid. A failed load
 * keeps whatever was cached and exposes `error`, so callers decide how to
 * report it; the next `ensure` retries.
 */
export function createCache<Ctx, T>(
  keyOf: (ctx: Ctx) => string,
  loader: (ctx: Ctx) => Promise<T>
): Cache<Ctx, T> {
  const entries = new SvelteMap<string, CacheEntry<T>>();
  const inflight = new SvelteMap<string, Promise<T | null>>();

  function get(ctx: Ctx | null | undefined): CacheEntry<T> {
    if (ctx == null) return EMPTY;
    return entries.get(keyOf(ctx)) ?? EMPTY;
  }

  function ensure(ctx: Ctx | null | undefined, { force = false } = {}): Promise<T | null> {
    if (ctx == null) return Promise.resolve(null);

    const key = keyOf(ctx);
    const cached = entries.get(key)?.data ?? null;
    if (cached !== null && !force) return Promise.resolve(cached);

    const running = inflight.get(key);
    if (running) return running;

    entries.set(key, { data: cached, loading: cached === null, refreshing: cached !== null, error: null });

    const promise = loader(ctx)
      .then((data) => {
        entries.set(key, { data, loading: false, refreshing: false, error: null });
        return data;
      })
      .catch((error) => {
        entries.set(key, { data: cached, loading: false, refreshing: false, error });
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
      entries.set(keyOf(ctx), { data, loading: false, refreshing: false, error: null });
    },
    clear(ctx) {
      if (ctx == null) entries.clear();
      else entries.delete(keyOf(ctx));
    }
  };
}
