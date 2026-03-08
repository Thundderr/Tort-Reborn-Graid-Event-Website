import { SimulatorState, ResourceAmounts, ResourceType } from './types';
import { TerritoryVerboseData } from '@/lib/connection-calculator';
import { buildAdjacencyMap, findRouteToHQ } from './routing';
import {
  DEFAULT_TAX_PER_HOP,
  getEfficientResourcesMultiplier,
  getResourceRateMultiplier,
} from './constants';

/**
 * Parse resource production from verbose data.
 * Verbose data stores amounts as strings (e.g., "9000") representing per-hour rates.
 * Returns per-tick amounts (divide by 60 since 1 tick = 1 minute).
 */
function getProductionPerTick(
  territoryName: string,
  verboseData: Record<string, TerritoryVerboseData>
): ResourceAmounts {
  const data = verboseData[territoryName];
  if (!data?.resources) return { emeralds: 0, ore: 0, wood: 0, fish: 0, crops: 0 };

  return {
    emeralds: Math.floor(parseInt(data.resources.emeralds || '0') / 60),
    ore: Math.floor(parseInt(data.resources.ore || '0') / 60),
    wood: Math.floor(parseInt(data.resources.wood || '0') / 60),
    fish: Math.floor(parseInt(data.resources.fish || '0') / 60),
    crops: Math.floor(parseInt(data.resources.crops || '0') / 60),
  };
}

/**
 * Apply taxation along a route.
 * Each intermediate territory (not source, not HQ) applies DEFAULT_TAX_PER_HOP.
 * Returns the fraction that arrives (0.0 - 1.0).
 */
function calculateRouteTaxFraction(routeLength: number): number {
  // Intermediate hops = route length - 2 (exclude source and destination)
  const intermediateHops = Math.max(0, routeLength - 2);
  return Math.pow(1 - DEFAULT_TAX_PER_HOP, intermediateHops);
}

/**
 * Pure tick function: advances the simulation by one tick.
 * Returns a new state object (does not mutate input).
 */
export function tick(
  state: SimulatorState,
  verboseData: Record<string, TerritoryVerboseData>
): SimulatorState {
  if (!state.hqTerritoryName) return state;

  const ownedNames = new Set(Object.keys(state.ownedTerritories));
  const adjacencyMap = buildAdjacencyMap(verboseData);

  // Clone HQ storage
  const newStorage: ResourceAmounts = { ...state.hqStorage.resources };
  let emeraldsGenerated = 0;
  let resourcesGenerated = 0;

  // Process each owned territory
  for (const [name, simTerr] of Object.entries(state.ownedTerritories)) {
    // Get base production
    const baseProd = getProductionPerTick(name, verboseData);

    // Apply Efficient Resources multiplier
    const effMultiplier = getEfficientResourcesMultiplier(simTerr.upgrades.efficientResources);
    // Apply Resource Rate multiplier
    const rateMultiplier = getResourceRateMultiplier(simTerr.upgrades.resourceRate);

    const production: ResourceAmounts = {
      emeralds: Math.floor(baseProd.emeralds * effMultiplier * rateMultiplier),
      ore: Math.floor(baseProd.ore * effMultiplier * rateMultiplier),
      wood: Math.floor(baseProd.wood * effMultiplier * rateMultiplier),
      fish: Math.floor(baseProd.fish * effMultiplier * rateMultiplier),
      crops: Math.floor(baseProd.crops * effMultiplier * rateMultiplier),
    };

    // Find route to HQ
    const route = findRouteToHQ(name, state.hqTerritoryName, ownedNames, adjacencyMap);
    if (!route) continue; // Disconnected — resources don't flow

    // Apply taxation
    const taxFraction = calculateRouteTaxFraction(route.length);

    // Add to HQ storage (capped)
    const resourceTypes: ResourceType[] = ['emeralds', 'ore', 'wood', 'fish', 'crops'];
    for (const res of resourceTypes) {
      const amount = Math.floor(production[res] * taxFraction);
      if (amount <= 0) continue;

      const max = res === 'emeralds' ? state.hqStorage.maxEmeralds : state.hqStorage.maxResources;
      const newVal = Math.min(newStorage[res] + amount, max);
      const actualAdded = newVal - newStorage[res];
      newStorage[res] = newVal;

      if (res === 'emeralds') emeraldsGenerated += actualAdded;
      else resourcesGenerated += actualAdded;
    }
  }

  return {
    ...state,
    hqStorage: {
      ...state.hqStorage,
      resources: newStorage,
    },
    tickCount: state.tickCount + 1,
    totalEmeraldsGenerated: state.totalEmeraldsGenerated + emeraldsGenerated,
    totalResourcesGenerated: state.totalResourcesGenerated + resourcesGenerated,
  };
}

/**
 * Calculate total production per tick for all owned territories (before tax).
 */
export function getTotalProduction(
  state: SimulatorState,
  verboseData: Record<string, TerritoryVerboseData> | null
): ResourceAmounts {
  const total: ResourceAmounts = { emeralds: 0, ore: 0, wood: 0, fish: 0, crops: 0 };
  if (!verboseData) return total;

  for (const [name, simTerr] of Object.entries(state.ownedTerritories)) {
    const baseProd = getProductionPerTick(name, verboseData);
    const effMultiplier = getEfficientResourcesMultiplier(simTerr.upgrades.efficientResources);
    const rateMultiplier = getResourceRateMultiplier(simTerr.upgrades.resourceRate);

    total.emeralds += Math.floor(baseProd.emeralds * effMultiplier * rateMultiplier);
    total.ore += Math.floor(baseProd.ore * effMultiplier * rateMultiplier);
    total.wood += Math.floor(baseProd.wood * effMultiplier * rateMultiplier);
    total.fish += Math.floor(baseProd.fish * effMultiplier * rateMultiplier);
    total.crops += Math.floor(baseProd.crops * effMultiplier * rateMultiplier);
  }

  return total;
}
