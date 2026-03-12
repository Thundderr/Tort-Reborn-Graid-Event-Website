// Territory data loader - parses territories_verbose.json for the simulator

import { TerritoryVerboseData } from '@/lib/connection-calculator';

export interface TerritoryData {
  name: string;
  baseProduction: {
    emeralds: number;
    ore: number;
    crop: number;
    wood: number;
    fish: number;
  };
  tradingRoutes: string[];
  location: {
    start: [number, number];
    end: [number, number];
  };
}

// Parse a resource string like "9000" or "0" to number
function parseResource(val: string): number {
  return parseInt(val, 10) || 0;
}

// Load and parse all territory data from the verbose JSON
export async function loadTerritoryData(): Promise<Record<string, TerritoryData>> {
  const res = await fetch('/territories_verbose.json');
  const raw: Record<string, TerritoryVerboseData> = await res.json();
  return parseTerritoryData(raw);
}

export function parseTerritoryData(raw: Record<string, TerritoryVerboseData>): Record<string, TerritoryData> {
  const result: Record<string, TerritoryData> = {};

  for (const [name, data] of Object.entries(raw)) {
    if (!data?.resources || !data?.Location) continue; // skip malformed entries
    result[name] = {
      name,
      baseProduction: {
        emeralds: parseResource(data.resources.emeralds),
        ore: parseResource(data.resources.ore),
        crop: parseResource(data.resources.crops),
        wood: parseResource(data.resources.wood),
        fish: parseResource(data.resources.fish),
      },
      tradingRoutes: data["Trading Routes"] || [],
      location: data.Location,
    };
  }

  return result;
}

// Build an adjacency map from territory data
export function buildAdjacencyGraph(territories: Record<string, TerritoryData>): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const [name, data] of Object.entries(territories)) {
    if (!graph.has(name)) {
      graph.set(name, new Set());
    }
    for (const route of data.tradingRoutes) {
      graph.get(name)!.add(route);
      // Ensure bidirectional
      if (!graph.has(route)) {
        graph.set(route, new Set());
      }
      graph.get(route)!.add(name);
    }
  }

  return graph;
}

// Get the primary resource a territory produces (highest non-emerald production)
export function getPrimaryResource(data: TerritoryData): 'ore' | 'crop' | 'wood' | 'fish' | null {
  const { ore, crop, wood, fish } = data.baseProduction;
  const max = Math.max(ore, crop, wood, fish);
  if (max === 0) return null;
  if (ore === max) return 'ore';
  if (crop === max) return 'crop';
  if (wood === max) return 'wood';
  return 'fish';
}

// Determine territory type based on production
export function getTerritoryType(data: TerritoryData): 'standard' | 'city' | 'oasis' {
  const { emeralds, ore, crop, wood, fish } = data.baseProduction;
  const nonZeroResources = [ore, crop, wood, fish].filter(r => r > 0).length;

  // Oases produce all resources at reduced rates
  if (nonZeroResources >= 4) return 'oasis';
  // Cities have double emerald production
  if (emeralds >= 18000) return 'city';
  return 'standard';
}
