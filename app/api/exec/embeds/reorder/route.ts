import { NextRequest, NextResponse } from 'next/server';
import { requireChiefSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Reorder managed messages within a channel. This only updates display order
// in the dashboard — it does NOT reorder messages on Discord (that would
// require deleting and re-sending every message, which is destructive and
// visible to all server members).
export async function PUT(request: NextRequest) {
  const session = await requireChiefSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const channelId = body?.channel_id ? String(body.channel_id) : null;
    const order = Array.isArray(body?.order) ? body.order : null;

    if (!channelId || !order) {
      return NextResponse.json(
        { error: 'channel_id and order array are required' },
        { status: 400 },
      );
    }

    // Validate shape
    for (const entry of order) {
      if (!entry || typeof entry !== 'object') {
        return NextResponse.json({ error: 'Invalid order entry' }, { status: 400 });
      }
      if (!Number.isInteger(entry.id) || !Number.isInteger(entry.position)) {
        return NextResponse.json({ error: 'Invalid order entry' }, { status: 400 });
      }
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { id, position } of order) {
        await client.query(
          `UPDATE managed_messages
           SET position = $1
           WHERE id = $2 AND channel_id = $3`,
          [position, id, channelId],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Embed reorder error:', error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
