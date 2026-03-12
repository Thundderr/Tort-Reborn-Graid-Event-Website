// CLI script to run the AI arena and print results
// Usage: npx tsx scripts/run-arena.ts [scenario] [runs]
//   scenario: "small" | "medium" | "small-def" | "medium-def" | "all" (default: "small")
//   runs: number of simulations per scenario (default: 10)

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { parseTerritoryData, TerritoryData } from '../lib/eco-sim/data/territories';
import { runArena, ArenaConfig } from '../lib/eco-sim/sim/arena';
import { summarizeArena, formatSummary, RunResult } from '../lib/eco-sim/sim/metrics';
import {
  SCENARIO_SMALL,
  SCENARIO_SMALL_DEFENDER,
  SCENARIO_MEDIUM,
  SCENARIO_MEDIUM_DEFENDER,
  SCENARIO_LARGE_INVASION,
  SCENARIO_LARGE_DEFENDER,
  ScenarioConfig,
} from '../lib/eco-sim/sim/scenarios';

// Load territory data from disk
function loadTerritoryDataFromDisk(): Record<string, TerritoryData> {
  const jsonPath = path.join(__dirname, '..', 'public', 'territories_verbose.json');
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  return parseTerritoryData(raw);
}

// Parse CLI args
const scenarioArg = process.argv[2] || 'small';
const runsArg = parseInt(process.argv[3] || '10', 10);
const maxHours = parseFloat(process.argv[4] || '2'); // sim hours

const SCENARIO_MAP: Record<string, ScenarioConfig[]> = {
  'small': [SCENARIO_SMALL],
  'small-def': [SCENARIO_SMALL_DEFENDER],
  'medium': [SCENARIO_MEDIUM],
  'medium-def': [SCENARIO_MEDIUM_DEFENDER],
  'large': [SCENARIO_LARGE_INVASION],
  'large-def': [SCENARIO_LARGE_DEFENDER],
  'all': [SCENARIO_SMALL, SCENARIO_SMALL_DEFENDER, SCENARIO_MEDIUM, SCENARIO_MEDIUM_DEFENDER, SCENARIO_LARGE_INVASION, SCENARIO_LARGE_DEFENDER],
};

const scenarios = SCENARIO_MAP[scenarioArg];
if (!scenarios) {
  console.error(`Unknown scenario: "${scenarioArg}". Options: ${Object.keys(SCENARIO_MAP).join(', ')}`);
  process.exit(1);
}

console.log(`Loading territory data...`);
const territoryData = loadTerritoryDataFromDisk();
console.log(`Loaded ${Object.keys(territoryData).length} territories.\n`);

// Validate scenario territories exist
for (const scenario of scenarios) {
  const allTerrs = [...scenario.playerTerritories, ...scenario.aiTerritories];
  const missing = allTerrs.filter(t => !territoryData[t]);
  if (missing.length > 0) {
    console.error(`ERROR: Scenario "${scenario.name}" references missing territories:`);
    for (const m of missing) console.error(`  - "${m}"`);
    process.exit(1);
  }
}

// Run arenas
for (const scenario of scenarios) {
  console.log(`\nRunning arena: ${scenario.name} (${runsArg} runs, max ${maxHours}h sim-time each)...`);

  const config: ArenaConfig = {
    scenario,
    territoryData,
    runs: runsArg,
    maxSimTimeMs: maxHours * 3600 * 1000,
    sampleIntervalMs: 60_000, // sample every 1 min sim-time
  };

  const startTime = Date.now();
  const results = runArena(config);
  const elapsed = Date.now() - startTime;

  console.log(`Completed in ${(elapsed / 1000).toFixed(1)}s real time.`);

  // Print individual run summaries
  console.log(`\n--- Individual Runs ---`);
  for (const r of results) {
    const captures = r.totalCaptures > 0 ? `${r.playerCaptures}/${r.aiCaptures} captures (P/AI)` : 'no captures';
    const firstCapture = r.timeToFirstCapture !== null
      ? `first@${Math.round(r.timeToFirstCapture / 60000)}min`
      : 'none';
    console.log(
      `  Run ${r.runIndex + 1}: ${r.winner.toUpperCase()} wins | ` +
      `P:${r.finalPlayerTerritories} AI:${r.finalAITerritories} | ` +
      `${captures} | ${firstCapture} | ` +
      `strats: ${Object.entries(r.strategyCounts).map(([k, v]) => `${k}:${v}`).join(',') || 'none'}`
    );
  }

  // Print summary
  const summary = summarizeArena(results);
  console.log(formatSummary(summary));
}

console.log('\nDone.');
