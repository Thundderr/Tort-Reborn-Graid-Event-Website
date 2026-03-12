// Game mechanic constants from the MALD Eco Guide

// Base production rates (per hour)
export const BASE_EMERALD_PRODUCTION = 9000;
export const BASE_RESOURCE_PRODUCTION = 3600;
export const CITY_EMERALD_PRODUCTION = 18000; // double for cities
export const OASIS_EMERALD_PRODUCTION = 1800;
export const OASIS_RESOURCE_PRODUCTION = 900; // all 5 resources

// Tax ranges
export const MIN_ALLY_TAX = 5;
export const MAX_ENEMY_TAX = 40;
export const DEFAULT_ALLY_TAX = 5;
export const DEFAULT_ENEMY_TAX = 40;

// Timers (in milliseconds of sim time)
export const PITY_TIMER_MS = 10 * 60 * 1000; // 10 minutes
export const BASE_ATTACK_TIMER_MS = 2 * 60 * 1000; // 2 minutes
export const PER_HOP_ATTACK_TIMER_MS = 1 * 60 * 1000; // 1 minute per additional hop
export const WAR_WAIT_PERIOD_MS = 25 * 1000; // 25 seconds grace period before war starts
export const CONNECTION_BONUS = 0.30; // +30% per owned connection (wiki-accurate)

// Attack costs (emeralds) based on attacker's territory count
export const ATTACK_COSTS: Record<string, number> = {
  '0': 0,    // free with 0 territories
  '1': 200,
  '2': 800,
  '3': 2000,
  '4+': 4000,
};

export function getAttackCost(territoryCount: number): number {
  if (territoryCount <= 0) return 0;
  if (territoryCount === 1) return 200;
  if (territoryCount === 2) return 800;
  if (territoryCount === 3) return 2000;
  return 4000;
}

// Tick intervals (in sim-time milliseconds)
export const FAST_TICK_INTERVAL = 100;    // attack timers, pity timers
export const ECONOMY_TICK_INTERVAL = 1000; // resource production
export const DISTRIBUTION_TICK_INTERVAL = 60000; // resource flow along trade routes

// Resource move interval in-game: every 60s (4s real tick period)
export const RESOURCE_MOVE_INTERVAL_MS = 60000;

// Max simultaneous attacks per guild
export const MAX_CONCURRENT_ATTACKS = 3;

// Multihit territory limit
export const MAX_MULTIHIT_TERRITORIES = 5;

// Tower damage increase per minute during war
export const WAR_DAMAGE_INCREASE_PER_MINUTE = 1; // +1 level equivalent per minute

// Territory ceding requirements
export const MIN_TERRITORIES_TO_CEDE = 4;
export const MIN_HOLD_TIME_TO_CEDE_MS = 60 * 60 * 1000; // 1 hour

// Storage base values
export const BASE_EMERALD_STORAGE = 3000;
export const BASE_RESOURCE_STORAGE = 300;

// Production intervals: resources produce every 4 seconds in-game
export const PRODUCTION_INTERVAL_SECONDS = 4;
export const EMERALD_PER_TICK = 10; // 10 emeralds every 4s = 9000/hr
export const RESOURCE_PER_TICK = 4; // 4 resource every 4s = 3600/hr
