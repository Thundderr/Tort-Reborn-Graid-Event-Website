import { getPool } from '@/lib/db';
import { ExecSessionData } from '@/lib/exec-auth';
import { NextRequest } from 'next/server';

interface AuditEntry {
  logType: string;
  session: ExecSessionData;
  action: string;
  targetTable?: string;
  targetId?: string;
  httpMethod?: string;
  oldValues?: Record<string, unknown> | null;
  request?: NextRequest;
}

/**
 * Insert a row into audit_log with structured data.
 * Captures actor, action, target context, old values (for reconstruction), and IP.
 * Never throws — audit failures are logged but don't break the request.
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const pool = getPool();
    const ip = entry.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    await pool.query(
      `INSERT INTO audit_log (log_type, actor_name, actor_id, action, target_table, target_id, http_method, old_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.logType,
        entry.session.ign,
        entry.session.discord_id,
        entry.action,
        entry.targetTable || null,
        entry.targetId || null,
        entry.httpMethod || null,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        ip,
      ]
    );
  } catch (err) {
    console.error('Audit log insert failed:', err);
  }
}
