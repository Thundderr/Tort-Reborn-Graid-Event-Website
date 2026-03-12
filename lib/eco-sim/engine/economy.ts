// Resource production and storage management

import { SimulationState, SimTerritory, ResourceSet, RESOURCE_KEYS, ResourceKey } from './types';
import {
  EFFICIENT_RESOURCES_MULTIPLIERS,
  EFFICIENT_EMERALDS_MULTIPLIERS,
  RESOURCE_RATE_INTERVALS,
  EMERALD_RATE_INTERVALS,
  RESOURCE_STORAGE_VALUES,
  EMERALD_STORAGE_VALUES,
  getUpgradeCostPerHour,
} from '../data/upgrade-costs';

// Get storage capacity for a territory
export function getStorageCapacity(territory: SimTerritory): ResourceSet {
  return {
    emeralds: EMERALD_STORAGE_VALUES[territory.upgrades.emeraldStorage],
    ore: RESOURCE_STORAGE_VALUES[territory.upgrades.resourceStorage],
    crop: RESOURCE_STORAGE_VALUES[territory.upgrades.resourceStorage],
    wood: RESOURCE_STORAGE_VALUES[territory.upgrades.resourceStorage],
    fish: RESOURCE_STORAGE_VALUES[territory.upgrades.resourceStorage],
  };
}

// Get effective production per hour for a territory (base * multipliers from upgrades)
export function getEffectiveProduction(territory: SimTerritory): ResourceSet {
  const base = territory.baseProduction;
  const upgrades = territory.upgrades;

  // Emerald production: base * efficient_emeralds_multiplier * emerald_rate_multiplier
  const emeraldEfficiency = EFFICIENT_EMERALDS_MULTIPLIERS[upgrades.efficientEmeralds];
  const emeraldRateMultiplier = 4 / EMERALD_RATE_INTERVALS[upgrades.emeraldRate]; // faster ticks = more per hour

  // Resource production: base * efficient_resources_multiplier * resource_rate_multiplier
  const resourceEfficiency = EFFICIENT_RESOURCES_MULTIPLIERS[upgrades.efficientResources];
  const resourceRateMultiplier = 4 / RESOURCE_RATE_INTERVALS[upgrades.resourceRate];

  return {
    emeralds: base.emeralds * emeraldEfficiency * emeraldRateMultiplier,
    ore: base.ore * resourceEfficiency * resourceRateMultiplier,
    crop: base.crop * resourceEfficiency * resourceRateMultiplier,
    wood: base.wood * resourceEfficiency * resourceRateMultiplier,
    fish: base.fish * resourceEfficiency * resourceRateMultiplier,
  };
}

// Get net production (production minus upgrade costs) per hour
export function getNetProduction(territory: SimTerritory): ResourceSet {
  const production = getEffectiveProduction(territory);
  const costs = getUpgradeCostPerHour(territory.upgrades);

  return {
    emeralds: production.emeralds - costs.emeralds,
    ore: production.ore - costs.ore,
    crop: production.crop - costs.crop,
    wood: production.wood - costs.wood,
    fish: production.fish - costs.fish,
  };
}

// Process one economy tick (1 second of sim time) for all territories
// Adds production, subtracts upgrade costs, clamps to storage
export function processEconomyTick(state: SimulationState): void {
  for (const territory of Object.values(state.territories)) {
    if (!territory.owner) continue; // unclaimed territories don't produce

    const production = getEffectiveProduction(territory);
    const costs = getUpgradeCostPerHour(territory.upgrades);
    const capacity = getStorageCapacity(territory);

    // Per-second amounts (divide hourly by 3600)
    for (const key of RESOURCE_KEYS) {
      const produced = production[key] / 3600;
      const consumed = costs[key] / 3600;

      // Territory uses its own production first for upgrades
      // Net = produced - consumed
      const net = produced - consumed;

      territory.stored[key] += net;

      // Clamp to storage capacity
      territory.stored[key] = Math.min(territory.stored[key], capacity[key]);
      // Don't go below 0 - deficit tracking happens in distribution
      territory.stored[key] = Math.max(territory.stored[key], 0);
    }
  }
}

// Get total production across all territories for a guild
export function getGuildTotalProduction(state: SimulationState, guildName: string): ResourceSet {
  const total: ResourceSet = { emeralds: 0, ore: 0, crop: 0, wood: 0, fish: 0 };

  for (const territory of Object.values(state.territories)) {
    if (territory.owner !== guildName) continue;
    const prod = getEffectiveProduction(territory);
    for (const key of RESOURCE_KEYS) {
      total[key] += prod[key];
    }
  }

  return total;
}

// Get total upgrade costs across all territories for a guild
export function getGuildTotalCosts(state: SimulationState, guildName: string): ResourceSet {
  const total: ResourceSet = { emeralds: 0, ore: 0, crop: 0, wood: 0, fish: 0 };

  for (const territory of Object.values(state.territories)) {
    if (territory.owner !== guildName) continue;
    const costs = getUpgradeCostPerHour(territory.upgrades);
    for (const key of RESOURCE_KEYS) {
      total[key] += costs[key];
    }
  }

  return total;
}

// Get total stored resources across all territories for a guild
export function getGuildTotalStored(state: SimulationState, guildName: string): ResourceSet {
  const total: ResourceSet = { emeralds: 0, ore: 0, crop: 0, wood: 0, fish: 0 };

  for (const territory of Object.values(state.territories)) {
    if (territory.owner !== guildName) continue;
    for (const key of RESOURCE_KEYS) {
      total[key] += territory.stored[key];
    }
  }

  return total;
}

// Check if a territory's upgrades are self-sufficient (met by own production)
export function isSelfSufficient(territory: SimTerritory): boolean {
  const production = getEffectiveProduction(territory);
  const costs = getUpgradeCostPerHour(territory.upgrades);

  for (const key of RESOURCE_KEYS) {
    if (costs[key] > production[key]) return false;
  }
  return true;
}

// Get the cost percentage for each resource (cost / production * 100)
export function getCostPercentages(state: SimulationState, guildName: string): ResourceSet {
  const prod = getGuildTotalProduction(state, guildName);
  const costs = getGuildTotalCosts(state, guildName);

  const result: ResourceSet = { emeralds: 0, ore: 0, crop: 0, wood: 0, fish: 0 };
  for (const key of RESOURCE_KEYS) {
    result[key] = prod[key] > 0 ? (costs[key] / prod[key]) * 100 : (costs[key] > 0 ? Infinity : 0);
  }
  return result;
}
