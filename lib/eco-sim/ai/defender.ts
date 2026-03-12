// AI Defender: tax evasion, prediction buffing, reclaiming, snaking

import { SimulationState, SimTerritory, RESOURCE_KEYS } from '../engine/types';
import { getGuildHQ, getGuildTerritories, addEvent } from '../engine/state';
import { isSelfSufficient, getEffectiveProduction, getNetProduction } from '../engine/economy';
import { getUpgradeCostPerHour } from '../data/upgrade-costs';
import { initiateAttack, canAttack } from '../engine/combat';
import { setUpgradeLevel, moveHQ, UpgradeKey } from '../engine/upgrades';
import { findEnemyGuild, getVulnerability, getDefensiveStrength } from './evaluator';
import { StrategyScore, DefenderStrategy } from './types';

const AI_EVAL_INTERVAL_MS = 5000; // evaluate every 5s sim-time
let lastEvalTime = 0;

// Main AI defender tick
export function processDefenderAI(state: SimulationState, aiGuild: string): void {
  if (state.simTimeMs - lastEvalTime < AI_EVAL_INTERVAL_MS) return;
  lastEvalTime = state.simTimeMs;

  const guild = state.guilds[aiGuild];
  if (!guild || !guild.isAI || guild.aiRole !== 'defender') return;

  const enemyGuild = findEnemyGuild(state, aiGuild);
  if (!enemyGuild) return;

  const difficulty = guild.aiDifficulty;

  const strategies: StrategyScore[] = [
    scoreTaxEvasion(state, aiGuild),
    scorePredictionBuff(state, aiGuild, enemyGuild),
    scoreLossBuff(state, aiGuild),
    scoreReclaim(state, aiGuild, enemyGuild),
    scoreSnake(state, aiGuild, enemyGuild),
  ].filter(s => s.score > 0);

  if (strategies.length === 0) return;

  strategies.sort((a, b) => b.score - a.score);

  let chosen: StrategyScore;
  if (difficulty === 'easy') {
    const pool = strategies.slice(0, Math.min(3, strategies.length));
    chosen = pool[Math.floor(Math.random() * pool.length)];
  } else if (difficulty === 'medium') {
    chosen = Math.random() < 0.3 && strategies.length > 1 ? strategies[1] : strategies[0];
  } else {
    chosen = strategies[0];
  }

  executeDefenderStrategy(state, aiGuild, enemyGuild, chosen);
}

function scoreTaxEvasion(state: SimulationState, aiGuild: string): StrategyScore {
  const territories = getGuildTerritories(state, aiGuild);
  let taxedCount = 0;

  // Check for territories that are being taxed (resources flowing through enemy territory)
  for (const t of territories) {
    if (!isSelfSufficient(t)) {
      // Territory depends on HQ supply which may be taxed
      taxedCount++;
    }
  }

  if (taxedCount === 0) {
    return { strategy: 'tax_evasion', score: 0, reasoning: 'No taxed territories' };
  }

  return {
    strategy: 'tax_evasion',
    score: 30 + taxedCount * 10,
    reasoning: `${taxedCount} territories not self-sufficient, reducing upgrades`,
  };
}

function scorePredictionBuff(state: SimulationState, aiGuild: string, enemyGuild: string): StrategyScore {
  // Check for incoming attacks
  const incomingAttacks = state.attacks.filter(a =>
    a.defenderGuild === aiGuild &&
    (a.status === 'traveling' || a.status === 'waiting')
  );

  if (incomingAttacks.length === 0) {
    // No active attacks, but predict likely targets
    const myTerritories = getGuildTerritories(state, aiGuild);
    const vulnerableTargets = myTerritories
      .map(t => ({ name: t.name, vuln: getVulnerability(t, state) }))
      .filter(t => t.vuln > 50)
      .sort((a, b) => b.vuln - a.vuln);

    if (vulnerableTargets.length === 0) {
      return { strategy: 'prediction_buff', score: 0, reasoning: 'No vulnerable territories' };
    }

    return {
      strategy: 'prediction_buff',
      score: 25 + vulnerableTargets[0].vuln * 0.2,
      target: vulnerableTargets[0].name,
      reasoning: `Pre-buff ${vulnerableTargets[0].name} (vulnerability: ${Math.round(vulnerableTargets[0].vuln)})`,
    };
  }

  // Active attack - buff the target
  const attack = incomingAttacks[0];
  return {
    strategy: 'prediction_buff',
    score: 80,
    target: attack.targetTerritory,
    reasoning: `Incoming attack on ${attack.targetTerritory}, buffing defenses`,
  };
}

function scoreLossBuff(state: SimulationState, aiGuild: string): StrategyScore {
  // Check recent captures against us
  const recentLosses = state.eventLog.filter(e =>
    e.type === 'territory_captured' &&
    e.guild !== aiGuild &&
    e.timestamp > state.simTimeMs - 120000 // last 2 min sim-time
  );

  if (recentLosses.length === 0) {
    return { strategy: 'loss_buff', score: 0, reasoning: 'No recent losses' };
  }

  // Find territories adjacent to lost ones that need buffing
  const myTerritories = getGuildTerritories(state, aiGuild);
  const bordersLost = myTerritories.filter(t =>
    t.tradingRoutes.some(n => recentLosses.some(l => l.territory === n))
  );

  if (bordersLost.length === 0) {
    return { strategy: 'loss_buff', score: 0, reasoning: 'No territories bordering losses' };
  }

  // Buff the weakest territory bordering a lost one
  const weakest = bordersLost
    .map(t => ({ name: t.name, strength: getDefensiveStrength(t, state) }))
    .sort((a, b) => a.strength - b.strength)[0];

  return {
    strategy: 'loss_buff',
    score: 50 + recentLosses.length * 10,
    target: weakest.name,
    reasoning: `Lost ${recentLosses.length} territories recently, buffing ${weakest.name}`,
  };
}

function scoreReclaim(state: SimulationState, aiGuild: string, enemyGuild: string): StrategyScore {
  // Find any adjacent enemy territories we can attack (not just reclaims)
  const myTerritories = getGuildTerritories(state, aiGuild);
  const adjacentEnemy: SimTerritory[] = [];

  for (const t of myTerritories) {
    for (const neighbor of t.tradingRoutes) {
      const n = state.territories[neighbor];
      if (n && n.owner === enemyGuild && n.pityTimerUntil <= state.simTimeMs) {
        if (!adjacentEnemy.some(e => e.name === n.name)) {
          adjacentEnemy.push(n);
        }
      }
    }
  }

  if (adjacentEnemy.length === 0) {
    return { strategy: 'reclaim', score: 0, reasoning: 'No reclaimable territories' };
  }

  // Pick most vulnerable
  const ranked = adjacentEnemy
    .map(t => ({ name: t.name, vuln: getVulnerability(t, state) }))
    .sort((a, b) => b.vuln - a.vuln);

  for (const candidate of ranked) {
    const check = canAttack(state, aiGuild, candidate.name);
    if (!check.ok) continue;

    // Higher base score — defenders should actively counterattack
    return {
      strategy: 'reclaim',
      score: 70 + candidate.vuln * 0.3,
      target: candidate.name,
      reasoning: `Reclaim ${candidate.name} (vulnerability: ${Math.round(candidate.vuln)})`,
    };
  }

  return { strategy: 'reclaim', score: 0, reasoning: 'No attackable targets' };
}

function scoreSnake(state: SimulationState, aiGuild: string, enemyGuild: string): StrategyScore {
  const hq = getGuildHQ(state, aiGuild);
  if (!hq) return { strategy: 'snake', score: 0, reasoning: 'No HQ' };

  // Check if HQ is under attack or highly vulnerable
  const hqUnderAttack = state.attacks.some(a =>
    a.targetTerritory === hq.name &&
    a.defenderGuild === aiGuild &&
    (a.status === 'traveling' || a.status === 'waiting' || a.status === 'fighting')
  );

  const hqVuln = getVulnerability(hq, state);

  if (!hqUnderAttack && hqVuln < 60) {
    return { strategy: 'snake', score: 0, reasoning: 'HQ not threatened' };
  }

  // Find a better territory for HQ (recently captured with pity timer)
  const myTerritories = getGuildTerritories(state, aiGuild);
  const candidates = myTerritories
    .filter(t => t.name !== hq.name && t.pityTimerUntil > state.simTimeMs)
    .sort((a, b) => b.pityTimerUntil - a.pityTimerUntil);

  if (candidates.length === 0) {
    // No pity-protected territories, find safest
    const safest = myTerritories
      .filter(t => t.name !== hq.name)
      .map(t => ({ name: t.name, vuln: getVulnerability(t, state) }))
      .sort((a, b) => a.vuln - b.vuln);

    if (safest.length === 0 || safest[0].vuln >= hqVuln) {
      return { strategy: 'snake', score: 0, reasoning: 'No safer territory available' };
    }

    return {
      strategy: 'snake',
      score: hqUnderAttack ? 95 : 40,
      target: safest[0].name,
      reasoning: `Move HQ to safer ${safest[0].name} (vuln: ${Math.round(safest[0].vuln)} vs ${Math.round(hqVuln)})`,
    };
  }

  return {
    strategy: 'snake',
    score: hqUnderAttack ? 100 : 50,
    target: candidates[0].name,
    reasoning: `Snake HQ to pity-protected ${candidates[0].name}`,
  };
}

function executeDefenderStrategy(
  state: SimulationState,
  aiGuild: string,
  enemyGuild: string,
  strategy: StrategyScore,
): void {
  const strat = strategy.strategy as DefenderStrategy;

  switch (strat) {
    case 'tax_evasion': {
      // Reduce non-self-sufficient territories to self-sufficient levels
      const territories = getGuildTerritories(state, aiGuild);
      for (const t of territories) {
        if (isSelfSufficient(t)) continue;
        // Reduce expensive upgrades
        const costlyUpgrades: UpgradeKey[] = [
          'efficientResources', 'efficientEmeralds', 'resourceRate', 'emeraldRate',
          'resourceStorage', 'emeraldStorage',
        ];
        for (const upgrade of costlyUpgrades) {
          if (t.upgrades[upgrade] > 0) {
            setUpgradeLevel(state, t.name, upgrade, t.upgrades[upgrade] - 1, aiGuild);
            if (isSelfSufficient(t)) break;
          }
        }
      }
      break;
    }

    case 'prediction_buff':
    case 'loss_buff': {
      if (!strategy.target) break;
      const territory = state.territories[strategy.target];
      if (!territory || territory.owner !== aiGuild) break;

      // Buff defense upgrades
      const defenseUpgrades: UpgradeKey[] = ['health', 'defense', 'damage', 'attackSpeed', 'aura'];
      for (const upgrade of defenseUpgrades) {
        const current = territory.upgrades[upgrade];
        const maxLevel = upgrade === 'aura' ? 3 : 11;
        if (current < Math.min(maxLevel, current + 2)) {
          setUpgradeLevel(state, territory.name, upgrade, current + 1, aiGuild);
        }
      }
      break;
    }

    case 'reclaim': {
      if (!strategy.target) break;
      const attack = initiateAttack(state, aiGuild, strategy.target);
      if (attack) {
        addEvent(state, 'ai_decision', aiGuild,
          `AI (reclaim): ${strategy.reasoning}`,
          strategy.target,
        );
      }
      break;
    }

    case 'snake': {
      if (!strategy.target) break;
      moveHQ(state, strategy.target, aiGuild);
      addEvent(state, 'ai_decision', aiGuild,
        `AI (snake): ${strategy.reasoning}`,
        strategy.target,
      );
      break;
    }
  }
}

// Reset AI timer
export function resetDefenderAI(): void {
  lastEvalTime = 0;
}
