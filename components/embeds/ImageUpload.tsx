"use client";

import { useState } from 'react';

interface ImageUploadProps {
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  uploadImage: (file: File) => Promise<string>;
  label?: string;
  placeholder?: string;
}

export default function ImageUpload({
  value,
  onChange,
  uploadImage,
  label,
  placeholder,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (e: any) {
      setUploadError(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {label && (
        <label style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {label}
        </label>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          value={value ?? ''}
          placeholder={placeholder ?? 'https://...'}
          onChange={(e) => onChange(e.target.value || undefined)}
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-card)',
            borderRadius: '0.375rem',
            padding: '0.4rem 0.6rem',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
        <label style={{
          padding: '0.4rem 0.75rem',
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          borderRadius: '0.375rem',
          color: 'var(--color-ocean-400)',
          fontSize: '0.8rem',
          fontWeight: '600',
          cursor: uploading ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
          opacity: uploading ? 0.6 : 1,
        }}>
          {uploading ? 'Uploading...' : 'Upload'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              // Reset so the same file can be picked again after an error.
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {uploadError && (
        <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>{uploadError}</div>
      )}
      {value && (
        <img
          src={value}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: '120px',
            objectFit: 'contain',
            borderRadius: '0.375rem',
            border: '1px solid var(--border-card)',
            alignSelf: 'flex-start',
          }}
        />
      )}
    </div>
  );
}
