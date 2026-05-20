import { NextResponse } from 'next/server';
import pool, { toNumber } from '@/lib/analytics-db';

export async function GET() {
  try {
    const [totalsResult, retentionAvgResult] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::bigint FROM users) AS total_users,
          (SELECT COUNT(*)::bigint FROM tattoos
             WHERE COALESCE(moderation_status, 'approved') != 'removed') AS total_posts,
          (SELECT COUNT(*)::bigint FROM user_saved_tattoos) AS total_saves,
          (SELECT COUNT(*)::bigint FROM user_liked_tattoos) AS total_likes,
          (SELECT COUNT(DISTINCT COALESCE(viewer_user_id::text, anonymous_id))::bigint
             FROM analytics_events
             WHERE event_name IN ('contact_artist', 'contact_request_submitted')
               AND COALESCE(viewer_user_id::text, anonymous_id) IS NOT NULL) AS users_ever_contacted,
          (SELECT COUNT(DISTINCT COALESCE(viewer_user_id::text, anonymous_id) || '|' || COALESCE(artist_id::text, ''))::bigint
             FROM analytics_events
             WHERE event_name IN ('contact_artist', 'contact_request_submitted')
               AND COALESCE(viewer_user_id::text, anonymous_id) IS NOT NULL) AS total_contact_requests,
          (SELECT COUNT(DISTINCT user_key)::bigint FROM analytics_daily_user_activity) AS total_active_users_ever
      `),
      pool.query(`
        SELECT
          ROUND(AVG(d1_retention) * 100, 2) AS avg_d1_retention_pct,
          ROUND(AVG(d7_retention) * 100, 2) AS avg_d7_retention_pct,
          ROUND(AVG(saves_per_user), 2) AS avg_saves_per_user
        FROM analytics_weekly_dashboard_metrics
        WHERE window_type = 'calendar_week'
          AND d1_retention IS NOT NULL
      `).catch(() => ({ rows: [{}] })),
    ]);

    const t = totalsResult.rows[0] || {};
    const r = retentionAvgResult.rows[0] || {};

    return NextResponse.json({
      totalUsers: toNumber(t.total_users),
      totalPosts: toNumber(t.total_posts),
      totalSaves: toNumber(t.total_saves),
      totalLikes: toNumber(t.total_likes),
      usersEverContacted: toNumber(t.users_ever_contacted),
      totalContactRequests: toNumber(t.total_contact_requests),
      totalActiveUsersEver: toNumber(t.total_active_users_ever),
      avgD1RetentionPct: toNumber(r.avg_d1_retention_pct),
      avgD7RetentionPct: toNumber(r.avg_d7_retention_pct),
      avgSavesPerUser: toNumber(r.avg_saves_per_user),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
