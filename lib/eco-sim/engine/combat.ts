// Combat system: attacks, captures, pity timers, tower resolution

import {
  SimulationState, AttackState, SimTerritory,
  RESOURCE_KEYS, ResourceKey,
} from './types';
import { addEvent, countGuildTerritories, clampStorage, getStorageCapacity } from './state';
import { findPath } from './trade';
import {
  getAttackCost,
  BASE_ATTACK_TIMER_MS,
  PER_HOP_ATTACK_TIMER_MS,
  WAR_WAIT_PERIOD_MS,
  PITY_TIMER_MS,
  MAX_CONCURRENT_ATTACKS,
  CONNECTION_BONUS,
} from '../data/constants';
import {
  DAMAGE_MULTIPLIERS, ATTACK_SPEED_VALUES, HEALTH_VALUES, DEFENSE_PERCENTS,
  AURA_FREQUENCY, VOLLEY_FREQUENCY, MOB_DAMAGE_MULTIPLIERS, MULTIHIT_TARGETS,
} from '../data/upgrade-costs';
import { getOwnedConnections } from './trade';

let nextAttackId = 1;

// Calculate attack timer duration in sim-time ms
export function getAttackTimerMs(hops: number): number {
  return BASE_ATTACK_TIMER_MS + Math.max(0, hops - 1) * PER_HOP_ATTACK_TIMER_MS;
}

// Check if a guild can initiate an attack
export function canAttack(
  state: SimulationState,
  attackerGuild: string,
  targetTerritory: string,
): { ok: boolean; reason?: string } {
  const guild = state.guilds[attackerGuild];
  if (!guild) return { ok: false, reason: 'Guild not found' };

  const target = state.territories[targetTerritory];
  if (!target) return { ok: false, reason: 'Territory not found' };
  if (target.owner === attackerGuild) return { ok: false, reason: 'Cannot attack own territory' };

  // Check pity timer
  if (target.pityTimerUntil > state.simTimeMs) {
    return { ok: false, reason: 'Territory is protected by pity timer' };
  }

  // Check already under attack
  if (state.attacks.some(a =>
    a.targetTerritory === targetTerritory &&
    a.status !== 'completed' && a.status !== 'cancelled'
  )) {
    return { ok: false, reason: 'Territory already under attack' };
  }

  // Check concurrent attack limit
  const activeAttacks = state.attacks.filter(a =>
    a.attackerGuild === attackerGuild &&
    a.status !== 'completed' && a.status !== 'cancelled'
  );
  if (activeAttacks.length >= MAX_CONCURRENT_ATTACKS) {
    return { ok: false, reason: `Maximum ${MAX_CONCURRENT_ATTACKS} concurrent attacks` };
  }

  // Check if attacker has a path to the target
  const attackerTerritories = Object.values(state.territories)
    .filter(t => t.owner === attackerGuild);
  if (attackerTerritories.length === 0) {
    return { ok: false, reason: 'No territories to attack from' };
  }

  // Find best path from any owned territory adjacent to target
  let bestPath = null;
  for (const t of attackerTerritories) {
    if (t.tradingRoutes.includes(targetTerritory)) {
      const path = findPath(state, t.name, targetTerritory, attackerGuild);
      if (path && (!bestPath || path.hops < bestPath.hops)) {
        bestPath = path;
      }
    }
  }

  if (!bestPath) {
    return { ok: false, reason: 'No adjacent territory to attack from' };
  }

  // Check emerald cost
  const territoryCount = countGuildTerritories(state, attackerGuild);
  const cost = getAttackCost(territoryCount);

  // Find HQ to check emeralds
  const hq = guild.hqTerritory ? state.territories[guild.hqTerritory] : null;
  if (hq && hq.stored.emeralds < cost) {
    return { ok: false, reason: `Not enough emeralds (need ${cost}, have ${Math.floor(hq.stored.emeralds)})` };
  }

  return { ok: true };
}

// Initiate an attack
export function initiateAttack(
  state: SimulationState,
  attackerGuild: string,
  targetTerritory: string,
): AttackState | null {
  const check = canAttack(state, attackerGuild, targetTerritory);
  if (!check.ok) return null;

  const target = state.territories[targetTerritory];
  const guild = state.guilds[attackerGuild];

  // Find attack path (from adjacent owned territory)
  const attackerTerritories = Object.values(state.territories)
    .filter(t => t.owner === attackerGuild);

  let bestPath = null;
  for (const t of attackerTerritories) {
    if (t.tradingRoutes.includes(targetTerritory)) {
      const path = findPath(state, t.name, targetTerritory, attackerGuild);
      if (path && (!bestPath || path.hops < bestPath.hops)) {
        bestPath = path;
      }
    }
  }
  if (!bestPath) return null;

  // Deduct emerald cost from HQ
  const territoryCount = countGuildTerritories(state, attackerGuild);
  const cost = getAttackCost(territoryCount);
  const hq = guild.hqTerritory ? state.territories[guild.hqTerritory] : null;
  if (hq) {
    hq.stored.emeralds -= cost;
  }

  // Lock defense stats at queue time
  const connections = getOwnedConnections(state, targetTerritory);
  const attack: AttackState = {
    id: `atk_${nextAttackId++}`,
    attackerGuild,
    defenderGuild: target.owner,
    targetTerritory,
    path: bestPath.path,
    hops: bestPath.hops,
    emeraldCost: cost,
    queuedAt: state.simTimeMs,
    arrivesAt: state.simTimeMs + getAttackTimerMs(bestPath.hops),
    warStartsAt: state.simTimeMs + getAttackTimerMs(bestPath.hops) + WAR_WAIT_PERIOD_MS,
    lockedDefense: {
      damage: target.upgrades.damage,
      attackSpeed: target.upgrades.attackSpeed,
      health: target.upgrades.health,
      defense: target.upgrades.defense,
      aura: target.upgrades.aura,
      volley: target.upgrades.volley,
      mobDamage: target.upgrades.mobDamage,
      multihit: target.upgrades.multihit,
      connections,
      isHQ: target.hq,
      externals: 0, // simplified - could calculate from territory data
    },
    status: 'traveling',
  };

  state.attacks.push(attack);

  addEvent(state, 'attack_queued', attackerGuild,
    `${attackerGuild} queued attack on ${targetTerritory} (${bestPath.hops} hops, ${Math.ceil(getAttackTimerMs(bestPath.hops) / 60000)}min timer)`,
    targetTerritory,
    { cost, hops: bestPath.hops },
  );

  return attack;
}

// Cancel an attack (only while traveling)
export function cancelAttack(state: SimulationState, attackId: string): boolean {
  const attack = state.attacks.find(a => a.id === attackId);
  if (!attack || attack.status !== 'traveling') return false;

  attack.status = 'cancelled';
  addEvent(state, 'attack_cancelled', attack.attackerGuild,
    `${attack.attackerGuild} cancelled attack on ${attack.targetTerritory}`,
    attack.targetTerritory,
  );

  return true;
}

// Calculate effective tower DPS (damage per second)
function getTowerDPS(attack: AttackState): number {
  const def = attack.lockedDefense;
  const baseDamage = 800; // base tower damage
  const damageMultiplier = DAMAGE_MULTIPLIERS[def.damage];
  const attacksPerSecond = ATTACK_SPEED_VALUES[def.attackSpeed];

  // Connection bonus: +30% per owned connection (wiki: stat*(1.0+(0.3*connections)))
  const connectionBonus = 1 + (def.connections * CONNECTION_BONUS);

  return baseDamage * (1 + damageMultiplier) * attacksPerSecond * connectionBonus;
}

// Calculate effective tower EHP (effective health points)
function getTowerEHP(attack: AttackState): number {
  const def = attack.lockedDefense;
  const baseHP = HEALTH_VALUES[def.health];
  const defenseReduction = DEFENSE_PERCENTS[def.defense];

  // Connection bonus: +30% per owned connection (wiki: stat*(1.0+(0.3*connections)))
  const connectionBonus = 1 + (def.connections * CONNECTION_BONUS);

  // EHP = health / (1 - defense%)
  return (baseHP * connectionBonus) / (1 - defenseReduction);
}

// Resolve a war with variance (±20% randomness on both sides)
// Returns true if attacker wins
function resolveWar(attack: AttackState, warDurationMs: number): boolean {
  const towerEHP = getTowerEHP(attack);
  const towerDPS = getTowerDPS(attack);

  // War duration affects tower strength - tower gets weaker over time
  const warMinutes = warDurationMs / 60000;
  const degradation = Math.max(0.1, 1 - warMinutes * 0.05); // 5% weaker per minute

  // Add ±20% randomness to both sides to create variance between runs
  const attackerVariance = 0.8 + Math.random() * 0.4; // 0.8-1.2
  const defenderVariance = 0.8 + Math.random() * 0.4; // 0.8-1.2

  const effectiveEHP = towerEHP * degradation * defenderVariance;

  // Attacker DPS represents a team of players
  const attackerDPS = 5000 * attackerVariance;
  const timeToKill = effectiveEHP / attackerDPS;

  // Tower needs to deal enough damage to kill all attackers
  const attackerTotalHP = 50000 * attackerVariance;
  const timeDefenderKills = attackerTotalHP / (towerDPS * degradation * defenderVariance);

  return timeToKill < timeDefenderKills;
}

// Process attack state transitions in a fast tick
export function processAttackTick(state: SimulationState): void {
  for (const attack of state.attacks) {
    if (attack.status === 'completed' || attack.status === 'cancelled') continue;

    // Check if target territory changed owner (e.g., another attack captured it)
    const target = state.territories[attack.targetTerritory];
    if (!target) {
      attack.status = 'cancelled';
      continue;
    }

    if (attack.status === 'traveling') {
      if (state.simTimeMs >= attack.arrivesAt) {
        attack.status = 'waiting';
        addEvent(state, 'war_started', attack.attackerGuild,
          `Emeralds arrived at ${attack.targetTerritory}, war begins in 30s`,
          attack.targetTerritory,
        );
      }
    }

    if (attack.status === 'waiting') {
      if (state.simTimeMs >= attack.warStartsAt) {
        attack.status = 'fighting';
      }
    }

    if (attack.status === 'fighting') {
      // War duration
      const warDuration = state.simTimeMs - attack.warStartsAt;

      // Auto-resolve after a certain duration based on tower strength
      const towerEHP = getTowerEHP(attack);
      const maxWarDuration = Math.min(
        5 * 60 * 1000, // 5 minutes max
        Math.max(30 * 1000, towerEHP / 5000 * 1000), // proportional to EHP
      );

      if (warDuration >= maxWarDuration) {
        const attackerWins = resolveWar(attack, warDuration);
        attack.status = 'completed';
        attack.result = attackerWins ? 'attacker_won' : 'defender_won';

        if (attackerWins) {
          captureTerritory(state, attack);
        }

        addEvent(state, 'war_ended', attack.attackerGuild,
          `War at ${attack.targetTerritory}: ${attackerWins ? attack.attackerGuild + ' captured' : attack.defenderGuild + ' defended'}`,
          attack.targetTerritory,
          { result: attack.result },
        );
      }
    }
  }

  // Clean up old completed/cancelled attacks (keep last 50)
  const activeOrRecent = state.attacks.filter(a =>
    a.status !== 'completed' && a.status !== 'cancelled'
  );
  const completed = state.attacks.filter(a =>
    a.status === 'completed' || a.status === 'cancelled'
  ).slice(-50);
  state.attacks = [...activeOrRecent, ...completed];
}

// Handle territory capture
function captureTerritory(state: SimulationState, attack: AttackState): void {
  const territory = state.territories[attack.targetTerritory];
  if (!territory) return;

  const previousOwner = territory.owner;
  const wasHQ = territory.hq;

  // Transfer stored resources to attacker's HQ
  const attackerGuild = state.guilds[attack.attackerGuild];
  const attackerHQ = attackerGuild?.hqTerritory ? state.territories[attackerGuild.hqTerritory] : null;

  if (attackerHQ) {
    for (const key of RESOURCE_KEYS) {
      attackerHQ.stored[key] += territory.stored[key];
    }
    // Add treasury bonus (emeralds based on treasury level)
    const treasuryBonus = [0, 1000, 3000, 6000, 10000][territory.treasuryLevel] || 0;
    attackerHQ.stored.emeralds += treasuryBonus;

    clampStorage(attackerHQ);
  }

  // If this was the defender's HQ, they need a new one
  if (wasHQ && previousOwner) {
    const defenderGuild = state.guilds[previousOwner];
    if (defenderGuild) {
      // Find another territory to be HQ (closest to old HQ, or first available)
      const remainingTerritories = Object.values(state.territories)
        .filter(t => t.owner === previousOwner && t.name !== attack.targetTerritory);

      if (remainingTerritories.length > 0) {
        // Pick the territory with the most connections
        const newHQ = remainingTerritories.reduce((best, t) =>
          t.tradingRoutes.length > best.tradingRoutes.length ? t : best,
        );
        newHQ.hq = true;
        defenderGuild.hqTerritory = newHQ.name;
        addEvent(state, 'hq_moved', previousOwner,
          `${previousOwner} HQ moved to ${newHQ.name} after ${attack.targetTerritory} was captured`,
          newHQ.name,
        );
      } else {
        defenderGuild.hqTerritory = null;
      }
    }
  }

  // Change ownership
  territory.owner = attack.attackerGuild;
  territory.hq = false;
  territory.stored = { emeralds: 0, ore: 0, crop: 0, wood: 0, fish: 0 };
  territory.acquiredAt = state.simTimeMs;
  territory.pityTimerUntil = state.simTimeMs + PITY_TIMER_MS;
  territory.treasuryLevel = 0;
  territory.upgrades = { ...territory.upgrades }; // keep upgrades as-is (they persist)

  addEvent(state, 'territory_captured', attack.attackerGuild,
    `${attack.attackerGuild} captured ${attack.targetTerritory} from ${previousOwner || 'unclaimed'}`,
    attack.targetTerritory,
    { previousOwner, treasuryLevel: territory.treasuryLevel },
  );
}

// Process pity timer expiry events
export function processPityTimers(state: SimulationState): void {
  for (const territory of Object.values(state.territories)) {
    if (territory.pityTimerUntil > 0 && state.simTimeMs >= territory.pityTimerUntil) {
      territory.pityTimerUntil = 0;
      addEvent(state, 'pity_expired', territory.owner,
        `Pity timer expired on ${territory.name}`,
        territory.name,
      );
    }
  }
}

// Update treasury levels based on hold time
export function updateTreasury(state: SimulationState): void {
  for (const territory of Object.values(state.territories)) {
    if (!territory.owner) continue;

    const holdTime = state.simTimeMs - territory.acquiredAt;
    // Treasury increases every 15 minutes held, up to level 4
    const newLevel = Math.min(4, Math.floor(holdTime / (15 * 60 * 1000)));
    territory.treasuryLevel = newLevel;
  }
}
