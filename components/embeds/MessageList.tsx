"use client";

import type { ManagedMessage } from '@/hooks/useExecEmbeds';

interface MessageListProps {
  messages: ManagedMessage[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onReorder: (order: { id: number; position: number }[]) => void;
}

function statusBadge(msg: ManagedMessage) {
  if (msg.pending_delete) {
    return { label: 'Deleting', color: '#ef4444' };
  }
  if (msg.is_new && !msg.message_id) {
    return { label: 'New', color: '#3b82f6' };
  }
  if (msg.dirty) {
    return { label: 'Pending sync', color: '#eab308' };
  }
  return { label: 'Synced', color: '#22c55e' };
}

function previewText(msg: ManagedMessage): string {
  if (msg.content) {
    return msg.content.slice(0, 60);
  }
  const first = msg.embeds[0];
  if (first?.title) return first.title.slice(0, 60);
  if (first?.description) return first.description.slice(0, 60);
  if (first?.author?.name) return first.author.name.slice(0, 60);
  return '(empty)';
}

export default function MessageList({
  messages,
  selectedId,
  onSelect,
  onCreate,
  onReorder,
}: MessageListProps) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= messages.length) return;
    // Build a new position list where we swap i and j.
    const next = messages.map((m) => ({ id: m.id, position: m.position }));
    [next[i], next[j]] = [next[j], next[i]];
    // Reassign sequential positions to keep them clean.
    const resequenced = next.map((entry, idx) => ({ id: entry.id, position: idx }));
    onReorder(resequenced);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.25rem',
      }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          Messages
        </span>
        <button
          type="button"
          onClick={onCreate}
          style={{
            padding: '0.3rem 0.6rem',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '0.375rem',
            color: 'var(--color-ocean-400)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + New
        </button>
      </div>

      {messages.length === 0 && (
        <div style={{
          padding: '1rem',
          border: '1px dashed var(--border-card)',
          borderRadius: '0.5rem',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          textAlign: 'center',
        }}>
          No messages yet. Run <code>/embeds import</code> in Discord, or click "New".
        </div>
      )}

      {messages.map((msg, i) => {
        const isActive = msg.id === selectedId;
        const badge = statusBadge(msg);
        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-card)',
              border: `1px solid ${isActive ? 'var(--color-ocean-400)' : 'var(--border-card)'}`,
              borderRadius: '0.5rem',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(msg.id)}
              style={{
                flex: 1,
                textAlign: 'left',
                padding: '0.6rem 0.75rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                minWidth: 0,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.72rem',
              }}>
                <span style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  background: badge.color,
                }} />
                <span style={{ color: 'var(--text-secondary)' }}>{badge.label}</span>
                {msg.updated_by && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    by {msg.updated_by}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {previewText(msg)}
              </div>
            </button>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid var(--border-card)',
            }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); move(i, -1); }}
                disabled={i === 0}
                title="Move up"
                style={{
                  flex: 1,
                  padding: '0.1rem 0.45rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: i === 0 ? 'not-allowed' : 'pointer',
                  opacity: i === 0 ? 0.3 : 1,
                  fontSize: '0.7rem',
                }}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); move(i, 1); }}
                disabled={i === messages.length - 1}
                title="Move down"
                style={{
                  flex: 1,
                  padding: '0.1rem 0.45rem',
                  background: 'transparent',
                  border: 'none',
                  borderTop: '1px solid var(--border-card)',
                  color: 'var(--text-secondary)',
                  cursor: i === messages.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: i === messages.length - 1 ? 0.3 : 1,
                  fontSize: '0.7rem',
                }}
              >
                ▼
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
