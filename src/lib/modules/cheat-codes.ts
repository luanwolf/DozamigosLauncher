import type { AccountData } from '$types/account';

/** Reward codes. Skip reusable lobby visuals (LetsBlockAndRoll, DontBlockMe, InsertCoinToContinue, BRB, PowerOut, CrowsAreAfraid, PumpkinSpiceLife) and the story glitch S7H-50P-R03. */
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
  'H0p0nVC',
  'WhereIsTheDustyTree',
  'DustInTheWind',
  'NOCTURNEOP55N1',
  'BeamMeUp',
  'BLINKYINKYPINKYCLYDE',
  'SAYH12WR1X3L',
  'PlayToLevelUp',
  'DestinyAwaits',
  'ChatFindMeAnotherCode',
  'MagicIsReal',
  'WhoCrackedTheCode',
  '9Years',
  'WeAreTheWorldChampionsToday',
  'BoneRattler',
  'AlmostScaringSeason',
  'IThinkTheKeyFoundMeChat',
  'DustySprites',
  'ImTheRealEdgelord',
  'runSystemOverride',
  'NoProLlama'
] as const;

export type CheatCodeStatus = 'redeemed' | 'skipped' | 'failed';
export type LobbyHackReason = 'used' | 'unavailable' | 'unknown' | 'cooldown' | 'rejected';

export type CheatCodeResult = {
  code: string;
  status: CheatCodeStatus;
  reason?: LobbyHackReason;
  detail?: string;
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

function epicError(error: unknown): {
  errorCode?: string;
  numericErrorCode?: number;
  errorMessage?: string;
  messageVars?: string[];
} | null {
  if (!error || typeof error !== 'object') return null;
  const data = error as {
    errorCode?: string;
    numericErrorCode?: number;
    errorMessage?: string;
    messageVars?: unknown[];
  };
  if (data.errorCode === undefined && data.errorMessage === undefined) return null;
  return {
    errorCode: data.errorCode,
    numericErrorCode: data.numericErrorCode,
    errorMessage: data.errorMessage,
    messageVars: (data.messageVars ?? []).filter((item): item is string => typeof item === 'string')
  };
}

function humanDetail(error: unknown): string {
  const data = epicError(error);
  if (!data) return '';
  const bits = [...(data.messageVars ?? []), data.errorMessage ?? ''];
  return bits.find((bit) => bit && !bit.startsWith('errors.com.'))?.trim() ?? '';
}

/** Maps Epic's lobby-hack refusal to a reason the toast can say out loud. */
export function classifyLobbyHackError(error: unknown): {
  status: 'skipped' | 'failed';
  reason: LobbyHackReason;
  detail?: string;
} {
  const data = epicError(error);
  const detail = humanDetail(error);
  const text = `${detail} ${data?.errorCode ?? ''}`.toLowerCase();
  if (/not currently available/.test(text)) return { status: 'failed', reason: 'unavailable' };
  if (/cool(?:ing)? off|slow down|too eager/.test(text)) return { status: 'failed', reason: 'cooldown' };
  if (/already used|already been used|previously|code_used|already_owned|duplicate/.test(text)) {
    return { status: 'skipped', reason: 'used' };
  }
  if (data?.errorCode?.includes('terminal_command_failure')) return { status: 'failed', reason: 'unknown' };
  if (/already|owned|claimed/.test(text)) return { status: 'skipped', reason: 'used' };
  return { status: 'failed', reason: 'rejected', detail: detail || undefined };
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
      const classified = classifyLobbyHackError(error);
      results.push({
        code,
        status: classified.status,
        reason: classified.reason,
        detail: classified.detail,
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
