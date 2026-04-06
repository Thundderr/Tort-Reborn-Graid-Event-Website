import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Daily database backup via Neon branching API.
 * Creates a named branch (backup-YYYY-MM-DD) and prunes branches older than 7 days.
 * Triggered by Vercel Cron or manually.
 *
 * Required env vars: NEON_API_KEY, NEON_PROJECT_ID, CRON_SECRET
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron or an authorized caller
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: 'NEON_API_KEY and NEON_PROJECT_ID must be set' },
      { status: 500 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const branchName = `backup-${today}`;
  const neonBase = `https://console.neon.tech/api/v2/projects/${projectId}`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    // List existing branches to find the main branch ID and old backups
    const listRes = await fetch(`${neonBase}/branches`, { headers });
    if (!listRes.ok) {
      const text = await listRes.text();
      return NextResponse.json({ error: `Failed to list branches: ${text}` }, { status: 500 });
    }
    const { branches } = await listRes.json();

    // Find main branch (parent for new backup)
    const mainBranch = branches.find((b: any) => b.name === 'main' || b.primary);
    if (!mainBranch) {
      return NextResponse.json({ error: 'Could not find main branch' }, { status: 500 });
    }

    // Check if today's backup already exists
    const existingBackup = branches.find((b: any) => b.name === branchName);
    if (existingBackup) {
      return NextResponse.json({ message: `Backup ${branchName} already exists`, skipped: true });
    }

    // Create new backup branch
    const createRes = await fetch(`${neonBase}/branches`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        branch: {
          name: branchName,
          parent_id: mainBranch.id,
        },
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      return NextResponse.json({ error: `Failed to create branch: ${text}` }, { status: 500 });
    }

    // Prune backup branches older than 7 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    let pruned = 0;

    for (const branch of branches) {
      if (!branch.name.startsWith('backup-')) continue;
      const dateStr = branch.name.replace('backup-', '');
      const branchDate = new Date(dateStr);
      if (isNaN(branchDate.getTime())) continue;
      if (branchDate < cutoff) {
        await fetch(`${neonBase}/branches/${branch.id}`, {
          method: 'DELETE',
          headers,
        }).catch(() => {}); // best-effort cleanup
        pruned++;
      }
    }

    return NextResponse.json({
      success: true,
      created: branchName,
      pruned,
    });
  } catch (error) {
    console.error('Backup cron error:', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
