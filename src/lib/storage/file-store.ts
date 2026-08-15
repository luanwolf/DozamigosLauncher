import type { Readable } from 'svelte/store';
import { dev } from '$app/environment';
import type { ZodType } from 'zod';
import * as path from '@tauri-apps/api/path';
import { dataDir } from '@tauri-apps/api/path';
import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { safePlatform } from '$lib/modules/safe-platform';
import { debounce } from '$lib/debounce';
import { getChildLogger } from '$lib/logger';

type Subscriber<T> = (value: T) => void;

const logger = getChildLogger('FileStore');

let cachedDataDirectory: string | null = null;

/** Lazy data dir — avoids top-level-await TDZ cycles with modules that import FileStore. */
export async function getDataDirectory() {
  if (cachedDataDirectory) return cachedDataDirectory;
  cachedDataDirectory =
    safePlatform() === 'android'
      ? await dataDir()
      : await path.join(await dataDir(), 'dozamigos-launcher');
  return cachedDataDirectory;
}

export abstract class FileStore<T> implements Readable<T> {
  private path: string;
  private state: T = null!;
  private readonly defaults: T;
  private readonly schema: ZodType<T>;

  private subscribers = new Set<Subscriber<T>>();
  private debouncedSave = debounce(() => this.save(), 500);

  protected constructor(fileName: string, defaults: T, schema: ZodType<T>) {
    this.path = dev ? `${fileName}-dev.json` : `${fileName}.json`;
    this.defaults = defaults;
    this.schema = schema;
  }

  async init() {
    if (this.state) return;

    const dir = await getDataDirectory();
    this.path = await path.join(dir, this.path);

    try {
      await mkdir(dir, { recursive: true });
    } catch (error) {
      logger.debug('mkdir dataDirectory', { error });
    }

    let fileExists = false;
    try {
      fileExists = await exists(this.path);
    } catch (error) {
      logger.debug('exists check failed, treating as missing', { file: this.path, error });
    }

    if (!fileExists) {
      this.state = structuredClone(this.defaults);
      this.notify();
      return;
    }

    try {
      const raw = await readTextFile(this.path);
      this.state = this.schema.parse(JSON.parse(raw));
    } catch (error) {
      logger.error('Invalid data, resetting to defaults', { file: this.path, error });
      this.state = structuredClone(this.defaults);
    }

    this.notify();
  }

  get() {
    return this.state ?? structuredClone(this.defaults);
  }

  subscribe(run: Subscriber<T>) {
    this.subscribers.add(run);

    if (this.state) {
      run(this.state);
    }

    return () => {
      this.subscribers.delete(run);
    };
  }

  set(setter: (value: T) => T) {
    this.state = setter(this.state);
    this.notify();
    this.debouncedSave();
  }

  private async save() {
    await writeTextFile(this.path, JSON.stringify(this.state, null, 2));
  }

  private notify() {
    if (!this.state) return;

    for (const fn of this.subscribers) {
      fn(this.state);
    }
  }
}
