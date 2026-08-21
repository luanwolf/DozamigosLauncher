import path from 'node:path';
import type { Client, ClientEvents } from 'discord.js';
import { walkTs, importPath } from '@/utils/fs';

export type Event<T extends keyof ClientEvents> = {
  name: T;
  once?: boolean;
  run: (...args: ClientEvents[T]) => void;
};

export async function loadEvents(client: Client) {
  for (const filePath of await walkTs(path.resolve('src', 'events'))) {
    // biome-ignore lint/suspicious/noExplicitAny: We don't care about the name
    const event: Event<any> | undefined = (await import(importPath(filePath))).default;
    if (!event) continue;

    client[event.once ? 'once' : 'on'](event.name, (...params: unknown[]) => event.run(...params));
  }
}
