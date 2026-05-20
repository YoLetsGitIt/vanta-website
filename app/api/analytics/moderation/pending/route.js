import { NextResponse } from 'next/server';
import pool, { toNumber } from '@/lib/analytics-db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 300);

    await pool.query(`
      WITH pending_tattoos AS (
        SELECT target_id FROM reports
        WHERE target_type = 'tattoo' AND review_status = 'open'
        GROUP BY target_id
      )
      UPDATE tattoos t SET moderation_status = 'under_review'
      FROM pending_tattoos p
      WHERE t.id = p.target_id AND COALESCE(t.moderation_status, 'approved') = 'approved'
    `);

    await pool.query(`
      WITH pending_artists AS (
        SELECT target_id FROM reports
        WHERE target_type = 'artist' AND review_status = 'open'
        GROUP BY target_id
      )
      UPDATE artists a SET moderation_status = 'under_review'
      FROM pending_artists p
      WHERE a.id = p.target_id AND COALESCE(a.moderation_status, 'approved') = 'approved'
    `);

    const result = await pool.query(`
      WITH pending AS (
        SELECT target_type, target_id,
               COUNT(*)::bigint AS open_report_count,
               MAX(created_at) AS most_recent_report
        FROM reports WHERE review_status = 'open'
        GROUP BY target_type, target_id
      )
      SELECT
        p.target_type, p.target_id, p.open_report_count, p.most_recent_report,
        CASE WHEN p.target_type = 'tattoo' THEN COALESCE(t.moderation_status, 'approved')
             ELSE COALESCE(a.moderation_status, 'approved') END AS moderation_status,
        CASE WHEN p.target_type = 'tattoo' THEN COALESCE(t.title, '[deleted tattoo]')
             ELSE COALESCE(u_artist.name, '[deleted artist]') END AS target_label,
        CASE WHEN p.target_type = 'tattoo' THEN COALESCE(u_tattoo_artist.name, '')
             ELSE '' END AS artist_name,
        CASE WHEN p.target_type = 'tattoo' THEN COALESCE(t.images[1], '')
             ELSE '' END AS preview_image
      FROM pending p
      LEFT JOIN tattoos t ON p.target_type = 'tattoo' AND t.id = p.target_id
      LEFT JOIN users u_tattoo_artist ON u_tattoo_artist.id = t.artist_id
      LEFT JOIN artists a ON p.target_type = 'artist' AND a.id = p.target_id
      LEFT JOIN users u_artist ON u_artist.id = a.id
      ORDER BY p.open_report_count DESC, p.most_recent_report DESC
      LIMIT $1
    `, [limit]);

    const rows = result.rows.map((row) => ({
      targetType: row.target_type,
      targetId: row.target_id,
      openReportCount: toNumber(row.open_report_count),
      mostRecentReport: row.most_recent_report,
      moderationStatus: row.moderation_status,
      targetLabel: row.target_label,
      artistName: row.artist_name,
      previewImage: row.preview_image,
    }));

    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
