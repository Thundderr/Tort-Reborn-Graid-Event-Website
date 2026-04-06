import { NextRequest, NextResponse } from 'next/server';
import { requireExecSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

const THUNDDERR_DISCORD_ID = '170719819715313665';

/**
 * GET /api/exec/admin/audit
 * Browse the audit log with filters. Thundderr only.
 *
 * Query params:
 *   logType     - filter by log_type
 *   actorId     - filter by actor_id (discord_id)
 *   targetTable - filter by target_table
 *   dateFrom    - ISO date string (inclusive)
 *   dateTo      - ISO date string (inclusive)
 *   page        - page number (default 1)
 *   perPage     - items per page (default 50, max 100)
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
  const logType = url.searchParams.get('logType');
  const actorId = url.searchParams.get('actorId');
  const targetTable = url.searchParams.get('targetTable');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('perPage') || '50', 10)));

  try {
    const pool = getPool();
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (logType) {
      conditions.push(`log_type = $${idx++}`);
      params.push(logType);
    }
    if (actorId) {
      conditions.push(`actor_id = $${idx++}`);
      params.push(actorId);
    }
    if (targetTable) {
      conditions.push(`target_table = $${idx++}`);
      params.push(targetTable);
    }
    if (dateFrom) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`created_at <= $${idx++}::date + INTERVAL '1 day'`);
      params.push(dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * perPage;

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM audit_log ${whereClause}`, params),
      pool.query(
        `SELECT id, log_type, actor_name, actor_id, action, target_table, target_id, http_method, old_values, ip_address, created_at
         FROM audit_log ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, perPage, offset]
      ),
    ]);

    return NextResponse.json({
      total: parseInt(countResult.rows[0].total, 10),
      page,
      perPage,
      entries: dataResult.rows,
    });
  } catch (error) {
    console.error('Audit log fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}
