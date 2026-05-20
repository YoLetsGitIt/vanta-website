import { NextResponse } from 'next/server';
import pool, { toNumber, fmtDate } from '@/lib/analytics-db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 26), 1), 104);
    const requestedWindow = String(searchParams.get('window') || 'calendar_week').toLowerCase();
    const supportedWindows = new Set(['calendar_week', 'trailing_7d', 'both']);

    if (!supportedWindows.has(requestedWindow)) {
      return NextResponse.json({ error: 'Invalid window' }, { status: 400 });
    }

    const values = [limit];
    let whereClause = '';
    if (requestedWindow !== 'both') {
      values.unshift(requestedWindow);
      whereClause = 'WHERE window_type = $1';
    }

    const result = await pool.query(`
      SELECT
        window_type, snapshot_week_start, snapshot_window_end,
        d1_retention, d7_retention, saves_per_user,
        new_users, activated_users, sessions_count, saves_per_session, computed_at
      FROM analytics_weekly_dashboard_metrics
      ${whereClause}
      ORDER BY snapshot_week_start DESC
      LIMIT $${values.length}
    `, values);

    const rows = result.rows
      .map((row) => ({
        windowType: row.window_type,
        weekStart: fmtDate(row.snapshot_week_start),
        windowEnd: fmtDate(row.snapshot_window_end),
        d1RetentionPct: toNumber(row.d1_retention) * 100,
        d7RetentionPct: toNumber(row.d7_retention) * 100,
        savesPerUser: toNumber(row.saves_per_user),
        newUsers: toNumber(row.new_users),
        activatedUsers: toNumber(row.activated_users),
        sessionsCount: toNumber(row.sessions_count),
        savesPerSession: toNumber(row.saves_per_session),
        computedAt: row.computed_at,
      }))
      .reverse();

    return NextResponse.json({ rows, selectedWindow: requestedWindow });
  } catch (error) {
    if (String(error.message).toLowerCase().includes('does not exist')) {
      return NextResponse.json({ rows: [], warning: 'analytics_weekly_dashboard_metrics table not found' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
