// Metric collection and arena summary

export interface RunResult {
  runIndex: number;
  scenario: string;
  finalPlayerTerritories: number;
  finalAITerritories: number;
  winner: 'player' | 'ai' | 'draw';
  simTimeMs: number;
  totalCaptures: number;
  playerCaptures: number;
  aiCaptures: number;
  timeToFirstCapture: number | null; // ms, or null if no captures
  strategyCounts: Record<string, number>;
  territoryCurve: { timeMs: number; player: number; ai: number }[];
}

export interface ArenaSummary {
  scenario: string;
  totalRuns: number;
  winRate: { player: number; ai: number; draw: number }; // as percentages
  avgGameLengthMs: number;
  avgTerritoriesAtEnd: { player: number; ai: number };
  avgTimeToFirstCaptureMs: number | null;
  strategyFrequency: Record<string, number>; // total times each strategy was chosen
  strategyInWins: Record<string, number>;    // times each strategy appeared in winning runs
}

export function summarizeArena(results: RunResult[]): ArenaSummary {
  if (results.length === 0) {
    return {
      scenario: 'none',
      totalRuns: 0,
      winRate: { player: 0, ai: 0, draw: 0 },
      avgGameLengthMs: 0,
      avgTerritoriesAtEnd: { player: 0, ai: 0 },
      avgTimeToFirstCaptureMs: null,
      strategyFrequency: {},
      strategyInWins: {},
    };
  }

  const n = results.length;

  const playerWins = results.filter(r => r.winner === 'player').length;
  const aiWins = results.filter(r => r.winner === 'ai').length;
  const draws = results.filter(r => r.winner === 'draw').length;

  const avgGameLength = results.reduce((s, r) => s + r.simTimeMs, 0) / n;
  const avgPlayerTerr = results.reduce((s, r) => s + r.finalPlayerTerritories, 0) / n;
  const avgAITerr = results.reduce((s, r) => s + r.finalAITerritories, 0) / n;

  const firstCaptureTimes = results.map(r => r.timeToFirstCapture).filter((t): t is number => t !== null);
  const avgFirstCapture = firstCaptureTimes.length > 0
    ? firstCaptureTimes.reduce((s, t) => s + t, 0) / firstCaptureTimes.length
    : null;

  // Strategy frequency
  const stratFreq: Record<string, number> = {};
  const stratInWins: Record<string, number> = {};

  for (const r of results) {
    for (const [strat, count] of Object.entries(r.strategyCounts)) {
      stratFreq[strat] = (stratFreq[strat] || 0) + count;
      if (r.winner === 'ai') {
        stratInWins[strat] = (stratInWins[strat] || 0) + count;
      }
    }
  }

  return {
    scenario: results[0].scenario,
    totalRuns: n,
    winRate: {
      player: Math.round((playerWins / n) * 100),
      ai: Math.round((aiWins / n) * 100),
      draw: Math.round((draws / n) * 100),
    },
    avgGameLengthMs: Math.round(avgGameLength),
    avgTerritoriesAtEnd: {
      player: Math.round(avgPlayerTerr * 10) / 10,
      ai: Math.round(avgAITerr * 10) / 10,
    },
    avgTimeToFirstCaptureMs: avgFirstCapture ? Math.round(avgFirstCapture) : null,
    strategyFrequency: stratFreq,
    strategyInWins: stratInWins,
  };
}

// Format summary as readable text
export function formatSummary(summary: ArenaSummary): string {
  const lines: string[] = [];

  lines.push(`\n=== Arena Summary: ${summary.scenario} ===`);
  lines.push(`Runs: ${summary.totalRuns}`);
  lines.push(`Win Rate: Player ${summary.winRate.player}% | AI ${summary.winRate.ai}% | Draw ${summary.winRate.draw}%`);
  lines.push(`Avg Game Length: ${Math.round(summary.avgGameLengthMs / 60000)}min`);
  lines.push(`Avg Territories at End: Player ${summary.avgTerritoriesAtEnd.player} | AI ${summary.avgTerritoriesAtEnd.ai}`);

  if (summary.avgTimeToFirstCaptureMs !== null) {
    lines.push(`Avg Time to First Capture: ${Math.round(summary.avgTimeToFirstCaptureMs / 60000)}min`);
  } else {
    lines.push(`Avg Time to First Capture: Never (no captures in any run)`);
  }

  lines.push(`\nStrategy Frequency (total picks across all runs):`);
  const sortedStrats = Object.entries(summary.strategyFrequency)
    .sort((a, b) => b[1] - a[1]);
  for (const [strat, count] of sortedStrats) {
    const inWins = summary.strategyInWins[strat] || 0;
    lines.push(`  ${strat}: ${count} picks (${inWins} in AI wins)`);
  }

  return lines.join('\n');
}
