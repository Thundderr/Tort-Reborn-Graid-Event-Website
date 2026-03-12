// Upgrade management: validation, application, cost checking

import { SimulationState, SimTerritory, RESOURCE_KEYS } from './types';
import { addEvent } from './state';
import {
  UpgradeLevels,
  getUpgradeCostPerHour,
  DAMAGE_COSTS, ATTACK_SPEED_COSTS, HEALTH_COSTS, DEFENSE_COSTS,
  MOB_DAMAGE_COSTS, MULTIHIT_COSTS, AURA_COSTS, VOLLEY_COSTS,
  RESOURCE_STORAGE_COSTS, EMERALD_STORAGE_COSTS,
  EFFICIENT_RESOURCES_COSTS, EFFICIENT_EMERALDS_COSTS,
  RESOURCE_RATE_COSTS, EMERALD_RATE_COSTS,
  TOME_SEEKING_COSTS, EMERALD_SEEKING_COSTS,
} from '../data/upgrade-costs';

export type UpgradeKey = keyof UpgradeLevels;

// Max levels for each upgrade
const MAX_LEVELS: Record<UpgradeKey, number> = {
  damage: 11,
  attackSpeed: 11,
  health: 11,
  defense: 11,
  mobDamage: 4,
  multihit: 3,
  aura: 3,
  volley: 3,
  resourceStorage: 6,
  emeraldStorage: 6,
  efficientResources: 6,
  efficientEmeralds: 3,
  resourceRate: 3,
  emeraldRate: 3,
  tomeSeeking: 3,
  emeraldSeeking: 3,
};

// Which resource each upgrade costs per hour
const UPGRADE_RESOURCE: Record<UpgradeKey, keyof typeof RESOURCE_KEYS extends number ? never : string> = {
  damage: 'ore',
  attackSpeed: 'crop',
  health: 'wood',
  defense: 'fish',
  mobDamage: 'wood',
  multihit: 'fish',
  aura: 'crop',
  volley: 'ore',
  resourceStorage: 'emeralds',
  emeraldStorage: 'wood',
  efficientResources: 'emeralds',
  efficientEmeralds: 'ore',
  resourceRate: 'emeralds',
  emeraldRate: 'crop',
  tomeSeeking: 'fish',
  emeraldSeeking: 'wood',
};

// Get human-readable name
const UPGRADE_NAMES: Record<UpgradeKey, string> = {
  damage: 'Damage',
  attackSpeed: 'Attack Speed',
  health: 'Health',
  defense: 'Defense',
  mobDamage: 'Stronger Minions',
  multihit: 'Multi-Attack',
  aura: 'Tower Aura',
  volley: 'Tower Volley',
  resourceStorage: 'Resource Storage',
  emeraldStorage: 'Emerald Storage',
  efficientResources: 'Efficient Resources',
  efficientEmeralds: 'Efficient Emeralds',
  resourceRate: 'Resource Rate',
  emeraldRate: 'Emerald Rate',
  tomeSeeking: 'Tome Seeking',
  emeraldSeeking: 'Emerald Seeking',
};

// Check if an upgrade can be applied
export function canUpgrade(
  state: SimulationState,
  territoryName: string,
  upgrade: UpgradeKey,
  guildName: string,
): { ok: boolean; reason?: string } {
  const territory = state.territories[territoryName];
  if (!territory) return { ok: false, reason: 'Territory not found' };
  if (territory.owner !== guildName) return { ok: false, reason: 'Not your territory' };

  const currentLevel = territory.upgrades[upgrade];
  const maxLevel = MAX_LEVELS[upgrade];

  if (currentLevel >= maxLevel) {
    return { ok: false, reason: `${UPGRADE_NAMES[upgrade]} is at max level (${maxLevel})` };
  }

  // Check if territory is under attack (defenses locked)
  const underAttack = state.attacks.some(a =>
    a.targetTerritory === territoryName &&
    a.status !== 'completed' && a.status !== 'cancelled'
  );
  if (underAttack && isDefenseUpgrade(upgrade)) {
    return { ok: false, reason: 'Defense upgrades locked during attack' };
  }

  return { ok: true };
}

// Check if an upgrade is a defense upgrade (locked during attacks)
function isDefenseUpgrade(upgrade: UpgradeKey): boolean {
  return ['damage', 'attackSpeed', 'health', 'defense', 'mobDamage', 'multihit', 'aura', 'volley'].includes(upgrade);
}

// Apply an upgrade to a territory
export function applyUpgrade(
  state: SimulationState,
  territoryName: string,
  upgrade: UpgradeKey,
  guildName: string,
): boolean {
  const check = canUpgrade(state, territoryName, upgrade, guildName);
  if (!check.ok) return false;

  const territory = state.territories[territoryName];
  const oldLevel = territory.upgrades[upgrade];
  territory.upgrades[upgrade] = oldLevel + 1;

  addEvent(state, 'upgrade_changed', guildName,
    `${guildName} upgraded ${UPGRADE_NAMES[upgrade]} to level ${oldLevel + 1} on ${territoryName}`,
    territoryName,
    { upgrade, oldLevel, newLevel: oldLevel + 1 },
  );

  return true;
}

// Downgrade (reduce level by 1)
export function applyDowngrade(
  state: SimulationState,
  territoryName: string,
  upgrade: UpgradeKey,
  guildName: string,
): boolean {
  const territory = state.territories[territoryName];
  if (!territory || territory.owner !== guildName) return false;

  const currentLevel = territory.upgrades[upgrade];
  if (currentLevel <= 0) return false;

  // Check if under attack (defense locked)
  const underAttack = state.attacks.some(a =>
    a.targetTerritory === territoryName &&
    a.status !== 'completed' && a.status !== 'cancelled'
  );
  if (underAttack && isDefenseUpgrade(upgrade)) return false;

  territory.upgrades[upgrade] = currentLevel - 1;

  addEvent(state, 'upgrade_changed', guildName,
    `${guildName} downgraded ${UPGRADE_NAMES[upgrade]} to level ${currentLevel - 1} on ${territoryName}`,
    territoryName,
    { upgrade, oldLevel: currentLevel, newLevel: currentLevel - 1 },
  );

  return true;
}

// Set a specific upgrade level (used by AI)
export function setUpgradeLevel(
  state: SimulationState,
  territoryName: string,
  upgrade: UpgradeKey,
  level: number,
  guildName: string,
): boolean {
  const territory = state.territories[territoryName];
  if (!territory || territory.owner !== guildName) return false;

  const maxLevel = MAX_LEVELS[upgrade];
  const clampedLevel = Math.max(0, Math.min(level, maxLevel));

  if (clampedLevel === territory.upgrades[upgrade]) return true; // no change

  const underAttack = state.attacks.some(a =>
    a.targetTerritory === territoryName &&
    a.status !== 'completed' && a.status !== 'cancelled'
  );
  if (underAttack && isDefenseUpgrade(upgrade)) return false;

  const oldLevel = territory.upgrades[upgrade];
  territory.upgrades[upgrade] = clampedLevel;

  addEvent(state, 'upgrade_changed', guildName,
    `${guildName} set ${UPGRADE_NAMES[upgrade]} to level ${clampedLevel} on ${territoryName}`,
    territoryName,
    { upgrade, oldLevel, newLevel: clampedLevel },
  );

  return true;
}

// Get the additional hourly cost if an upgrade is applied
export function getUpgradeAdditionalCost(
  territory: SimTerritory,
  upgrade: UpgradeKey,
): { resource: string; currentCost: number; newCost: number; delta: number } | null {
  const currentLevel = territory.upgrades[upgrade];
  const maxLevel = MAX_LEVELS[upgrade];
  if (currentLevel >= maxLevel) return null;

  const resource = UPGRADE_RESOURCE[upgrade];
  const currentCosts = getUpgradeCostPerHour(territory.upgrades);
  const newUpgrades = { ...territory.upgrades, [upgrade]: currentLevel + 1 };
  const newCosts = getUpgradeCostPerHour(newUpgrades);

  const currentResourceCost = currentCosts[resource as keyof typeof currentCosts];
  const newResourceCost = newCosts[resource as keyof typeof newCosts];

  return {
    resource,
    currentCost: currentResourceCost,
    newCost: newResourceCost,
    delta: newResourceCost - currentResourceCost,
  };
}

// Get all upgrade info for a territory (for UI display)
export function getUpgradeInfo(territory: SimTerritory): {
  key: UpgradeKey;
  name: string;
  level: number;
  maxLevel: number;
  resource: string;
  isDefense: boolean;
}[] {
  return (Object.keys(MAX_LEVELS) as UpgradeKey[]).map(key => ({
    key,
    name: UPGRADE_NAMES[key],
    level: territory.upgrades[key],
    maxLevel: MAX_LEVELS[key],
    resource: UPGRADE_RESOURCE[key],
    isDefense: isDefenseUpgrade(key),
  }));
}

// Move HQ to another territory
export function moveHQ(
  state: SimulationState,
  newHQTerritory: string,
  guildName: string,
): boolean {
  const guild = state.guilds[guildName];
  if (!guild) return false;

  const newHQ = state.territories[newHQTerritory];
  if (!newHQ || newHQ.owner !== guildName) return false;
  if (newHQ.name === guild.hqTerritory) return false; // already HQ

  // Remove HQ status from old territory
  if (guild.hqTerritory) {
    const oldHQ = state.territories[guild.hqTerritory];
    if (oldHQ) oldHQ.hq = false;
  }

  // Set new HQ
  newHQ.hq = true;
  guild.hqTerritory = newHQ.name;

  addEvent(state, 'hq_moved', guildName,
    `${guildName} moved HQ to ${newHQTerritory}`,
    newHQTerritory,
  );

  return true;
}

export { MAX_LEVELS, UPGRADE_NAMES, UPGRADE_RESOURCE };
