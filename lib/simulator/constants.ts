import { ResourceType, TerritoryUpgrades, ResourceAmounts } from './types';

// Schema version for localStorage compatibility
export const SIM_STATE_VERSION = 1;

// --- Tower upgrade costs per level (cost to go FROM level N-1 TO level N) ---
// All 4 tower upgrades share the same cost progression
export const TOWER_UPGRADE_COSTS = [100, 300, 600, 1200, 2400, 4800, 7200, 9600, 13200, 18000, 22800];

// Bonus upgrade costs per level (aura, volley, stronger minions, multi-attack)
export const BONUS_UPGRADE_COSTS = [2000, 4000, 8000];

// Seeking upgrade costs per level
export const SEEKING_UPGRADE_COSTS = [2000, 4000, 8000];

// Storage/gathering upgrade costs per level
export const STORAGE_UPGRADE_COSTS = [2000, 4000, 8000];

// --- Which resource each upgrade costs ---
export const UPGRADE_RESOURCE: Record<keyof TerritoryUpgrades, ResourceType> = {
  damage: 'ore',
  attackSpeed: 'crops',
  health: 'wood',
  defense: 'fish',
  aura: 'crops',
  volley: 'ore',
  strongerMinions: 'wood',
  multiAttack: 'fish',
  xpSeeking: 'emeralds',
  tomeSeeking: 'fish',
  emeraldSeeking: 'wood',
  largerStorage: 'emeralds',
  efficientResources: 'emeralds',
  resourceRate: 'emeralds',
};

// --- Max levels ---
export const MAX_TOWER_LEVEL = 11;
export const MAX_BONUS_LEVEL = 3;
export const MAX_SEEKING_LEVEL = 3;
export const MAX_STORAGE_LEVEL = 3;

export const UPGRADE_MAX_LEVELS: Record<keyof TerritoryUpgrades, number> = {
  damage: MAX_TOWER_LEVEL,
  attackSpeed: MAX_TOWER_LEVEL,
  health: MAX_TOWER_LEVEL,
  defense: MAX_TOWER_LEVEL,
  aura: MAX_BONUS_LEVEL,
  volley: MAX_BONUS_LEVEL,
  strongerMinions: MAX_BONUS_LEVEL,
  multiAttack: MAX_BONUS_LEVEL,
  xpSeeking: MAX_SEEKING_LEVEL,
  tomeSeeking: MAX_SEEKING_LEVEL,
  emeraldSeeking: MAX_SEEKING_LEVEL,
  largerStorage: MAX_STORAGE_LEVEL,
  efficientResources: MAX_STORAGE_LEVEL,
  resourceRate: MAX_STORAGE_LEVEL,
};

// --- Get cost array for a given upgrade ---
export function getUpgradeCosts(upgrade: keyof TerritoryUpgrades): number[] {
  switch (upgrade) {
    case 'damage':
    case 'attackSpeed':
    case 'health':
    case 'defense':
      return TOWER_UPGRADE_COSTS;
    case 'aura':
    case 'volley':
    case 'strongerMinions':
    case 'multiAttack':
      return BONUS_UPGRADE_COSTS;
    case 'xpSeeking':
    case 'tomeSeeking':
    case 'emeraldSeeking':
      return SEEKING_UPGRADE_COSTS;
    case 'largerStorage':
    case 'efficientResources':
    case 'resourceRate':
      return STORAGE_UPGRADE_COSTS;
  }
}

// Get cost to upgrade from current level to next level (0-indexed: cost[0] = cost to go to level 1)
export function getNextLevelCost(upgrade: keyof TerritoryUpgrades, currentLevel: number): number | null {
  const costs = getUpgradeCosts(upgrade);
  if (currentLevel >= UPGRADE_MAX_LEVELS[upgrade]) return null;
  return costs[currentLevel]; // costs[0] = cost to reach level 1, costs[1] = cost to reach level 2, etc.
}

// --- HQ Storage ---
export const BASE_HQ_EMERALDS = 5000;
export const BASE_HQ_RESOURCES = 1500;
export const MAX_HQ_EMERALDS = 400000;
export const MAX_HQ_RESOURCES = 120000;

// Larger Storage bonus multipliers per level (percentage increase)
const LARGER_STORAGE_BONUS = [1.0, 2.0, 4.0]; // +100%, +200%, +400%

export function getHQStorageCap(largerStorageLevel: number): { maxEmeralds: number; maxResources: number } {
  // The HQ's own Larger Storage upgrade increases caps
  // For simplicity, we use the max across all territories' largerStorage levels
  const bonus = largerStorageLevel > 0 ? LARGER_STORAGE_BONUS[largerStorageLevel - 1] : 0;
  return {
    maxEmeralds: Math.min(BASE_HQ_EMERALDS * (1 + bonus), MAX_HQ_EMERALDS),
    maxResources: Math.min(BASE_HQ_RESOURCES * (1 + bonus), MAX_HQ_RESOURCES),
  };
}

// --- Attack costs ---
export function getAttackCost(currentOwnedCount: number): number {
  if (currentOwnedCount === 0) return 0;
  if (currentOwnedCount === 1) return 200;
  if (currentOwnedCount === 2) return 800;
  if (currentOwnedCount === 3) return 2000;
  return 4000;
}

// --- Efficient Resources bonus (reduces tax or increases production) ---
const EFFICIENT_RESOURCES_BONUS = [0.5, 1.0, 2.0]; // +50%, +100%, +200%

export function getEfficientResourcesMultiplier(level: number): number {
  if (level <= 0) return 1.0;
  return 1.0 + EFFICIENT_RESOURCES_BONUS[level - 1];
}

// --- Resource Rate (gather interval) ---
// Base gather rate: 4 seconds per unit, reduced by upgrade
const RESOURCE_RATE_INTERVALS = [4, 3, 2, 1]; // seconds per gather at level 0,1,2,3

export function getResourceRateMultiplier(level: number): number {
  // Higher level = faster gathering = more production per tick
  return RESOURCE_RATE_INTERVALS[0] / RESOURCE_RATE_INTERVALS[level];
}

// --- Tax per hop (default 5% per intermediate territory) ---
export const DEFAULT_TAX_PER_HOP = 0.05;

// --- Default upgrades (all zero) ---
export function createDefaultUpgrades(): TerritoryUpgrades {
  return {
    damage: 0,
    attackSpeed: 0,
    health: 0,
    defense: 0,
    aura: 0,
    volley: 0,
    strongerMinions: 0,
    multiAttack: 0,
    xpSeeking: 0,
    tomeSeeking: 0,
    emeraldSeeking: 0,
    largerStorage: 0,
    efficientResources: 0,
    resourceRate: 0,
  };
}

// --- Default resource amounts ---
export function createEmptyResources(): ResourceAmounts {
  return { emeralds: 0, ore: 0, wood: 0, fish: 0, crops: 0 };
}

// --- Resource display names ---
export const RESOURCE_NAMES: Record<ResourceType, string> = {
  emeralds: 'Emeralds',
  ore: 'Ore',
  wood: 'Wood',
  fish: 'Fish',
  crops: 'Crops',
};

// --- Resource colors ---
export const RESOURCE_COLORS: Record<ResourceType, string> = {
  emeralds: '#4CAF50',
  ore: '#B0BEC5',
  wood: '#8D6E63',
  fish: '#2196F3',
  crops: '#FFEB3B',
};

// --- Upgrade display names ---
export const UPGRADE_NAMES: Record<keyof TerritoryUpgrades, string> = {
  damage: 'Damage',
  attackSpeed: 'Attack Speed',
  health: 'Health',
  defense: 'Defense',
  aura: 'Tower Aura',
  volley: 'Tower Volley',
  strongerMinions: 'Stronger Minions',
  multiAttack: 'Multi-Attack',
  xpSeeking: 'XP Seeking',
  tomeSeeking: 'Tome Seeking',
  emeraldSeeking: 'Emerald Seeking',
  largerStorage: 'Larger Storage',
  efficientResources: 'Efficient Resources',
  resourceRate: 'Resource Rate',
};
