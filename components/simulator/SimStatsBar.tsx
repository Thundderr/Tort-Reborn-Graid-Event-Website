"use client";

import { ResourceAmounts, ResourceType } from '@/lib/simulator/types';
import { RESOURCE_COLORS, RESOURCE_NAMES } from '@/lib/simulator/constants';

interface SimStatsBarProps {
  ownedCount: number;
  hqStorage: ResourceAmounts;
  maxEmeralds: number;
  maxResources: number;
  totalProduction: ResourceAmounts;
  nextAttackCost: number;
}

function MiniResourcePill({ resource, amount, max }: { resource: ResourceType; amount: number; max: number }) {
  const color = RESOURCE_COLORS[resource];
  const fillPercent = max > 0 ? Math.min((amount / max) * 100, 100) : 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      fontSize: '0.7rem',
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }} />
      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
        {amount.toLocaleString()}
      </span>
      <div style={{
        width: '30px',
        height: '3px',
        background: 'var(--bg-secondary)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${fillPercent}%`,
          height: '100%',
          background: color,
          borderRadius: '2px',
        }} />
      </div>
    </div>
  );
}

export default function SimStatsBar({
  ownedCount,
  hqStorage,
  maxEmeralds,
  maxResources,
  totalProduction,
  nextAttackCost,
}: SimStatsBarProps) {
  const resources: ResourceType[] = ['emeralds', 'ore', 'wood', 'fish', 'crops'];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      background: 'var(--bg-card-solid)',
      borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem',
      border: '1px solid var(--border-color)',
      flexWrap: 'wrap',
    }}>
      {/* Territory count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Territories:</span>
        <span style={{ color: '#00BCD4', fontWeight: '600' }}>{ownedCount}</span>
        {ownedCount > 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
            (next: {nextAttackCost.toLocaleString()} em)
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: 'var(--border-color)' }} />

      {/* HQ Storage mini bars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>HQ:</span>
        {resources.map(res => (
          <MiniResourcePill
            key={res}
            resource={res}
            amount={hqStorage[res]}
            max={res === 'emeralds' ? maxEmeralds : maxResources}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: 'var(--border-color)' }} />

      {/* Production per tick */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Per tick:</span>
        {resources.filter(r => totalProduction[r] > 0).map(res => (
          <span key={res} style={{ color: RESOURCE_COLORS[res], fontWeight: '500' }}>
            +{totalProduction[res].toLocaleString()}
          </span>
        ))}
        {resources.every(r => totalProduction[r] === 0) && (
          <span style={{ color: 'var(--text-muted)' }}>none</span>
        )}
      </div>
    </div>
  );
}
