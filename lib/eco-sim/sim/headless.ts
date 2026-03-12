// Headless simulation runner — no RAF/browser deps, direct tick loop

import { SimulationState } from '../engine/types';
import { processTick } from '../engine/tick';

export class HeadlessRunner {
  state: SimulationState;

  constructor(state: SimulationState) {
    this.state = state;
    this.state.paused = false;
  }

  // Fast-forward by simMs milliseconds of sim-time
  // tickSize controls granularity (smaller = more accurate, slower)
  advance(simMs: number, tickSize: number = 100): void {
    this.state.paused = false;
    this.state.speed = 1;
    let remaining = simMs;
    while (remaining > 0) {
      const step = Math.min(remaining, tickSize);
      processTick(this.state, step);
      remaining -= step;
    }
  }

  // Run until condition is met or maxSimMs elapsed
  // Returns true if condition was met, false if timed out
  runUntil(
    condition: (s: SimulationState) => boolean,
    maxSimMs: number,
    tickSize: number = 100,
  ): boolean {
    this.state.paused = false;
    this.state.speed = 1;
    let elapsed = 0;
    while (elapsed < maxSimMs) {
      if (condition(this.state)) return true;
      const step = Math.min(maxSimMs - elapsed, tickSize);
      processTick(this.state, step);
      elapsed += step;
    }
    return condition(this.state);
  }

  // Deep-clone snapshot of current state
  snapshot(): SimulationState {
    return JSON.parse(JSON.stringify(this.state));
  }

  // Get territory count for a guild
  territoryCount(guildName: string): number {
    return Object.values(this.state.territories).filter(t => t.owner === guildName).length;
  }

  // Check if a guild has been eliminated (lost all territories)
  isEliminated(guildName: string): boolean {
    return this.territoryCount(guildName) === 0;
  }

  // Get sim time in readable format
  getSimTimeMinutes(): number {
    return Math.floor(this.state.simTimeMs / 60000);
  }
}
