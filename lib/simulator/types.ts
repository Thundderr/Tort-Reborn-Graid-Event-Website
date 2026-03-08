export type ResourceType = 'emeralds' | 'ore' | 'wood' | 'fish' | 'crops';

export interface TerritoryUpgrades {
  // Tower stats (0-11)
  damage: number;
  attackSpeed: number;
  health: number;
  defense: number;
  // Bonus upgrades (0-3)
  aura: number;
  volley: number;
  strongerMinions: number;
  multiAttack: number;
  // Seeking upgrades (0-3)
  xpSeeking: number;
  tomeSeeking: number;
  emeraldSeeking: number;
  // Storage/gathering upgrades (0-3)
  largerStorage: number;
  efficientResources: number;
  resourceRate: number;
}

export interface ResourceAmounts {
  emeralds: number;
  ore: number;
  wood: number;
  fish: number;
  crops: number;
}

export interface SimTerritory {
  name: string;
  upgrades: TerritoryUpgrades;
}

export interface HQStorage {
  resources: ResourceAmounts;
  maxEmeralds: number;
  maxResources: number; // same cap for ore/wood/fish/crops
}

export interface SimulatorState {
  ownedTerritories: Record<string, SimTerritory>; // keyed by territory name
  hqTerritoryName: string | null;
  hqStorage: HQStorage;
  tickCount: number;
  speed: 1 | 2 | 5 | 10;
  isRunning: boolean;
  totalEmeraldsGenerated: number;
  totalResourcesGenerated: number;
  version: number; // schema version for localStorage compatibility
}

export type SimAction =
  | { type: 'CLAIM_TERRITORY'; name: string }
  | { type: 'UNCLAIM_TERRITORY'; name: string }
  | { type: 'SET_HQ'; name: string }
  | { type: 'PURCHASE_UPGRADE'; territoryName: string; upgrade: keyof TerritoryUpgrades }
  | { type: 'REFUND_UPGRADE'; territoryName: string; upgrade: keyof TerritoryUpgrades }
  | { type: 'TICK'; verboseData: Record<string, import('@/lib/connection-calculator').TerritoryVerboseData> }
  | { type: 'SET_SPEED'; speed: 1 | 2 | 5 | 10 }
  | { type: 'TOGGLE_RUNNING' }
  | { type: 'STEP'; verboseData: Record<string, import('@/lib/connection-calculator').TerritoryVerboseData> }
  | { type: 'RESET' }
  | { type: 'RESTORE'; state: SimulatorState };
