"use client";

export type MapViewMode = 'live' | 'history' | 'simulator';

interface MapModeSelectorProps {
  mode: MapViewMode;
  onModeChange: (mode: MapViewMode) => void;
  historyAvailable: boolean;
}

export default function MapModeSelector({
  mode,
  onModeChange,
  historyAvailable,
}: MapModeSelectorProps) {
  const buttonStyle = (active: boolean, disabled?: boolean) => ({
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? '600' : '400',
    fontSize: '0.875rem',
    background: active ? 'var(--accent-primary)' : 'transparent',
    color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
  });

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.25rem',
        background: 'var(--bg-card-solid)',
        borderRadius: '0.5rem',
        padding: '0.25rem',
        border: '1px solid var(--border-color)',
      }}
    >
      <button
        type="button"
        onClick={() => onModeChange('live')}
        style={buttonStyle(mode === 'live')}
      >
        Live
      </button>
      <button
        type="button"
        onClick={() => historyAvailable && onModeChange('history')}
        disabled={!historyAvailable}
        style={buttonStyle(mode === 'history', !historyAvailable)}
      >
        History
      </button>
      <button
        type="button"
        onClick={() => onModeChange('simulator')}
        style={buttonStyle(mode === 'simulator')}
      >
        Simulator
      </button>
    </div>
  );
}
