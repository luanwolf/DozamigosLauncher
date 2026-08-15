/** Run async work over items with limited parallelism (default 1 = sequential). */
export async function mapPool<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 1
): Promise<PromiseSettledResult<R>[]> {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}
