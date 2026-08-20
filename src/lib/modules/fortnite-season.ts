import type { AccountData } from '$types/account';

type CalendarState = {
  validFrom: string;
  state: Record<string, unknown>;
};

type CalendarTimelineResponse = {
  channels: Record<
    string,
    {
      states: CalendarState[];
    }
  >;
  currentTime?: string;
};

type PublicSeasonResponse = {
  seasonDateBegin: string;
  seasonDateEnd: string;
  seasonNumber: number;
};

export type SeasonInfo = {
  seasonNumber: number;
  name: string;
  begin?: Date;
  end?: Date;
  displayedEnd?: Date;
  progressPercent?: number;
  daysRemaining?: number;
  hasTimeline: boolean;
  /** Wide season key art (from BR news / CMS). */
  keyArt?: string;
};

type FetchSeasonInfoOptions = {
  seasonNameHint?: string;
  account?: AccountData | null;
  locale?: string;
};

/** Chapter 7 Season 4 (Override) — used only when Epic/API omit end dates. */
export const FALLBACK_SEASON_BEGIN = new Date('2026-08-20T07:00:00.000Z');
export const FALLBACK_SEASON_END = new Date('2026-10-31T23:59:59.000Z');

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getActiveState(states: CalendarState[]): CalendarState | null {
  if (!states.length) return null;

  const now = Date.now();
  let active = states[0];

  for (const state of states) {
    const validFrom = new Date(state.validFrom).getTime();
    if (!Number.isNaN(validFrom) && validFrom <= now) {
      active = state;
    }
  }

  return active;
}

function seasonProgress(begin: Date, end: Date) {
  const now = Date.now();
  const total = end.getTime() - begin.getTime();
  if (total <= 0) return 0;

  const elapsed = now - begin.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

function daysUntil(end: Date) {
  const ms = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function withFallbackTimeline(season: SeasonInfo): SeasonInfo {
  if (season.begin && season.displayedEnd) return season;

  const begin = season.begin ?? FALLBACK_SEASON_BEGIN;
  const end = season.end ?? FALLBACK_SEASON_END;
  const displayedEnd = season.displayedEnd ?? end;

  return {
    ...season,
    begin,
    end,
    displayedEnd,
    progressPercent: seasonProgress(begin, displayedEnd),
    daysRemaining: daysUntil(displayedEnd),
    hasTimeline: true
  };
}

function parseTimelineResponse(response: CalendarTimelineResponse, seasonNameHint?: string): SeasonInfo | null {
  const channel = response.channels['client-event'] ?? response.channels['client-Event'];
  const active = channel ? getActiveState(channel.states) : null;
  if (!active) return null;

  const state = active.state;
  const seasonNumber = typeof state.seasonNumber === 'number' ? state.seasonNumber : Number(state.seasonNumber);
  const begin = parseDate(state.seasonBegin);
  const end = parseDate(state.seasonEnd);
  const displayedEnd = parseDate(state.seasonDisplayedEnd) ?? end;

  if (!seasonNumber || !begin || !end || !displayedEnd) return null;

  const name =
    seasonNameHint?.trim() ||
    (typeof state.seasonName === 'string' ? state.seasonName : '') ||
    `Temporada ${seasonNumber}`;

  return {
    seasonNumber,
    name,
    begin,
    end,
    displayedEnd,
    progressPercent: seasonProgress(begin, displayedEnd),
    daysRemaining: daysUntil(displayedEnd),
    hasTimeline: true
  };
}

export function parsePublicSeasonResponse(response: PublicSeasonResponse, seasonNameHint?: string): SeasonInfo | null {
  const begin = parseDate(response.seasonDateBegin);
  const end = parseDate(response.seasonDateEnd);
  const seasonNumber = Number(response.seasonNumber);
  if (!seasonNumber || !begin || !end) return null;

  return {
    seasonNumber,
    name: seasonNameHint?.trim() || `Temporada ${seasonNumber}`,
    begin,
    end,
    displayedEnd: end,
    progressPercent: seasonProgress(begin, end),
    daysRemaining: daysUntil(end),
    hasTimeline: true
  };
}

function buildNameOnlySeason(name: string, keyArt?: string): SeasonInfo {
  return withFallbackTimeline({
    seasonNumber: 0,
    name,
    hasTimeline: false,
    keyArt
  });
}

export function formatSeasonNameFromNews(title: string) {
  return (
    title
      .replace(/^Fortnite:\s*/i, '')
      .replace(/\s+(?:chegou|já chegou|is here|ya está aquí|est arrivé)!?$/i, '')
      .trim() || title.trim()
  );
}

/**
 * Epic announces a season with a "Fortnite: <name> Chegou!" headline, while the
 * top slot of the MOTD list is whatever is being promoted right now (an FNCS
 * broadcast, a collab). Only the announcement names the season.
 */
export function findSeasonNews<T extends { title: string }>(news: T[]): T | null {
  return news.find((item) => /^Fortnite:\s*\S/i.test(item.title)) ?? null;
}

export async function fetchSeasonInfo(options: FetchSeasonInfoOptions = {}): Promise<SeasonInfo | null> {
  const { seasonNameHint, account, locale } = options;

  // Keeps the pure name helpers runnable in Bun selfchecks without a Tauri runtime.
  const [{ apiFortniteService, calendarService }, { getAuthedKy }, { fetchBrNews }, { getApiFortniteKey }] =
    await Promise.all([
      import('$lib/http'),
      import('$lib/modules/auth-session'),
      import('$lib/modules/fortnite-api'),
      import('$lib/env')
    ]);

  const newsPromise = fetchBrNews(locale).catch(() => []);
  const calendarPromise = account
    ? getAuthedKy(account, calendarService)
        .get<CalendarTimelineResponse>('timeline')
        .json()
        .catch(() => null)
    : Promise.resolve(null);

  const [news, calendar] = await Promise.all([newsPromise, calendarPromise]);
  const seasonMotd = findSeasonNews(news);
  const newsName = seasonMotd ? formatSeasonNameFromNews(seasonMotd.title) : undefined;
  const keyArt = seasonMotd?.image || undefined;
  const hint = seasonNameHint?.trim() || newsName;

  if (calendar) {
    const season = parseTimelineResponse(calendar, hint);
    if (season) {
      return {
        ...season,
        name: hint || season.name,
        keyArt
      };
    }
  }

  if (getApiFortniteKey()) {
    const publicSeason = await apiFortniteService
      .get<PublicSeasonResponse>('v1/season')
      .json()
      .catch(() => null);
    if (publicSeason) {
      const season = parsePublicSeasonResponse(publicSeason, hint);
      if (season) return { ...season, keyArt };
    }
  }

  if (hint) {
    return buildNameOnlySeason(hint, keyArt);
  }

  return withFallbackTimeline({
    seasonNumber: 0,
    name: 'Temporada atual',
    hasTimeline: false,
    keyArt
  });
}
