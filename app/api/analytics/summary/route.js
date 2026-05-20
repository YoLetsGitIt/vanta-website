import { NextResponse } from 'next/server';
import pool, { toNumber, fmtDate } from '@/lib/analytics-db';

export async function GET() {
  try {
    const [weeklyResult, dailyResult, retentionResult] = await Promise.all([
      pool.query(`SELECT * FROM analytics_kpi_weekly ORDER BY week_start DESC LIMIT 1`),
      pool.query(`SELECT * FROM analytics_kpi_daily ORDER BY day DESC LIMIT 1`),
      pool.query(`
        SELECT new_users, activated_users, sessions_count, saves_per_session
        FROM analytics_weekly_dashboard_metrics
        WHERE window_type = 'calendar_week'
        ORDER BY snapshot_week_start DESC
        LIMIT 1
      `).catch(() => ({ rows: [] })),
    ]);

    const latestWeek = weeklyResult.rows[0] || null;
    const latestDay = dailyResult.rows[0] || null;
    const latestRetentionRow = retentionResult.rows[0] || null;

    return NextResponse.json({
      latestWeek: latestWeek ? {
        weekStart: fmtDate(latestWeek.week_start),
        newUsers: toNumber(latestWeek.new_users),
        activatedUsers: toNumber(latestRetentionRow?.activated_users),
        pctUsersContactArtist: toNumber(latestWeek.pct_users_contact_artist),
        saveToProfileClickConversion: toNumber(latestWeek.save_to_profile_click_conversion),
        profileClickToContactConversion: toNumber(latestWeek.profile_click_to_contact_conversion),
        repeatSavesSameArtist: toNumber(latestWeek.repeat_saves_same_artist),
        postsPerWeek: toNumber(latestWeek.posts_per_week),
        viewsPerPost: toNumber(latestWeek.views_per_post),
        savesPerPost: toNumber(latestWeek.saves_per_post),
        likesPerPost: toNumber(latestWeek.likes_per_post),
        contactRequestsReceived: toNumber(latestWeek.contact_requests_received),
        profileConversionRate: toNumber(latestWeek.profile_conversion_rate),
        sessionsCount: toNumber(latestWeek.sessions_count),
        savesPerSession: toNumber(latestWeek.saves_per_session),
      } : null,
      latestDay: latestDay ? {
        day: fmtDate(latestDay.day),
        newUsers: toNumber(latestDay.new_users),
      } : null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
