// Arena runner: run N simulations, collect metrics

import { SimulationState, SimSetupConfig } from '../engine/types';
import { createInitialState } from '../engine/state';
import { TerritoryData } from '../data/territories';
import { HeadlessRunner } from './headless';
import { ScenarioConfig } from './scenarios';
import { RunResult } from './metrics';
import { resetAttackerAI } from '../ai/attacker';
import { resetDefenderAI } from '../ai/defender';
import { resetUpgradeAI } from '../ai/upgrades';

export interface ArenaConfig {
  scenario: ScenarioConfig;
  territoryData: Record<string, TerritoryData>;
  runs: number;
  maxSimTimeMs: number;       // max sim-time per run (e.g., 2 hours = 7_200_000)
  sampleIntervalMs: number;   // snapshot territory counts every N ms (e.g., 60_000)
}

export function runArena(config: ArenaConfig): RunResult[] {
  const results: RunResult[] = [];

  for (let i = 0; i < config.runs; i++) {
    // Reset AI module-level timers between runs
    resetAttackerAI();
    resetDefenderAI();
    resetUpgradeAI();

    const result = runSingle(config, i);
    results.push(result);
  }

  return results;
}

function runSingle(config: ArenaConfig, runIndex: number): RunResult {
  const { scenario, territoryData, maxSimTimeMs, sampleIntervalMs } = config;

  // Build setup config — both guilds are AI-controlled for arena
  const setupConfig: SimSetupConfig = {
    playerGuild: {
      name: 'Guild A',
      prefix: 'GA',
      color: '#2563eb',
      territories: scenario.playerTerritories,
      hq: scenario.playerHQ,
    },
    aiGuild: {
      name: 'Guild B',
      prefix: 'GB',
      color: '#ef4444',
      territories: scenario.aiTerritories,
      hq: scenario.aiHQ,
      role: scenario.aiRole,
      difficulty: scenario.aiDifficulty,
    },
    allies: [],
    speed: 1,
  };

  // Filter territory data to only include scenario territories + their neighbors
  // This dramatically reduces per-tick processing (437 → ~20 territories)
  const scenarioTerritories = new Set([...scenario.playerTerritories, ...scenario.aiTerritories]);
  // Add neighbors so trading routes resolve correctly
  for (const tName of scenarioTerritories) {
    const td = territoryData[tName];
    if (td) {
      for (const neighbor of td.tradingRoutes) {
        scenarioTerritories.add(neighbor);
      }
    }
  }
  const filteredData: Record<string, typeof territoryData[string]> = {};
  for (const tName of scenarioTerritories) {
    if (territoryData[tName]) filteredData[tName] = territoryData[tName];
  }

  const state = createInitialState(setupConfig, filteredData);

  // Make Guild A also AI-controlled (attacker if B is defender, defender if B is attacker)
  state.guilds['Guild A'].isAI = true;
  state.guilds['Guild A'].aiRole = scenario.aiRole === 'attacker' ? 'defender' : 'attacker';
  state.guilds['Guild A'].aiDifficulty = scenario.aiDifficulty;

  const runner = new HeadlessRunner(state);

  // Collect territory curves
  const territoryCurve: { timeMs: number; player: number; ai: number }[] = [];
  const strategyCounts: Record<string, number> = {};
  let timeToFirstCapture: number | null = null;

  const initialPlayerCount = runner.territoryCount('Guild A');
  const initialAICount = runner.territoryCount('Guild B');

  // Record initial state
  territoryCurve.push({
    timeMs: 0,
    player: initialPlayerCount,
    ai: initialAICount,
  });

  // Run simulation in chunks, sampling at intervals
  let elapsed = 0;
  while (elapsed < maxSimTimeMs) {
    const step = Math.min(sampleIntervalMs, maxSimTimeMs - elapsed);
    runner.advance(step);
    elapsed += step;

    const playerCount = runner.territoryCount('Guild A');
    const aiCount = runner.territoryCount('Guild B');

    territoryCurve.push({ timeMs: elapsed, player: playerCount, ai: aiCount });

    // Check for first capture
    if (timeToFirstCapture === null && (playerCount !== initialPlayerCount || aiCount !== initialAICount)) {
      timeToFirstCapture = elapsed;
    }

    // Count AI strategy decisions from event log
    const recentEvents = state.eventLog.filter(e =>
      e.type === 'ai_decision' &&
      e.timestamp > elapsed - sampleIntervalMs &&
      e.timestamp <= elapsed
    );
    for (const event of recentEvents) {
      const stratMatch = event.message.match(/^AI \((\w+)\)/);
      if (stratMatch) {
        const strat = stratMatch[1];
        strategyCounts[strat] = (strategyCounts[strat] || 0) + 1;
      }
    }

    // Early exit if one side eliminated
    if (playerCount === 0 || aiCount === 0) break;
  }

  const finalPlayerTerritories = runner.territoryCount('Guild A');
  const finalAITerritories = runner.territoryCount('Guild B');

  // Count captures from event log
  const captureEvents = state.eventLog.filter(e => e.type === 'territory_captured');
  const playerCaptures = captureEvents.filter(e => e.guild === 'Guild A').length;
  const aiCaptures = captureEvents.filter(e => e.guild === 'Guild B').length;

  // Determine winner
  let winner: 'player' | 'ai' | 'draw';
  if (finalPlayerTerritories === 0) {
    winner = 'ai';
  } else if (finalAITerritories === 0) {
    winner = 'player';
  } else if (finalPlayerTerritories > finalAITerritories) {
    winner = 'player';
  } else if (finalAITerritories > finalPlayerTerritories) {
    winner = 'ai';
  } else {
    winner = 'draw';
  }

  return {
    runIndex,
    scenario: scenario.name,
    finalPlayerTerritories,
    finalAITerritories,
    winner,
    simTimeMs: state.simTimeMs,
    totalCaptures: captureEvents.length,
    playerCaptures,
    aiCaptures,
    timeToFirstCapture,
    strategyCounts,
    territoryCurve,
  };
}
