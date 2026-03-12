// AI decision types and strategy definitions

export type AttackerStrategy = 'drain' | 'chokehold' | 'hq_snipe' | 'dry_snipe' | 'expansion';
export type DefenderStrategy = 'tax_evasion' | 'prediction_buff' | 'loss_buff' | 'reclaim' | 'snake' | 'idle';

export interface StrategyScore {
  strategy: AttackerStrategy | DefenderStrategy;
  score: number;
  target?: string;           // territory name
  reasoning: string;
  details?: Record<string, unknown>;
}

export interface AIDecision {
  guild: string;
  strategy: AttackerStrategy | DefenderStrategy;
  actions: AIAction[];
  reasoning: string;
  timestamp: number;         // sim time when decision was made
}

export type AIAction =
  | { type: 'attack'; target: string }
  | { type: 'upgrade'; territory: string; upgrade: string; level: number }
  | { type: 'downgrade'; territory: string; upgrade: string }
  | { type: 'move_hq'; territory: string }
  | { type: 'set_border'; territory: string; style: 'open' | 'closed' }
  | { type: 'set_tax'; territory: string; allyTax: number; enemyTax: number };

export interface TerritoryScore {
  name: string;
  value: number;             // overall strategic value
  vulnerability: number;     // how easy to attack (higher = more vulnerable)
  chokeScore: number;        // how much damage removing this does
  resourceValue: number;     // production value
  defensiveStrength: number; // tower EHP * DPS estimate
}
