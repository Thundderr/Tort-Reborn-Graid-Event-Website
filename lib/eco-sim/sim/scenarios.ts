// Predefined territory setups for arena testing
// Territory names are from territories_verbose.json

export interface ScenarioConfig {
  name: string;
  description: string;
  playerTerritories: string[];
  playerHQ: string;
  aiTerritories: string[];
  aiHQ: string;
  aiRole: 'attacker' | 'defender';
  aiDifficulty: 'easy' | 'medium' | 'hard';
}

// Small 5v5: Corrupted area vs Detlas area
// Good for basic attack/defend testing
export const SCENARIO_SMALL: ScenarioConfig = {
  name: 'Small (5v5)',
  description: 'Two adjacent 5-territory clusters near Detlas. Tests basic attack/defend behavior.',
  playerTerritories: [
    'Detlas',
    'Detlas Suburbs',
    'Scorched Trail',
    'Ancient Nemract',
    'Corrupted Tower',
  ],
  playerHQ: 'Scorched Trail',
  aiTerritories: [
    'Corrupted Warfront',
    'Corrupted Orchard',
    'Akias Ruins',
    'Corrupted Road',
    'Roots of Corruption',
  ],
  aiHQ: 'Corrupted Warfront',
  aiRole: 'attacker',
  aiDifficulty: 'medium',
};

// Medium 15v15: Detlas/Nemract region vs Corrupted/Elkurn region
// Tests chokepoints, trade routes, drain strategies
export const SCENARIO_MEDIUM: ScenarioConfig = {
  name: 'Medium (15v15)',
  description: 'Two 15-territory clusters spanning Detlas-Nemract vs Corrupted-Elkurn. Tests drain, chokepoints, trade routes.',
  playerTerritories: [
    'Detlas',
    'Detlas Suburbs',
    'Scorched Trail',
    'Cathedral Harbour',
    'Ancient Nemract',
    'Nemract Cathedral',
    'Mount Wynn Inn',
    'Nested Cliffside',
    'Blackstring Den',
    'Arachnid Woods',
    'Nivla Woods Exit',
    'Durum Malt Islet',
    'Durum Oat Islet',
    'Rooster Island',
    'Nemract',
  ],
  playerHQ: 'Cathedral Harbour',
  aiTerritories: [
    'Corrupted Warfront',
    'Corrupted Orchard',
    'Akias Ruins',
    'Corrupted Road',
    'Roots of Corruption',
    'Corrupted River',
    'Elkurn',
    'Tempo Town',
    'Road to Elkurn',
    'Blooming Boulders',
    'Alekin',
    'Nesaak Transition',
    'Desolate Valley',
    'Plains Lake',
    'Mine Base Plains',
  ],
  aiHQ: 'Corrupted Warfront',
  aiRole: 'attacker',
  aiDifficulty: 'hard',
};

// Defender scenario: AI defends, player is the (AI-controlled) attacker
export const SCENARIO_SMALL_DEFENDER: ScenarioConfig = {
  ...SCENARIO_SMALL,
  name: 'Small Defender (5v5)',
  description: 'Same as small but AI plays defender role.',
  aiRole: 'defender',
};

export const SCENARIO_MEDIUM_DEFENDER: ScenarioConfig = {
  ...SCENARIO_MEDIUM,
  name: 'Medium Defender (15v15)',
  description: 'Same as medium but AI plays defender role.',
  aiRole: 'defender',
};

// Large 65 vs 5: Attacker invades a 65-territory claim from a 5-territory foothold
// Tests full-scale invasion against an established defender
export const SCENARIO_LARGE_INVASION: ScenarioConfig = {
  name: 'Large Invasion (5 vs 65)',
  description: 'AI attacks a 65-territory Corkus/Gavel claim from a 5-territory foothold near Cathedral Harbour.',
  playerTerritories: [
    'Corkus City', 'Retrofitted Manufactory', 'Corkus City Crossroads', 'Corkus Castle',
    'Corkus Forest', 'Picnic Pond', 'Avos Temple', 'Avos Territory', 'Corkus Outskirts',
    'Fallen Factory', 'Road to Mine', 'Industrial Clearing', 'Bloody Beach', "Ava's Workshop",
    'Overrun Docks', "Founder's Statue", 'Relos', 'Ruined Houses', 'Corkus Sea Cove',
    'Corkus City Mine', 'Pirate Town', 'Volcanic Excavation', 'Balloon Airbase',
    'Zhight Island', 'Lost Atoll', 'Volcanic Isles', 'Light Peninsula', 'Entrance to Gavel',
    'Southern Outpost', 'Lighthouse Lookout', 'Legendary Island', 'Bear Zoo', 'Tree Island',
    'The Shiar', 'Llevigar', 'Royal Gate', 'Rooster Island', 'Maro Peaks',
    'Mycelial Expanse', 'Aldorei Valley Outskirts', 'Luxuriant Pond', 'Karoc Quarry',
    'Llevigar Gate', 'Fort Torann', 'Selchar', 'Durum Malt Islet', 'Nemract',
    "Skien's Island", 'Collapsed Bridge', 'Mantis Nest', "Dodegar's Forge",
    'Aldorei Springs', "Path to Light's Secret", 'Shineridge Orc Camp', 'Harnort Compound',
    'Llevigar Stables', 'Orc Road', 'Sanguine Spider Den', 'Forts in Fall', 'Xima Valley',
    'Durum Isles Barn', 'Durum Barley Islet', 'Cathedral Harbour', 'Nemract Cathedral',
    'Rocky Shore',
  ],
  playerHQ: 'Corkus City',
  aiTerritories: [
    'Ancient Nemract', 'Scorched Trail', 'Savannah Plains', 'Durum Oat Islet',
    'Mount Wynn Inn',
  ],
  aiHQ: 'Ancient Nemract',
  aiRole: 'attacker',
  aiDifficulty: 'hard',
};

export const SCENARIO_LARGE_DEFENDER: ScenarioConfig = {
  ...SCENARIO_LARGE_INVASION,
  name: 'Large Defender (5 vs 65)',
  description: 'Same as large invasion but AI plays defender (holds the 65-territory claim).',
  // Swap: AI defends the big claim, player attacks from foothold
  playerTerritories: SCENARIO_LARGE_INVASION.aiTerritories,
  playerHQ: SCENARIO_LARGE_INVASION.aiHQ,
  aiTerritories: SCENARIO_LARGE_INVASION.playerTerritories,
  aiHQ: SCENARIO_LARGE_INVASION.playerHQ,
  aiRole: 'defender',
};

// All scenarios for quick access
export const ALL_SCENARIOS: ScenarioConfig[] = [
  SCENARIO_SMALL,
  SCENARIO_SMALL_DEFENDER,
  SCENARIO_MEDIUM,
  SCENARIO_MEDIUM_DEFENDER,
  SCENARIO_LARGE_INVASION,
  SCENARIO_LARGE_DEFENDER,
];
