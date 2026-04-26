"use client";

import type { EmbedData } from '@/lib/embed-validation';
import EmbedPreview from './EmbedPreview';

interface MessagePreviewProps {
  content: string | null;
  embeds: EmbedData[];
}

export default function MessagePreview({ content, embeds }: MessagePreviewProps) {
  return (
    <div
      style={{
        background: '#313338',
        borderRadius: '0.5rem',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        color: '#dbdee1',
        fontSize: '0.95rem',
        lineHeight: 1.4,
      }}
    >
      {content && (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {content}
        </div>
      )}
      {embeds.map((e, i) => (
        <EmbedPreview key={i} embed={e} />
      ))}
      {!content && embeds.length === 0 && (
        <div style={{ color: '#72767d', fontStyle: 'italic', fontSize: '0.85rem' }}>
          (empty message)
        </div>
      )}
    </div>
  );
}
