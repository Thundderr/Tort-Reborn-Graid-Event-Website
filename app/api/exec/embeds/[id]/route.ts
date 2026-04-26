import { NextRequest, NextResponse } from 'next/server';
import { requireChiefSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';
import { sanitizeEmbed, validateMessage, EmbedData } from '@/lib/embed-validation';

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireChiefSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseId(params.id);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const content: string | null = typeof body?.content === 'string' ? body.content : null;
    const rawEmbeds = Array.isArray(body?.embeds) ? body.embeds : [];
    const embeds: EmbedData[] = rawEmbeds.map(sanitizeEmbed);

    const valid = validateMessage(content, embeds);
    if (!valid.ok) {
      return NextResponse.json({ error: valid.error }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE managed_messages
       SET content = $1,
           embeds = $2::jsonb,
           dirty = TRUE,
           updated_at = NOW(),
           updated_by = $3
       WHERE id = $4`,
      [content, JSON.stringify(embeds), session.discord_username, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Embed update error:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await requireChiefSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseId(params.id);
  if (id === null) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const pool = getPool();

    // If the message has never been sent to Discord (is_new + no message_id),
    // we can delete the row outright. Otherwise, schedule deletion so the bot
    // removes it from Discord first.
    const row = await pool.query(
      `SELECT message_id, is_new FROM managed_messages WHERE id = $1`,
      [id],
    );

    if (row.rowCount === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const { message_id, is_new } = row.rows[0];

    if (!message_id && is_new) {
      await pool.query(`DELETE FROM managed_messages WHERE id = $1`, [id]);
    } else {
      await pool.query(
        `UPDATE managed_messages
         SET pending_delete = TRUE, dirty = TRUE,
             updated_at = NOW(), updated_by = $1
         WHERE id = $2`,
        [session.discord_username, id],
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Embed delete error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
