"use client";

import { useEffect, useState } from 'react';

function intToHex(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  return '#' + n.toString(16).padStart(6, '0');
}

function hexToInt(hex: string): number | undefined {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return undefined;
  return parseInt(m[1], 16);
}

interface ColorPickerProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [text, setText] = useState(intToHex(value));

  // Keep the text input in sync when the parent changes the value externally
  // (e.g. when switching between embeds).
  useEffect(() => {
    setText(intToHex(value));
  }, [value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange(undefined);
      return;
    }
    const n = hexToInt(trimmed);
    if (n !== undefined) onChange(n);
  };

  const swatch = text && hexToInt(text) !== undefined ? text : '#2B2D31';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <input
        type="color"
        value={swatch.startsWith('#') ? swatch : `#${swatch}`}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        style={{
          width: '2.5rem',
          height: '2rem',
          padding: 0,
          border: '1px solid var(--border-card)',
          borderRadius: '0.375rem',
          background: 'transparent',
          cursor: 'pointer',
        }}
      />
      <input
        type="text"
        value={text}
        placeholder="#5865F2"
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-card)',
          borderRadius: '0.375rem',
          padding: '0.375rem 0.6rem',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          outline: 'none',
          width: '7rem',
          fontFamily: 'monospace',
        }}
      />
      {value !== undefined && (
        <button
          type="button"
          onClick={() => {
            setText('');
            onChange(undefined);
          }}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-card)',
            borderRadius: '0.375rem',
            padding: '0.25rem 0.5rem',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
