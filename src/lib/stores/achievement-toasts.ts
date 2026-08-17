import { writable } from 'svelte/store';

export type AchievementAction = {
  id: string;
  label: string;
  primary?: boolean;
  onClick: () => void | Promise<void>;
};

export type AchievementToast = {
  id: string;
  title: string;
  message?: string;
  /** 0-100 renders the progress rail; omit to hide it. */
  progress?: number;
  actions?: AchievementAction[];
  /** Stays until dismissed explicitly. Implied when the toast has actions. */
  sticky?: boolean;
};

const DEFAULT_TTL_MS = 6000;
const MAX_VISIBLE = 3;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const achievementToasts = writable<AchievementToast[]>([]);

function clearTimer(id: string) {
  const timer = timers.get(id);
  if (!timer) return;
  clearTimeout(timer);
  timers.delete(id);
}

/** A toast the user has to answer (actions) or that tracks work (progress) never expires. */
function scheduleDismiss(toast: AchievementToast) {
  clearTimer(toast.id);
  if (toast.sticky || toast.actions?.length || toast.progress !== undefined) return;
  timers.set(
    toast.id,
    setTimeout(() => dismissAchievement(toast.id), DEFAULT_TTL_MS)
  );
}

export function pushAchievement(toast: Omit<AchievementToast, 'id'> & { id?: string }): string {
  const id = toast.id ?? Math.random().toString(36).slice(2);
  const next: AchievementToast = { ...toast, id };

  achievementToasts.update((list) => [...list.filter((item) => item.id !== id), next].slice(-MAX_VISIBLE));
  scheduleDismiss(next);

  return id;
}

/** Patches a live toast in place, so a download can drive one card instead of stacking. */
export function updateAchievement(id: string, patch: Partial<Omit<AchievementToast, 'id'>>) {
  let updated: AchievementToast | null = null;

  achievementToasts.update((list) =>
    list.map((toast) => {
      if (toast.id !== id) return toast;
      updated = { ...toast, ...patch, id };
      return updated;
    })
  );

  if (updated) scheduleDismiss(updated);
}

export function dismissAchievement(id: string) {
  clearTimer(id);
  achievementToasts.update((list) => list.filter((toast) => toast.id !== id));
}
