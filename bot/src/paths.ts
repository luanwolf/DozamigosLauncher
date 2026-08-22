import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Launcher repo root (parent of `bot/`). */
export const REPO_ROOT = path.resolve(HERE, '../..');
export const STATIC_ROOT = path.join(REPO_ROOT, 'static');
export const BOT_ROOT = path.join(REPO_ROOT, 'bot');
export const DATA_DIR = path.join(BOT_ROOT, 'data');

export function staticFile(...parts: string[]) {
  return path.join(STATIC_ROOT, ...parts);
}
