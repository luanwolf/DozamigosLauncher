/** STW world-info constants (from launcher). */
export const Theaters = {
  Stonewood: '33A2311D4AE64B361CCE27BC9F313C8B',
  Plankerton: 'D477605B4FA48648107B649CE97FCF27',
  CannyValley: 'E6ECBD064B153234656CB4BDE6743870',
  TwinePeaks: 'D9A801C5444D1C74D1B7DAB5C7C12C5B'
} as const;

export const TheaterColors: Record<string, string> = {
  [Theaters.Stonewood]: '#4CAF50',
  [Theaters.Plankerton]: '#E67E22',
  [Theaters.CannyValley]: '#E4B169',
  [Theaters.TwinePeaks]: '#E74C3C',
  Ventures: '#3CD8E3'
};

export const TheaterLetters: Record<string, string> = {
  [Theaters.Stonewood]: 'S',
  [Theaters.Plankerton]: 'P',
  [Theaters.CannyValley]: 'C',
  [Theaters.TwinePeaks]: 'T',
  Ventures: 'V'
};

export const TheaterStormKingZones = {
  [Theaters.CannyValley]: 'Hard_Zone5_Dudebro',
  [Theaters.TwinePeaks]: 'Nightmare_Zone10_Dudebro'
} as const;

export const TheaterPowerLevels: Record<string, Record<string, number>> = {
  [Theaters.Stonewood]: {
    Start_Zone1: 1, Start_Zone2: 3, Start_Zone3: 5, Start_Zone4: 9, Start_Zone5: 15, Normal_Zone1: 19
  },
  [Theaters.Plankerton]: {
    Normal_Zone1: 19, Normal_Zone2: 23, Normal_Zone3: 28, Normal_Zone4: 34, Normal_Zone5: 40, Hard_Zone1: 46
  },
  [Theaters.CannyValley]: {
    Hard_Zone1: 46, Hard_Zone2: 52, Hard_Zone3: 58, Hard_Zone4: 64, Hard_Zone5: 70
  },
  [Theaters.TwinePeaks]: {
    Nightmare_Zone1: 76, Nightmare_Zone2: 82, Nightmare_Zone3: 88, Nightmare_Zone4: 94, Nightmare_Zone5: 100,
    Endgame_Zone1: 108, Endgame_Zone2: 116, Endgame_Zone3: 124, Endgame_Zone4: 132, Endgame_Zone5: 140,
    Endgame_Zone6: 160
  },
  Ventures: {
    Phoenix_Zone02: 3, Phoenix_Zone03: 5, Phoenix_Zone05: 15, Phoenix_Zone07: 23, Phoenix_Zone09: 34,
    Phoenix_Zone11: 46, Phoenix_Zone13: 58, Phoenix_Zone15: 70, Phoenix_Zone17: 82, Phoenix_Zone19: 94,
    Phoenix_Zone21: 108, Phoenix_Zone23: 124, Phoenix_Zone25: 140
  }
};

export const ZoneCategories = {
  quest: ['1stTrapTheStorm', 'BuildOff', 'Day1_C', 'DeployTheProbe', 'DtM', 'FightTheGunslinger', 'Kidnapped', 'Landmark', 'PtS', 'StabilizeTheRift', 'StC', 'TestTheSuit', 'VindermanMansion'],
  atlas: ['1Gate', 'Cat1FtS', 'GateSingle'],
  'atlas-c2': ['2Gates'],
  'atlas-c3': ['3Gates'],
  'atlas-c4': ['4Gates'],
  dtb: ['DtB'],
  dte: ['DestroyTheEncampments', 'DtE'],
  eac: ['EliminateAndCollect'],
  ets: ['EtS_C', 'EtShelter', 'EvacuateTheSurvivors'],
  'mini-boss': ['DUDEBRO'],
  htm: ['HTM_C'],
  htr: ['HitTheRoad', 'Mayday'],
  ptp: ['ProtectThePresents'],
  radar: ['BuildtheRadarGrid'],
  refuel: ['RefuelTheBase'],
  rescue: ['EtSurvivors'],
  resupply: ['Resupply'],
  rocket: ['LtR'],
  rtd: ['RetrieveTheData', 'RtD'],
  rtl: ['LaunchTheBalloon', 'LtB', 'RideTheLightning', 'RtL'],
  rts: ['PowerTheStormShield', 'RtS'],
  stn: ['SurviveTheNight'],
  'storm-shield': ['Outpost'],
  tts: ['TrapTheStorm'],
  'yarrr-island': ['MissionGen_Yarrr_Island'],
  'walk-plank': ['MissionGen_Yarrr_WalkthePlank', 'WalkthePlank'],
  'adventure-revenge': ['MissionGen_AdventureRevenge', 'AdventureRevenge'],
  horde: ['MissionGen_HordeV3'],
  onboarding: ['Onboarding_Fort'],
  hestia: ['HestiaBeauty']
} as const;

export type ZoneCategoryId = keyof typeof ZoneCategories;

export const ZoneCategoriesWithoutIcon = new Set<ZoneCategoryId>([
  'quest', 'yarrr-island', 'walk-plank', 'adventure-revenge', 'onboarding', 'hestia'
]);

export const GroupZones: ZoneCategoryId[] = [
  'atlas', 'atlas-c2', 'atlas-c3', 'atlas-c4', 'dtb', 'ets', 'rtd', 'rtl', 'rts'
];

export const DefaultMissionZoneIcon = 'world/quest.png';

export const ZoneModifiers: Record<string, string> = {
  FireStorm: 'elementalzonefireenableitem',
  NatureStorm: 'elementalzonenatureenableitem',
  IceStorm: 'elementalzonewaterenableitem',
  ExplodingDeathbomb: 'gm_basehusk_ondeath_explode',
  MetalCorrosion: 'gm_basehusk_ondmgdealt_metalcorrosion',
  EpicMiniBoss: 'minibossenableprimarymissionitem',
  WallWeakening: 'gm_enemy_onhitweakenbuildings',
  SlowingAttacks: 'gm_enemy_ondmgdealt_slowdownfoe',
  AcidPools: 'gm_enemy_ondeath_spawndamagepool'
};

export const Rarities = { Common: 'c', Uncommon: 'uc', Rare: 'r', Epic: 'vr', Legendary: 'sr', Mythic: 'ur' } as const;
export type RarityType = (typeof Rarities)[keyof typeof Rarities];

export const RarityNamesPt: Record<RarityType, string> = {
  c: 'Comum', uc: 'Incomum', r: 'Raro', vr: 'Épico', sr: 'Lendário', ur: 'Mítico'
};
