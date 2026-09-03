import type { AccountData } from '$types/account';

/** Override lobby Admin Panel codes (skip visual repeatables LetsBlockAndRoll / DontBlockMe). */
export const LOBBY_HACK_CODES = [
  'INVALIDCHEAT',
  'ChatWhereDoYouFindTheKey',
  'YourThoughtsAreMine',
  'JonesyIsGolden',
  'GatherAndCraft',
  'Play4All',
  'GottaGoFast',
  'IWannaFlyHigh',
  'Born2Play',
  '8BitBlast',
  'SurviveTheNight',
  'FindItChat',
  'TakeYourHeart',
  'O2Override',
  'BeMoreAlien',
  'ReachYourImpossible',
  'PerfectOrder',
  'ABGESTAUBT',
  'PERLINPINPIN',
  'CHISPAMBO',
  'MAGILUME',
  'OverrideXP',
  'H0p0nVC'
] as const;

export type CheatCodeStatus = 'redeemed' | 'skipped' | 'failed';

export type CheatCodeResult = {
  code: string;
  status: CheatCodeStatus;
  errorCode?: string;
};

export type CheatCodeRedeemSummary = {
  redeemed: number;
  skipped: number;
  failed: number;
  unavailable: boolean;
  results: CheatCodeResult[];
};

export function emptyCheatCodeSummary(): CheatCodeRedeemSummary {
  return { redeemed: 0, skipped: 0, failed: 0, unavailable: false, results: [] };
}

export function aggregateCheatCodeResults(results: CheatCodeResult[], unavailable = false): CheatCodeRedeemSummary {
  const summary = emptyCheatCodeSummary();
  summary.results = results;
  summary.unavailable = unavailable;
  for (const result of results) {
    summary[result.status] += 1;
  }
  return summary;
}

export function normalizeLobbyHackCode(code: string): string {
  return code.replace(/\s+/g, '').trim();
}

function epicError(error: unknown): { errorCode?: string; numericErrorCode?: number; errorMessage?: string } | null {
  if (!error || typeof error !== 'object') return null;
  const data = error as { errorCode?: string; numericErrorCode?: number; errorMessage?: string };
  if (data.errorCode === undefined) return null;
  return data;
}

/** Operation missing / no MCP permission — not "code unavailable in this match". */
export function isLobbyHackUnavailable(error: unknown): boolean {
  const data = epicError(error);
  if (!data?.errorCode) return false;
  return (
    data.errorCode === 'errors.com.epicgames.modules.profiles.invalid_command' ||
    /missing_action|missing_permission|operation_forbidden/i.test(data.errorCode)
  );
}

function classifyRedeemError(error: unknown): CheatCodeStatus {
  const data = epicError(error);
  const lower = `${data?.errorCode ?? ''} ${data?.errorMessage ?? ''}`.toLowerCase();
  if (/already|used|owned|duplicate|previously|claimed/.test(lower)) return 'skipped';
  return 'failed';
}

const GAP_MS = 400;

export async function redeemCheatCodes(
  account: AccountData,
  codes: readonly string[]
): Promise<CheatCodeRedeemSummary> {
  const unique = [...new Set(codes.map(normalizeLobbyHackCode).filter(Boolean))];
  if (unique.length === 0) return emptyCheatCodeSummary();

  const { composeMCP, clientQuestLogin } = await import('$lib/modules/mcp');
  const { getCachedToken } = await import('$lib/modules/auth-session');
  const { defaultClient } = await import('$lib/constants/clients');

  await getCachedToken(account, defaultClient, true);
  await clientQuestLogin(account, 'athena');

  const results: CheatCodeResult[] = [];
  for (const [index, code] of unique.entries()) {
    try {
      await composeMCP(account, 'ExecuteTerminalCommand', 'athena', { command: code });
      results.push({ code, status: 'redeemed' });
    } catch (error) {
      if (isLobbyHackUnavailable(error)) {
        return aggregateCheatCodeResults(
          unique.map((item) => ({
            code: item,
            status: 'failed',
            errorCode: epicError(error)?.errorCode ?? 'mcp_unavailable'
          })),
          true
        );
      }
      results.push({
        code,
        status: classifyRedeemError(error),
        errorCode: epicError(error)?.errorCode
      });
    }
    if (index < unique.length - 1) await new Promise((resolve) => setTimeout(resolve, GAP_MS));
  }

  return aggregateCheatCodeResults(results);
}

export function redeemAllCheatCodes(
  account: AccountData,
  codes: readonly string[] = LOBBY_HACK_CODES
): Promise<CheatCodeRedeemSummary> {
  return redeemCheatCodes(account, codes);
}
