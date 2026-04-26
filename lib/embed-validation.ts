// Discord API embed limits — mirrored from the bot's Discord library.
// See: https://discord.com/developers/docs/resources/channel#embed-limits
export const DISCORD_LIMITS = {
  content: 2000,
  embedsPerMessage: 10,
  totalEmbedChars: 6000,
  title: 256,
  description: 4096,
  fieldsPerEmbed: 25,
  fieldName: 256,
  fieldValue: 1024,
  footerText: 2048,
  authorName: 256,
} as const;

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface EmbedData {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text?: string; icon_url?: string };
  image?: { url?: string };
  thumbnail?: { url?: string };
  author?: { name?: string; url?: string; icon_url?: string };
  fields?: EmbedField[];
}

function countEmbedChars(e: EmbedData): number {
  let total = 0;
  if (e.title) total += e.title.length;
  if (e.description) total += e.description.length;
  if (e.footer?.text) total += e.footer.text.length;
  if (e.author?.name) total += e.author.name.length;
  for (const f of e.fields ?? []) {
    total += (f.name?.length ?? 0) + (f.value?.length ?? 0);
  }
  return total;
}

export function validateMessage(
  content: string | null | undefined,
  embeds: EmbedData[] | null | undefined,
): { ok: true } | { ok: false; error: string } {
  const embedsArr = embeds ?? [];

  if (content && content.length > DISCORD_LIMITS.content) {
    return { ok: false, error: `Content exceeds ${DISCORD_LIMITS.content} characters` };
  }

  if (!Array.isArray(embedsArr)) {
    return { ok: false, error: 'embeds must be an array' };
  }

  if (embedsArr.length > DISCORD_LIMITS.embedsPerMessage) {
    return { ok: false, error: `Too many embeds (max ${DISCORD_LIMITS.embedsPerMessage})` };
  }

  // A message must have at least content or one non-empty embed.
  const hasContent = !!content && content.trim().length > 0;
  const hasAnyEmbed = embedsArr.some(e => countEmbedChars(e) > 0 || e.image?.url || e.thumbnail?.url);
  if (!hasContent && !hasAnyEmbed) {
    return { ok: false, error: 'Message must have content or at least one non-empty embed' };
  }

  let totalChars = 0;
  for (const [i, e] of embedsArr.entries()) {
    if (e.title && e.title.length > DISCORD_LIMITS.title) {
      return { ok: false, error: `Embed #${i + 1}: title exceeds ${DISCORD_LIMITS.title} chars` };
    }
    if (e.description && e.description.length > DISCORD_LIMITS.description) {
      return { ok: false, error: `Embed #${i + 1}: description exceeds ${DISCORD_LIMITS.description} chars` };
    }
    if (e.footer?.text && e.footer.text.length > DISCORD_LIMITS.footerText) {
      return { ok: false, error: `Embed #${i + 1}: footer exceeds ${DISCORD_LIMITS.footerText} chars` };
    }
    if (e.author?.name && e.author.name.length > DISCORD_LIMITS.authorName) {
      return { ok: false, error: `Embed #${i + 1}: author name exceeds ${DISCORD_LIMITS.authorName} chars` };
    }
    const fields = e.fields ?? [];
    if (fields.length > DISCORD_LIMITS.fieldsPerEmbed) {
      return { ok: false, error: `Embed #${i + 1}: too many fields (max ${DISCORD_LIMITS.fieldsPerEmbed})` };
    }
    for (const [fi, f] of fields.entries()) {
      if (!f.name || !f.value) {
        return { ok: false, error: `Embed #${i + 1} field #${fi + 1}: name and value are required` };
      }
      if (f.name.length > DISCORD_LIMITS.fieldName) {
        return { ok: false, error: `Embed #${i + 1} field #${fi + 1}: name exceeds ${DISCORD_LIMITS.fieldName} chars` };
      }
      if (f.value.length > DISCORD_LIMITS.fieldValue) {
        return { ok: false, error: `Embed #${i + 1} field #${fi + 1}: value exceeds ${DISCORD_LIMITS.fieldValue} chars` };
      }
    }
    totalChars += countEmbedChars(e);
  }

  if (totalChars > DISCORD_LIMITS.totalEmbedChars) {
    return { ok: false, error: `Total embed characters exceed ${DISCORD_LIMITS.totalEmbedChars}` };
  }

  return { ok: true };
}

/**
 * Strip any unknown top-level keys and coerce to the embed JSON shape. This
 * prevents the website from persisting arbitrary fields that would then be
 * rejected by Discord on edit.
 */
export function sanitizeEmbed(e: any): EmbedData {
  if (!e || typeof e !== 'object') return {};
  const out: EmbedData = {};
  if (typeof e.title === 'string') out.title = e.title;
  if (typeof e.description === 'string') out.description = e.description;
  if (typeof e.url === 'string') out.url = e.url;
  if (typeof e.color === 'number') out.color = e.color;
  if (typeof e.timestamp === 'string') out.timestamp = e.timestamp;
  if (e.footer && typeof e.footer === 'object') {
    out.footer = {
      text: typeof e.footer.text === 'string' ? e.footer.text : undefined,
      icon_url: typeof e.footer.icon_url === 'string' ? e.footer.icon_url : undefined,
    };
  }
  if (e.image && typeof e.image === 'object' && typeof e.image.url === 'string') {
    out.image = { url: e.image.url };
  }
  if (e.thumbnail && typeof e.thumbnail === 'object' && typeof e.thumbnail.url === 'string') {
    out.thumbnail = { url: e.thumbnail.url };
  }
  if (e.author && typeof e.author === 'object') {
    out.author = {
      name: typeof e.author.name === 'string' ? e.author.name : undefined,
      url: typeof e.author.url === 'string' ? e.author.url : undefined,
      icon_url: typeof e.author.icon_url === 'string' ? e.author.icon_url : undefined,
    };
  }
  if (Array.isArray(e.fields)) {
    out.fields = e.fields
      .filter((f: any) => f && typeof f === 'object')
      .map((f: any) => ({
        name: typeof f.name === 'string' ? f.name : '',
        value: typeof f.value === 'string' ? f.value : '',
        inline: !!f.inline,
      }));
  }
  return out;
}
