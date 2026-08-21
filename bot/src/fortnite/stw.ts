import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AccountData } from '@/fortnite/clients';
import type { QueryProfile } from '@/fortnite/mcp';
import { REPO_ROOT } from '@/paths';

export type StwResourceRow = {
  templateId: string;
  name: string;
  quantity: number;
  imageUrl: string;
  imageUrls: string[];
  rarity: string;
};

type ResourceCatalog = Record<string, { name: string; type: string }>;

const catalog = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'src/lib/data/resources.json'), 'utf8')
) as ResourceCatalog;

const RARITY_TOKEN: Record<string, string> = {
  ur: 'mythic',
  sr: 'legendary',
  vr: 'epic',
  r: 'rare',
  uc: 'uncommon',
  c: 'common'
};

function rarityFromTemplate(templateId: string): string {
  const match = templateId.match(/_(ur|sr|vr|uc|c|r)(?:_|$)/i);
  return RARITY_TOKEN[match?.[1]?.toLowerCase() ?? ''] ?? 'common';
}

function resourceId(templateId: string) {
  return templateId.includes(':') ? templateId.slice(templateId.indexOf(':') + 1) : templateId;
}

function displayName(id: string) {
  const exact = catalog[id];
  if (exact) return exact.name;
  const key = Object.keys(catalog)
    .sort((a, b) => b.length - a.length)
    .find((k) => id.toLowerCase().includes(k.toLowerCase()));
  return key ? catalog[key]!.name : id.replace(/[_-]+/g, ' ');
}

function iconCandidates(id: string): string[] {
  const isEvent =
    id.startsWith('eventcurrency_') || id === 'campaign_event_currency' || id === 'eventcurrency_scaling';
  return [`${isEvent ? '/currency' : '/resources'}/${id}.png`];
}

const WIKI_FILE: Record<string, string> = {
  'Hero XP': 'Hero XP - Icon - Fortnite.png',
  'Schematic XP': 'Schematic XP - Icon - Fortnite.png',
  'Survivor XP': 'Survivor XP - Icon - Fortnite.png',
  'Gold': 'Gold - Icon - Fortnite.png',
  'V-Bucks': 'V-Bucks - Icon - Fortnite.png',
  'Pure Drop of Rain': 'Pure Drop of Rain - Icon - Fortnite.png',
  'Lightning in a Bottle': 'Lightning in a Bottle - Icon - Fortnite.png',
  'Eye of the Storm': 'Eye of the Storm - Icon - Fortnite.png',
  'Storm Shard': 'Storm Shard - Icon - Fortnite.png',
  'Legendary Flux': 'Legendary Flux - Resource - Fortnite.png',
  'Epic Flux': 'Epic Flux - Resource - Fortnite.png',
  'Rare Flux': 'Rare Flux - Resource - Fortnite.png',
  'RE-PERK!': 'RE-PERK! - Resource - Fortnite.png',
  'Core RE-PERK!': 'Core RE-PERK! - Resource - Fortnite.png',
  'FIRE-UP!': 'FIRE-UP! - Resource - Fortnite.png',
  'AMP-UP!': 'AMP-UP! - Resource - Fortnite.png',
  'FROST-UP!': 'FROST-UP! - Resource - Fortnite.png',
  'Hero Supercharger': 'Hero Supercharger - Resource - Fortnite.png',
  'Survivor Supercharger': 'Survivor Supercharger - Resource - Fortnite.png',
  'Trap Supercharger': 'Trap Supercharger - Resource - Fortnite.png',
  'Weapon Supercharger': 'Weapon Supercharger - Resource - Fortnite.png',
  'Uncommon PERK-UP!': 'Uncommon PERK-UP! - Resource - Fortnite.png',
  'Rare PERK-UP!': 'Rare PERK-UP! - Resource - Fortnite.png',
  'Epic PERK-UP!': 'Epic PERK-UP! - Resource - Fortnite.png',
  'Legendary PERK-UP!': 'Legendary PERK-UP! - Resource - Fortnite.png',
  'Training Manual': 'Training Manuals - Icon - Fortnite.png',
  'Road Trip Tickets': 'Road Trip Tickets - Resource - Save the World.png',
  'Pirate Tickets': 'Adventure Tickets - Icon - Fortnite.png'
};

const wikiUrlCache = new Map<string, string | null>();

function wikiTitlesFor(name: string): string[] {
  const known = WIKI_FILE[name];
  const files = known
    ? [known]
    : [
        `${name} - Icon - Fortnite.png`,
        `${name} - Resource - Fortnite.png`,
        `${name} - Resource - Save the World.png`
      ];
  return files.map((file) => `File:${file}`);
}

async function resolveWikiIconUrls(names: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(names)].filter((name) => !wikiUrlCache.has(name));
  const titles = unique.flatMap(wikiTitlesFor);
  const byTitle = new Map<string, string>();

  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const url = new URL('https://fortnite.fandom.com/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url');
    url.searchParams.set('format', 'json');
    url.searchParams.set('titles', chunk.join('|'));
    const res = await fetch(url, { headers: { 'User-Agent': 'DozamigosDiscordBot/0.1.0' } });
    if (!res.ok) continue;
    const data = (await res.json()) as {
      query?: {
        normalized?: { from: string; to: string }[];
        pages?: Record<string, { title: string; imageinfo?: { url: string }[] }>;
      };
    };
    const canon = new Map<string, string>(data.query?.normalized?.map((n) => [n.from, n.to]) ?? []);
    const urls = new Map<string, string>();
    for (const page of Object.values(data.query?.pages ?? {})) {
      const src = page.imageinfo?.[0]?.url;
      if (src) urls.set(page.title, src);
    }
    for (const title of chunk) {
      const src = urls.get(canon.get(title) ?? title);
      if (src) byTitle.set(title, src);
    }
  }

  for (const name of unique) {
    const src = wikiTitlesFor(name).map((title) => byTitle.get(title)).find(Boolean) ?? null;
    wikiUrlCache.set(name, src);
  }

  const out = new Map<string, string>();
  for (const name of names) {
    const src = wikiUrlCache.get(name);
    if (src) out.set(name, src);
  }
  return out;
}

export function parseStwResources(campaign: QueryProfile<'campaign'>): StwResourceRow[] {
  const rows: StwResourceRow[] = [];
  for (const item of Object.values(campaign.profileChanges[0]!.profile.items)) {
    if (!item.templateId.startsWith('AccountResource:') || (item.quantity ?? 0) < 1) continue;
    const id = resourceId(item.templateId);
    const urls = iconCandidates(id);
    rows.push({
      templateId: item.templateId,
      name: displayName(id),
      quantity: item.quantity ?? 0,
      imageUrl: urls[0]!,
      imageUrls: urls,
      rarity: rarityFromTemplate(item.templateId)
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || b.quantity - a.quantity);
}

export async function fetchStwResources(account: AccountData) {
  const { queryProfile } = await import('@/fortnite/mcp');
  const campaign = await queryProfile(account, 'campaign');
  const resources = parseStwResources(campaign);
  const wiki = await resolveWikiIconUrls(resources.map((r) => r.name));
  return {
    resources: resources.map((r) => {
      const extra = wiki.get(r.name);
      return extra ? { ...r, imageUrls: [...r.imageUrls, extra] } : r;
    })
  };
}

export type StwQuestEntry = {
  id: string;
  templateId: string;
  state: string;
  bucket: 'daily' | 'save' | 'other';
};

const DAILY_RE = /quest_.*daily|daily_/i;
const SAVE_RE = /outpost|stormshield|ssd|homebase/i;

export function parseCampaignQuests(items: Record<string, { templateId: string; attributes?: Record<string, unknown> }>) {
  const quests: StwQuestEntry[] = [];
  for (const [id, item] of Object.entries(items)) {
    if (!item.templateId.startsWith('Quest:')) continue;
    const bucket: StwQuestEntry['bucket'] = DAILY_RE.test(item.templateId)
      ? 'daily'
      : SAVE_RE.test(item.templateId)
        ? 'save'
        : 'other';
    quests.push({
      id,
      templateId: item.templateId,
      state: String(item.attributes?.quest_state ?? 'Unknown'),
      bucket
    });
  }
  return quests;
}

export async function fetchStwQuests(account: AccountData) {
  const { clientQuestLogin } = await import('@/fortnite/mcp');
  const profile = await clientQuestLogin(account, 'campaign');
  return parseCampaignQuests(profile.profileChanges[0]!.profile.items);
}

export async function claimCompletedQuests(account: AccountData, questIds: string[]) {
  const { composeMCP } = await import('@/fortnite/mcp');
  let claimed = 0;
  for (const questId of questIds) {
    await composeMCP(account, 'ClaimQuestReward', 'campaign', { questId, selectedRewardIndex: 0 });
    claimed++;
  }
  return claimed;
}

export async function fetchFreeLlamas(account: AccountData) {
  const { composeMCP } = await import('@/fortnite/mcp');
  const result = await composeMCP<{
    profileChanges: { profile: { items: Record<string, { templateId: string }> } }[];
  }>(account, 'PopulatePrerolledOffers', 'campaign', {});
  return Object.entries(result.profileChanges[0]!.profile.items)
    .filter(([, item]) => item.templateId.startsWith('CardPack:'))
    .map(([id, item]) => ({ id, templateId: item.templateId }));
}

export async function openLlamas(account: AccountData, ids: string[]) {
  if (!ids.length) return;
  const { composeMCP } = await import('@/fortnite/mcp');
  await composeMCP(account, 'OpenCardPackBatch', 'campaign', { cardPackItemIds: ids });
}

const THEATERS = {
  Stonewood: '33A2311D4AE64B361CCE27BC9F313C8B',
  Plankerton: 'D477605B4FA48648107B649CE97FCF27',
  CannyValley: 'E6ECBD064B153234656CB4BDE6743870',
  TwinePeaks: 'D9A801C5444D1C74D1B7DAB5C7C12C5B'
} as const;

const POWER: Record<string, Record<string, number>> = {
  [THEATERS.Stonewood]: {
    Start_Zone1: 1,
    Start_Zone2: 3,
    Start_Zone3: 5,
    Start_Zone4: 9,
    Start_Zone5: 15,
    Normal_Zone1: 19
  },
  [THEATERS.Plankerton]: {
    Normal_Zone1: 19,
    Normal_Zone2: 23,
    Normal_Zone3: 28,
    Normal_Zone4: 34,
    Normal_Zone5: 40,
    Hard_Zone1: 46
  },
  [THEATERS.CannyValley]: {
    Hard_Zone1: 46,
    Hard_Zone2: 52,
    Hard_Zone3: 58,
    Hard_Zone4: 64,
    Hard_Zone5: 70
  },
  [THEATERS.TwinePeaks]: {
    Nightmare_Zone1: 76,
    Nightmare_Zone2: 82,
    Nightmare_Zone3: 88,
    Nightmare_Zone4: 94,
    Nightmare_Zone5: 100,
    Endgame_Zone1: 108,
    Endgame_Zone2: 116,
    Endgame_Zone3: 124,
    Endgame_Zone4: 132,
    Endgame_Zone5: 140,
    Endgame_Zone6: 160
  },
  Ventures: {
    Phoenix_Zone02: 3,
    Phoenix_Zone03: 5,
    Phoenix_Zone05: 15,
    Phoenix_Zone07: 23,
    Phoenix_Zone09: 34,
    Phoenix_Zone11: 46,
    Phoenix_Zone13: 58,
    Phoenix_Zone15: 70,
    Phoenix_Zone17: 82,
    Phoenix_Zone19: 94,
    Phoenix_Zone21: 108,
    Phoenix_Zone23: 124,
    Phoenix_Zone25: 140
  }
};

const MISSION_PATTERNS: [string, string][] = [
  ['3Gates', 'fightCategory3Storm'],
  ['2Gates', 'fightCategory2Storm'],
  ['4Gates', 'fightCategory4Storm'],
  ['Cat1FtS', 'fightTheStorm'],
  ['GateSingle', 'fightTheStorm'],
  ['1Gate', 'fightTheStorm'],
  ['DestroyTheEncampments', 'destroyTheEncampments'],
  ['DtE', 'destroyTheEncampments'],
  ['RetrieveTheData', 'retrieveTheData'],
  ['RtD', 'retrieveTheData'],
  ['RideTheLightning', 'rideTheLightning'],
  ['RtL', 'rideTheLightning'],
  ['LaunchTheBalloon', 'rideTheLightning'],
  ['LtB', 'rideTheLightning'],
  ['EvacuateTheSurvivors', 'evacuateTheShelter'],
  ['EtShelter', 'evacuateTheShelter'],
  ['EtS_C', 'evacuateTheShelter'],
  ['EtSurvivors', 'rescueTheSurvivors'],
  ['DtB', 'deliverTheBomb'],
  ['BuildtheRadarGrid', 'buildTheRadarGrid'],
  ['Resupply', 'resupply'],
  ['LtR', 'launchTheRocket'],
  ['PowerTheStormShield', 'repairTheShelter'],
  ['RtS', 'repairTheShelter'],
  ['SurviveTheNight', 'surviveTheStorm'],
  ['TrapTheStorm', 'trapTheStorm'],
  ['Outpost', 'homebaseStormShield'],
  ['DUDEBRO', 'fightCategory4Storm'],
  ['HitTheRoad', 'hitTheRoad'],
  ['RefuelTheBase', 'refuelTheHomebase'],
  ['EliminateAndCollect', 'eliminateAndCollect'],
  ['HTM_C', 'huntTheTitan']
];

type LocaleNames = Record<string, { names: Record<string, string> }>;
const theatersCatalog = JSON.parse(readFileSync(resolve(REPO_ROOT, 'src/lib/data/theaters.json'), 'utf8')) as LocaleNames;
const missionsCatalog = JSON.parse(readFileSync(resolve(REPO_ROOT, 'src/lib/data/missions.json'), 'utf8')) as LocaleNames;
const zoneThemes = JSON.parse(readFileSync(resolve(REPO_ROOT, 'src/lib/data/zone-themes.json'), 'utf8')) as LocaleNames;

type RewardItem = { itemType: string; quantity: number };
type WorldInfo = {
  theaters?: {
    uniqueId: string;
    displayName?: Record<string, string>;
    tiles?: { zoneTheme?: string }[];
    regions?: {
      uniqueId: string;
      tileIndices: number[];
      missionData?: { difficultyWeights?: { difficultyInfo?: { rowName?: string } }[] };
    }[];
  }[];
  missions?: {
    theaterId: string;
    availableMissions?: { tileIndex: number; missionGenerator: string; missionRewards?: { items?: RewardItem[] } }[];
  }[];
  missionAlerts?: {
    theaterId: string;
    availableMissionAlerts?: { tileIndex: number; missionAlertRewards?: { items?: RewardItem[] } }[];
  }[];
};

export type VbucksAlert = {
  powerLevel: number;
  zone: string;
  theater: string;
  mission: string;
  vbucks: number;
};

function localeName(entry: { names: Record<string, string> } | undefined, fallback: string) {
  return entry?.names['pt-br'] || entry?.names.en || fallback;
}

function isMtx(itemType: string) {
  return /currency_mtxswap|voucher_cardpack_mtx|currency_mtx/i.test(itemType);
}

function mtxQty(items: RewardItem[] | undefined) {
  return (items ?? []).reduce((sum, item) => (isMtx(item.itemType) ? sum + item.quantity : sum), 0);
}

function zoneKey(theme: string) {
  const last = theme.split(/[/.]/).pop() ?? theme;
  return last.toLowerCase();
}

function missionName(generator: string) {
  const key = MISSION_PATTERNS.find(([pattern]) => generator.includes(pattern))?.[1];
  if (key) return localeName(missionsCatalog[key], key);
  const raw = generator.match(/MissionGen_([A-Za-z0-9_]+)/)?.[1] ?? generator;
  return raw.replace(/_Group.*$/i, '').replace(/_/g, ' ');
}

function regionZone(theaterId: string, rowName: string) {
  let zone = rowName.replace('Theater_', '').replace('_Group', '');
  if (zone === 'Hard_Zone5_Dudebro') zone = 'Hard_Zone5';
  if (zone === 'Nightmare_Zone10_Dudebro') zone = 'Endgame_Zone5';
  return POWER[theaterId]?.[zone] ?? POWER.Ventures?.[zone] ?? -1;
}

export function parseVbucksAlerts(data: WorldInfo): VbucksAlert[] {
  const alerts: VbucksAlert[] = [];
  for (const theater of data.theaters ?? []) {
    const missions = data.missions?.find((m) => m.theaterId === theater.uniqueId);
    const theaterAlerts = data.missionAlerts?.find((m) => m.theaterId === theater.uniqueId);
    if (!missions?.availableMissions?.length || !theaterAlerts?.availableMissionAlerts?.length) continue;

    const theaterName =
      localeName(theatersCatalog[theater.uniqueId], theater.displayName?.['pt-BR'] || theater.displayName?.en || theater.uniqueId);

    for (const alert of theaterAlerts.availableMissionAlerts) {
      const vbucks = mtxQty(alert.missionAlertRewards?.items);
      if (!vbucks) continue;
      const mission = missions.availableMissions.find((m) => m.tileIndex === alert.tileIndex);
      if (!mission) continue;

      const region = theater.regions?.find((r) => {
        if (r.uniqueId === 'mission' || r.uniqueId === 'outpost') return false;
        return r.tileIndices.includes(mission.tileIndex) && !!r.missionData?.difficultyWeights?.[0]?.difficultyInfo?.rowName;
      });
      const rowName = region?.missionData?.difficultyWeights?.[0]?.difficultyInfo?.rowName ?? '';
      const tile = theater.tiles?.[mission.tileIndex];
      const themeKey = zoneKey(tile?.zoneTheme ?? '');
      alerts.push({
        powerLevel: rowName ? regionZone(theater.uniqueId, rowName) : -1,
        zone: localeName(zoneThemes[themeKey], themeKey || 'Zona'),
        theater: theaterName,
        mission: missionName(mission.missionGenerator),
        vbucks
      });
    }
  }

  return alerts.sort((a, b) => b.powerLevel - a.powerLevel || b.vbucks - a.vbucks);
}

export async function fetchVbucksAlerts(account: AccountData) {
  const { authed } = await import('@/fortnite/auth');
  const { baseGameService } = await import('@/fortnite/http');
  const data = await authed(account, baseGameService).get('world/info').json<WorldInfo>();
  const alerts = parseVbucksAlerts(data);
  return { alerts, totalVbucks: alerts.reduce((sum, a) => sum + a.vbucks, 0) };
}
