import { NextRequest, NextResponse } from 'next/server';
import { requireExecSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['DPS', 'HEALER', 'TANK'];
const KEY_REGEX = /^[a-z0-9_]+$/;

export async function POST(request: NextRequest) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { key, name, role, color, connsUrl, hqUrl } = await request.json();

    if (!key || typeof key !== 'string' || !KEY_REGEX.test(key) || key.length > 32) {
      return NextResponse.json({ error: 'Key must be lowercase alphanumeric with underscores, max 32 chars' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role must be DPS, HEALER, or TANK' }, { status: 400 });
    }
    if (!color || typeof color !== 'string') {
      return NextResponse.json({ error: 'Color is required' }, { status: 400 });
    }

    const pool = getPool();

    // Get next sort order
    const sortResult = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM build_definitions WHERE deleted_at IS NULL');
    const nextOrder = sortResult.rows[0].next_order;

    await pool.query(
      `INSERT INTO build_definitions (key, name, role, color, conns_url, hq_url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [key, name.trim(), role, color, connsUrl?.trim() || '#', hqUrl?.trim() || '#', nextOrder]
    );

    await auditLog({ logType: 'build', session, action: `Created build definition: ${name.trim()}`, targetTable: 'build_definitions', targetId: key, httpMethod: 'POST', request });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'A build with that key already exists' }, { status: 409 });
    }
    console.error('Build definition create error:', error);
    return NextResponse.json({ error: 'Failed to create build definition' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { key, name, role, color, connsUrl, hqUrl } = await request.json();

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role must be DPS, HEALER, or TANK' }, { status: 400 });
    }
    if (!color || typeof color !== 'string') {
      return NextResponse.json({ error: 'Color is required' }, { status: 400 });
    }

    const pool = getPool();

    const old = await pool.query(
      `SELECT * FROM build_definitions WHERE key = $1 AND deleted_at IS NULL`,
      [key]
    );

    const result = await pool.query(
      `UPDATE build_definitions SET name = $2, role = $3, color = $4, conns_url = $5, hq_url = $6
       WHERE key = $1 AND deleted_at IS NULL`,
      [key, name.trim(), role, color, connsUrl?.trim() || '#', hqUrl?.trim() || '#']
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    await auditLog({ logType: 'build', session, action: `Updated build definition: ${name.trim()}`, targetTable: 'build_definitions', targetId: key, httpMethod: 'PATCH', oldValues: old.rows[0] || null, request });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Build definition update error:', error);
    return NextResponse.json({ error: 'Failed to update build definition' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { key } = await request.json();
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      const old = await client.query(
        'SELECT * FROM build_definitions WHERE key = $1 AND deleted_at IS NULL',
        [key]
      );

      // Soft delete the definition (member_builds stay linked for potential restore)
      const result = await client.query(
        'UPDATE build_definitions SET deleted_at = NOW(), deleted_by = $2 WHERE key = $1 AND deleted_at IS NULL',
        [key, session.discord_id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Build not found' }, { status: 404 });
      }

      await auditLog({ logType: 'build', session, action: `Deleted build definition: ${key}`, targetTable: 'build_definitions', targetId: key, httpMethod: 'DELETE', oldValues: old.rows[0] || null, request });

      return NextResponse.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Build definition delete error:', error);
    return NextResponse.json({ error: 'Failed to delete build definition' }, { status: 500 });
  }
}
