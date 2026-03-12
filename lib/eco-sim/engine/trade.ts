// Dijkstra pathfinding for trade routes + resource distribution

import { SimulationState, SimTerritory, RESOURCE_KEYS, ResourceKey } from './types';
import { getStorageCapacity as _getStorageCapacity, getEffectiveProduction as _getEffectiveProduction } from './economy';
import { getUpgradeCostPerHour as _getUpgradeCostPerHour } from '../data/upgrade-costs';

interface PathResult {
  path: string[];          // territory names from start to end
  totalTax: number;        // cumulative tax multiplier (1.0 = no tax)
  hops: number;
}

// Priority queue (min-heap) for Dijkstra
class MinHeap {
  private items: { node: string; cost: number }[] = [];

  push(node: string, cost: number): void {
    this.items.push({ node, cost });
    this.bubbleUp(this.items.length - 1);
  }

  pop(): { node: string; cost: number } | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  get size(): number { return this.items.length; }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.items[i].cost >= this.items[parent].cost) break;
      [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.items.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.items[left].cost < this.items[smallest].cost) smallest = left;
      if (right < n && this.items[right].cost < this.items[smallest].cost) smallest = right;
      if (smallest === i) break;
      [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
      i = smallest;
    }
  }
}

// Get the tax rate a guild would pay passing through a territory
function getTaxRate(territory: SimTerritory, travelingGuild: string, state: SimulationState): number {
  if (territory.owner === travelingGuild) return 0;
  if (territory.owner === '') return 0; // unclaimed

  // Check if territory owner is an ally
  const ownerGuild = state.guilds[territory.owner];
  const travelGuild = state.guilds[travelingGuild];
  if (!ownerGuild || !travelGuild) return territory.enemyTax / 100;

  const isAlly = travelGuild.allies.includes(territory.owner) ||
                 ownerGuild.allies.includes(travelingGuild);

  return isAlly ? (territory.allyTax / 100) : (territory.enemyTax / 100);
}

// Check if resources can pass through a territory (border check)
function canPassThrough(territory: SimTerritory, travelingGuild: string, state: SimulationState): boolean {
  if (territory.owner === travelingGuild) return true; // own territories always passable
  if (territory.borderStyle === 'closed') return false;
  return true; // open borders allow passage
}

// Find cheapest path (minimize tax) from start to end
export function findCheapestPath(
  state: SimulationState,
  start: string,
  end: string,
  guildName: string,
): PathResult | null {
  return dijkstra(state, start, end, guildName, 'cheapest');
}

// Find fastest path (minimize hops) from start to end
export function findFastestPath(
  state: SimulationState,
  start: string,
  end: string,
  guildName: string,
): PathResult | null {
  return dijkstra(state, start, end, guildName, 'fastest');
}

// Find path based on guild's HQ trade style
export function findPath(
  state: SimulationState,
  start: string,
  end: string,
  guildName: string,
): PathResult | null {
  const guild = state.guilds[guildName];
  const hq = guild?.hqTerritory ? state.territories[guild.hqTerritory] : null;
  const style = hq?.tradeStyle || 'cheapest';
  return dijkstra(state, start, end, guildName, style);
}

function dijkstra(
  state: SimulationState,
  start: string,
  end: string,
  guildName: string,
  mode: 'cheapest' | 'fastest',
): PathResult | null {
  if (start === end) return { path: [start], totalTax: 0, hops: 0 };

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const heap = new MinHeap();

  dist.set(start, 0);
  heap.push(start, 0);

  while (heap.size > 0) {
    const { node: current, cost: currentCost } = heap.pop()!;

    if (current === end) break;

    const currentDist = dist.get(current)!;
    if (currentCost > currentDist) continue;

    const territory = state.territories[current];
    if (!territory) continue;

    for (const neighbor of territory.tradingRoutes) {
      const neighborTerritory = state.territories[neighbor];
      if (!neighborTerritory) continue;

      // Check if we can pass through the neighbor
      // Exception: if all borders to the target are closed, emeralds pass anyway (for attacks)
      if (!canPassThrough(neighborTerritory, guildName, state) && neighbor !== end) {
        continue;
      }

      let edgeCost: number;
      if (mode === 'cheapest') {
        const taxRate = getTaxRate(neighborTerritory, guildName, state);
        edgeCost = 1 + taxRate * 10; // weight: 1 base + tax penalty
      } else {
        edgeCost = 1; // uniform cost for fastest
      }

      const newDist = currentDist + edgeCost;
      if (!dist.has(neighbor) || newDist < dist.get(neighbor)!) {
        dist.set(neighbor, newDist);
        prev.set(neighbor, current);
        heap.push(neighbor, newDist);
      }
    }
  }

  if (!dist.has(end)) return null;

  // Reconstruct path
  const path: string[] = [];
  let current: string | undefined = end;
  while (current !== undefined) {
    path.unshift(current);
    current = prev.get(current);
  }

  // Calculate actual total tax along the path
  let taxMultiplier = 1.0;
  for (let i = 1; i < path.length - 1; i++) { // skip start and end
    const t = state.territories[path[i]];
    if (t) {
      const rate = getTaxRate(t, guildName, state);
      taxMultiplier *= (1 - rate);
    }
  }

  return {
    path,
    totalTax: 1 - taxMultiplier, // fraction lost to tax
    hops: path.length - 1,
  };
}

// Find path from a territory to its guild's HQ
export function findPathToHQ(
  state: SimulationState,
  territoryName: string,
  guildName: string,
): PathResult | null {
  const guild = state.guilds[guildName];
  if (!guild?.hqTerritory) return null;
  if (territoryName === guild.hqTerritory) return { path: [territoryName], totalTax: 0, hops: 0 };
  return findPath(state, territoryName, guild.hqTerritory, guildName);
}

// Process resource distribution tick (every 60s sim time)
// Territories send excess to HQ, HQ sends needed resources to territories
export function processDistributionTick(state: SimulationState): void {
  for (const guild of Object.values(state.guilds)) {
    distributeResourcesForGuild(state, guild.name);
  }
}

function distributeResourcesForGuild(state: SimulationState, guildName: string): void {
  const guild = state.guilds[guildName];
  if (!guild?.hqTerritory) return;

  const hq = state.territories[guild.hqTerritory];
  if (!hq || hq.owner !== guildName) return;

  const ownedTerritories = Object.values(state.territories)
    .filter(t => t.owner === guildName && t.name !== guild.hqTerritory);

  // Phase 1: Territories send excess resources to HQ
  for (const territory of ownedTerritories) {
    const path = findPathToHQ(state, territory.name, guildName);
    if (!path || path.path.length === 0) continue; // cut off from HQ

    const net = getNetProductionForTerritory(territory);

    for (const key of RESOURCE_KEYS) {
      if (net[key] > 0) {
        // Territory has excess - send to HQ (per minute = net/60)
        const excess = Math.min(net[key] / 60, territory.stored[key]);
        if (excess <= 0) continue;

        // Apply tax along the path
        const afterTax = excess * (1 - path.totalTax);

        territory.stored[key] -= excess;
        hq.stored[key] += afterTax;

        // Log significant taxation
        if (path.totalTax > 0.1 && excess > 10) {
          const taxed = excess - afterTax;
          // Distribute taxed resources to taxing territories
          distributeTaxRevenue(state, path.path, guildName, key, taxed);
        }
      }
    }
  }

  // Phase 2: HQ sends resources to territories that need them
  for (const territory of ownedTerritories) {
    const path = findPathToHQ(state, territory.name, guildName);
    if (!path || path.path.length === 0) continue;

    const net = getNetProductionForTerritory(territory);

    for (const key of RESOURCE_KEYS) {
      if (net[key] < 0) {
        // Territory has deficit - HQ sends resources
        const deficit = Math.abs(net[key]) / 60; // per minute
        if (deficit <= 0) continue;

        // Need to send more to account for tax
        const taxFactor = 1 - path.totalTax;
        if (taxFactor <= 0) continue;

        const toSend = Math.min(deficit / taxFactor, hq.stored[key]);
        if (toSend <= 0) continue;

        hq.stored[key] -= toSend;
        const received = toSend * taxFactor;
        territory.stored[key] += received;

        // Tax revenue
        if (path.totalTax > 0) {
          distributeTaxRevenue(state, path.path, guildName, key, toSend - received);
        }
      }
    }
  }

  // Clamp HQ storage
  const hqCap = _getStorageCapacity(hq);
  for (const key of RESOURCE_KEYS) {
    hq.stored[key] = Math.min(hq.stored[key], hqCap[key]);
    hq.stored[key] = Math.max(hq.stored[key], 0);
  }
}

// Distribute tax revenue to territories that applied tax along a path
function distributeTaxRevenue(
  state: SimulationState,
  path: string[],
  travelingGuild: string,
  resource: ResourceKey,
  totalTaxed: number,
): void {
  // Skip first (origin) and last (destination)
  const taxingTerritories = path.slice(1, -1).filter(name => {
    const t = state.territories[name];
    return t && t.owner !== travelingGuild && t.owner !== '';
  });

  if (taxingTerritories.length === 0) return;
  const share = totalTaxed / taxingTerritories.length;

  for (const name of taxingTerritories) {
    const t = state.territories[name];
    if (t) {
      t.stored[resource] += share;
    }
  }
}

// Get net production for a single territory (production - costs per hour)
function getNetProductionForTerritory(territory: SimTerritory): Record<ResourceKey, number> {
  const prod = _getEffectiveProduction(territory);
  const costs = _getUpgradeCostPerHour(territory.upgrades);

  const result: Record<string, number> = {};
  for (const key of RESOURCE_KEYS) {
    result[key] = prod[key] - costs[key];
  }
  return result as Record<ResourceKey, number>;
}

// Get number of connections a territory has that are owned by the same guild
export function getOwnedConnections(state: SimulationState, territoryName: string): number {
  const territory = state.territories[territoryName];
  if (!territory || !territory.owner) return 0;

  return territory.tradingRoutes.filter(name => {
    const neighbor = state.territories[name];
    return neighbor && neighbor.owner === territory.owner;
  }).length;
}
