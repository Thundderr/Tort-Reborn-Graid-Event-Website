import { NextRequest, NextResponse } from 'next/server';
import { requireExecSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, topic, description FROM agenda_bau_topics WHERE deleted_at IS NULL ORDER BY id ASC`
    );

    return NextResponse.json({
      topics: result.rows.map(row => ({
        id: row.id,
        topic: row.topic,
        description: row.description,
      })),
    });
  } catch (error) {
    console.error('Agenda BAU fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch BAU topics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { topic, description } = await request.json();
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(
      `INSERT INTO agenda_bau_topics (topic, description) VALUES ($1, $2)`,
      [topic.trim(), description?.trim() || null]
    );

    await auditLog({ logType: 'agenda', session, action: `Added BAU topic: ${topic.trim()}`, targetTable: 'agenda_bau_topics', httpMethod: 'POST', request });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Topic already exists' }, { status: 409 });
    }
    console.error('Agenda BAU add error:', error);
    return NextResponse.json({ error: 'Failed to add topic' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, topic, description } = await request.json();
    if (!id || !topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json({ error: 'ID and topic are required' }, { status: 400 });
    }

    const pool = getPool();
    const old = await pool.query(`SELECT * FROM agenda_bau_topics WHERE id = $1 AND deleted_at IS NULL`, [id]);
    await pool.query(
      `UPDATE agenda_bau_topics SET topic = $1, description = $2 WHERE id = $3 AND deleted_at IS NULL`,
      [topic.trim(), description?.trim() || null, id]
    );

    await auditLog({ logType: 'agenda', session, action: `Updated BAU topic ${id}`, targetTable: 'agenda_bau_topics', targetId: String(id), httpMethod: 'PATCH', oldValues: old.rows[0] || null, request });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Topic already exists' }, { status: 409 });
    }
    console.error('Agenda BAU edit error:', error);
    return NextResponse.json({ error: 'Failed to edit topic' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const pool = getPool();
    const old = await pool.query(`SELECT * FROM agenda_bau_topics WHERE id = $1 AND deleted_at IS NULL`, [id]);
    await pool.query(
      `UPDATE agenda_bau_topics SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL`,
      [id, session.discord_id]
    );

    await auditLog({ logType: 'agenda', session, action: `Deleted BAU topic ${id}`, targetTable: 'agenda_bau_topics', targetId: String(id), httpMethod: 'DELETE', oldValues: old.rows[0] || null, request });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Agenda BAU delete error:', error);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}
