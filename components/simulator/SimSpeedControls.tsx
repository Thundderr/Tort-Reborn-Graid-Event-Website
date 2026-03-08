"use client";

interface SimSpeedControlsProps {
  isRunning: boolean;
  speed: 1 | 2 | 5 | 10;
  tickCount: number;
  onToggleRunning: () => void;
  onSetSpeed: (speed: 1 | 2 | 5 | 10) => void;
  onStep: () => void;
}

export default function SimSpeedControls({
  isRunning,
  speed,
  tickCount,
  onToggleRunning,
  onSetSpeed,
  onStep,
}: SimSpeedControlsProps) {
  const speeds: (1 | 2 | 5 | 10)[] = [1, 2, 5, 10];
  const elapsedMinutes = tickCount;
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      background: 'var(--bg-card-solid)',
      borderRadius: '0.5rem',
      padding: '0.25rem',
      border: '1px solid var(--border-color)',
    }}>
      {/* Play/Pause */}
      <button
        type="button"
        onClick={onToggleRunning}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer',
          background: isRunning ? '#EF5350' : '#4CAF50',
          color: '#fff',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
        title={isRunning ? 'Pause' : 'Play'}
      >
        {isRunning ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* Step (only when paused) */}
      {!isRunning && (
        <button
          type="button"
          onClick={onStep}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          title="Step (advance 1 tick)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="4,3 14,12 4,21" />
            <rect x="16" y="3" width="4" height="18" />
          </svg>
        </button>
      )}

      {/* Speed selector */}
      {speeds.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSetSpeed(s)}
          style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontWeight: speed === s ? '600' : '400',
            fontSize: '0.75rem',
            background: speed === s ? 'var(--accent-primary)' : 'transparent',
            color: speed === s ? 'var(--text-on-accent)' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
        >
          {s}x
        </button>
      ))}

      {/* Tick counter */}
      <span style={{
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        marginLeft: '0.25rem',
        whiteSpace: 'nowrap',
      }}>
        Tick {tickCount} ({timeStr})
      </span>
    </div>
  );
}
