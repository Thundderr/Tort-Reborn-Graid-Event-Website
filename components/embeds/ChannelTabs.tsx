"use client";

import type { ManagedChannel } from '@/hooks/useExecEmbeds';

interface ChannelTabsProps {
  channels: ManagedChannel[];
  selected: string | null;
  onSelect: (channelId: string) => void;
  messageCounts: Record<string, number>;
}

export default function ChannelTabs({
  channels,
  selected,
  onSelect,
  messageCounts,
}: ChannelTabsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap',
      borderBottom: '1px solid var(--border-card)',
      paddingBottom: '0.75rem',
      marginBottom: '1rem',
    }}>
      {channels.map((c) => {
        const isActive = c.channel_id === selected;
        const count = messageCounts[c.channel_id] ?? 0;
        return (
          <button
            key={c.channel_id}
            type="button"
            onClick={() => onSelect(c.channel_id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: `1px solid ${isActive ? 'var(--color-ocean-400)' : 'var(--border-card)'}`,
              background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-card)',
              color: isActive ? 'var(--color-ocean-400)' : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>#{c.label}</span>
            <span style={{
              fontSize: '0.7rem',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '0.75rem',
              padding: '0.1rem 0.5rem',
              color: 'var(--text-muted)',
            }}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
