// Create and mutate simulation state

import { SimulationState, SimTerritory, SimSetupConfig, EMPTY_RESOURCES, ResourceSet } from './types';
import { TerritoryData } from '../data/territories';
import { DEFAULT_UPGRADES, EMERALD_STORAGE_VALUES, RESOURCE_STORAGE_VALUES } from '../data/upgrade-costs';
import { DEFAULT_ALLY_TAX, DEFAULT_ENEMY_TAX, BASE_EMERALD_STORAGE, BASE_RESOURCE_STORAGE } from '../data/constants';

export function createSimTerritory(
  data: TerritoryData,
  owner: string,
  isHQ: boolean,
): SimTerritory {
  return {
    name: data.name,
    owner,
    hq: isHQ,
    stored: {
      emeralds: isHQ ? 5000 : 0,
      ore: 0,
      crop: 0,
      wood: 0,
      fish: 0,
    },
    baseProduction: { ...data.baseProduction },
    upgrades: { ...DEFAULT_UPGRADES },
    tradingRoutes: [...data.tradingRoutes],
    location: data.location,
    acquiredAt: 0,
    pityTimerUntil: 0,
    borderStyle: 'open',
    tradeStyle: 'cheapest',
    allyTax: DEFAULT_ALLY_TAX,
    enemyTax: DEFAULT_ENEMY_TAX,
    treasuryLevel: 0,
  };
}

export function createInitialState(
  config: SimSetupConfig,
  allTerritoryData: Record<string, TerritoryData>,
): SimulationState {
  const territories: Record<string, SimTerritory> = {};

  // Initialize all territories as unclaimed first
  for (const [name, data] of Object.entries(allTerritoryData)) {
    territories[name] = createSimTerritory(data, '', false);
  }

  // Assign player territories
  for (const tName of config.playerGuild.territories) {
    if (territories[tName]) {
      territories[tName].owner = config.playerGuild.name;
      if (tName === config.playerGuild.hq) {
        territories[tName].hq = true;
        territories[tName].stored.emeralds = 15000;
        territories[tName].upgrades.emeraldStorage = 3; // 24,000 capacity
      }
    }
  }

  // Assign AI territories
  for (const tName of config.aiGuild.territories) {
    if (territories[tName]) {
      territories[tName].owner = config.aiGuild.name;
      if (tName === config.aiGuild.hq) {
        territories[tName].hq = true;
        territories[tName].stored.emeralds = 15000;
        territories[tName].upgrades.emeraldStorage = 3; // 24,000 capacity
      }
    }
  }

  return {
    simTimeMs: 0,
    speed: config.speed,
    paused: true,
    territories,
    guilds: {
      [config.playerGuild.name]: {
        name: config.playerGuild.name,
        prefix: config.playerGuild.prefix,
        color: config.playerGuild.color,
        allies: config.allies,
        hqTerritory: config.playerGuild.hq,
        isAI: false,
        aiRole: null,
        aiDifficulty: 'medium',
      },
      [config.aiGuild.name]: {
        name: config.aiGuild.name,
        prefix: config.aiGuild.prefix,
        color: config.aiGuild.color,
        allies: [],
        hqTerritory: config.aiGuild.hq,
        isAI: true,
        aiRole: config.aiGuild.role,
        aiDifficulty: config.aiGuild.difficulty,
      },
    },
    attacks: [],
    eventLog: [],
    nextEventId: 1,
    accFastTick: 0,
    accEconomyTick: 0,
    accDistributionTick: 0,
  };
}

// Helper: get all territories owned by a guild
export function getGuildTerritories(state: SimulationState, guildName: string): SimTerritory[] {
  return Object.values(state.territories).filter(t => t.owner === guildName);
}

// Helper: get HQ territory for a guild
export function getGuildHQ(state: SimulationState, guildName: string): SimTerritory | null {
  const guild = state.guilds[guildName];
  if (!guild?.hqTerritory) return null;
  return state.territories[guild.hqTerritory] || null;
}

// Helper: count territories owned by guild
export function countGuildTerritories(state: SimulationState, guildName: string): number {
  return Object.values(state.territories).filter(t => t.owner === guildName).length;
}

// Helper: get storage capacity for a territory
export function getStorageCapacity(territory: SimTerritory): ResourceSet {
  return {
    emeralds: EMERALD_STORAGE_VALUES[territory.upgrades.emeraldStorage],
    ore: RESOURCE_STORAGE_VALUES[territory.upgrades.resourceStorage],
    crop: RESOURCE_STORAGE_VALUES[territory.upgrades.resourceStorage],
    wood: RESOURCE_STORAGE_VALUES[territory.upgrades.resourceStorage],
    fish: RESOURCE_STORAGE_VALUES[territory.upgrades.resourceStorage],
  };
}

// Helper: clamp stored resources to storage capacity
export function clampStorage(territory: SimTerritory): void {
  const capacity = getStorageCapacity(territory);
  for (const key of ['emeralds', 'ore', 'crop', 'wood', 'fish'] as const) {
    territory.stored[key] = Math.min(territory.stored[key], capacity[key]);
    territory.stored[key] = Math.max(territory.stored[key], 0);
  }
}

// Helper: add event to log
export function addEvent(state: SimulationState, type: SimulationState['eventLog'][0]['type'], guild: string, message: string, territory?: string, details?: Record<string, unknown>): void {
  state.eventLog.push({
    id: state.nextEventId++,
    timestamp: state.simTimeMs,
    type,
    guild,
    territory,
    message,
    details,
  });
  // Keep log manageable
  if (state.eventLog.length > 500) {
    state.eventLog = state.eventLog.slice(-300);
  }
}
