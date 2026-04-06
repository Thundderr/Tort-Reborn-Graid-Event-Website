import { NextRequest, NextResponse } from 'next/server';
import { requireExecSession } from '@/lib/exec-auth';
import { getPool } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
    }

    const pool = getPool();

    const ticketResult = await pool.query(
      `SELECT t.*,
              dl1.ign AS submitted_by_ign,
              dl2.ign AS assigned_to_ign
       FROM tracker_tickets t
       LEFT JOIN discord_links dl1 ON dl1.discord_id = t.submitted_by
       LEFT JOIN discord_links dl2 ON dl2.discord_id = t.assigned_to
       WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const row = ticketResult.rows[0];

    const [commentsResult, attachmentsResult] = await Promise.all([
      pool.query(
        `SELECT c.*, dl.ign AS author_ign
         FROM tracker_comments c
         LEFT JOIN discord_links dl ON dl.discord_id = c.author_id
         WHERE c.ticket_id = $1
         ORDER BY c.created_at ASC`,
        [ticketId]
      ),
      pool.query(
        `SELECT id, filename, content_type, size_bytes, uploaded_by, created_at
         FROM tracker_attachments
         WHERE ticket_id = $1
         ORDER BY created_at ASC`,
        [ticketId]
      ),
    ]);

    return NextResponse.json({
      ticket: {
        id: row.id,
        type: row.type,
        system: row.system,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        submittedBy: row.submitted_by?.toString(),
        submittedByIgn: row.submitted_by_ign,
        assignedTo: row.assigned_to?.toString() || null,
        assignedToIgn: row.assigned_to_ign || null,
        dueDate: row.due_date || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      comments: commentsResult.rows.map(c => ({
        id: c.id,
        authorId: c.author_id?.toString(),
        authorIgn: c.author_ign,
        body: c.body,
        createdAt: c.created_at,
      })),
      attachments: attachmentsResult.rows.map(a => ({
        id: a.id,
        filename: a.filename,
        contentType: a.content_type,
        sizeBytes: a.size_bytes,
        uploadedBy: a.uploaded_by?.toString(),
        createdAt: a.created_at,
      })),
    });
  } catch (error) {
    console.error('Tracker detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireExecSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (body.status !== undefined) {
      if (!['untriaged', 'todo', 'in_progress', 'deployed', 'declined'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.push(`status = $${paramIdx}`);
      values.push(body.status);
      paramIdx++;
    }

    if (body.priority !== undefined) {
      if (!['low', 'medium', 'high', 'critical'].includes(body.priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
      }
      updates.push(`priority = $${paramIdx}`);
      values.push(body.priority);
      paramIdx++;
    }

    if (body.type !== undefined) {
      if (!['bug', 'feature'].includes(body.type)) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
      }
      updates.push(`type = $${paramIdx}`);
      values.push(body.type);
      paramIdx++;
    }

    if (body.system !== undefined) {
      const validSystems = ['discord_bot', 'minecraft_mod', 'website'];
      const systemArr: string[] = Array.isArray(body.system) ? body.system : [body.system];
      if (systemArr.length === 0 || !systemArr.every((s: string) => validSystems.includes(s))) {
        return NextResponse.json({ error: 'Invalid system' }, { status: 400 });
      }
      updates.push(`system = $${paramIdx}::text[]`);
      values.push(systemArr);
      paramIdx++;
    }

    if (body.assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIdx}`);
      values.push(body.assigned_to || null);
      paramIdx++;
    }

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updates.push(`title = $${paramIdx}`);
      values.push(body.title.trim());
      paramIdx++;
    }

    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || body.description.trim().length === 0) {
        return NextResponse.json({ error: 'Description cannot be empty' }, { status: 400 });
      }
      updates.push(`description = $${paramIdx}`);
      values.push(body.description.trim());
      paramIdx++;
    }

    if (body.due_date !== undefined) {
      updates.push(`due_date = $${paramIdx}`);
      values.push(body.due_date || null);
      paramIdx++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(ticketId);

    const pool = getPool();

    const old = await pool.query(
      `SELECT * FROM tracker_tickets WHERE id = $1 AND deleted_at IS NULL`,
      [ticketId]
    );

    await pool.query(
      `UPDATE tracker_tickets SET ${updates.join(', ')} WHERE id = $${paramIdx} AND deleted_at IS NULL`,
      values
    );

    await auditLog({ logType: 'tracker', session, action: `Updated ticket #${ticketId}`, targetTable: 'tracker_tickets', targetId: String(ticketId), httpMethod: 'PATCH', oldValues: old.rows[0] || null, request });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tracker update error:', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

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
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
    }

    const pool = getPool();

    const old = await pool.query(
      `SELECT * FROM tracker_tickets WHERE id = $1 AND deleted_at IS NULL`,
      [ticketId]
    );

    // Soft delete (S3 attachments retained for potential restore)
    await pool.query(
      `UPDATE tracker_tickets SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL`,
      [ticketId, session.discord_id]
    );

    await auditLog({ logType: 'tracker', session, action: `Deleted ticket #${ticketId}`, targetTable: 'tracker_tickets', targetId: String(ticketId), httpMethod: 'DELETE', oldValues: old.rows[0] || null, request });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tracker delete error:', error);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
