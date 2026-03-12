// AI upgrade logic: optimal territory upgrading for both attacker and defender
//
// Strategy:
// - Border territories (adjacent to enemy): prioritize defense (health > defense > damage > atkspd)
// - Interior territories: prioritize economy (efficient resources, emerald storage, resource storage)
// - HQ: max emerald storage first, then economy
// - Self-sufficiency constraint: don't upgrade beyond what production can sustain

import { SimulationState, SimTerritory, RESOURCE_KEYS } from '../engine/types';
import { getGuildTerritories, getGuildHQ } from '../engine/state';
import { getEffectiveProduction, isSelfSufficient, getNetProduction } from '../engine/economy';
import { setUpgradeLevel, UpgradeKey } from '../engine/upgrades';
import { getUpgradeCostPerHour } from '../data/upgrade-costs';

const UPGRADE_EVAL_INTERVAL_MS = 15000; // evaluate every 15s sim-time
const lastUpgradeEvalTimes: Record<string, number> = {};

export function resetUpgradeAI(): void {
  for (const key of Object.keys(lastUpgradeEvalTimes)) {
    delete lastUpgradeEvalTimes[key];
  }
}

// Main upgrade tick — called for each AI guild
export function processUpgradeAI(state: SimulationState, aiGuild: string): void {
  const lastEval = lastUpgradeEvalTimes[aiGuild] || 0;
  if (state.simTimeMs - lastEval < UPGRADE_EVAL_INTERVAL_MS) return;
  lastUpgradeEvalTimes[aiGuild] = state.simTimeMs;

  const territories = getGuildTerritories(state, aiGuild);
  if (territories.length === 0) return;

  const hq = getGuildHQ(state, aiGuild);

  // Classify territories
  const border: SimTerritory[] = [];
  const interior: SimTerritory[] = [];

  for (const t of territories) {
    const hasEnemyNeighbor = t.tradingRoutes.some(n => {
      const neighbor = state.territories[n];
      return neighbor && neighbor.owner && neighbor.owner !== aiGuild;
    });
    if (hasEnemyNeighbor) {
      border.push(t);
    } else {
      interior.push(t);
    }
  }

  // Upgrade HQ: emerald storage first
  if (hq) {
    upgradeHQ(state, hq, aiGuild);
  }

  // Upgrade border territories: defense
  for (const t of border) {
    upgradeBorderTerritory(state, t, aiGuild);
  }

  // Upgrade interior territories: economy
  for (const t of interior) {
    upgradeInteriorTerritory(state, t, aiGuild);
  }
}

function canAffordUpgrade(territory: SimTerritory, upgrade: UpgradeKey, targetLevel: number): boolean {
  // Check if the territory can sustain the upgrade cost from its own production
  const testUpgrades = { ...territory.upgrades, [upgrade]: targetLevel };
  const costs = getUpgradeCostPerHour(testUpgrades);
  const prod = getEffectiveProduction(territory);

  // Allow up to 80% of production to be consumed by upgrades (leave 20% margin)
  for (const key of RESOURCE_KEYS) {
    if (costs[key] > prod[key] * 0.8) return false;
  }
  return true;
}

function tryUpgrade(state: SimulationState, territory: SimTerritory, upgrade: UpgradeKey, guildName: string, maxLevel: number): boolean {
  const current = territory.upgrades[upgrade];
  if (current >= maxLevel) return false;

  const target = current + 1;
  if (!canAffordUpgrade(territory, upgrade, target)) return false;

  return setUpgradeLevel(state, territory.name, upgrade, target, guildName);
}

function upgradeHQ(state: SimulationState, hq: SimTerritory, guildName: string): void {
  // HQ priority: emerald storage > resource storage > efficient emeralds > emerald rate
  const hqPriority: [UpgradeKey, number][] = [
    ['emeraldStorage', 5],    // high storage for funding attacks
    ['resourceStorage', 3],   // moderate resource storage
    ['efficientEmeralds', 2], // boost emerald production
    ['emeraldRate', 1],       // faster emerald ticks
  ];

  for (const [upgrade, maxLevel] of hqPriority) {
    if (hq.upgrades[upgrade] < maxLevel) {
      tryUpgrade(state, hq, upgrade, guildName, maxLevel);
      return; // one upgrade per eval
    }
  }
}

function upgradeBorderTerritory(state: SimulationState, territory: SimTerritory, guildName: string): void {
  // Border priority: health > defense > damage > attack speed > aura > volley
  const defensePriority: [UpgradeKey, number][] = [
    ['health', 6],       // solid HP
    ['defense', 6],      // solid damage reduction
    ['damage', 5],       // good tower damage
    ['attackSpeed', 4],  // decent attack speed
    ['aura', 2],         // some aura
    ['volley', 2],       // some volley
  ];

  for (const [upgrade, maxLevel] of defensePriority) {
    if (territory.upgrades[upgrade] < maxLevel) {
      tryUpgrade(state, territory, upgrade, guildName, maxLevel);
      return; // one upgrade per eval
    }
  }
}

function upgradeInteriorTerritory(state: SimulationState, territory: SimTerritory, guildName: string): void {
  // Interior priority: resource storage > efficient resources > resource rate
  // Only upgrade economy — these territories feed the war effort
  const econPriority: [UpgradeKey, number][] = [
    ['resourceStorage', 3],      // more storage for distribution
    ['emeraldStorage', 2],       // some emerald storage
    ['efficientResources', 2],   // boost resource production
    ['resourceRate', 1],         // slightly faster ticks
  ];

  for (const [upgrade, maxLevel] of econPriority) {
    if (territory.upgrades[upgrade] < maxLevel) {
      tryUpgrade(state, territory, upgrade, guildName, maxLevel);
      return; // one upgrade per eval
    }
  }
}
