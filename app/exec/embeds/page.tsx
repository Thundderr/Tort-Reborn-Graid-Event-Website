"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  useExecEmbeds,
  type EmbedData,
  type ManagedMessage,
} from '@/hooks/useExecEmbeds';
import { isChiefRank } from '@/lib/rank-constants';
import { useExecSession } from '@/hooks/useExecSession';
import { DISCORD_LIMITS, validateMessage } from '@/lib/embed-validation';
import ChannelTabs from '@/components/embeds/ChannelTabs';
import MessageList from '@/components/embeds/MessageList';
import MessageEditor from '@/components/embeds/MessageEditor';
import MessagePreview from '@/components/embeds/MessagePreview';

export default function ExecEmbedsPage() {
  const { user, loading: sessionLoading } = useExecSession();
  const {
    channels,
    messages,
    loading,
    error,
    updateMessage,
    createMessage,
    deleteMessage,
    reorderMessages,
    uploadImage,
  } = useExecEmbeds();

  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);

  // Draft state for the editor. Kept separate from the server copy so we can
  // diff and prompt on unsaved changes.
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [draftEmbeds, setDraftEmbeds] = useState<EmbedData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-select the first channel once channels load.
  useEffect(() => {
    if (!selectedChannel && channels.length > 0) {
      setSelectedChannel(channels[0].channel_id);
    }
  }, [channels, selectedChannel]);

  const channelMessages = useMemo(
    () => messages.filter(m => m.channel_id === selectedChannel)
      .sort((a, b) => a.position - b.position),
    [messages, selectedChannel],
  );

  const messageCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of messages) {
      out[m.channel_id] = (out[m.channel_id] ?? 0) + 1;
    }
    return out;
  }, [messages]);

  const selected = useMemo(
    () => channelMessages.find(m => m.id === selectedMessageId) ?? null,
    [channelMessages, selectedMessageId],
  );

  // Sync draft from the server copy whenever the selected message changes.
  useEffect(() => {
    if (selected) {
      setDraftContent(selected.content);
      setDraftEmbeds(selected.embeds ?? []);
    } else {
      setDraftContent(null);
      setDraftEmbeds([]);
    }
    setSaveError(null);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear selection when switching channels.
  useEffect(() => {
    setSelectedMessageId(null);
  }, [selectedChannel]);

  const hasUnsavedChanges = useMemo(() => {
    if (!selected) return false;
    return (
      (selected.content ?? null) !== (draftContent ?? null) ||
      JSON.stringify(selected.embeds ?? []) !== JSON.stringify(draftEmbeds)
    );
  }, [selected, draftContent, draftEmbeds]);

  // Warn before navigating away with unsaved edits.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    if (!selected) return;
    const validation = validateMessage(draftContent, draftEmbeds);
    if (!validation.ok) {
      setSaveError(validation.error);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateMessage(selected.id, draftContent, draftEmbeds);
      setToast('Saved — the bot will push this to Discord within ~10s.');
      setTimeout(() => setToast(null), 5000);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedChannel) return;
    try {
      const id = await createMessage(selectedChannel, null, [{ color: 0x5865f2 }]);
      setSelectedMessageId(id);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to create message');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm('Delete this message? The bot will remove it from Discord.')) {
      return;
    }
    try {
      await deleteMessage(selected.id);
      setSelectedMessageId(null);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Delete failed');
    }
  };

  const handleReorder = async (order: { id: number; position: number }[]) => {
    if (!selectedChannel) return;
    try {
      await reorderMessages(selectedChannel, order);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Reorder failed');
    }
  };

  // --- Access gate ---
  if (sessionLoading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading…</div>;
  }
  if (!isChiefRank(user?.rank)) {
    return (
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>Embeds</h1>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.5rem',
          padding: '1rem',
          color: '#ef4444',
        }}>
          The embed editor is restricted to chiefs (Dolphin and above).
        </div>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>Embeds</h1>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '0.5rem',
          height: 400,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>Embeds</h1>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.5rem',
          padding: '1rem',
          color: '#ef4444',
        }}>
          Failed to load: {error}
        </div>
      </div>
    );
  }

  const totalEmbedChars = draftEmbeds.reduce((acc, e) => {
    let n = 0;
    if (e.title) n += e.title.length;
    if (e.description) n += e.description.length;
    if (e.footer?.text) n += e.footer.text.length;
    if (e.author?.name) n += e.author.name.length;
    for (const f of e.fields ?? []) n += (f.name?.length ?? 0) + (f.value?.length ?? 0);
    return acc + n;
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Embeds
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Edit managed Discord messages. Changes sync to Discord automatically within ~10 seconds.
        </p>
      </div>

      <ChannelTabs
        channels={channels}
        selected={selectedChannel}
        onSelect={(id) => {
          if (hasUnsavedChanges && !window.confirm('Discard unsaved changes?')) return;
          setSelectedChannel(id);
        }}
        messageCounts={messageCounts}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 280px) minmax(0, 1fr) minmax(0, 1fr)',
        gap: '1rem',
        alignItems: 'start',
      }}>
        <MessageList
          messages={channelMessages}
          selectedId={selectedMessageId}
          onSelect={(id) => {
            if (hasUnsavedChanges && !window.confirm('Discard unsaved changes?')) return;
            setSelectedMessageId(id);
          }}
          onCreate={handleCreate}
          onReorder={handleReorder}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
          {!selected && (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              border: '1px dashed var(--border-card)',
              borderRadius: '0.5rem',
            }}>
              Select a message on the left, or create a new one.
            </div>
          )}

          {selected && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                  }}>
                    Embed chars: {totalEmbedChars} / {DISCORD_LIMITS.totalEmbedChars}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{
                      padding: '0.4rem 0.75rem',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: 'transparent',
                      borderRadius: '0.375rem',
                      color: '#ef4444',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !hasUnsavedChanges}
                    style={{
                      padding: '0.4rem 1rem',
                      border: 'none',
                      background: hasUnsavedChanges
                        ? 'var(--color-ocean-400, #3b82f6)'
                        : 'rgba(59, 130, 246, 0.3)',
                      borderRadius: '0.375rem',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: hasUnsavedChanges && !saving ? 'pointer' : 'not-allowed',
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Saving…' : hasUnsavedChanges ? 'Save' : 'Saved'}
                  </button>
                </div>
              </div>

              {saveError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  color: '#ef4444',
                  fontSize: '0.8rem',
                }}>
                  {saveError}
                </div>
              )}

              {toast && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  color: '#22c55e',
                  fontSize: '0.8rem',
                }}>
                  {toast}
                </div>
              )}

              <MessageEditor
                content={draftContent}
                embeds={draftEmbeds}
                onChangeContent={setDraftContent}
                onChangeEmbeds={setDraftEmbeds}
                uploadImage={uploadImage}
              />
            </>
          )}
        </div>

        <div style={{
          position: 'sticky',
          top: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minWidth: 0,
        }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Live preview
          </span>
          {selected ? (
            <MessagePreview content={draftContent} embeds={draftEmbeds} />
          ) : (
            <div style={{
              padding: '1rem',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontStyle: 'italic',
              textAlign: 'center',
              border: '1px dashed var(--border-card)',
              borderRadius: '0.5rem',
            }}>
              Nothing to preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
