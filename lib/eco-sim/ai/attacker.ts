// AI Attacker: drain, chokehold, HQ snipe, dry snipe, expansion

import { SimulationState } from '../engine/types';
import { countGuildTerritories, getGuildHQ } from '../engine/state';
import { initiateAttack, canAttack } from '../engine/combat';
import { addEvent } from '../engine/state';
import { findPath } from '../engine/trade';
import { getGuildTotalStored, getGuildTotalProduction } from '../engine/economy';
import {
  StrategyScore, AIDecision, AttackerStrategy,
} from './types';
import {
  scoreEnemyTerritories, findEnemyGuild,
  getChokepointScore, getVulnerability, getDefensiveStrength, getResourceDrainImpact,
} from './evaluator';

const AI_EVAL_INTERVAL_MS = 10000; // evaluate every 10s sim-time
let lastEvalTime = 0;

// Main AI attacker tick - called from the simulation loop
export function processAttackerAI(state: SimulationState, aiGuild: string): void {
  if (state.simTimeMs - lastEvalTime < AI_EVAL_INTERVAL_MS) return;
  lastEvalTime = state.simTimeMs;

  const guild = state.guilds[aiGuild];
  if (!guild || !guild.isAI || guild.aiRole !== 'attacker') return;

  const enemyGuild = findEnemyGuild(state, aiGuild);
  if (!enemyGuild) return;

  const difficulty = guild.aiDifficulty;

  // Score all strategies
  const strategies: StrategyScore[] = [
    scoreDrainStrategy(state, aiGuild, enemyGuild),
    scoreChokeholdStrategy(state, aiGuild, enemyGuild),
    scoreHQSnipeStrategy(state, aiGuild, enemyGuild),
    scoreDrySnipeStrategy(state, aiGuild, enemyGuild),
    scoreExpansionStrategy(state, aiGuild, enemyGuild),
  ].filter(s => s.score > 0);

  if (strategies.length === 0) return;

  // Sort by score, apply difficulty randomness
  strategies.sort((a, b) => b.score - a.score);

  let chosen: StrategyScore;
  if (difficulty === 'easy') {
    // Easy AI picks randomly from top 3
    const pool = strategies.slice(0, Math.min(3, strategies.length));
    chosen = pool[Math.floor(Math.random() * pool.length)];
  } else if (difficulty === 'medium') {
    // Medium picks from top 2 with bias toward best
    if (strategies.length >= 2 && Math.random() < 0.3) {
      chosen = strategies[1];
    } else {
      chosen = strategies[0];
    }
  } else {
    // Hard always picks optimal
    chosen = strategies[0];
  }

  // Execute the chosen strategy
  executeStrategy(state, aiGuild, chosen);
}

function scoreDrainStrategy(state: SimulationState, aiGuild: string, enemyGuild: string): StrategyScore {
  const targets = scoreEnemyTerritories(state, aiGuild, enemyGuild);
  if (targets.length === 0) return { strategy: 'drain', score: 0, reasoning: 'No targets' };

  // Find territories whose capture removes a significant resource
  let bestTarget = '';
  let bestScore = 0;
  let bestReasoning = '';

  for (const target of targets) {
    const drainImpact = getResourceDrainImpact(state, target.name, enemyGuild);
    const maxImpact = drainImpact.reduce((max, d) => Math.max(max, d.percentLost), 0);

    if (maxImpact > 15) { // Significant drain if removes >15% of a resource
      const check = canAttack(state, aiGuild, target.name);
      if (!check.ok) continue;

      const score = maxImpact * 0.5 + target.vulnerability * 0.3;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = target.name;
        const drainedResource = drainImpact.find(d => d.percentLost === maxImpact);
        bestReasoning = `Drain ${drainedResource?.resource} (${Math.round(maxImpact)}% loss)`;
      }
    }
  }

  return {
    strategy: 'drain',
    score: bestScore,
    target: bestTarget,
    reasoning: bestReasoning || 'No viable drain targets',
  };
}

function scoreChokeholdStrategy(state: SimulationState, aiGuild: string, enemyGuild: string): StrategyScore {
  const targets = scoreEnemyTerritories(state, aiGuild, enemyGuild);
  if (targets.length === 0) return { strategy: 'chokehold', score: 0, reasoning: 'No targets' };

  // Find chokepoints that disconnect enemy territories
  let bestTarget = '';
  let bestScore = 0;

  for (const target of targets) {
    if (target.chokeScore < 2) continue; // must disconnect at least 2 territories
    const check = canAttack(state, aiGuild, target.name);
    if (!check.ok) continue;

    const score = target.chokeScore * 20 + target.vulnerability * 0.2;
    if (score > bestScore) {
      bestScore = score;
      bestTarget = target.name;
    }
  }

  return {
    strategy: 'chokehold',
    score: bestScore,
    target: bestTarget,
    reasoning: bestScore > 0
      ? `Chokepoint disconnects ${Math.round(bestScore / 20)} territories`
      : 'No chokepoints found',
  };
}

function scoreHQSnipeStrategy(state: SimulationState, aiGuild: string, enemyGuild: string): StrategyScore {
  const enemyHQ = getGuildHQ(state, enemyGuild);
  if (!enemyHQ) return { strategy: 'hq_snipe', score: 0, reasoning: 'No enemy HQ' };

  // Check if HQ is adjacent or close
  const check = canAttack(state, aiGuild, enemyHQ.name);
  if (!check.ok) return { strategy: 'hq_snipe', score: 0, reasoning: check.reason || 'Cannot attack HQ' };

  const vulnerability = getVulnerability(enemyHQ, state);
  const connections = enemyHQ.tradingRoutes.filter(n => {
    const t = state.territories[n];
    return t && t.owner === enemyGuild;
  }).length;

  // HQ snipe is valuable if HQ is reachable and somewhat vulnerable
  let score = 0;
  if (connections <= 2) {
    // Weakly connected HQ — high priority
    score = 70 + vulnerability * 0.3;
  } else if (connections <= 4 && vulnerability > 30) {
    // Moderately connected but vulnerable
    score = 50 + vulnerability * 0.3;
  } else if (vulnerability > 50) {
    // Well connected but still vulnerable
    score = 30 + vulnerability * 0.2;
  }

  return {
    strategy: 'hq_snipe',
    score,
    target: enemyHQ.name,
    reasoning: score > 0
      ? `HQ has ${connections} connections, vulnerability ${Math.round(vulnerability)}`
      : 'HQ too well defended',
  };
}

function scoreDrySnipeStrategy(state: SimulationState, aiGuild: string, enemyGuild: string): StrategyScore {
  const enemyHQ = getGuildHQ(state, enemyGuild);
  if (!enemyHQ) return { strategy: 'dry_snipe', score: 0, reasoning: 'No enemy HQ' };

  const check = canAttack(state, aiGuild, enemyHQ.name);
  if (!check.ok) return { strategy: 'dry_snipe', score: 0, reasoning: check.reason || 'Cannot reach HQ' };

  // Check if enemy is resource-drained
  const enemyStored = getGuildTotalStored(state, enemyGuild);
  const enemyProd = getGuildTotalProduction(state, enemyGuild);

  // Check if enemy is resource-drained relative to their territory count
  const enemyTerrCount = Object.values(state.territories).filter(t => t.owner === enemyGuild).length;
  const emeraldsPerTerritory = enemyStored.emeralds / Math.max(1, enemyTerrCount);
  const isDrained = (
    emeraldsPerTerritory < 500 || // low emeralds per territory
    (enemyStored.emeralds < 5000 && enemyProd.emeralds < 10000) // or absolute low
  );

  if (!isDrained) {
    return { strategy: 'dry_snipe', score: 0, reasoning: 'Enemy not drained enough' };
  }

  const vulnerability = getVulnerability(enemyHQ, state);
  const score = 90 + vulnerability * 0.1; // high priority when conditions met

  return {
    strategy: 'dry_snipe',
    score,
    target: enemyHQ.name,
    reasoning: `Enemy drained (${Math.round(enemyStored.emeralds)} emeralds), HQ vulnerable`,
  };
}

function scoreExpansionStrategy(state: SimulationState, aiGuild: string, enemyGuild: string): StrategyScore {
  const targets = scoreEnemyTerritories(state, aiGuild, enemyGuild);
  if (targets.length === 0) return { strategy: 'expansion', score: 0, reasoning: 'No targets' };

  // Pick the most vulnerable adjacent territory
  for (const target of targets) {
    const check = canAttack(state, aiGuild, target.name);
    if (!check.ok) continue;

    return {
      strategy: 'expansion',
      score: 20 + target.vulnerability * 0.3 + target.resourceValue / 10000,
      target: target.name,
      reasoning: `Expand to ${target.name} (vulnerability: ${Math.round(target.vulnerability)})`,
    };
  }

  return { strategy: 'expansion', score: 0, reasoning: 'No attackable targets' };
}

function executeStrategy(state: SimulationState, aiGuild: string, strategy: StrategyScore): void {
  if (!strategy.target) return;

  const check = canAttack(state, aiGuild, strategy.target);
  if (!check.ok) return;

  const attack = initiateAttack(state, aiGuild, strategy.target);
  if (attack) {
    addEvent(state, 'ai_decision', aiGuild,
      `AI (${strategy.strategy}): ${strategy.reasoning}`,
      strategy.target,
      { strategy: strategy.strategy, score: strategy.score },
    );
  }
}

// Reset AI timer (call when state is reset)
export function resetAttackerAI(): void {
  lastEvalTime = 0;
}
