const STORAGE_KEY = 'stwVbucksHistory';
const MAX_ENTRIES = 400;

export type VbucksHistory = Record<string, number>;

function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function loadVbucksHistory(): VbucksHistory {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VbucksHistory) : {};
  } catch {
    return {};
  }
}

function saveVbucksHistory(history: VbucksHistory) {
  const keys = Object.keys(history).sort();
  const trimmed: VbucksHistory = {};
  for (const key of keys.slice(-MAX_ENTRIES)) {
    trimmed[key] = history[key];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/** Persists today's alert V-Bucks total (UTC day). */
export function recordDailyVbucks(amount: number) {
  if (typeof localStorage === 'undefined') return;
  const history = loadVbucksHistory();
  history[utcDateKey()] = amount;
  saveVbucksHistory(history);
}

function startOfUtcWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return d;
}

function datesInUtcRange(start: Date, end: Date) {
  const keys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    keys.push(utcDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

function sumHistoryForKeys(history: VbucksHistory, keys: string[], todayKey: string, todayAmount: number) {
  let sum = 0;
  let tracked = 0;
  for (const key of keys) {
    const value = key === todayKey ? todayAmount : history[key];
    if (value === undefined) continue;
    sum += value;
    tracked += 1;
  }
  return { sum, tracked, totalDays: keys.length };
}

export type VbucksPeriodTotals = {
  today: number;
  week: number;
  month: number;
  year: number;
  weekTrackedDays: number;
  weekTotalDays: number;
  monthTrackedDays: number;
  monthTotalDays: number;
  yearTrackedDays: number;
  yearTotalDays: number;
};

export function getVbucksPeriodTotals(todayAmount: number): VbucksPeriodTotals {
  const now = new Date();
  const todayKey = utcDateKey(now);
  const history = loadVbucksHistory();

  const weekStart = startOfUtcWeek(now);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const weekKeys = datesInUtcRange(weekStart, todayUtc);
  const monthKeys = datesInUtcRange(monthStart, todayUtc);
  const yearKeys = datesInUtcRange(yearStart, todayUtc);

  const week = sumHistoryForKeys(history, weekKeys, todayKey, todayAmount);
  const month = sumHistoryForKeys(history, monthKeys, todayKey, todayAmount);
  const year = sumHistoryForKeys(history, yearKeys, todayKey, todayAmount);

  return {
    today: todayAmount,
    week: week.sum,
    month: month.sum,
    year: year.sum,
    weekTrackedDays: week.tracked,
    weekTotalDays: week.totalDays,
    monthTrackedDays: month.tracked,
    monthTotalDays: month.totalDays,
    yearTrackedDays: year.tracked,
    yearTotalDays: year.totalDays
  };
}
