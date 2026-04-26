"use client";

import type { EmbedField } from '@/lib/embed-validation';
import { DISCORD_LIMITS } from '@/lib/embed-validation';

interface FieldEditorProps {
  fields: EmbedField[];
  onChange: (next: EmbedField[]) => void;
}

const smallBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border-card)',
  borderRadius: '0.375rem',
  color: 'var(--text-secondary)',
  fontSize: '0.75rem',
  padding: '0.25rem 0.5rem',
  cursor: 'pointer',
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

export default function FieldEditor({ fields, onChange }: FieldEditorProps) {
  const updateField = (i: number, patch: Partial<EmbedField>) => {
    const next = fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    onChange(next);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i: number) => {
    onChange(fields.filter((_, idx) => idx !== i));
  };

  const add = () => {
    if (fields.length >= DISCORD_LIMITS.fieldsPerEmbed) return;
    onChange([...fields, { name: '', value: '', inline: false }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          Fields ({fields.length}/{DISCORD_LIMITS.fieldsPerEmbed})
        </span>
        <button
          type="button"
          onClick={add}
          disabled={fields.length >= DISCORD_LIMITS.fieldsPerEmbed}
          style={{
            ...smallBtn,
            color: 'var(--color-ocean-400)',
            borderColor: 'rgba(59, 130, 246, 0.4)',
          }}
        >
          + Add field
        </button>
      </div>

      {fields.map((field, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-card)',
            borderRadius: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              #{i + 1}
            </span>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}>
              <input
                type="checkbox"
                checked={!!field.inline}
                onChange={(e) => updateField(i, { inline: e.target.checked })}
              />
              Inline
            </label>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} style={smallBtn}>↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === fields.length - 1} style={smallBtn}>↓</button>
            <button
              type="button"
              onClick={() => remove(i)}
              style={{ ...smallBtn, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              Remove
            </button>
          </div>
          <input
            type="text"
            value={field.name}
            placeholder="Field name"
            maxLength={DISCORD_LIMITS.fieldName}
            onChange={(e) => updateField(i, { name: e.target.value })}
            style={inputStyle}
          />
          <textarea
            value={field.value}
            placeholder="Field value"
            maxLength={DISCORD_LIMITS.fieldValue}
            onChange={(e) => updateField(i, { value: e.target.value })}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: '4rem' }}
          />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            {field.value.length} / {DISCORD_LIMITS.fieldValue}
          </div>
        </div>
      ))}
    </div>
  );
}
