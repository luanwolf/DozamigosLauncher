import dailyQuestsJson from '$lib/data/daily-quests.json';
import gadgetsJson from '$lib/data/gadgets.json';
import heroesJson from '$lib/data/heroes.json';
import ingredientsJson from '$lib/data/ingredients.json';
import missionsJson from '$lib/data/missions.json';
import resourcesJson from '$lib/data/resources.json';
import survivorsMythicLeadsJson from '$lib/data/survivors-mythic-leads.json';
import survivorsJson from '$lib/data/survivors.json';
import teamPerksJson from '$lib/data/team-perks.json';
import theatersJson from '$lib/data/theaters.json';
import trapsJson from '$lib/data/traps.json';
import zoneThemesJson from '$lib/data/zone-themes.json';
import type {
  DailyQuestData,
  GadgetData,
  HeroData,
  IngredientData,
  MissionData,
  Resource,
  SurvivorData,
  SurvivorUniqueLeadData,
  TeamPerkData,
  TheaterData,
  TrapData,
  ZoneThemeData
} from '$types/game/stw/resources';

export const resources = resourcesJson as Record<string, Resource>;
export const survivors = survivorsJson as Record<string, SurvivorData>;
export const survivorsMythicLeads = survivorsMythicLeadsJson as Record<string, SurvivorUniqueLeadData>;
export const ingredients = ingredientsJson as Record<string, IngredientData>;
export const traps = trapsJson as Record<string, TrapData>;
export const dailyQuests = dailyQuestsJson as Record<string, DailyQuestData>;
export const teamPerks = teamPerksJson as Record<string, TeamPerkData>;
export const gadgets = gadgetsJson as Record<string, GadgetData>;
export const heroes = heroesJson as Record<string, HeroData>;
export const zoneThemes = zoneThemesJson as Record<string, ZoneThemeData>;
export const theaters = theatersJson as Record<string, TheaterData>;
export const missions = missionsJson as Record<string, MissionData>;
