// Main tick dispatcher - orchestrates fast, economy, and distribution ticks

import { SimulationState } from './types';
import { processEconomyTick } from './economy';
import { processDistributionTick } from './trade';
import { processAttackTick, processPityTimers, updateTreasury } from './combat';
import {
  FAST_TICK_INTERVAL,
  ECONOMY_TICK_INTERVAL,
  DISTRIBUTION_TICK_INTERVAL,
} from '../data/constants';
import { processAttackerAI } from '../ai/attacker';
import { processDefenderAI } from '../ai/defender';
import { processUpgradeAI } from '../ai/upgrades';

// Process a single frame's worth of simulation time
// deltaMs = real-time milliseconds since last frame
// Returns the number of sim-time milliseconds processed
export function processTick(state: SimulationState, deltaMs: number): number {
  if (state.paused) return 0;

  // Convert real time to sim time based on speed
  const simDelta = deltaMs * state.speed;
  state.simTimeMs += simDelta;

  // Accumulate time for each tick type
  state.accFastTick += simDelta;
  state.accEconomyTick += simDelta;
  state.accDistributionTick += simDelta;

  // Process fast ticks (100ms sim-time intervals)
  // Cap iterations to prevent spiral of death at very high speeds
  let fastIterations = 0;
  while (state.accFastTick >= FAST_TICK_INTERVAL && fastIterations < 100) {
    state.accFastTick -= FAST_TICK_INTERVAL;
    processAttackTick(state);
    processPityTimers(state);
    fastIterations++;
  }
  // If we still have excess, reset to prevent accumulation
  if (state.accFastTick >= FAST_TICK_INTERVAL * 10) {
    state.accFastTick = 0;
  }

  // Process economy ticks (1s sim-time intervals)
  let econIterations = 0;
  while (state.accEconomyTick >= ECONOMY_TICK_INTERVAL && econIterations < 60) {
    state.accEconomyTick -= ECONOMY_TICK_INTERVAL;
    processEconomyTick(state);
    updateTreasury(state);
    econIterations++;
  }
  if (state.accEconomyTick >= ECONOMY_TICK_INTERVAL * 10) {
    state.accEconomyTick = 0;
  }

  // Process distribution ticks (60s sim-time intervals)
  let distIterations = 0;
  while (state.accDistributionTick >= DISTRIBUTION_TICK_INTERVAL && distIterations < 5) {
    state.accDistributionTick -= DISTRIBUTION_TICK_INTERVAL;
    processDistributionTick(state);
    distIterations++;
  }
  if (state.accDistributionTick >= DISTRIBUTION_TICK_INTERVAL * 5) {
    state.accDistributionTick = 0;
  }

  // Process AI decisions (runs on its own internal timer)
  for (const guild of Object.values(state.guilds)) {
    if (!guild.isAI) continue;
    // Both roles upgrade territories
    processUpgradeAI(state, guild.name);
    // Role-specific strategy
    if (guild.aiRole === 'attacker') {
      processAttackerAI(state, guild.name);
    } else if (guild.aiRole === 'defender') {
      processDefenderAI(state, guild.name);
    }
  }

  return simDelta;
}

// Format sim time as human-readable string
export function formatSimTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

// Get sim time breakdown
export function getSimTimeBreakdown(ms: number): { hours: number; minutes: number; seconds: number } {
  const totalSeconds = Math.floor(ms / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
