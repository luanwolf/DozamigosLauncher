import { resolveColor, type ColorResolvable } from 'discord.js';

/** Accent on Components V2 containers — the only color Discord draws on the card. */
export const THEME = {
  mark: '◈',
  name: 'DOZAMIGOS',
  colors: {
    default: resolveColor('#22D3EE'),
    success: resolveColor('#34D399'),
    error: resolveColor('#FB7185'),
    warn: resolveColor('#FBBF24')
  }
} as const;

export type ThemeKind = 'info' | 'success' | 'error' | 'warn';

export function accent(kind: ThemeKind = 'info', override?: ColorResolvable) {
  if (override != null) return resolveColor(override);
  if (kind === 'info') return THEME.colors.default;
  return THEME.colors[kind];
}

export function discordTime(date: Date | string | number, style: 'R' | 'F' | 'f' | 'D' | 't' = 'f') {
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${style}>`;
}

export function brandSubtext(extra?: string) {
  const now = discordTime(Date.now(), 'R');
  return extra ? `-# ${THEME.mark} ${THEME.name}  ·  ${extra}  ·  ${now}` : `-# ${THEME.mark} ${THEME.name}  ·  ${now}`;
}
