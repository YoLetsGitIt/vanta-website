import { NextResponse } from 'next/server';
import pool from '@/lib/analytics-db';

export async function POST(request, { params }) {
  const { targetType, targetId } = await params;
  const action = String((await request.json().catch(() => ({}))).action || '').toLowerCase();

  if (targetType !== 'tattoo' && targetType !== 'artist') {
    return NextResponse.json({ error: 'targetType must be tattoo or artist' }, { status: 400 });
  }
  if (action !== 'approve' && action !== 'remove') {
    return NextResponse.json({ error: 'action must be approve or remove' }, { status: 400 });
  }

  const moderationStatus = action === 'approve' ? 'approved' : 'removed';
  const reviewStatus = action === 'approve' ? 'approved' : 'removed';
  const table = targetType === 'tattoo' ? 'tattoos' : 'artists';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE ${table} SET moderation_status = $1 WHERE id = $2`, [moderationStatus, targetId]);
    await client.query(`
      UPDATE reports
      SET review_status = $1, reviewed_at = now()
      WHERE target_type = $2 AND target_id = $3 AND review_status = 'open'
    `, [reviewStatus, targetType, targetId]);
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, targetType, targetId, moderationStatus });
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
