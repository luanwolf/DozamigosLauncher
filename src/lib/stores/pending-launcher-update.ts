import { writable } from 'svelte/store';

export type PendingLauncherUpdate = {
  version: string;
  /** Brings the update card back in whatever state it was dismissed from. */
  reopen: () => void;
};

/** Set when the user postpones an update, so the sidebar can keep offering it. */
export const pendingLauncherUpdate = writable<PendingLauncherUpdate | null>(null);
