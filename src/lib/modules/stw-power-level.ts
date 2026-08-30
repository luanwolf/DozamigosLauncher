import homebaseRatingKeys from '$lib/data/stw-homebase-rating.json';
import survivorRatingTables from '$lib/data/stw-survivor-rating.json';
import type { ProfileItem } from '$types/game/mcp';

type CurvePoint = [number, number];

/** Linear interpolation along Epic's curve tables (KeyTime → KeyValue). */
function evalCurve(keys: CurvePoint[], key: number): number {
  if (!keys.length) return 0;
  if (key <= keys[0]![0]) return keys[0]![1];
  const last = keys[keys.length - 1]!;
  if (key >= last[0]) return last[1];

  const nextIdx = keys.findIndex((k) => k[0] > key);
  const prev = keys[nextIdx - 1]!;
  const next = keys[nextIdx]!;
  const fac = (key - prev[0]) / (next[0] - prev[0]);
  return prev[1] * (1 - fac) + next[1] * fac;
}

const HOMEBASE_RATING = homebaseRatingKeys as CurvePoint[];
const SURVIVOR_RATING = survivorRatingTables as Record<string, CurvePoint[]>;

export type FortStats = {
  fortitude: number;
  resistance: number;
  offense: number;
  tech: number;
};

const EMPTY_FORT: FortStats = { fortitude: 0, resistance: 0, offense: 0, tech: 0 };

function sumFort(a: FortStats, b: FortStats): FortStats {
  return {
    fortitude: a.fortitude + b.fortitude,
    resistance: a.resistance + b.resistance,
    offense: a.offense + b.offense,
    tech: a.tech + b.tech
  };
}

export function fortTotal(stats: FortStats): number {
  return stats.fortitude + stats.resistance + stats.offense + stats.tech;
}

export function powerLevelFromFort(stats: FortStats): number {
  return evalCurve(HOMEBASE_RATING, fortTotal(stats) * 4);
}

const CAMPAIGN_FORT_STAT_IDS = {
  fortitude: 'stat:fortitude',
  resistance: 'stat:resistance',
  offense: 'stat:offense',
  tech: 'stat:technology'
} as const;

const VENTURE_FORT_STAT_IDS = {
  fortitude: 'stat:fortitude_phoenix',
  resistance: 'stat:resistance_phoenix',
  offense: 'stat:offense_phoenix',
  tech: 'stat:technology_phoenix'
} as const;

function fortStatQty(items: Record<string, ProfileItem>, templateId: string): number {
  let total = 0;
  for (const item of Object.values(items)) {
    if (item.templateId.toLowerCase() === templateId) total += item.quantity ?? 0;
  }
  return total;
}

/** Commander / ventures FORT from exact personal `Stat:` items (ignores party `team_*`, legacy `Stat:tech`). */
export function researchFortFromItems(
  items: Record<string, ProfileItem>,
  ventures = false
): FortStats {
  const ids = ventures ? VENTURE_FORT_STAT_IDS : CAMPAIGN_FORT_STAT_IDS;
  return {
    fortitude: fortStatQty(items, ids.fortitude),
    resistance: fortStatQty(items, ids.resistance),
    offense: fortStatQty(items, ids.offense),
    tech: fortStatQty(items, ids.tech)
  };
}

type ParsedSurvivor = {
  leader: boolean;
  rarity: string;
  tier: number;
  level: number;
  personality?: string;
  managerSynergy?: string;
  squad: { name: string; type: string; slotIdx: number } | null;
  powerLevel: number;
  leadBonus: number;
};

const LEAD_SYNERGY: Record<string, string> = {
  trainingteam: 'IsTrainer',
  fireteamalpha: 'IsSoldier',
  closeassaultsquad: 'IsMartialArtist',
  thethinktank: 'IsInventor',
  emtsquad: 'IsDoctor',
  corpsofengineering: 'IsEngineer',
  scoutingparty: 'IsExplorer',
  gadgeteers: 'IsGadgeteer'
};

function parseSurvivorTemplate(templateId: string) {
  const id = templateId.split(':')[1] ?? '';
  const fields = id.split('_');
  const rawType = fields.shift() ?? '';
  const leader = rawType.includes('manager');
  const type = rawType === 'worker' ? 'special' : leader ? 'manager' : 'basic';
  const tier = Number.parseInt((fields.pop() ?? 't01').slice(1), 10) || 1;
  const rarity = (leader ? fields.shift() : fields.pop()) ?? 'c';
  return { type, leader, rarity: rarity.toLowerCase(), tier };
}

function survivorBaseRating(leader: boolean, rarity: string, tier: number, level: number): number {
  const key = leader ? `manager_${rarity}_t0${tier}` : `default_${rarity}_t0${tier}`;
  const table = SURVIVOR_RATING[key];
  return table ? evalCurve(table, level) : 0;
}

function leadBonus(survivor: ParsedSurvivor): number {
  if (!survivor.managerSynergy || !survivor.squad) return 0;
  const match = survivor.managerSynergy.split('.')[2];
  return LEAD_SYNERGY[survivor.squad.name] === match ? survivor.powerLevel : 0;
}

function calcSurvivorBonus(survivor: ParsedSurvivor, leader: ParsedSurvivor): number {
  if (survivor.leader || !leader.leader) return 0;
  if (survivor.personality === leader.personality) {
    if (leader.rarity === 'sr') return 8;
    if (leader.rarity === 'vr') return 5;
    if (leader.rarity === 'r') return 4;
    if (leader.rarity === 'uc') return 3;
    if (leader.rarity === 'c') return 2;
  } else if (leader.rarity === 'sr') {
    return survivor.powerLevel <= 2 ? 0 : -2;
  }
  return 0;
}

function parseSlottedSurvivors(items: Record<string, ProfileItem>): ParsedSurvivor[] {
  const out: ParsedSurvivor[] = [];

  for (const item of Object.values(items)) {
    if (!item.templateId.startsWith('Worker:')) continue;
    const squadId = item.attributes?.squad_id as string | undefined;
    if (!squadId) continue;

    const parsed = parseSurvivorTemplate(item.templateId);
    const level = Number(item.attributes?.level) || 1;
    const powerLevel = survivorBaseRating(parsed.leader, parsed.rarity, parsed.tier, level);
    const parts = squadId.split('_');
    const survivor: ParsedSurvivor = {
      leader: parsed.leader,
      rarity: parsed.rarity,
      tier: parsed.tier,
      level,
      personality: item.attributes?.personality,
      managerSynergy: item.attributes?.managerSynergy,
      squad: {
        name: parts[3] ?? '',
        type: parts[2] ?? '',
        slotIdx: Number(item.attributes?.squad_slot_idx) || 0
      },
      powerLevel,
      leadBonus: 0
    };
    survivor.leadBonus = leadBonus(survivor);
    out.push(survivor);
  }

  return out;
}

export function survivorFortFromItems(items: Record<string, ProfileItem>): FortStats {
  const stats = { ...EMPTY_FORT };
  const slotted = parseSlottedSurvivors(items);
  const bySquad = new Map<string, ParsedSurvivor[]>();

  for (const s of slotted) {
    if (!s.squad) continue;
    const key = s.squad.name;
    const list = bySquad.get(key) ?? [];
    list.push(s);
    bySquad.set(key, list);
  }

  for (const squad of bySquad.values()) {
    const lead = squad.find((s) => s.squad?.slotIdx === 0);
    for (const survivor of squad) {
      let total = survivor.powerLevel;
      if (survivor.squad?.slotIdx === 0) total += survivor.leadBonus;
      else if (lead) total += calcSurvivorBonus(survivor, lead);

      switch (survivor.squad?.type) {
        case 'medicine':
          stats.fortitude += total;
          break;
        case 'arms':
          stats.offense += total;
          break;
        case 'synthesis':
          stats.tech += total;
          break;
        case 'scavenging':
          stats.resistance += total;
          break;
      }
    }
  }

  return stats;
}

export function campaignFortFromItems(items: Record<string, ProfileItem>): FortStats {
  return sumFort(survivorFortFromItems(items), researchFortFromItems(items, false));
}

export function campaignPowerLevel(items: Record<string, ProfileItem>): number {
  return powerLevelFromFort(campaignFortFromItems(items));
}
