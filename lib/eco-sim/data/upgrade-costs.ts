// All upgrade costs and effects from the PDF Appendix B

// ============================================================
// Base Defenses (Section 7.2)
// ============================================================

// Damage (Ore) - levels 0-11
export const DAMAGE_COSTS = [0, 100, 300, 600, 1200, 2400, 4800, 8400, 12000, 15600, 19200, 22800];
export const DAMAGE_MULTIPLIERS = [0, 0.40, 0.80, 1.20, 1.60, 2.00, 2.40, 2.80, 3.20, 3.60, 4.00, 4.40];

// Attack Speed (Crop) - levels 0-11
export const ATTACK_SPEED_COSTS = [0, 100, 300, 600, 1200, 2400, 4800, 8400, 12000, 15600, 19200, 22800];
export const ATTACK_SPEED_VALUES = [0.5, 0.75, 1.0, 1.25, 1.61, 2.0, 2.5, 3.0, 3.6, 3.8, 4.2, 4.7];

// Health (Wood) - levels 0-11
export const HEALTH_COSTS = [0, 100, 300, 600, 1200, 2400, 4800, 8400, 12000, 15600, 19200, 22800];
export const HEALTH_VALUES = [300000, 450000, 600000, 750000, 960000, 1200000, 1500000, 1860000, 2220000, 2580000, 2940000, 3300000];

// Defense (Fish) - levels 0-11
export const DEFENSE_COSTS = [0, 100, 300, 600, 1200, 2400, 4800, 8400, 12000, 15600, 19200, 22800];
export const DEFENSE_PERCENTS = [0.10, 0.40, 0.55, 0.625, 0.70, 0.75, 0.79, 0.82, 0.84, 0.86, 0.88, 0.90];

// ============================================================
// Defensive Bonuses (Section 7.3)
// ============================================================

// Stronger Minions / Mob Damage (Wood) - levels 0-4
export const MOB_DAMAGE_COSTS = [0, 200, 400, 800, 1600];
export const MOB_DAMAGE_MULTIPLIERS = [1.0, 2.5, 3.0, 3.5, 4.0]; // +150%, +200%, +250%, +300%

// Tower Multi-Attacks (Fish) - levels 0-3
export const MULTIHIT_COSTS = [0, 4800, 9600, 14400]; // extremely expensive
export const MULTIHIT_TARGETS = [1, 2, 2, 3]; // max players targeted

// Tower Aura (Crop) - levels 0-3
export const AURA_COSTS = [0, 800, 1600, 3200];
export const AURA_FREQUENCY = [0, 24, 18, 12]; // seconds between aura (0 = disabled)

// Tower Volley (Ore) - levels 0-3
export const VOLLEY_COSTS = [0, 200, 400, 800];
export const VOLLEY_FREQUENCY = [0, 20, 15, 10]; // seconds between volley (0 = disabled)

// ============================================================
// Production Bonuses (Section 7.4)
// ============================================================

// Larger Resource Storage (Emerald cost) - levels 0-6
export const RESOURCE_STORAGE_COSTS = [0, 400, 800, 2000, 5000, 16000, 48000]; // emeralds/hr
export const RESOURCE_STORAGE_VALUES = [300, 600, 1200, 2400, 4500, 10200, 24000];
export const RESOURCE_STORAGE_MAX_THROUGHPUT = [18000, 36000, 72000, 144000, 270000, 612000, 1440000];

// Larger Emerald Storage (Wood cost) - levels 0-6
export const EMERALD_STORAGE_COSTS = [0, 200, 400, 1000, 2500, 8000, 24000]; // wood/hr
export const EMERALD_STORAGE_VALUES = [3000, 6000, 12000, 24000, 45000, 102000, 240000];
export const EMERALD_STORAGE_MAX_THROUGHPUT = [180000, 360000, 720000, 1440000, 2700000, 6120000, 14400000];

// Efficient Resources (Emerald cost) - levels 0-6
// Increases resource production per tick
export const EFFICIENT_RESOURCES_COSTS = [0, 6000, 12000, 24000, 48000, 96000, 192000]; // emeralds/hr
export const EFFICIENT_RESOURCES_MULTIPLIERS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]; // resource per tick multiplier

// Efficient Emeralds (Ore cost) - levels 0-3
export const EFFICIENT_EMERALDS_COSTS = [0, 2000, 8000, 52000]; // ore/hr
export const EFFICIENT_EMERALDS_MULTIPLIERS = [1.0, 1.35, 2.0, 4.0]; // emerald production multiplier

// Resource Rate (Emerald cost) - levels 0-3
// Decreases time between resource ticks
export const RESOURCE_RATE_COSTS = [0, 6000, 18000, 32000]; // emeralds/hr
export const RESOURCE_RATE_INTERVALS = [4, 3, 2, 1]; // seconds between ticks (lower = faster)

// Emerald Rate (Crop cost) - levels 0-3
export const EMERALD_RATE_COSTS = [0, 2000, 8000, 32000]; // crop/hr
export const EMERALD_RATE_INTERVALS = [4, 3, 2, 1]; // seconds between ticks

// ============================================================
// Other Bonuses (Section 7.5)
// ============================================================

// Mob Experience (Fish cost) - levels 0, 5-8 (starts at level 5)
export const MOB_XP_COSTS = [0, 3000, 5000, 10000, 20000]; // fish/hr (index 0=off, 1=lvl5, etc.)
export const MOB_XP_MULTIPLIERS = [1.0, 1.5, 1.6, 1.8, 2.0];

// Gathering XP (Crop cost) - levels 0, 5-8
export const GATHER_XP_COSTS = [0, 3000, 5000, 10000, 20000]; // crop/hr
export const GATHER_XP_MULTIPLIERS = [1.0, 1.8, 2.2, 2.6, 3.0];

// Tome Seeking (Fish cost) - levels 0-3
export const TOME_SEEKING_COSTS = [0, 400, 3200, 6400]; // fish/hr
export const TOME_SEEKING_RATES = [0, 0.15, 1.2, 2.4]; // %/hr

// Emerald Seeking (Wood cost) - levels 0, 3-5 (starts at level 3)
export const EMERALD_SEEKING_COSTS = [0, 1600, 3200, 6400]; // wood/hr
export const EMERALD_SEEKING_RATES = [0, 6, 12, 24]; // %/hr

// ============================================================
// Helper: Get total resource cost per hour for a territory's upgrades
// ============================================================

export interface UpgradeLevels {
  damage: number;        // 0-11, ore cost
  attackSpeed: number;   // 0-11, crop cost
  health: number;        // 0-11, wood cost
  defense: number;       // 0-11, fish cost
  mobDamage: number;     // 0-4, wood cost
  multihit: number;      // 0-3, fish cost
  aura: number;          // 0-3, crop cost
  volley: number;        // 0-3, ore cost
  resourceStorage: number;  // 0-6, emerald cost
  emeraldStorage: number;   // 0-6, wood cost
  efficientResources: number; // 0-6, emerald cost
  efficientEmeralds: number;  // 0-3, ore cost
  resourceRate: number;       // 0-3, emerald cost
  emeraldRate: number;        // 0-3, crop cost
  tomeSeeking: number;        // 0-3, fish cost
  emeraldSeeking: number;     // 0-3, wood cost
}

export const DEFAULT_UPGRADES: UpgradeLevels = {
  damage: 0, attackSpeed: 0, health: 0, defense: 0,
  mobDamage: 0, multihit: 0, aura: 0, volley: 0,
  resourceStorage: 0, emeraldStorage: 0,
  efficientResources: 0, efficientEmeralds: 0,
  resourceRate: 0, emeraldRate: 0,
  tomeSeeking: 0, emeraldSeeking: 0,
};

export interface ResourceCost {
  emeralds: number;
  ore: number;
  crop: number;
  wood: number;
  fish: number;
}

export function getUpgradeCostPerHour(upgrades: UpgradeLevels): ResourceCost {
  return {
    emeralds:
      RESOURCE_STORAGE_COSTS[upgrades.resourceStorage] +
      EFFICIENT_RESOURCES_COSTS[upgrades.efficientResources] +
      RESOURCE_RATE_COSTS[upgrades.resourceRate],
    ore:
      DAMAGE_COSTS[upgrades.damage] +
      VOLLEY_COSTS[upgrades.volley] +
      EFFICIENT_EMERALDS_COSTS[upgrades.efficientEmeralds],
    crop:
      ATTACK_SPEED_COSTS[upgrades.attackSpeed] +
      AURA_COSTS[upgrades.aura] +
      EMERALD_RATE_COSTS[upgrades.emeraldRate],
    wood:
      HEALTH_COSTS[upgrades.health] +
      MOB_DAMAGE_COSTS[upgrades.mobDamage] +
      EMERALD_STORAGE_COSTS[upgrades.emeraldStorage] +
      EMERALD_SEEKING_COSTS[upgrades.emeraldSeeking],
    fish:
      DEFENSE_COSTS[upgrades.defense] +
      MULTIHIT_COSTS[upgrades.multihit] +
      TOME_SEEKING_COSTS[upgrades.tomeSeeking],
  };
}
