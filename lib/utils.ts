export function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Territory interfaces and functions
export interface Territory {
  guild: {
    uuid: string;
    name: string;
    prefix: string;
  };
  acquired: string;
  location: {
    start: [number, number];
    end: [number, number];
  };
  resources?: {
    emeralds: string;
    ore: string;
    crops: string;
    fish: string;
    wood: string;
  };
  "Trading Routes"?: string[];
}

// Legacy interface for territories_verbose.json
export interface TerritoryVerbose {
  resources: {
    emeralds: string;
    ore: string;
    crops: string;
    fish: string;
    wood: string;
  };
  "Trading Routes": string[];
  Location: {
    start: [number, number];
    end: [number, number];
  };
  Guild: {
    uuid: string;
    name: string;
    prefix: string;
  };
  Acquired: string;
}

// Function to load territories from the database cache (managed by external bot)
export async function loadTerritories(): Promise<Record<string, Territory>> {
  try {
    // Load from our API proxy - no fallbacks, cache managed by external bot
    const apiResponse = await fetch('/api/territories', {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (apiResponse.ok) {
      const result = await apiResponse.json();
      // Check if the response contains an error
      if (result.error) {
        console.warn('Territory API error:', result.error);
        return {};
      }
      return result;
    }
    
    console.warn('Failed to load territories from cache, status:', apiResponse.status);
    return {};
  } catch (error) {
    console.error('Error loading territories:', error);
    return {};
  }
}

// Coordinate conversion utility - maps game coordinates to pixel coordinates
export function coordToPixel(coord: [number, number]): [number, number] {
  // Using Detlas as reference point:
  // Game coordinate [402, -1657] should map to pixel [2872, 4990]
  const refGameCoord = [402, -1657];
  const refPixelCoord = [2872, 4990];
  
  // Calculate offset from reference point
  const deltaX = coord[0] - refGameCoord[0];
  const deltaY = coord[1] - refGameCoord[1];
  
  // Adjusted scale factors
  const scaleX = 1.0;
  const scaleY = 1.0; // fix: Y axis now matches map image orientation
  
  // Apply small offset to shift overlays left and higher
  const pixelX = refPixelCoord[0] + deltaX * scaleX - 85;
  const pixelY = refPixelCoord[1] + deltaY * scaleY - 75;
  
  return [pixelX, pixelY];
}

// Helper function to get territory at a specific coordinate
export function getTerritoryAtCoord(coord: [number, number], territories: Record<string, Territory>): { name: string; territory: Territory } | null {
  for (const [name, territory] of Object.entries(territories)) {
    const { start, end } = territory.location;
    if (
      coord[0] >= Math.min(start[0], end[0]) &&
      coord[0] <= Math.max(start[0], end[0]) &&
      coord[1] >= Math.min(start[1], end[1]) &&
      coord[1] <= Math.max(start[1], end[1])
    ) {
      return { name, territory };
    }
  }
  return null;
}

// Guild color cache - client side
let guildColorCache: Record<string, string> | null = null;
let guildColorCacheTimestamp: number = 0;
const GUILD_COLOR_CACHE_TTL = 300000; // 5 minutes

// Load all cached guild colors from database
export async function loadGuildColors(guildNames: string[]): Promise<Record<string, string>> {
  try {
    // Check if we have a valid client-side cache
    const now = Date.now();
    if (guildColorCache && (now - guildColorCacheTimestamp) < GUILD_COLOR_CACHE_TTL) {
      // Return from cache
      const result: Record<string, string> = {};
      for (const name of guildNames) {
        if (name === 'Unclaimed') {
          result[name] = '#808080';
        } else {
          // Try prefix first, then guild name
          const lowerName = name.toLowerCase();
          result[name] = guildColorCache[lowerName] || '#808080';
        }
      }
      return result;
    }

    // Fetch all cached guild colors from database (no external API calls)
    const response = await fetch('/api/guild-colors/cached');

    if (!response.ok) {
      console.warn('Failed to fetch cached guild colors');
      // Return gray for all guilds
      const result: Record<string, string> = {};
      for (const name of guildNames) {
        result[name] = '#808080';
      }
      return result;
    }

    const data = await response.json();
    const { guildColors } = data;

    // Update client-side cache with all guild colors
    guildColorCache = {};
    for (const [key, color] of Object.entries(guildColors)) {
      guildColorCache[key.toLowerCase()] = color as string;
    }
    guildColorCacheTimestamp = now;

    // Build result map for requested guilds
    const result: Record<string, string> = {};
    for (const name of guildNames) {
      if (name === 'Unclaimed') {
        result[name] = '#808080';
      } else {
        // Try exact match first, then lowercase
        const lowerName = name.toLowerCase();
        result[name] = guildColors[name] || guildColors[lowerName] || guildColorCache[lowerName] || '#808080';
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Error loading cached guild colors:', error);
    // Return gray for all guilds on error
    const result: Record<string, string> = {};
    for (const name of guildNames) {
      result[name] = '#808080';
    }
    return result;
  }
}

// Single guild color helper (uses cached colors only)
export async function getGuildColor(guildName: string, guildPrefix?: string): Promise<string> {
  if (!guildName || guildName === 'Unclaimed') {
    return '#808080';
  }

  // Check client-side cache first
  const now = Date.now();
  if (guildColorCache && (now - guildColorCacheTimestamp) < GUILD_COLOR_CACHE_TTL) {
    // Try prefix first
    if (guildPrefix) {
      const prefixColor = guildColorCache[guildPrefix.toLowerCase()];
      if (prefixColor) return prefixColor;
    }
    // Try guild name
    const nameColor = guildColorCache[guildName.toLowerCase()];
    if (nameColor) return nameColor;
    
    // Not in cache, return gray
    return '#808080';
  }

  // Load all cached colors once and use for this guild
  const colors = await loadGuildColors([guildName]);
  return colors[guildName] || '#808080';
}
