import { derived, readable } from 'svelte/store';
import { m } from '$lib/paraglide/messages';
import type { Locale } from '$lib/paraglide/runtime';

type MessageKey = keyof typeof m;
type MessageFn<K extends MessageKey> = (typeof m)[K];
type InputsOf<K extends MessageKey> = Parameters<MessageFn<K>>[0];
type OptionsOf<K extends MessageKey> = Parameters<MessageFn<K>>[1];

// Hardcoded locale — avoids importing settingsStore (FileStore/Tauri) at module
// evaluation time, which caused TDZ crashes during SvelteKit client boot.
export const language = readable('pt-br' as Locale);

export const t = derived(language, ($language) => {
  return function t<K extends MessageKey>(key: K, inputs?: InputsOf<K>, options?: OptionsOf<K>): string {
    return m[key](inputs ?? ({} as any), {
      locale: $language,
      ...options
    }) as ReturnType<MessageFn<K>>;
  };
});
