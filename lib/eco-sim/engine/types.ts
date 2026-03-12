// Core simulation types

import { UpgradeLevels } from '../data/upgrade-costs';

export interface ResourceSet {
  emeralds: number;
  ore: number;
  crop: number;
  wood: number;
  fish: number;
}

export const EMPTY_RESOURCES: ResourceSet = { emeralds: 0, ore: 0, crop: 0, wood: 0, fish: 0 };

export type ResourceKey = keyof ResourceSet;
export const RESOURCE_KEYS: ResourceKey[] = ['emeralds', 'ore', 'crop', 'wood', 'fish'];
export const NON_EMERALD_KEYS: ResourceKey[] = ['ore', 'crop', 'wood', 'fish'];

export interface SimTerritory {
  name: string;
  owner: string;               // guild name, or '' for unclaimed
  hq: boolean;
  stored: ResourceSet;         // current storage amounts
  baseProduction: ResourceSet; // per-hour base rates
  upgrades: UpgradeLevels;
  tradingRoutes: string[];     // connected territory names
  location: { start: [number, number]; end: [number, number] };
  acquiredAt: number;          // sim timestamp ms when captured
  pityTimerUntil: number;      // sim timestamp ms when pity expires (0 if none)
  borderStyle: 'open' | 'closed';
  tradeStyle: 'cheapest' | 'fastest';
  allyTax: number;             // 5-60
  enemyTax: number;            // 5-60
  treasuryLevel: number;       // 0-4, increases over time held
}

export interface AttackState {
  id: string;                  // unique attack id
  attackerGuild: string;
  defenderGuild: string;
  targetTerritory: string;
  path: string[];              // territories in the attack path
  hops: number;
  emeraldCost: number;
  queuedAt: number;            // sim timestamp ms
  arrivesAt: number;           // sim timestamp ms when emeralds arrive
  warStartsAt: number;         // arrivesAt + WAR_WAIT_PERIOD
  // Tower stats are locked at queue time
  lockedDefense: {
    damage: number;
    attackSpeed: number;
    health: number;
    defense: number;
    aura: number;
    volley: number;
    mobDamage: number;
    multihit: number;
    connections: number;
    isHQ: boolean;
    externals: number;
  };
  status: 'traveling' | 'waiting' | 'fighting' | 'completed' | 'cancelled';
  result?: 'attacker_won' | 'defender_won';
}

export interface GuildState {
  name: string;
  prefix: string;
  color: string;
  allies: string[];
  hqTerritory: string | null;
  isAI: boolean;
  aiRole: 'attacker' | 'defender' | null;
  aiDifficulty: 'easy' | 'medium' | 'hard';
}

export type SimEventType =
  | 'territory_captured'
  | 'attack_queued'
  | 'attack_cancelled'
  | 'war_started'
  | 'war_ended'
  | 'upgrade_changed'
  | 'hq_moved'
  | 'resources_taxed'
  | 'ai_decision'
  | 'pity_expired'
  | 'territory_drained';

export interface SimEvent {
  id: number;
  timestamp: number;           // sim time ms
  type: SimEventType;
  guild: string;
  territory?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SimulationState {
  simTimeMs: number;           // simulated elapsed time
  speed: number;               // 1, 2, 5, 10
  paused: boolean;
  territories: Record<string, SimTerritory>;
  guilds: Record<string, GuildState>;
  attacks: AttackState[];
  eventLog: SimEvent[];
  nextEventId: number;
  // Tick accumulators (track partial ticks at sub-intervals)
  accFastTick: number;
  accEconomyTick: number;
  accDistributionTick: number;
}

// Setup configuration before simulation starts
export interface SimSetupConfig {
  playerGuild: {
    name: string;
    prefix: string;
    color: string;
    territories: string[];     // territory names claimed
    hq: string;                // which territory is HQ
  };
  aiGuild: {
    name: string;
    prefix: string;
    color: string;
    territories: string[];
    hq: string;
    role: 'attacker' | 'defender';
    difficulty: 'easy' | 'medium' | 'hard';
  };
  allies: string[];            // other guild names that are allies
  speed: number;
}
