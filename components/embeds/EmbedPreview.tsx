"use client";

import type { EmbedData } from '@/lib/embed-validation';

// Very small Discord-style markdown renderer. Covers the subset most useful
// for FAQ / info embeds: bold, italic, underline, strikethrough, inline code,
// code block, block quote, links, and channel/role/user mentions (displayed as
// styled tokens).
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split on code blocks first so we don't apply inline rules inside them.
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3).replace(/^\w+\n/, '');
      return (
        <pre
          key={i}
          style={{
            background: '#2b2d31',
            border: '1px solid #1e1f22',
            borderRadius: '4px',
            padding: '0.5rem 0.75rem',
            margin: '0.25rem 0',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.85em',
            whiteSpace: 'pre-wrap',
            color: '#dbdee1',
          }}
        >
          {inner}
        </pre>
      );
    }
    return <InlineMarkdown key={i} text={part} />;
  });
}

function InlineMarkdown({ text }: { text: string }) {
  // Split by newlines so block quotes and line breaks render correctly.
  const lines = text.split(/\n/);
  return (
    <>
      {lines.map((line, li) => {
        const isQuote = /^>\s?/.test(line);
        const content = isQuote ? line.replace(/^>\s?/, '') : line;
        const nodes = renderInlineSegments(content);
        return (
          <span key={li} style={{ display: 'block' }}>
            {isQuote ? (
              <span
                style={{
                  display: 'inline-block',
                  width: '100%',
                  borderLeft: '4px solid #4e5058',
                  paddingLeft: '0.5rem',
                  color: '#dbdee1',
                }}
              >
                {nodes}
              </span>
            ) : (
              nodes
            )}
          </span>
        );
      })}
    </>
  );
}

function renderInlineSegments(text: string): React.ReactNode[] {
  // Order matters: process larger syntax first.
  // We'll do a simple sequential scan.
  const out: React.ReactNode[] = [];
  let rest = text;
  let key = 0;

  const push = (node: React.ReactNode) => out.push(<span key={key++}>{node}</span>);

  while (rest.length > 0) {
    // [label](url)
    const link = rest.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (link) {
      push(
        <a href={link[2]} target="_blank" rel="noreferrer"
          style={{ color: '#00a8fc', textDecoration: 'none' }}>{link[1]}</a>,
      );
      rest = rest.slice(link[0].length);
      continue;
    }
    // **bold**
    const bold = rest.match(/^\*\*([^*]+)\*\*/);
    if (bold) {
      push(<strong>{renderInlineSegments(bold[1])}</strong>);
      rest = rest.slice(bold[0].length);
      continue;
    }
    // __underline__
    const under = rest.match(/^__([^_]+)__/);
    if (under) {
      push(<u>{renderInlineSegments(under[1])}</u>);
      rest = rest.slice(under[0].length);
      continue;
    }
    // *italic*
    const ital = rest.match(/^\*([^*]+)\*/);
    if (ital) {
      push(<em>{renderInlineSegments(ital[1])}</em>);
      rest = rest.slice(ital[0].length);
      continue;
    }
    // ~~strike~~
    const strike = rest.match(/^~~([^~]+)~~/);
    if (strike) {
      push(<s>{renderInlineSegments(strike[1])}</s>);
      rest = rest.slice(strike[0].length);
      continue;
    }
    // `code`
    const code = rest.match(/^`([^`]+)`/);
    if (code) {
      push(
        <code style={{
          background: '#2b2d31',
          padding: '0.1em 0.3em',
          borderRadius: '3px',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '0.9em',
        }}>{code[1]}</code>,
      );
      rest = rest.slice(code[0].length);
      continue;
    }
    // Channel/role/user mentions: <#id>, <@&id>, <@id>, <@!id>
    const mention = rest.match(/^<([#@])[&!]?(\d{17,20})>/);
    if (mention) {
      const token = mention[1] === '#' ? '#channel' : '@mention';
      push(
        <span style={{
          background: 'rgba(88, 101, 242, 0.3)',
          color: '#c9cdfb',
          padding: '0 2px',
          borderRadius: '3px',
        }}>
          {token}
        </span>,
      );
      rest = rest.slice(mention[0].length);
      continue;
    }
    // Custom emoji <:name:id> / <a:name:id> — just show :name:
    const emoji = rest.match(/^<a?:(\w+):\d+>/);
    if (emoji) {
      push(<span>{`:${emoji[1]}:`}</span>);
      rest = rest.slice(emoji[0].length);
      continue;
    }

    // Otherwise take next plain character until the next special.
    const nextSpecial = rest.search(/[\*_~`<\[]/);
    const chunk = nextSpecial === -1 ? rest : rest.slice(0, nextSpecial || 1);
    push(chunk);
    rest = rest.slice(chunk.length);
  }

  return out;
}

function colorToCss(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '#4e5058';
  return '#' + n.toString(16).padStart(6, '0');
}

interface EmbedPreviewProps {
  embed: EmbedData;
}

export default function EmbedPreview({ embed }: EmbedPreviewProps) {
  const hasContent =
    embed.title ||
    embed.description ||
    (embed.fields && embed.fields.length > 0) ||
    embed.image?.url ||
    embed.thumbnail?.url ||
    embed.author?.name ||
    embed.footer?.text;

  if (!hasContent) {
    return (
      <div style={{
        color: '#72767d',
        fontStyle: 'italic',
        fontSize: '0.85rem',
      }}>
        (empty embed)
      </div>
    );
  }

  // Group inline fields into rows of up to 3.
  const fieldRows: EmbedData['fields'][] = [];
  let currentRow: EmbedData['fields'] = [];
  for (const f of embed.fields ?? []) {
    if (!f.inline) {
      if (currentRow!.length > 0) {
        fieldRows.push(currentRow);
        currentRow = [];
      }
      fieldRows.push([f]);
    } else {
      currentRow!.push(f);
      if (currentRow!.length === 3) {
        fieldRows.push(currentRow);
        currentRow = [];
      }
    }
  }
  if (currentRow!.length > 0) fieldRows.push(currentRow);

  return (
    <div
      style={{
        borderLeft: `4px solid ${colorToCss(embed.color)}`,
        background: '#2b2d31',
        borderRadius: '4px',
        padding: '0.5rem 1rem 1rem',
        display: 'grid',
        gridTemplateColumns: embed.thumbnail?.url ? '1fr auto' : '1fr',
        gap: '1rem',
        maxWidth: '520px',
        color: '#dbdee1',
        fontSize: '0.9rem',
        lineHeight: '1.375',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
        {embed.author?.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            {embed.author.icon_url && (
              <img src={embed.author.icon_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            )}
            {embed.author.url ? (
              <a href={embed.author.url} target="_blank" rel="noreferrer"
                style={{ color: '#f2f3f5', textDecoration: 'none', fontWeight: 600 }}>
                {embed.author.name}
              </a>
            ) : (
              <span style={{ color: '#f2f3f5', fontWeight: 600 }}>{embed.author.name}</span>
            )}
          </div>
        )}

        {embed.title && (
          embed.url ? (
            <a href={embed.url} target="_blank" rel="noreferrer"
              style={{ color: '#00a8fc', fontWeight: 700, fontSize: '1rem', textDecoration: 'none' }}>
              {embed.title}
            </a>
          ) : (
            <div style={{ color: '#f2f3f5', fontWeight: 700, fontSize: '1rem' }}>{embed.title}</div>
          )
        )}

        {embed.description && (
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {renderMarkdown(embed.description)}
          </div>
        )}

        {fieldRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
            {fieldRows.map((row, ri) => (
              <div
                key={ri}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${row!.length}, minmax(0, 1fr))`,
                  gap: '0.75rem',
                }}
              >
                {row!.map((f, fi) => (
                  <div key={fi} style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#f2f3f5', marginBottom: '0.1rem' }}>
                      {f.name}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {renderMarkdown(f.value)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {embed.image?.url && (
          <img
            src={embed.image.url}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              objectFit: 'contain',
              borderRadius: '4px',
              marginTop: '0.5rem',
            }}
          />
        )}

        {(embed.footer?.text || embed.timestamp) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: '#b5bac1',
            marginTop: '0.5rem',
          }}>
            {embed.footer?.icon_url && (
              <img src={embed.footer.icon_url} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
            )}
            {embed.footer?.text && <span>{embed.footer.text}</span>}
            {embed.footer?.text && embed.timestamp && <span>•</span>}
            {embed.timestamp && <span>{new Date(embed.timestamp).toLocaleString()}</span>}
          </div>
        )}
      </div>

      {embed.thumbnail?.url && (
        <img
          src={embed.thumbnail.url}
          alt=""
          style={{
            width: '80px',
            height: '80px',
            objectFit: 'cover',
            borderRadius: '4px',
          }}
        />
      )}
    </div>
  );
}
