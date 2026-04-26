"use client";

import type { EmbedData } from '@/lib/embed-validation';
import { DISCORD_LIMITS } from '@/lib/embed-validation';
import EmbedEditor from './EmbedEditor';

interface MessageEditorProps {
  content: string | null;
  embeds: EmbedData[];
  onChangeContent: (content: string | null) => void;
  onChangeEmbeds: (embeds: EmbedData[]) => void;
  uploadImage: (file: File) => Promise<string>;
}

export default function MessageEditor({
  content,
  embeds,
  onChangeContent,
  onChangeEmbeds,
  uploadImage,
}: MessageEditorProps) {
  const addEmbed = () => {
    if (embeds.length >= DISCORD_LIMITS.embedsPerMessage) return;
    onChangeEmbeds([...embeds, { color: 0x5865f2 }]);
  };

  const updateEmbed = (i: number, next: EmbedData) => {
    onChangeEmbeds(embeds.map((e, idx) => (idx === i ? next : e)));
  };

  const removeEmbed = (i: number) => {
    onChangeEmbeds(embeds.filter((_, idx) => idx !== i));
  };

  const contentLen = (content ?? '').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={{
          fontSize: '0.7rem',
          fontWeight: '700',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '0.25rem',
          display: 'block',
        }}>
          Message content ({contentLen} / {DISCORD_LIMITS.content})
        </label>
        <textarea
          value={content ?? ''}
          placeholder="Optional plain-text message above the embeds."
          maxLength={DISCORD_LIMITS.content}
          rows={3}
          onChange={(e) => onChangeContent(e.target.value || null)}
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-card)',
            borderRadius: '0.375rem',
            padding: '0.4rem 0.6rem',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
            width: '100%',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '3rem',
            lineHeight: 1.4,
          }}
        />
      </div>

      {embeds.map((embed, i) => (
        <EmbedEditor
          key={i}
          index={i}
          embed={embed}
          onChange={(next) => updateEmbed(i, next)}
          onRemove={() => removeEmbed(i)}
          uploadImage={uploadImage}
        />
      ))}

      <button
        type="button"
        onClick={addEmbed}
        disabled={embeds.length >= DISCORD_LIMITS.embedsPerMessage}
        style={{
          padding: '0.6rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px dashed rgba(59, 130, 246, 0.4)',
          borderRadius: '0.5rem',
          color: 'var(--color-ocean-400)',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: embeds.length >= DISCORD_LIMITS.embedsPerMessage ? 'not-allowed' : 'pointer',
          opacity: embeds.length >= DISCORD_LIMITS.embedsPerMessage ? 0.5 : 1,
        }}
      >
        + Add embed ({embeds.length}/{DISCORD_LIMITS.embedsPerMessage})
      </button>
    </div>
  );
}
