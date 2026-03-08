"use client";

import React, { useMemo } from 'react';
import { SimTerritory, TerritoryUpgrades, ResourceType } from '@/lib/simulator/types';
import { TerritoryVerboseData, TerritoryExternalsData } from '@/lib/connection-calculator';
import {
  UPGRADE_RESOURCE,
  UPGRADE_NAMES,
  UPGRADE_MAX_LEVELS,
  RESOURCE_COLORS,
  RESOURCE_NAMES,
  getNextLevelCost,
  getAttackCost,
} from '@/lib/simulator/constants';
import {
  calculateEffectiveHP,
  calculateAvgDPS,
  getDefenseTier,
  formatNumber,
} from '@/lib/tower-stats';
import { calculateConnections } from '@/lib/connection-calculator';
import { Territory } from '@/lib/utils';
import { buildAdjacencyMap, findRouteToHQ } from '@/lib/simulator/routing';

interface SimTerritoryPanelProps {
  territoryName: string;
  simTerritory: SimTerritory | null; // null if unowned
  verboseData: Record<string, TerritoryVerboseData> | null;
  externalsData: TerritoryExternalsData | null;
  ownedTerritories: Record<string, SimTerritory>;
  hqTerritoryName: string | null;
  hqEmeralds: number;
  hqResources: { ore: number; wood: number; fish: number; crops: number; emeralds: number };
  ownedCount: number;
  connectedTerritories: Set<string>;
  onClose: () => void;
  onClaim: (name: string) => void;
  onUnclaim: (name: string) => void;
  onSetHQ: (name: string) => void;
  onPurchaseUpgrade: (name: string, upgrade: keyof TerritoryUpgrades) => void;
  onRefundUpgrade: (name: string, upgrade: keyof TerritoryUpgrades) => void;
}

function UpgradeRow({
  label,
  upgrade,
  level,
  maxLevel,
  resourceType,
  available,
  onIncrease,
  onDecrease,
}: {
  label: string;
  upgrade: keyof TerritoryUpgrades;
  level: number;
  maxLevel: number;
  resourceType: ResourceType;
  available: number;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  const nextCost = getNextLevelCost(upgrade, level);
  const canAfford = nextCost !== null && available >= nextCost;
  const resColor = RESOURCE_COLORS[resourceType];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '0.35rem',
      fontSize: '0.8rem',
    }}>
      <span style={{ color: 'var(--text-secondary)', minWidth: '100px', fontSize: '0.75rem' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {nextCost !== null && (
          <span style={{
            fontSize: '0.65rem',
            color: canAfford ? resColor : '#EF5350',
            minWidth: '55px',
            textAlign: 'right',
          }}>
            {nextCost.toLocaleString()} {RESOURCE_NAMES[resourceType].slice(0, 3)}
          </span>
        )}
        <button
          onClick={onDecrease}
          disabled={level <= 0}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            background: level <= 0 ? 'var(--bg-secondary)' : '#6b3a3a',
            color: level <= 0 ? 'var(--text-secondary)' : '#ffcccc',
            cursor: level <= 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
        >-</button>
        <span style={{
          minWidth: '20px',
          textAlign: 'center',
          color: 'var(--text-primary)',
          fontWeight: '600',
          fontSize: '0.8rem',
        }}>
          {level}
        </span>
        <button
          onClick={onIncrease}
          disabled={level >= maxLevel || !canAfford}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            background: (level >= maxLevel || !canAfford) ? 'var(--bg-secondary)' : '#3a5a3a',
            color: (level >= maxLevel || !canAfford) ? 'var(--text-secondary)' : '#ccffcc',
            cursor: (level >= maxLevel || !canAfford) ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
          }}
        >+</button>
      </div>
    </div>
  );
}

export default function SimTerritoryPanel({
  territoryName,
  simTerritory,
  verboseData,
  externalsData,
  ownedTerritories,
  hqTerritoryName,
  hqEmeralds,
  hqResources,
  ownedCount,
  connectedTerritories,
  onClose,
  onClaim,
  onUnclaim,
  onSetHQ,
  onPurchaseUpgrade,
  onRefundUpgrade,
}: SimTerritoryPanelProps) {
  const isOwned = !!simTerritory;
  const isHQ = territoryName === hqTerritoryName;
  const isConnected = connectedTerritories.has(territoryName);

  // Get production info
  const production = useMemo(() => {
    if (!verboseData) return null;
    const data = verboseData[territoryName];
    if (!data?.resources) return null;
    return data.resources;
  }, [territoryName, verboseData]);

  // Route to HQ info
  const routeInfo = useMemo(() => {
    if (!isOwned || !hqTerritoryName || !verboseData || isHQ) return null;
    const ownedNames = new Set(Object.keys(ownedTerritories));
    const adjacencyMap = buildAdjacencyMap(verboseData);
    const route = findRouteToHQ(territoryName, hqTerritoryName, ownedNames, adjacencyMap);
    if (!route) return { connected: false, hops: 0, taxPercent: 0 };
    const intermediateHops = Math.max(0, route.length - 2);
    const taxPercent = Math.round((1 - Math.pow(0.95, intermediateHops)) * 100);
    return { connected: true, hops: route.length - 1, taxPercent };
  }, [territoryName, hqTerritoryName, ownedTerritories, verboseData, isOwned, isHQ]);

  // Connection count for tower stat bonuses
  const connections = useMemo(() => {
    if (!isOwned || !verboseData) return 0;
    // Build synthetic territories for connection calculation
    const synthTerritories: Record<string, Territory> = {};
    for (const name of Object.keys(ownedTerritories)) {
      synthTerritories[name] = {
        guild: { uuid: 'sim', name: 'Simulator', prefix: 'SIM' },
        acquired: new Date().toISOString(),
        location: { start: [0, 0], end: [0, 0] },
      };
    }
    const result = calculateConnections(territoryName, 'Simulator', synthTerritories, verboseData);
    return result.owned;
  }, [territoryName, ownedTerritories, verboseData, isOwned]);

  // Tower stats
  const towerStats = useMemo(() => {
    if (!simTerritory) return null;
    const u = simTerritory.upgrades;
    const ehp = calculateEffectiveHP(u.health, u.defense, connections, isHQ, 0);
    const dps = calculateAvgDPS(u.damage, u.attackSpeed, connections, isHQ, 0);
    const tier = getDefenseTier(u.damage, u.attackSpeed, u.health, u.defense, u.aura, u.volley, isHQ);
    return { ehp, dps, tier };
  }, [simTerritory, connections, isHQ]);

  const attackCost = getAttackCost(ownedCount);
  const canAffordClaim = hqEmeralds >= attackCost || ownedCount === 0;

  // Section header style
  const sectionHeader = {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.35rem',
    marginTop: '0.75rem',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        width: '320px',
        backgroundColor: 'var(--bg-card-solid)',
        border: '2px solid var(--border-color)',
        borderRadius: '0.5rem',
        padding: '1rem',
        zIndex: 1001,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        pointerEvents: 'auto',
        maxHeight: 'calc(100vh - 8rem)',
        overflowY: 'auto',
        userSelect: 'text',
        cursor: 'default',
      }}
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          width: '1.5rem',
          height: '1.5rem',
          borderRadius: '0.25rem',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: '1',
        }}
      >×</button>

      {/* Territory Name */}
      <div style={{
        fontWeight: 'bold',
        fontSize: '1.1rem',
        color: 'var(--text-primary)',
        marginBottom: '0.25rem',
        paddingRight: '2rem',
      }}>
        {territoryName}
      </div>

      {/* Status badges */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        {isOwned && (
          <span style={{
            fontSize: '0.65rem',
            padding: '0.15rem 0.4rem',
            borderRadius: '0.25rem',
            background: '#00BCD4',
            color: '#fff',
            fontWeight: '600',
          }}>OWNED</span>
        )}
        {isHQ && (
          <span style={{
            fontSize: '0.65rem',
            padding: '0.15rem 0.4rem',
            borderRadius: '0.25rem',
            background: '#FFD700',
            color: '#000',
            fontWeight: '600',
          }}>HQ</span>
        )}
        {isOwned && !isConnected && !isHQ && (
          <span style={{
            fontSize: '0.65rem',
            padding: '0.15rem 0.4rem',
            borderRadius: '0.25rem',
            background: '#EF5350',
            color: '#fff',
            fontWeight: '600',
          }}>DISCONNECTED</span>
        )}
      </div>

      {/* Resources */}
      {production && (
        <div style={{ marginBottom: '0.5rem' }}>
          {Object.entries(production).map(([type, amount]) => {
            const val = parseInt(amount || '0');
            if (val <= 0) return null;
            const resType = type as ResourceType;
            return (
              <div key={type} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                <span style={{ color: RESOURCE_COLORS[resType] || 'var(--text-secondary)' }}>+{val.toLocaleString()}</span>{' '}
                {RESOURCE_NAMES[resType] || type} / hr
              </div>
            );
          })}
        </div>
      )}

      {/* Claim / Unclaim buttons */}
      {!isOwned && (
        <button
          onClick={() => onClaim(territoryName)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            background: '#00BCD4',
            color: '#fff',
            fontWeight: '600',
            fontSize: '0.85rem',
            transition: 'all 0.15s ease',
          }}
        >
          Claim Territory
        </button>
      )}

      {isOwned && !isHQ && (
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem' }}>
          <button
            onClick={() => onSetHQ(territoryName)}
            style={{
              flex: 1,
              padding: '0.35rem',
              borderRadius: '0.375rem',
              border: '1px solid #FFD700',
              cursor: 'pointer',
              background: 'transparent',
              color: '#FFD700',
              fontWeight: '600',
              fontSize: '0.75rem',
            }}
          >Set as HQ</button>
          <button
            onClick={() => { onUnclaim(territoryName); onClose(); }}
            style={{
              flex: 1,
              padding: '0.35rem',
              borderRadius: '0.375rem',
              border: '1px solid #EF5350',
              cursor: 'pointer',
              background: 'transparent',
              color: '#EF5350',
              fontWeight: '600',
              fontSize: '0.75rem',
            }}
          >Unclaim</button>
        </div>
      )}

      {/* Route info */}
      {isOwned && routeInfo && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          {routeInfo.connected ? (
            <>Route: {routeInfo.hops} hop{routeInfo.hops !== 1 ? 's' : ''} to HQ ({routeInfo.taxPercent}% tax)</>
          ) : (
            <span style={{ color: '#EF5350' }}>No route to HQ - resources cannot flow</span>
          )}
        </div>
      )}

      {/* Upgrades section (only if owned) */}
      {isOwned && simTerritory && (
        <>
          {/* Tower Stats */}
          <div style={sectionHeader}>Tower Upgrades</div>
          {(['damage', 'attackSpeed', 'health', 'defense'] as const).map(upgrade => (
            <UpgradeRow
              key={upgrade}
              label={UPGRADE_NAMES[upgrade]}
              upgrade={upgrade}
              level={simTerritory.upgrades[upgrade]}
              maxLevel={UPGRADE_MAX_LEVELS[upgrade]}
              resourceType={UPGRADE_RESOURCE[upgrade]}
              available={hqResources[UPGRADE_RESOURCE[upgrade]]}
              onIncrease={() => onPurchaseUpgrade(territoryName, upgrade)}
              onDecrease={() => onRefundUpgrade(territoryName, upgrade)}
            />
          ))}

          {/* Bonus Upgrades */}
          <div style={sectionHeader}>Bonus Upgrades</div>
          {(['aura', 'volley', 'strongerMinions', 'multiAttack'] as const).map(upgrade => (
            <UpgradeRow
              key={upgrade}
              label={UPGRADE_NAMES[upgrade]}
              upgrade={upgrade}
              level={simTerritory.upgrades[upgrade]}
              maxLevel={UPGRADE_MAX_LEVELS[upgrade]}
              resourceType={UPGRADE_RESOURCE[upgrade]}
              available={hqResources[UPGRADE_RESOURCE[upgrade]]}
              onIncrease={() => onPurchaseUpgrade(territoryName, upgrade)}
              onDecrease={() => onRefundUpgrade(territoryName, upgrade)}
            />
          ))}

          {/* Seeking */}
          <div style={sectionHeader}>Seeking Upgrades</div>
          {(['xpSeeking', 'tomeSeeking', 'emeraldSeeking'] as const).map(upgrade => (
            <UpgradeRow
              key={upgrade}
              label={UPGRADE_NAMES[upgrade]}
              upgrade={upgrade}
              level={simTerritory.upgrades[upgrade]}
              maxLevel={UPGRADE_MAX_LEVELS[upgrade]}
              resourceType={UPGRADE_RESOURCE[upgrade]}
              available={hqResources[UPGRADE_RESOURCE[upgrade]]}
              onIncrease={() => onPurchaseUpgrade(territoryName, upgrade)}
              onDecrease={() => onRefundUpgrade(territoryName, upgrade)}
            />
          ))}

          {/* Storage/Gathering */}
          <div style={sectionHeader}>Storage & Gathering</div>
          {(['largerStorage', 'efficientResources', 'resourceRate'] as const).map(upgrade => (
            <UpgradeRow
              key={upgrade}
              label={UPGRADE_NAMES[upgrade]}
              upgrade={upgrade}
              level={simTerritory.upgrades[upgrade]}
              maxLevel={UPGRADE_MAX_LEVELS[upgrade]}
              resourceType={UPGRADE_RESOURCE[upgrade]}
              available={hqResources[UPGRADE_RESOURCE[upgrade]]}
              onIncrease={() => onPurchaseUpgrade(territoryName, upgrade)}
              onDecrease={() => onRefundUpgrade(territoryName, upgrade)}
            />
          ))}

          {/* Computed stats */}
          {towerStats && (
            <>
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.75rem 0' }} />
              <div style={{ fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Effective HP</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{formatNumber(towerStats.ehp)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Avg DPS</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{formatNumber(towerStats.dps)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Connections</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{connections}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Defense Tier</span>
                  <span style={{ color: towerStats.tier.color, fontWeight: '600' }}>{towerStats.tier.tier}</span>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
