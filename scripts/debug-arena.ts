import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { parseTerritoryData } from '../lib/eco-sim/data/territories';
import { createInitialState } from '../lib/eco-sim/engine/state';
import { SCENARIO_SMALL } from '../lib/eco-sim/sim/scenarios';
import { resetAttackerAI } from '../lib/eco-sim/ai/attacker';
import { resetDefenderAI } from '../lib/eco-sim/ai/defender';
import { processTick } from '../lib/eco-sim/engine/tick';

const jsonPath = path.join(__dirname, '..', 'public', 'territories_verbose.json');
const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const territoryData = parseTerritoryData(raw);

// Filter to scenario territories + neighbors
const scenario = SCENARIO_SMALL;
const scenarioTerritories = new Set([...scenario.playerTerritories, ...scenario.aiTerritories]);
for (const tName of scenarioTerritories) {
  const td = territoryData[tName];
  if (td) for (const neighbor of td.tradingRoutes) scenarioTerritories.add(neighbor);
}
const filteredData: Record<string, typeof territoryData[string]> = {};
for (const tName of scenarioTerritories) {
  if (territoryData[tName]) filteredData[tName] = territoryData[tName];
}

const setupConfig = {
  playerGuild: { name: 'Guild A', prefix: 'GA', color: '#2563eb', territories: scenario.playerTerritories, hq: scenario.playerHQ },
  aiGuild: { name: 'Guild B', prefix: 'GB', color: '#ef4444', territories: scenario.aiTerritories, hq: scenario.aiHQ, role: scenario.aiRole as any, difficulty: scenario.aiDifficulty as any },
  allies: [],
  speed: 1,
};

const state = createInitialState(setupConfig, filteredData);
state.guilds['Guild A'].isAI = true;
state.guilds['Guild A'].aiRole = 'defender';
state.guilds['Guild A'].aiDifficulty = 'medium';

resetAttackerAI();
resetDefenderAI();
state.paused = false;
state.speed = 1;

console.log('Territories in state:', Object.keys(state.territories).length);
console.log('HQ emeralds:', state.territories[scenario.aiHQ]?.stored.emeralds);
console.log('HQ storage level:', state.territories[scenario.aiHQ]?.upgrades.emeraldStorage);

// Run 10 min of sim-time
const startTime = Date.now();
let lastEventCount = 0;
const totalTicks = 6000; // 6000 * 100ms = 600s = 10min
for (let i = 0; i < totalTicks; i++) {
  processTick(state, 100);

  if (state.eventLog.length > lastEventCount) {
    for (let j = lastEventCount; j < state.eventLog.length; j++) {
      const e = state.eventLog[j];
      console.log(`  [${(e.timestamp/1000).toFixed(1)}s] ${e.type}: ${e.message}`);
    }
    lastEventCount = state.eventLog.length;
  }
}

const elapsed = Date.now() - startTime;
console.log(`\nCompleted in ${(elapsed/1000).toFixed(1)}s real time`);
console.log(`Final state at ${(state.simTimeMs/1000).toFixed(0)}s:`);
console.log('  Attacks:', state.attacks.length);
console.log('  Guild A:', Object.values(state.territories).filter(t => t.owner === 'Guild A').length, 'territories');
console.log('  Guild B:', Object.values(state.territories).filter(t => t.owner === 'Guild B').length, 'territories');
