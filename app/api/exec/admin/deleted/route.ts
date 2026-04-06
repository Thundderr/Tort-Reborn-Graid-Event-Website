import { NextRequest, NextResponse } from 'next/server';
import { requireExecSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

const THUNDDERR_DISCORD_ID = '170719819715313665';

const RESTORABLE_TABLES: Record<string, { idColumn: string; displayColumns: string[] }> = {
  snipe_logs:              { idColumn: 'id',   displayColumns: ['id', 'hq', 'difficulty', 'guild_tag', 'sniped_at', 'deleted_at', 'deleted_by'] },
  blacklist:               { idColumn: 'uuid', displayColumns: ['uuid', 'ign', 'reason', 'created_at', 'deleted_at', 'deleted_by'] },
  kick_list:               { idColumn: 'uuid', displayColumns: ['uuid', 'ign', 'tier', 'added_by', 'deleted_at', 'deleted_by'] },
  tracker_tickets:         { idColumn: 'id',   displayColumns: ['id', 'title', 'type', 'status', 'priority', 'deleted_at', 'deleted_by'] },
  dashboard_events:        { idColumn: 'id',   displayColumns: ['id', 'title', 'event_date', 'deleted_at', 'deleted_by'] },
  dashboard_notes:         { idColumn: 'id',   displayColumns: ['id', 'content', 'completed', 'deleted_at', 'deleted_by'] },
  build_definitions:       { idColumn: 'key',  displayColumns: ['key', 'name', 'role', 'color', 'deleted_at', 'deleted_by'] },
  graid_events:            { idColumn: 'id',   displayColumns: ['id', 'title', 'active', 'start_ts', 'deleted_at', 'deleted_by'] },
  agenda_bau_topics:       { idColumn: 'id',   displayColumns: ['id', 'topic', 'description', 'deleted_at', 'deleted_by'] },
  agenda_requested_topics: { idColumn: 'id',   displayColumns: ['id', 'topic', 'description', 'deleted_at', 'deleted_by'] },
  promotion_queue:         { idColumn: 'id',   displayColumns: ['id', 'ign', 'action_type', 'current_rank', 'new_rank', 'deleted_at', 'deleted_by'] },
  promo_suggestions:       { idColumn: 'id',   displayColumns: ['id', 'ign', 'current_rank', 'suggested_by_ign', 'deleted_at', 'deleted_by'] },
};

/**
 * GET /api/exec/admin/deleted?table=snipe_logs&page=1&perPage=25
 * List soft-deleted records by table. Thundderr only.
 */
export async function GET(request: NextRequest) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.discord_id !== THUNDDERR_DISCORD_ID) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = new URL(request.url);
  const table = url.searchParams.get('table');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('perPage') || '25', 10)));

  if (!table) {
    return NextResponse.json({ tables: Object.keys(RESTORABLE_TABLES) });
  }

  const config = RESTORABLE_TABLES[table];
  if (!config) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
  }

  try {
    const pool = getPool();
    const cols = config.displayColumns.join(', ');
    const offset = (page - 1) * perPage;

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM ${table} WHERE deleted_at IS NOT NULL`),
      pool.query(
        `SELECT ${cols} FROM ${table} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT $1 OFFSET $2`,
        [perPage, offset]
      ),
    ]);

    return NextResponse.json({
      table,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      perPage,
      items: dataResult.rows,
    });
  } catch (error) {
    console.error('Deleted items fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch deleted items' }, { status: 500 });
  }
}
