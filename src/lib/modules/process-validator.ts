import { writable } from 'svelte/store';
import { redactSecrets } from '$lib/modules/redact-secrets';

export { redactSecrets };

export type ProbeFailCode =
  | 'auth'
  | 'network'
  | 'empty'
  | 'parse'
  | 'csp_suspect'
  | 'secret_leak'
  | 'http'
  | 'ok';

export type ProbeResult = {
  id: string;
  routeId: string;
  label: string;
  hostPath: string;
  ok: boolean;
  status?: number;
  ms: number;
  code: ProbeFailCode;
  detail?: string;
  at: number;
};

const MAX = 80;
const { subscribe, update, set } = writable<ProbeResult[]>([]);

export const processValidatorLog = {
  subscribe,
  clear() {
    set([]);
  },
  push(entry: ProbeResult) {
    update((list) => [entry, ...list].slice(0, MAX));
  }
};

export function classifyHttpFail(status?: number, message?: string): ProbeFailCode {
  if (message && /(authorization|bearer\s+|eg1~|device[_-]?auth|x-api-key|api[_-]?key)/i.test(message)) {
    return 'secret_leak';
  }
  if (status === 401 || status === 403) return 'auth';
  if (status === 0 || message?.toLowerCase().includes('network')) return 'network';
  if (message?.toLowerCase().includes('csp') || message?.toLowerCase().includes('blocked')) {
    return 'csp_suspect';
  }
  if (status && status >= 400) return 'http';
  return 'network';
}

export type ProbeCheck = {
  id: string;
  label: string;
  /** Safe host+path for display (no secrets). */
  hostPath: string;
  run: () => Promise<{ status?: number; empty?: boolean }>;
};

export async function runProbes(routeId: string, checks: ProbeCheck[]) {
  for (const check of checks) {
    const started = performance.now();
    try {
      const result = await check.run();
      const ms = Math.round(performance.now() - started);
      let code: ProbeFailCode = 'ok';
      let ok = true;
      if (result.empty) {
        code = 'empty';
        ok = false;
      } else if (result.status && result.status >= 400) {
        code = classifyHttpFail(result.status);
        ok = false;
      }
      processValidatorLog.push({
        id: `${check.id}-${Date.now()}`,
        routeId,
        label: check.label,
        hostPath: check.hostPath,
        ok,
        status: result.status,
        ms,
        code,
        at: Date.now()
      });
    } catch (error) {
      const ms = Math.round(performance.now() - started);
      const raw = error instanceof Error ? error.message : String(error);
      const detail = redactSecrets(raw);
      processValidatorLog.push({
        id: `${check.id}-${Date.now()}`,
        routeId,
        label: check.label,
        hostPath: check.hostPath,
        ok: false,
        ms,
        code: classifyHttpFail(undefined, raw),
        detail,
        at: Date.now()
      });
    }
  }
}
