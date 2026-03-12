// Shared AI scoring: territory value, vulnerability, chokepoint detection

import { SimulationState, SimTerritory, RESOURCE_KEYS } from '../engine/types';
import { getEffectiveProduction, getStorageCapacity } from '../engine/economy';
import { getOwnedConnections } from '../engine/trade';
import { TerritoryScore } from './types';
import {
  DAMAGE_MULTIPLIERS, ATTACK_SPEED_VALUES, HEALTH_VALUES, DEFENSE_PERCENTS,
} from '../data/upgrade-costs';
import { CONNECTION_BONUS } from '../data/constants';

// Calculate resource production value (emerald-equivalent per hour)
export function getResourceValue(territory: SimTerritory): number {
  const prod = getEffectiveProduction(territory);
  // Rough emerald equivalence: 1 resource ≈ 2.5 emeralds
  return prod.emeralds + (prod.ore + prod.crop + prod.wood + prod.fish) * 2.5;
}

// Estimate tower strength as EHP * DPS product (higher = harder to take)
export function getDefensiveStrength(territory: SimTerritory, state: SimulationState): number {
  const u = territory.upgrades;
  const connections = getOwnedConnections(state, territory.name);
  const connectionMult = 1 + connections * CONNECTION_BONUS;

  const hp = HEALTH_VALUES[u.health] * connectionMult;
  const defenseReduction = DEFENSE_PERCENTS[u.defense];
  const ehp = hp / (1 - defenseReduction);

  const baseDmg = 800;
  const dmgMult = DAMAGE_MULTIPLIERS[u.damage];
  const atkSpd = ATTACK_SPEED_VALUES[u.attackSpeed];
  const dps = baseDmg * (1 + dmgMult) * atkSpd * connectionMult;

  return ehp * dps;
}

// Vulnerability score: how easy a territory is to attack (0-100, higher = more vulnerable)
export function getVulnerability(territory: SimTerritory, state: SimulationState): number {
  const strength = getDefensiveStrength(territory, state);
  const connections = getOwnedConnections(state, territory.name);

  // Normalize strength (rough scale: 1e11 is very strong, 1e8 is weak)
  const strengthScore = Math.max(0, 100 - Math.log10(Math.max(1, strength)) * 10);

  // Fewer friendly connections = more vulnerable
  const connectionPenalty = Math.max(0, (3 - connections) * 10);

  // Pity timer reduces vulnerability
  const pityProtection = territory.pityTimerUntil > state.simTimeMs ? -50 : 0;

  return Math.max(0, Math.min(100, strengthScore + connectionPenalty + pityProtection));
}

// Chokepoint score: BFS disconnection analysis
// If removing this territory would disconnect the guild's territory graph,
// score = size of the disconnected component(s)
export function getChokepointScore(
  state: SimulationState,
  territoryName: string,
  guildName: string,
): number {
  const guildTerritories = Object.values(state.territories)
    .filter(t => t.owner === guildName)
    .map(t => t.name);

  if (!guildTerritories.includes(territoryName)) return 0;

  // Remove the territory and check connectivity
  const remaining = guildTerritories.filter(n => n !== territoryName);
  if (remaining.length === 0) return guildTerritories.length;

  // BFS from first remaining territory
  const visited = new Set<string>();
  const queue = [remaining[0]];
  visited.add(remaining[0]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const territory = state.territories[current];
    if (!territory) continue;

    for (const neighbor of territory.tradingRoutes) {
      if (remaining.includes(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Score = number of territories that became disconnected
  const disconnected = remaining.length - visited.size;
  return disconnected;
}

// Find which resource types would be lost if territory is captured
export function getResourceDrainImpact(
  state: SimulationState,
  territoryName: string,
  guildName: string,
): { resource: string; percentLost: number }[] {
  const guildTerritories = Object.values(state.territories)
    .filter(t => t.owner === guildName);

  const totalProd: Record<string, number> = { emeralds: 0, ore: 0, crop: 0, wood: 0, fish: 0 };
  const targetProd: Record<string, number> = { emeralds: 0, ore: 0, crop: 0, wood: 0, fish: 0 };

  for (const t of guildTerritories) {
    const prod = getEffectiveProduction(t);
    for (const key of RESOURCE_KEYS) {
      totalProd[key] += prod[key];
      if (t.name === territoryName) {
        targetProd[key] = prod[key];
      }
    }
  }

  const results: { resource: string; percentLost: number }[] = [];
  for (const key of RESOURCE_KEYS) {
    if (totalProd[key] > 0 && targetProd[key] > 0) {
      results.push({
        resource: key,
        percentLost: (targetProd[key] / totalProd[key]) * 100,
      });
    }
  }

  return results;
}

// Score all enemy territories for attack prioritization
export function scoreEnemyTerritories(
  state: SimulationState,
  aiGuild: string,
  enemyGuild: string,
): TerritoryScore[] {
  const enemyTerritories = Object.values(state.territories)
    .filter(t => t.owner === enemyGuild);

  // Only score territories adjacent to AI's territories
  const aiTerritories = Object.values(state.territories)
    .filter(t => t.owner === aiGuild);
  const aiAdjacentNames = new Set<string>();
  for (const t of aiTerritories) {
    for (const neighbor of t.tradingRoutes) {
      const n = state.territories[neighbor];
      if (n && n.owner === enemyGuild) {
        aiAdjacentNames.add(neighbor);
      }
    }
  }

  return enemyTerritories
    .filter(t => aiAdjacentNames.has(t.name))
    .map(t => {
      const resourceValue = getResourceValue(t);
      const vulnerability = getVulnerability(t, state);
      const chokeScore = getChokepointScore(state, t.name, enemyGuild);
      const defensiveStrength = getDefensiveStrength(t, state);

      // Overall value: combines strategic importance with ease of capture
      const value = (resourceValue / 10000) * 0.3 +
        vulnerability * 0.3 +
        chokeScore * 15 * 0.4;

      return {
        name: t.name,
        value,
        vulnerability,
        chokeScore,
        resourceValue,
        defensiveStrength,
      };
    })
    .sort((a, b) => b.value - a.value);
}

// Find the enemy guild name from AI's perspective
export function findEnemyGuild(state: SimulationState, aiGuild: string): string | null {
  for (const guild of Object.values(state.guilds)) {
    if (guild.name !== aiGuild && !guild.isAI) {
      return guild.name;
    }
  }
  // If no non-AI guild, find any guild that isn't us
  for (const guild of Object.values(state.guilds)) {
    if (guild.name !== aiGuild) return guild.name;
  }
  return null;
}
