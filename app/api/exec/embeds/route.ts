import { NextRequest, NextResponse } from 'next/server';
import { requireChiefSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';
import { sanitizeEmbed, EmbedData } from '@/lib/embed-validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireChiefSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pool = getPool();

    const channelsRes = await pool.query(
      `SELECT channel_id, guild_id, label FROM managed_channels ORDER BY label`
    );

    const messagesRes = await pool.query(
      `SELECT id, channel_id, message_id, position, content, embeds, attachments,
              dirty, is_new, pending_delete, last_synced_at, updated_at, updated_by
       FROM managed_messages
       ORDER BY channel_id, position`
    );

    return NextResponse.json({
      channels: channelsRes.rows.map(r => ({
        channel_id: r.channel_id.toString(),
        guild_id: r.guild_id.toString(),
        label: r.label,
      })),
      messages: messagesRes.rows.map(r => ({
        id: r.id,
        channel_id: r.channel_id.toString(),
        message_id: r.message_id ? r.message_id.toString() : null,
        position: r.position,
        content: r.content,
        embeds: r.embeds ?? [],
        attachments: r.attachments ?? [],
        dirty: r.dirty,
        is_new: r.is_new,
        pending_delete: r.pending_delete,
        last_synced_at: r.last_synced_at,
        updated_at: r.updated_at,
        updated_by: r.updated_by,
      })),
    });
  } catch (error) {
    console.error('Embed list fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch embeds' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireChiefSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const channelIdRaw = body?.channel_id;
    const content: string | null = typeof body?.content === 'string' ? body.content : null;
    const rawEmbeds = Array.isArray(body?.embeds) ? body.embeds : [];
    const embeds: EmbedData[] = rawEmbeds.map(sanitizeEmbed);

    if (!channelIdRaw) {
      return NextResponse.json({ error: 'channel_id is required' }, { status: 400 });
    }

    const channelId = String(channelIdRaw);

    // POST creates an empty draft that the user will fill in. Validation runs
    // on PUT (save) -- by then `dirty` flips TRUE and the bot may try to send,
    // so the message must meet Discord's minimums at that point.

    const pool = getPool();

    // Ensure the channel is registered — we don't allow creating messages in
    // arbitrary channels.
    const chanCheck = await pool.query(
      `SELECT 1 FROM managed_channels WHERE channel_id = $1`,
      [channelId]
    );
    if (chanCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Channel is not managed' }, { status: 400 });
    }

    const posRes = await pool.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
       FROM managed_messages WHERE channel_id = $1`,
      [channelId]
    );
    const nextPos = posRes.rows[0].next_pos;

    const insertRes = await pool.query(
      `INSERT INTO managed_messages (
         channel_id, position, content, embeds, attachments,
         dirty, is_new, updated_by
       )
       VALUES ($1, $2, $3, $4::jsonb, '[]'::jsonb, FALSE, TRUE, $5)
       RETURNING id`,
      [channelId, nextPos, content, JSON.stringify(embeds), session.discord_username]
    );

    return NextResponse.json({ success: true, id: insertRes.rows[0].id });
  } catch (error) {
    console.error('Embed create error:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
