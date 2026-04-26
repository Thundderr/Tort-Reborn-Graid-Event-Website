"use client";

import type { EmbedData } from '@/lib/embed-validation';
import { DISCORD_LIMITS } from '@/lib/embed-validation';
import ColorPicker from './ColorPicker';
import FieldEditor from './FieldEditor';
import ImageUpload from './ImageUpload';

const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: '700',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '0.25rem',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-card)',
  borderRadius: '0.375rem',
  padding: '0.4rem 0.6rem',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
};

interface EmbedEditorProps {
  embed: EmbedData;
  index: number;
  onChange: (next: EmbedData) => void;
  onRemove: () => void;
  uploadImage: (file: File) => Promise<string>;
}

export default function EmbedEditor({
  embed,
  index,
  onChange,
  onRemove,
  uploadImage,
}: EmbedEditorProps) {
  const patch = (p: Partial<EmbedData>) => onChange({ ...embed, ...p });

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '0.5rem',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h3 style={{
          fontSize: '0.95rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          Embed #{index + 1}
        </h3>
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: 'transparent',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.375rem',
            padding: '0.25rem 0.5rem',
            color: '#ef4444',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Remove embed
        </button>
      </div>

      <div>
        <label style={labelStyle}>Color</label>
        <ColorPicker value={embed.color} onChange={(v) => patch({ color: v })} />
      </div>

      <div>
        <label style={labelStyle}>Author</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <input
            type="text"
            value={embed.author?.name ?? ''}
            placeholder="Author name"
            maxLength={DISCORD_LIMITS.authorName}
            onChange={(e) =>
              patch({ author: { ...embed.author, name: e.target.value || undefined } })
            }
            style={inputStyle}
          />
          <input
            type="text"
            value={embed.author?.url ?? ''}
            placeholder="Author link URL"
            onChange={(e) =>
              patch({ author: { ...embed.author, url: e.target.value || undefined } })
            }
            style={inputStyle}
          />
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <ImageUpload
            value={embed.author?.icon_url}
            onChange={(v) =>
              patch({ author: { ...embed.author, icon_url: v } })
            }
            uploadImage={uploadImage}
            label="Author icon"
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Title</label>
        <input
          type="text"
          value={embed.title ?? ''}
          placeholder="Title"
          maxLength={DISCORD_LIMITS.title}
          onChange={(e) => patch({ title: e.target.value || undefined })}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Title URL</label>
        <input
          type="text"
          value={embed.url ?? ''}
          placeholder="https://..."
          onChange={(e) => patch({ url: e.target.value || undefined })}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>
          Description ({(embed.description ?? '').length} / {DISCORD_LIMITS.description})
        </label>
        <textarea
          value={embed.description ?? ''}
          placeholder="Embed description. Supports Discord markdown."
          maxLength={DISCORD_LIMITS.description}
          rows={6}
          onChange={(e) => patch({ description: e.target.value || undefined })}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '6rem', lineHeight: 1.4 }}
        />
      </div>

      <ImageUpload
        value={embed.thumbnail?.url}
        onChange={(v) => patch({ thumbnail: v ? { url: v } : undefined })}
        uploadImage={uploadImage}
        label="Thumbnail"
      />

      <ImageUpload
        value={embed.image?.url}
        onChange={(v) => patch({ image: v ? { url: v } : undefined })}
        uploadImage={uploadImage}
        label="Main image"
      />

      <FieldEditor
        fields={embed.fields ?? []}
        onChange={(next) => patch({ fields: next.length > 0 ? next : undefined })}
      />

      <div>
        <label style={labelStyle}>Footer</label>
        <input
          type="text"
          value={embed.footer?.text ?? ''}
          placeholder="Footer text"
          maxLength={DISCORD_LIMITS.footerText}
          onChange={(e) =>
            patch({ footer: { ...embed.footer, text: e.target.value || undefined } })
          }
          style={inputStyle}
        />
        <div style={{ marginTop: '0.5rem' }}>
          <ImageUpload
            value={embed.footer?.icon_url}
            onChange={(v) =>
              patch({ footer: { ...embed.footer, icon_url: v } })
            }
            uploadImage={uploadImage}
            label="Footer icon"
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Timestamp</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="datetime-local"
            value={embed.timestamp ? embed.timestamp.slice(0, 16) : ''}
            onChange={(e) => {
              const v = e.target.value;
              patch({ timestamp: v ? new Date(v).toISOString() : undefined });
            }}
            style={{ ...inputStyle, width: 'auto', flex: '0 1 auto' }}
          />
          <button
            type="button"
            onClick={() => patch({ timestamp: new Date().toISOString() })}
            style={{
              padding: '0.35rem 0.75rem',
              border: '1px solid var(--border-card)',
              background: 'transparent',
              borderRadius: '0.375rem',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Now
          </button>
          {embed.timestamp && (
            <button
              type="button"
              onClick={() => patch({ timestamp: undefined })}
              style={{
                padding: '0.35rem 0.75rem',
                border: '1px solid var(--border-card)',
                background: 'transparent',
                borderRadius: '0.375rem',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
