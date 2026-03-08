"use client";

import { useReducer, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  SimulatorState,
  SimAction,
  SimTerritory,
  ResourceType,
} from '@/lib/simulator/types';
import {
  createDefaultUpgrades,
  createEmptyResources,
  getAttackCost,
  getNextLevelCost,
  getUpgradeCosts,
  getHQStorageCap,
  UPGRADE_RESOURCE,
  UPGRADE_MAX_LEVELS,
  SIM_STATE_VERSION,
  BASE_HQ_EMERALDS,
  BASE_HQ_RESOURCES,
} from '@/lib/simulator/constants';
import { tick, getTotalProduction } from '@/lib/simulator/engine';
import { buildAdjacencyMap, getConnectedTerritories } from '@/lib/simulator/routing';
import { TerritoryVerboseData, TerritoryExternalsData } from '@/lib/connection-calculator';
import { Territory } from '@/lib/utils';

const SIM_GUILD_NAME = 'Simulator';
const SIM_GUILD_PREFIX = 'SIM';

function createInitialState(): SimulatorState {
  return {
    ownedTerritories: {},
    hqTerritoryName: null,
    hqStorage: {
      resources: createEmptyResources(),
      maxEmeralds: BASE_HQ_EMERALDS,
      maxResources: BASE_HQ_RESOURCES,
    },
    tickCount: 0,
    speed: 1,
    isRunning: false,
    totalEmeraldsGenerated: 0,
    totalResourcesGenerated: 0,
    version: SIM_STATE_VERSION,
  };
}

function simReducer(state: SimulatorState, action: SimAction): SimulatorState {
  switch (action.type) {
    case 'CLAIM_TERRITORY': {
      if (state.ownedTerritories[action.name]) return state; // Already owned
      const ownedCount = Object.keys(state.ownedTerritories).length;

      const newTerritory: SimTerritory = {
        name: action.name,
        upgrades: createDefaultUpgrades(),
      };

      // First territory is auto-HQ
      const isFirstTerritory = ownedCount === 0;

      return {
        ...state,
        ownedTerritories: {
          ...state.ownedTerritories,
          [action.name]: newTerritory,
        },
        hqTerritoryName: isFirstTerritory ? action.name : state.hqTerritoryName,
      };
    }

    case 'UNCLAIM_TERRITORY': {
      if (!state.ownedTerritories[action.name]) return state;
      if (action.name === state.hqTerritoryName) return state; // Can't unclaim HQ

      const { [action.name]: _removed, ...remaining } = state.ownedTerritories;
      return {
        ...state,
        ownedTerritories: remaining,
      };
    }

    case 'SET_HQ': {
      if (!state.ownedTerritories[action.name]) return state; // Must own the territory
      return {
        ...state,
        hqTerritoryName: action.name,
      };
    }

    case 'PURCHASE_UPGRADE': {
      const terr = state.ownedTerritories[action.territoryName];
      if (!terr) return state;

      const currentLevel = terr.upgrades[action.upgrade];
      const maxLevel = UPGRADE_MAX_LEVELS[action.upgrade];
      if (currentLevel >= maxLevel) return state;

      const cost = getNextLevelCost(action.upgrade, currentLevel);
      if (cost === null) return state;

      const resourceType = UPGRADE_RESOURCE[action.upgrade];
      if (state.hqStorage.resources[resourceType] < cost) return state;

      return {
        ...state,
        ownedTerritories: {
          ...state.ownedTerritories,
          [action.territoryName]: {
            ...terr,
            upgrades: {
              ...terr.upgrades,
              [action.upgrade]: currentLevel + 1,
            },
          },
        },
        hqStorage: {
          ...state.hqStorage,
          resources: {
            ...state.hqStorage.resources,
            [resourceType]: state.hqStorage.resources[resourceType] - cost,
          },
        },
      };
    }

    case 'REFUND_UPGRADE': {
      const terr = state.ownedTerritories[action.territoryName];
      if (!terr) return state;

      const currentLevel = terr.upgrades[action.upgrade];
      if (currentLevel <= 0) return state;

      // Refund cost of current level
      const costs = getUpgradeCosts(action.upgrade);
      const refund = costs[currentLevel - 1];
      const resourceType = UPGRADE_RESOURCE[action.upgrade];

      return {
        ...state,
        ownedTerritories: {
          ...state.ownedTerritories,
          [action.territoryName]: {
            ...terr,
            upgrades: {
              ...terr.upgrades,
              [action.upgrade]: currentLevel - 1,
            },
          },
        },
        hqStorage: {
          ...state.hqStorage,
          resources: {
            ...state.hqStorage.resources,
            [resourceType]: Math.min(
              state.hqStorage.resources[resourceType] + refund,
              resourceType === 'emeralds' ? state.hqStorage.maxEmeralds : state.hqStorage.maxResources
            ),
          },
        },
      };
    }

    case 'TICK':
    case 'STEP':
      return tick(state, action.verboseData);

    case 'SET_SPEED':
      return { ...state, speed: action.speed };

    case 'TOGGLE_RUNNING':
      return { ...state, isRunning: !state.isRunning };

    case 'RESET':
      return createInitialState();

    case 'RESTORE':
      return action.state;

    default:
      return state;
  }
}

interface UseSimulatorOptions {
  verboseData: Record<string, TerritoryVerboseData> | null;
  externalsData: TerritoryExternalsData | null;
  enabled: boolean;
}

export function useSimulator({ verboseData, externalsData, enabled }: UseSimulatorOptions) {
  const [state, dispatch] = useReducer(simReducer, null, () => {
    // Try restoring from localStorage on init
    if (typeof window === 'undefined') return createInitialState();
    try {
      const cached = localStorage.getItem('sim-state');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.version === SIM_STATE_VERSION) {
          return { ...parsed, isRunning: false }; // Always restore paused
        }
      }
    } catch { /* ignore */ }
    return createInitialState();
  });

  // Save to localStorage (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('sim-state', JSON.stringify(state));
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state, enabled]);

  // Tick loop
  const verboseDataRef = useRef(verboseData);
  verboseDataRef.current = verboseData;

  useEffect(() => {
    if (!enabled || !state.isRunning || !verboseDataRef.current) return;

    const tickInterval = 60000 / state.speed;
    const intervalId = setInterval(() => {
      if (verboseDataRef.current) {
        dispatch({ type: 'TICK', verboseData: verboseDataRef.current });
      }
    }, tickInterval);

    return () => clearInterval(intervalId);
  }, [enabled, state.isRunning, state.speed]);

  // Actions
  const claimTerritory = useCallback((name: string) => {
    dispatch({ type: 'CLAIM_TERRITORY', name });
  }, []);

  const unclaimTerritory = useCallback((name: string) => {
    dispatch({ type: 'UNCLAIM_TERRITORY', name });
  }, []);

  const setHQ = useCallback((name: string) => {
    dispatch({ type: 'SET_HQ', name });
  }, []);

  const purchaseUpgrade = useCallback((territoryName: string, upgrade: keyof import('@/lib/simulator/types').TerritoryUpgrades) => {
    dispatch({ type: 'PURCHASE_UPGRADE', territoryName, upgrade });
  }, []);

  const refundUpgrade = useCallback((territoryName: string, upgrade: keyof import('@/lib/simulator/types').TerritoryUpgrades) => {
    dispatch({ type: 'REFUND_UPGRADE', territoryName, upgrade });
  }, []);

  const setSpeed = useCallback((speed: 1 | 2 | 5 | 10) => {
    dispatch({ type: 'SET_SPEED', speed });
  }, []);

  const toggleRunning = useCallback(() => {
    dispatch({ type: 'TOGGLE_RUNNING' });
  }, []);

  const stepOnce = useCallback(() => {
    if (verboseData) {
      dispatch({ type: 'STEP', verboseData });
    }
  }, [verboseData]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    localStorage.removeItem('sim-state');
  }, []);

  // Derived: owned count
  const ownedCount = Object.keys(state.ownedTerritories).length;

  // Derived: attack cost for next territory
  const nextAttackCost = getAttackCost(ownedCount);

  // Derived: total production per tick
  const totalProduction = useMemo(
    () => getTotalProduction(state, verboseData),
    [state.ownedTerritories, verboseData]
  );

  // Derived: connected territories (for visual indicators)
  const connectedTerritories = useMemo(() => {
    if (!state.hqTerritoryName || !verboseData) return new Set<string>();
    const ownedNames = new Set(Object.keys(state.ownedTerritories));
    const adjacencyMap = buildAdjacencyMap(verboseData);
    return getConnectedTerritories(state.hqTerritoryName, ownedNames, adjacencyMap);
  }, [state.ownedTerritories, state.hqTerritoryName, verboseData]);

  // Derived: synthetic Territory objects for map display
  const displayTerritories = useMemo(() => {
    const result: Record<string, Territory> = {};
    for (const name of Object.keys(state.ownedTerritories)) {
      result[name] = {
        guild: { uuid: 'sim', name: SIM_GUILD_NAME, prefix: SIM_GUILD_PREFIX },
        acquired: new Date().toISOString(),
        location: { start: [0, 0], end: [0, 0] }, // Will be overridden by real data
      };
    }
    return result;
  }, [state.ownedTerritories]);

  return {
    state,
    dispatch,
    claimTerritory,
    unclaimTerritory,
    setHQ,
    purchaseUpgrade,
    refundUpgrade,
    setSpeed,
    toggleRunning,
    stepOnce,
    reset,
    ownedCount,
    nextAttackCost,
    totalProduction,
    connectedTerritories,
    displayTerritories,
  };
}
