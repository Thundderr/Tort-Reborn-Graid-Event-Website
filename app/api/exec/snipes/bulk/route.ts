import { NextRequest, NextResponse } from 'next/server';
import { requireExecSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// POST — Bulk operations on snipe logs
export async function POST(request: NextRequest) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const body = await request.json();
    const { action, ids, season } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing action or ids' }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 items per bulk operation' }, { status: 400 });
    }

    const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(',');

    if (action === 'delete') {
      // Soft delete (participants kept intact for potential restore)
      const result = await pool.query(
        `UPDATE snipe_logs SET deleted_at = NOW(), deleted_by = $${ids.length + 1}
         WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
        [...ids, session.discord_id]
      );

      await auditLog({ logType: 'snipe', session, action: `Bulk deleted ${result.rowCount} snipes: [${ids.join(', ')}]`, targetTable: 'snipe_logs', httpMethod: 'DELETE', request });

      return NextResponse.json({ success: true, deleted: result.rowCount });
    }

    if (action === 'update_season') {
      if (season == null || season < 1) {
        return NextResponse.json({ error: 'Invalid season value' }, { status: 400 });
      }

      const result = await pool.query(
        `UPDATE snipe_logs SET season = $${ids.length + 1} WHERE id IN (${placeholders})`,
        [...ids, season]
      );

      await auditLog({ logType: 'snipe', session, action: `Bulk moved ${result.rowCount} snipes to season ${season}: [${ids.join(', ')}]`, targetTable: 'snipe_logs', httpMethod: 'PATCH', request });

      return NextResponse.json({ success: true, updated: result.rowCount });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Snipe bulk error:', error);
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 });
  }
}
