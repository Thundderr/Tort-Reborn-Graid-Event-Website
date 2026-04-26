import { NextRequest, NextResponse } from 'next/server';
import { requireChiefSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Register a new channel as managed. The bot's /embeds import command should
// then be run to pull in any existing messages.
export async function POST(request: NextRequest) {
  const session = await requireChiefSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const channelIdRaw = body?.channel_id;
    const guildIdRaw = body?.guild_id;
    const label = typeof body?.label === 'string' ? body.label.trim() : '';

    if (!channelIdRaw || !guildIdRaw || !label) {
      return NextResponse.json(
        { error: 'channel_id, guild_id, and label are required' },
        { status: 400 },
      );
    }

    // Discord IDs are numeric strings up to 19 digits.
    const channelId = String(channelIdRaw);
    const guildId = String(guildIdRaw);
    if (!/^\d{17,20}$/.test(channelId) || !/^\d{17,20}$/.test(guildId)) {
      return NextResponse.json({ error: 'Invalid Discord ID format' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      `INSERT INTO managed_channels (channel_id, guild_id, label)
       VALUES ($1, $2, $3)
       ON CONFLICT (channel_id) DO UPDATE SET label = EXCLUDED.label`,
      [channelId, guildId, label],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Managed channel upsert error:', error);
    return NextResponse.json({ error: 'Failed to register channel' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireChiefSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const channelId = body?.channel_id ? String(body.channel_id) : null;
    if (!channelId) {
      return NextResponse.json({ error: 'channel_id is required' }, { status: 400 });
    }

    const pool = getPool();
    // Cascade from managed_channels deletes the associated messages rows too.
    await pool.query(`DELETE FROM managed_channels WHERE channel_id = $1`, [channelId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Managed channel delete error:', error);
    return NextResponse.json({ error: 'Failed to remove channel' }, { status: 500 });
  }
}
