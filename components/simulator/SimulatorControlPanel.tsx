"use client";

import { ResourceType, ResourceAmounts } from '@/lib/simulator/types';
import SimResourceBar from './SimResourceBar';

interface SimulatorControlPanelProps {
  ownedCount: number;
  hqTerritoryName: string | null;
  hqStorage: ResourceAmounts;
  maxEmeralds: number;
  maxResources: number;
  totalProduction: ResourceAmounts;
  nextAttackCost: number;
  totalEmeraldsGenerated: number;
  totalResourcesGenerated: number;
  onReset: () => void;
}

export default function SimulatorControlPanel({
  ownedCount,
  hqTerritoryName,
  hqStorage,
  maxEmeralds,
  maxResources,
  totalProduction,
  nextAttackCost,
  totalEmeraldsGenerated,
  totalResourcesGenerated,
  onReset,
}: SimulatorControlPanelProps) {
  const resources: ResourceType[] = ['emeralds', 'ore', 'wood', 'fish', 'crops'];

  return (
    <div
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        width: '280px',
        backgroundColor: 'var(--bg-card-solid)',
        border: '2px solid var(--border-color)',
        borderRadius: '0.5rem',
        padding: '0.75rem',
        zIndex: 1001,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        pointerEvents: 'auto',
        maxHeight: 'calc(100vh - 8rem)',
        overflowY: 'auto',
      }}
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
      }}>
        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#00BCD4' }}>
          Eco Simulator
        </div>
        <button
          onClick={onReset}
          style={{
            padding: '0.2rem 0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid #EF5350',
            background: 'transparent',
            color: '#EF5350',
            cursor: 'pointer',
            fontSize: '0.65rem',
            fontWeight: '600',
          }}
        >Reset</button>
      </div>

      {/* Quick stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        marginBottom: '0.5rem',
      }}>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Territories: </span>
          <span style={{ color: '#00BCD4', fontWeight: '600' }}>{ownedCount}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>In-game cost: </span>
          <span style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.65rem' }}>
            {nextAttackCost.toLocaleString()} em
          </span>
        </div>
      </div>

      {/* HQ indicator */}
      {hqTerritoryName ? (
        <div style={{
          fontSize: '0.75rem',
          marginBottom: '0.75rem',
          padding: '0.35rem 0.5rem',
          background: 'rgba(255, 215, 0, 0.1)',
          borderRadius: '0.25rem',
          border: '1px solid rgba(255, 215, 0, 0.3)',
        }}>
          <span style={{ color: '#FFD700', fontWeight: '600' }}>HQ: </span>
          <span style={{ color: 'var(--text-primary)' }}>{hqTerritoryName}</span>
        </div>
      ) : (
        <div style={{
          fontSize: '0.75rem',
          marginBottom: '0.75rem',
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}>
          Click a territory to claim it. First territory becomes HQ.
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

      {/* HQ Storage */}
      <div style={{
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.35rem',
      }}>HQ Storage</div>

      {resources.map(res => (
        <SimResourceBar
          key={res}
          resource={res}
          current={hqStorage[res]}
          max={res === 'emeralds' ? maxEmeralds : maxResources}
          perTick={totalProduction[res]}
          compact
        />
      ))}

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

      {/* Lifetime stats */}
      <div style={{
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.25rem',
      }}>Lifetime</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.15rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Emeralds earned:</span>
        <span style={{ color: '#4CAF50', fontWeight: '500' }}>{totalEmeraldsGenerated.toLocaleString()}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Resources earned:</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{totalResourcesGenerated.toLocaleString()}</span>
      </div>

      {/* Instructions */}
      <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
        Click territories to claim. Click owned territories to upgrade.
        Use the play/speed controls at the bottom to run the simulation.
      </div>
    </div>
  );
}
