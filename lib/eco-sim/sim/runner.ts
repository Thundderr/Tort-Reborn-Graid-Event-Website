// RAF-based simulation runner with speed control

import { SimulationState } from '../engine/types';
import { processTick } from '../engine/tick';

export type SimEventCallback = (state: SimulationState) => void;

export class SimulationRunner {
  private state: SimulationState;
  private rafId: number | null = null;
  private lastTimestamp: number = 0;
  private listeners: Set<SimEventCallback> = new Set();
  private tickCount: number = 0;

  constructor(state: SimulationState) {
    this.state = state;
  }

  getState(): SimulationState {
    return this.state;
  }

  setState(state: SimulationState): void {
    this.state = state;
  }

  // Subscribe to state updates (called every frame)
  subscribe(callback: SimEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  // Start the simulation loop
  start(): void {
    if (this.rafId !== null) return;
    this.state.paused = false;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  // Pause the simulation
  pause(): void {
    this.state.paused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.notify();
  }

  // Toggle play/pause
  toggle(): void {
    if (this.state.paused) {
      this.start();
    } else {
      this.pause();
    }
  }

  // Set simulation speed (1, 2, 5, 10)
  setSpeed(speed: number): void {
    this.state.speed = Math.max(1, Math.min(100, speed));
    this.notify();
  }

  // Is the simulation running?
  isRunning(): boolean {
    return !this.state.paused && this.rafId !== null;
  }

  // Get current tick count
  getTickCount(): number {
    return this.tickCount;
  }

  // Step forward by a fixed amount of sim time (useful for debugging)
  step(simMs: number): void {
    const wasPaused = this.state.paused;
    this.state.paused = false;

    // Temporarily set speed to process the exact amount
    const savedSpeed = this.state.speed;
    this.state.speed = 1;
    processTick(this.state, simMs);
    this.state.speed = savedSpeed;

    this.state.paused = wasPaused;
    this.tickCount++;
    this.notify();
  }

  // Main RAF loop
  private loop = (timestamp: number): void => {
    const deltaMs = Math.min(timestamp - this.lastTimestamp, 100); // cap at 100ms to prevent spiral
    this.lastTimestamp = timestamp;

    if (!this.state.paused) {
      processTick(this.state, deltaMs);
      this.tickCount++;
      this.notify();
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  // Clean up
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.listeners.clear();
  }
}
