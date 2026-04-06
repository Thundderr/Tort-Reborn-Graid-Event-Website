import { NextRequest, NextResponse } from 'next/server';
import { requireExecSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const THUNDDERR_DISCORD_ID = '170719819715313665';

const RESTORABLE_TABLES: Record<string, { idColumn: string }> = {
  snipe_logs:              { idColumn: 'id' },
  blacklist:               { idColumn: 'uuid' },
  kick_list:               { idColumn: 'uuid' },
  tracker_tickets:         { idColumn: 'id' },
  dashboard_events:        { idColumn: 'id' },
  dashboard_notes:         { idColumn: 'id' },
  build_definitions:       { idColumn: 'key' },
  graid_events:            { idColumn: 'id' },
  agenda_bau_topics:       { idColumn: 'id' },
  agenda_requested_topics: { idColumn: 'id' },
  promotion_queue:         { idColumn: 'id' },
  promo_suggestions:       { idColumn: 'id' },
};

/**
 * POST /api/exec/admin/restore
 * Body: { table: "snipe_logs", id: "42" }
 * Restore a soft-deleted record. Thundderr only.
 */
export async function POST(request: NextRequest) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.discord_id !== THUNDDERR_DISCORD_ID) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { table, id } = await request.json();

    if (!table || !id) {
      return NextResponse.json({ error: 'table and id are required' }, { status: 400 });
    }

    const config = RESTORABLE_TABLES[table];
    if (!config) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE ${table} SET deleted_at = NULL, deleted_by = NULL WHERE ${config.idColumn} = $1 AND deleted_at IS NOT NULL`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Record not found or not deleted' }, { status: 404 });
    }

    await auditLog({
      logType: 'admin_restore',
      session,
      action: `Restored ${table} record: ${id}`,
      targetTable: table,
      targetId: String(id),
      httpMethod: 'POST',
      request,
    });

    return NextResponse.json({ success: true, restored: { table, id } });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Failed to restore record' }, { status: 500 });
  }
}
