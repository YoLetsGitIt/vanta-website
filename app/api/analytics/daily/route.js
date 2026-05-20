import { NextResponse } from 'next/server';
import pool, { toNumber, fmtDate } from '@/lib/analytics-db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 60), 1), 365);

    const result = await pool.query(`
      SELECT
        day, active_users, new_users, users_contacted_artist,
        pct_users_contact_artist, tattoo_detail_views, save_events,
        profile_click_events, contact_events, repeat_saves_same_artist,
        posts_created, views_per_post, saves_per_post, likes_per_post,
        contact_requests_received, profile_conversion_rate,
        save_to_profile_click_conversion, profile_click_to_contact_conversion,
        sessions_count, saves_per_session
      FROM analytics_kpi_daily
      ORDER BY day DESC
      LIMIT $1
    `, [limit]);

    const rows = result.rows
      .map((row) => ({
        day: fmtDate(row.day),
        activeUsers: toNumber(row.active_users),
        newUsers: toNumber(row.new_users),
        usersContactedArtist: toNumber(row.users_contacted_artist),
        pctUsersContactArtist: toNumber(row.pct_users_contact_artist),
        tattooDetailViews: toNumber(row.tattoo_detail_views),
        saveEvents: toNumber(row.save_events),
        profileClickEvents: toNumber(row.profile_click_events),
        contactEvents: toNumber(row.contact_events),
        repeatSavesSameArtist: toNumber(row.repeat_saves_same_artist),
        postsCreated: toNumber(row.posts_created),
        viewsPerPost: toNumber(row.views_per_post),
        savesPerPost: toNumber(row.saves_per_post),
        likesPerPost: toNumber(row.likes_per_post),
        contactRequestsReceived: toNumber(row.contact_requests_received),
        profileConversionRate: toNumber(row.profile_conversion_rate),
        saveToProfileClickConversion: toNumber(row.save_to_profile_click_conversion),
        profileClickToContactConversion: toNumber(row.profile_click_to_contact_conversion),
        sessionsCount: toNumber(row.sessions_count),
        savesPerSession: toNumber(row.saves_per_session),
      }))
      .reverse();

    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
