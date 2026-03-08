import { TerritoryVerboseData } from '@/lib/connection-calculator';

/**
 * Build adjacency map from verbose territory data.
 * Maps each territory name to its list of connected territory names (trading routes).
 */
export function buildAdjacencyMap(
  verboseData: Record<string, TerritoryVerboseData>
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const [name, data] of Object.entries(verboseData)) {
    adjacency.set(name, data["Trading Routes"] || []);
  }
  return adjacency;
}

/**
 * BFS from a territory to the HQ through owned territories only.
 * Returns the path (list of territory names from source to HQ), or null if disconnected.
 */
export function findRouteToHQ(
  fromTerritory: string,
  hqTerritory: string,
  ownedTerritories: Set<string>,
  adjacencyMap: Map<string, string[]>
): string[] | null {
  if (fromTerritory === hqTerritory) return [fromTerritory];
  if (!ownedTerritories.has(fromTerritory) || !ownedTerritories.has(hqTerritory)) return null;

  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: string[] = [fromTerritory];
  visited.add(fromTerritory);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacencyMap.get(current) || [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      if (!ownedTerritories.has(neighbor)) continue;

      parent.set(neighbor, current);
      if (neighbor === hqTerritory) {
        // Reconstruct path
        const path: string[] = [];
        let node: string | undefined = hqTerritory;
        while (node !== undefined) {
          path.unshift(node);
          node = parent.get(node);
        }
        return path;
      }

      visited.add(neighbor);
      queue.push(neighbor);
    }
  }

  return null; // No route found
}

/**
 * Check which owned territories are connected to the HQ.
 * Returns a Set of connected territory names.
 */
export function getConnectedTerritories(
  hqTerritory: string,
  ownedTerritories: Set<string>,
  adjacencyMap: Map<string, string[]>
): Set<string> {
  if (!ownedTerritories.has(hqTerritory)) return new Set();

  const connected = new Set<string>();
  const queue: string[] = [hqTerritory];
  connected.add(hqTerritory);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacencyMap.get(current) || [];

    for (const neighbor of neighbors) {
      if (connected.has(neighbor)) continue;
      if (!ownedTerritories.has(neighbor)) continue;
      connected.add(neighbor);
      queue.push(neighbor);
    }
  }

  return connected;
}
