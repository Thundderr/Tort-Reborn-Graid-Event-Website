"use client";

import { RESOURCE_COLORS, RESOURCE_NAMES } from '@/lib/simulator/constants';
import { ResourceType } from '@/lib/simulator/types';

interface SimResourceBarProps {
  resource: ResourceType;
  current: number;
  max: number;
  perTick?: number;
  compact?: boolean;
}

export default function SimResourceBar({ resource, current, max, perTick, compact }: SimResourceBarProps) {
  const fillPercent = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color = RESOURCE_COLORS[resource];
  const name = RESOURCE_NAMES[resource];

  // Fill color: green -> yellow -> red based on fill
  const fillColor = fillPercent < 50 ? color : fillPercent < 80 ? '#FFA726' : '#EF5350';

  return (
    <div style={{ marginBottom: compact ? '0.25rem' : '0.5rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.125rem',
        fontSize: compact ? '0.7rem' : '0.75rem',
      }}>
        <span style={{ color, fontWeight: '600' }}>{name}</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {current.toLocaleString()} / {max.toLocaleString()}
          {perTick !== undefined && (
            <span style={{ color: perTick > 0 ? '#4CAF50' : 'var(--text-muted)', marginLeft: '0.25rem' }}>
              (+{perTick.toLocaleString()}/t)
            </span>
          )}
        </span>
      </div>
      <div style={{
        height: compact ? '4px' : '6px',
        background: 'var(--bg-secondary)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${fillPercent}%`,
          height: '100%',
          background: fillColor,
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}
