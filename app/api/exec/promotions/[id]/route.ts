import { NextRequest, NextResponse } from 'next/server';
import { requireExecSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const entryId = parseInt(id, 10);
    if (isNaN(entryId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const pool = getPool();

    const old = await pool.query(
      `SELECT * FROM promotion_queue WHERE id = $1 AND deleted_at IS NULL`,
      [entryId]
    );

    const result = await pool.query(
      `UPDATE promotion_queue SET deleted_at = NOW(), deleted_by = $2
       WHERE id = $1 AND status = 'pending' AND deleted_at IS NULL`,
      [entryId, session.discord_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Entry not found or already processed' }, { status: 404 });
    }

    await auditLog({ logType: 'promotion', session, action: `Cancelled promotion #${entryId}`, targetTable: 'promotion_queue', targetId: String(entryId), httpMethod: 'DELETE', oldValues: old.rows[0] || null, request });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel promotion error:', error);
    return NextResponse.json({ error: 'Failed to cancel promotion' }, { status: 500 });
  }
}
