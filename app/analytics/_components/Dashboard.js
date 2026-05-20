'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Chart from 'chart.js/auto';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatNumber = (v) => Number(v || 0).toLocaleString();
const formatPercent = (v) => `${Number(v || 0).toFixed(2)}%`;

const formatDate = (value) => {
  if (!value) return '';
  const s = String(value);
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const formatDateWeekEnd = (value) => {
  if (!value) return '';
  const s = String(value);
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ title, value, accent, curr, prev, deltaType }) {
  let deltaEl = null;
  if (prev != null) {
    const diff = Number(curr) - Number(prev);
    const significant = deltaType === 'pp' ? Math.abs(diff) >= 0.01 : diff !== 0;
    if (significant) {
      const cls = diff > 0 ? 'kpi-delta-up' : 'kpi-delta-down';
      const text = deltaType === 'pp'
        ? `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(2)}pp`
        : `${diff > 0 ? '↑' : '↓'} ${formatNumber(Math.abs(diff))}`;
      deltaEl = <span className={`kpi-delta ${cls}`}>{text}</span>;
    }
  }
  return (
    <article className="kpi-card" style={{ '--kpi-accent': accent }}>
      <p className="kpi-title">{title}</p>
      <p className="kpi-value">{value}</p>
      {deltaEl}
    </article>
  );
}

// ── Chart helpers ──────────────────────────────────────────────────────────

const chartBaseOpts = (extraScales = {}) => {
  const tickStyle = { color: '#606c7e', font: { size: 11 } };
  const gridStyle = { color: 'rgba(255,255,255,0.045)' };
  const borderStyle = { color: 'rgba(255,255,255,0.06)' };
  return {
    responsive: true,
    aspectRatio: 2.4,
    plugins: {
      legend: { labels: { color: '#9fadc2', font: { size: 12 }, boxWidth: 10, padding: 14 } },
      tooltip: {
        backgroundColor: '#141c2a', borderColor: '#2a3548', borderWidth: 1,
        titleColor: '#dde3ee', bodyColor: '#9fadc2', padding: 10, cornerRadius: 8,
        boxWidth: 10, boxHeight: 10,
      },
    },
    scales: {
      x: { ticks: { ...tickStyle, maxRotation: 45, autoSkip: true, maxTicksLimit: 14 }, grid: gridStyle, border: borderStyle },
      y: { ticks: tickStyle, grid: gridStyle, border: borderStyle },
      ...extraScales,
    },
  };
};

// ── Dashboard ──────────────────────────────────────────────────────────────

export default function Dashboard({ page }) {
  const [weekly, setWeekly] = useState([]);
  const [daily, setDaily] = useState([]);
  const [retention, setRetention] = useState([]);
  const [moderation, setModeration] = useState([]);
  const [alltime, setAlltime] = useState(null);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(-1);
  const [retentionWindow, setRetentionWindow] = useState('calendar_week');
  const [statusMsg, setStatusMsg] = useState('Loading…');
  const [statusError, setStatusError] = useState(false);

  // Chart canvas refs
  const conversionRef   = useRef(null);
  const contentRef      = useRef(null);
  const contactDailyRef = useRef(null);
  const postsDailyRef   = useRef(null);
  const retentionRef    = useRef(null);
  const growthRef       = useRef(null);
  const sessionsRef     = useRef(null);

  const chartInstances = useRef({});

  const makeChart = useCallback((key, ref, config) => {
    if (chartInstances.current[key]) {
      chartInstances.current[key].destroy();
      delete chartInstances.current[key];
    }
    if (!ref?.current) return;
    chartInstances.current[key] = new Chart(ref.current, config);
  }, []);

  // Destroy all charts on unmount
  useEffect(() => {
    return () => Object.values(chartInstances.current).forEach((c) => c?.destroy());
  }, []);

  const loadDashboard = useCallback(async (window = retentionWindow) => {
    setStatusMsg('Loading…');
    setStatusError(false);
    try {
      const [at, wk, dy, ret, mod] = await Promise.all([
        fetchJson('/api/analytics/alltime'),
        fetchJson('/api/analytics/weekly?limit=52'),
        fetchJson('/api/analytics/daily?limit=60'),
        fetchJson(`/api/analytics/retention?limit=52&window=${encodeURIComponent(window)}`),
        fetchJson('/api/analytics/moderation/pending?limit=120'),
      ]);

      const rows = wk.rows || [];
      setAlltime(at);
      setWeekly(rows);
      setDaily(dy.rows || []);
      setRetention(ret.rows || []);
      setModeration(mod.rows || []);
      setSelectedWeekIdx((prev) => (prev < 0 ? rows.length - 1 : Math.min(prev, rows.length - 1)));
      setStatusMsg(`Updated ${new Date().toLocaleString()}`);
    } catch (e) {
      setStatusMsg(`Failed to load: ${e.message}`);
      setStatusError(true);
    }
  }, [retentionWindow]);

  useEffect(() => { loadDashboard(); }, []);

  // Render charts — only on alltime page, after data arrives
  useEffect(() => {
    if (page !== 'alltime') return;
    if (!weekly.length && !daily.length && !retention.length) return;

    const weeklyLabels    = weekly.map((r) => formatDate(r.weekStart));
    const dailyLabels     = daily.map((r) => formatDate(r.day));
    const retentionLabels = retention.map((r) => formatDate(r.weekStart));

    makeChart('conversion', conversionRef, {
      type: 'line',
      data: {
        labels: weeklyLabels,
        datasets: [
          { label: '% Contact Artist',  data: weekly.map((r) => r.pctUsersContactArtist),           borderColor: '#8be9fd', backgroundColor: 'rgba(139,233,253,0.1)', tension: 0.35, pointRadius: 3 },
          { label: 'Saves→Profile %',   data: weekly.map((r) => r.saveToProfileClickConversion),    borderColor: '#f1fa8c', backgroundColor: 'rgba(241,250,140,0.1)', tension: 0.35, pointRadius: 3 },
          { label: 'Profile→Contact %', data: weekly.map((r) => r.profileClickToContactConversion), borderColor: '#bd93f9', backgroundColor: 'rgba(189,147,249,0.1)', tension: 0.35, pointRadius: 3 },
        ],
      },
      options: chartBaseOpts(),
    });

    makeChart('content', contentRef, {
      type: 'bar',
      data: {
        labels: weeklyLabels,
        datasets: [
          { label: 'Posts/Week',   data: weekly.map((r) => r.postsPerWeek), backgroundColor: 'rgba(80,250,123,0.65)'  },
          { label: 'Weekly Views', data: weekly.map((r) => r.viewsPerPost), backgroundColor: 'rgba(255,184,108,0.65)' },
          { label: 'Weekly Saves', data: weekly.map((r) => r.savesPerPost), backgroundColor: 'rgba(255,121,198,0.65)' },
          { label: 'Weekly Likes', data: weekly.map((r) => r.likesPerPost), backgroundColor: 'rgba(189,147,249,0.65)' },
        ],
      },
      options: chartBaseOpts(),
    });

    makeChart('contactDaily', contactDailyRef, {
      type: 'line',
      data: {
        labels: dailyLabels,
        datasets: [
          { label: 'Contact Requests', data: daily.map((r) => r.contactRequestsReceived), borderColor: '#ff79c6', backgroundColor: 'rgba(255,121,198,0.1)', tension: 0.35, pointRadius: 2 },
          { label: 'Repeat Saves',     data: daily.map((r) => r.repeatSavesSameArtist),   borderColor: '#50fa7b', backgroundColor: 'rgba(80,250,123,0.1)',   tension: 0.35, pointRadius: 2 },
        ],
      },
      options: chartBaseOpts(),
    });

    makeChart('postsDaily', postsDailyRef, {
      type: 'bar',
      data: {
        labels: dailyLabels,
        datasets: [
          { label: 'Posts Created', data: daily.map((r) => r.postsCreated), backgroundColor: 'rgba(139,233,253,0.65)' },
          { label: 'Daily Views',   data: daily.map((r) => r.viewsPerPost), backgroundColor: 'rgba(255,184,108,0.65)' },
          { label: 'Daily Saves',   data: daily.map((r) => r.savesPerPost), backgroundColor: 'rgba(189,147,249,0.65)' },
          { label: 'Daily Likes',   data: daily.map((r) => r.likesPerPost), backgroundColor: 'rgba(255,121,198,0.65)' },
        ],
      },
      options: chartBaseOpts(),
    });

    makeChart('retention', retentionRef, {
      type: 'line',
      data: {
        labels: retentionLabels,
        datasets: [
          { label: 'D1 Retention %', data: retention.map((r) => r.d1RetentionPct), borderColor: '#8be9fd', backgroundColor: 'rgba(139,233,253,0.1)', tension: 0.35, pointRadius: 3 },
          { label: 'D7 Retention %', data: retention.map((r) => r.d7RetentionPct), borderColor: '#bd93f9', backgroundColor: 'rgba(189,147,249,0.1)', tension: 0.35, pointRadius: 3 },
          { label: 'Saves/User',     data: retention.map((r) => r.savesPerUser),   borderColor: '#f1fa8c', backgroundColor: 'rgba(241,250,140,0.1)', tension: 0.35, pointRadius: 3 },
        ],
      },
      options: chartBaseOpts(),
    });

    makeChart('growth', growthRef, {
      type: 'bar',
      data: {
        labels: retentionLabels,
        datasets: [
          { label: 'New Users',       data: retention.map((r) => r.newUsers),       backgroundColor: 'rgba(80,250,123,0.65)'  },
          { label: 'Activated Users', data: retention.map((r) => r.activatedUsers), backgroundColor: 'rgba(139,233,253,0.65)' },
        ],
      },
      options: chartBaseOpts(),
    });

    const axisStyle   = { color: '#606c7e', font: { size: 11 } };
    const gridStyle   = { color: 'rgba(255,255,255,0.045)' };
    const borderStyle = { color: 'rgba(255,255,255,0.06)' };
    makeChart('sessions', sessionsRef, {
      type: 'line',
      data: {
        labels: retentionLabels,
        datasets: [
          { label: 'Sessions/Week', data: retention.map((r) => r.sessionsCount),   borderColor: '#ff79c6', backgroundColor: 'rgba(255,121,198,0.1)', tension: 0.35, pointRadius: 3, yAxisID: 'ySessions' },
          { label: 'Saves/Session', data: retention.map((r) => r.savesPerSession), borderColor: '#f1fa8c', backgroundColor: 'rgba(241,250,140,0.1)', tension: 0.35, pointRadius: 3, yAxisID: 'ySavesPerSession' },
        ],
      },
      options: {
        responsive: true, aspectRatio: 2.4,
        plugins: {
          legend: { labels: { color: '#9fadc2', font: { size: 12 }, boxWidth: 10, padding: 14 } },
          tooltip: { backgroundColor: '#141c2a', borderColor: '#2a3548', borderWidth: 1, titleColor: '#dde3ee', bodyColor: '#9fadc2', padding: 10, cornerRadius: 8 },
        },
        scales: {
          x: { ticks: { ...axisStyle, maxRotation: 45, autoSkip: true, maxTicksLimit: 14 }, grid: gridStyle, border: borderStyle },
          ySessions:        { type: 'linear', position: 'left',  ticks: axisStyle, grid: gridStyle, border: borderStyle, title: { display: true, text: 'Sessions',      color: '#8a96aa', font: { size: 11 } } },
          ySavesPerSession: { type: 'linear', position: 'right', ticks: axisStyle, grid: { drawOnChartArea: false }, border: { color: 'transparent' }, title: { display: true, text: 'Saves / Session', color: '#8a96aa', font: { size: 11 } } },
        },
      },
    });
  }, [weekly, daily, retention, page, makeChart]);

  async function handleLogout() {
    await fetch('/api/analytics/logout', { method: 'POST' });
    window.location.href = '/analytics/login';
  }

  async function handleModAction(action, targetType, targetId) {
    const label = action === 'approve' ? 'allow this back in' : 'ban/remove this';
    if (!window.confirm(`Are you sure you want to ${label} ${targetType}?`)) return;
    try {
      await fetchJson(
        `/api/analytics/moderation/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/action`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }
      );
      await loadDashboard();
    } catch (e) {
      setStatusMsg(`Moderation action failed: ${e.message}`);
      setStatusError(true);
    }
  }

  const currentWeek = weekly[selectedWeekIdx] || null;
  const prevWeek    = selectedWeekIdx > 0 ? weekly[selectedWeekIdx - 1] : null;

  function getActivatedUsersForWeek(weekStartStr) {
    const ws  = String(weekStartStr || '').substring(0, 10);
    const row = retention.find((r) => String(r.weekStart || '').substring(0, 10) === ws);
    return row?.activatedUsers || 0;
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-brand"><h1>Vanta Analytics</h1></div>
        <nav className="page-nav">
          <Link href="/analytics"         className={`nav-btn${page === 'alltime' ? ' active' : ''}`}>All Time</Link>
          <Link href="/analytics/weekly"  className={`nav-btn${page === 'weekly'  ? ' active' : ''}`}>Weekly</Link>
          <Link href="/analytics/review"  className={`nav-btn${page === 'review'  ? ' active' : ''}`}>Review</Link>
        </nav>
        <div className="topbar-actions">
          <button onClick={() => loadDashboard()}>Refresh</button>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="container">

        {/* ── All Time ── */}
        {page === 'alltime' && (
          <>
            <section className="kpi-grid">
              {alltime ? (
                <>
                  <KpiCard title="Total Users"      value={formatNumber(alltime.totalUsers)}            accent="#50fa7b" />
                  <KpiCard title="Total Posts"      value={formatNumber(alltime.totalPosts)}            accent="#50fa7b" />
                  <KpiCard title="Total Saves"      value={formatNumber(alltime.totalSaves)}            accent="#bd93f9" />
                  <KpiCard title="Total Likes"      value={formatNumber(alltime.totalLikes)}            accent="#ff79c6" />
                  <KpiCard title="Contact Requests" value={formatNumber(alltime.totalContactRequests)}  accent="#8be9fd" />
                  <KpiCard title="Avg Saves / User" value={Number(alltime.avgSavesPerUser || 0).toFixed(2)} accent="#ffb86c" />
                  <KpiCard title="Avg D1 Retention" value={formatPercent(alltime.avgD1RetentionPct)}   accent="#f1fa8c" />
                  <KpiCard title="Avg D7 Retention" value={formatPercent(alltime.avgD7RetentionPct)}   accent="#f1fa8c" />
                </>
              ) : (
                <KpiCard title="Loading…" value="—" accent="var(--border)" />
              )}
            </section>

            <div className="section-controls">
              <label htmlFor="retentionWindowSelect">Retention Window</label>
              <select
                id="retentionWindowSelect"
                value={retentionWindow}
                onChange={(e) => { setRetentionWindow(e.target.value); loadDashboard(e.target.value); }}
              >
                <option value="calendar_week">Calendar Week (Mon–Sun)</option>
                <option value="trailing_7d">Trailing 7 Days</option>
                <option value="both">Both</option>
              </select>
            </div>

            <section className="chart-grid">
              <article className="card"><h2>Conversion Funnel Trends (Weekly)</h2><canvas ref={conversionRef} /></article>
              <article className="card"><h2>Content Performance (Weekly)</h2><canvas ref={contentRef} /></article>
            </section>
            <section className="chart-grid">
              <article className="card"><h2>Retention Trends (Weekly)</h2><canvas ref={retentionRef} /></article>
              <article className="card"><h2>Growth — New &amp; Activated Users (Weekly)</h2><canvas ref={growthRef} /></article>
            </section>
            <section className="chart-grid">
              <article className="card"><h2>Sessions &amp; Saves/Session (Weekly)</h2><canvas ref={sessionsRef} /></article>
            </section>
            <section className="chart-grid">
              <article className="card"><h2>Contact + Repeat Saves (Daily)</h2><canvas ref={contactDailyRef} /></article>
              <article className="card"><h2>Posts + Views/Saves/Likes (Daily)</h2><canvas ref={postsDailyRef} /></article>
            </section>
          </>
        )}

        {/* ── Weekly ── */}
        {page === 'weekly' && (
          <>
            <div className="week-picker-bar">
              <button className="week-nav-btn" disabled={selectedWeekIdx <= 0} onClick={() => setSelectedWeekIdx((i) => i - 1)}>←</button>
              <select
                className="week-select"
                value={selectedWeekIdx}
                onChange={(e) => setSelectedWeekIdx(Number(e.target.value))}
              >
                {[...weekly].reverse().map((r, i) => {
                  const idx = weekly.length - 1 - i;
                  return (
                    <option key={idx} value={idx}>
                      {formatDate(r.weekStart)} – {formatDateWeekEnd(r.weekStart)}
                    </option>
                  );
                })}
              </select>
              <button className="week-nav-btn" disabled={selectedWeekIdx >= weekly.length - 1} onClick={() => setSelectedWeekIdx((i) => i + 1)}>→</button>
            </div>

            <section className="kpi-grid">
              {currentWeek ? (
                <>
                  <KpiCard title="New Users"          value={formatNumber(currentWeek.newUsers)}                         accent="#50fa7b" curr={currentWeek.newUsers}                        prev={prevWeek?.newUsers}                        deltaType="num" />
                  <KpiCard title="Activated Users"    value={formatNumber(getActivatedUsersForWeek(currentWeek.weekStart))} accent="#50fa7b" />
                  <KpiCard title="Sessions"           value={formatNumber(currentWeek.sessionsCount)}                    accent="#bd93f9" curr={currentWeek.sessionsCount}                   prev={prevWeek?.sessionsCount}                   deltaType="num" />
                  <KpiCard title="Saves / Session"    value={Number(currentWeek.savesPerSession || 0).toFixed(2)}        accent="#bd93f9" />
                  <KpiCard title="% Contact Artist"   value={formatPercent(currentWeek.pctUsersContactArtist)}           accent="#8be9fd" curr={currentWeek.pctUsersContactArtist}           prev={prevWeek?.pctUsersContactArtist}           deltaType="pp"  />
                  <KpiCard title="Saves → Profile"    value={formatPercent(currentWeek.saveToProfileClickConversion)}    accent="#f1fa8c" curr={currentWeek.saveToProfileClickConversion}    prev={prevWeek?.saveToProfileClickConversion}    deltaType="pp"  />
                  <KpiCard title="Profile → Contact"  value={formatPercent(currentWeek.profileClickToContactConversion)} accent="#f1fa8c" curr={currentWeek.profileClickToContactConversion} prev={prevWeek?.profileClickToContactConversion} deltaType="pp"  />
                  <KpiCard title="Repeat Saves"       value={formatNumber(currentWeek.repeatSavesSameArtist)}            accent="#ffb86c" curr={currentWeek.repeatSavesSameArtist}            prev={prevWeek?.repeatSavesSameArtist}            deltaType="num" />
                  <KpiCard title="Posts / Week"       value={formatNumber(currentWeek.postsPerWeek)}                     accent="#ffb86c" curr={currentWeek.postsPerWeek}                     prev={prevWeek?.postsPerWeek}                     deltaType="num" />
                  <KpiCard title="Weekly Views"       value={formatNumber(currentWeek.viewsPerPost)}                     accent="#ffb86c" curr={currentWeek.viewsPerPost}                     prev={prevWeek?.viewsPerPost}                     deltaType="num" />
                  <KpiCard title="Weekly Saves"       value={formatNumber(currentWeek.savesPerPost)}                     accent="#ff79c6" curr={currentWeek.savesPerPost}                     prev={prevWeek?.savesPerPost}                     deltaType="num" />
                  <KpiCard title="Weekly Likes"       value={formatNumber(currentWeek.likesPerPost)}                     accent="#ff79c6" curr={currentWeek.likesPerPost}                     prev={prevWeek?.likesPerPost}                     deltaType="num" />
                  <KpiCard title="Contact Requests"   value={formatNumber(currentWeek.contactRequestsReceived)}          accent="#ff79c6" curr={currentWeek.contactRequestsReceived}          prev={prevWeek?.contactRequestsReceived}          deltaType="num" />
                  <KpiCard title="Profile Conversion" value={formatPercent(currentWeek.profileConversionRate)}           accent="#8be9fd" curr={currentWeek.profileConversionRate}           prev={prevWeek?.profileConversionRate}           deltaType="pp"  />
                </>
              ) : (
                <KpiCard title="No data" value="—" accent="var(--border)" />
              )}
            </section>

            <section className="card">
              <h2>Weekly Snapshot</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>% Contact Artist</th>
                      <th>Saves→Profile %</th>
                      <th>Profile→Contact %</th>
                      <th>Posts/Week</th>
                      <th>Weekly Views</th>
                      <th>Weekly Saves</th>
                      <th>Weekly Likes</th>
                      <th>Contact Requests</th>
                      <th>Repeat Saves</th>
                      <th>Profile Conv. %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...weekly].reverse().map((row, i) => {
                      const isSelected = String(row.weekStart || '').substring(0, 10) === String(currentWeek?.weekStart || '').substring(0, 10);
                      return (
                        <tr key={i} className={isSelected ? 'row-selected' : ''}>
                          <td>{formatDate(row.weekStart)}</td>
                          <td>{formatPercent(row.pctUsersContactArtist)}</td>
                          <td>{formatPercent(row.saveToProfileClickConversion)}</td>
                          <td>{formatPercent(row.profileClickToContactConversion)}</td>
                          <td>{formatNumber(row.postsPerWeek)}</td>
                          <td>{formatNumber(row.viewsPerPost)}</td>
                          <td>{formatNumber(row.savesPerPost)}</td>
                          <td>{formatNumber(row.likesPerPost)}</td>
                          <td>{formatNumber(row.contactRequestsReceived)}</td>
                          <td>{formatNumber(row.repeatSavesSameArtist)}</td>
                          <td>{formatPercent(row.profileConversionRate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ── Review ── */}
        {page === 'review' && (
          <section className="card">
            <h2>Moderation Review Queue</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th><th>Target</th><th>Artist</th>
                    <th>Open Reports</th><th>Status</th><th>Last Report</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {moderation.length === 0 ? (
                    <tr><td colSpan={7}>No pending reports to review.</td></tr>
                  ) : moderation.map((row, i) => {
                    const reportedAt  = row.mostRecentReport ? new Date(row.mostRecentReport).toLocaleString() : '-';
                    const statusClass = row.moderationStatus === 'under_review' ? 'badge-review'
                                      : row.moderationStatus === 'removed'      ? 'badge-removed'
                                      : 'badge-approved';
                    return (
                      <tr key={i}>
                        <td>{row.targetType}</td>
                        <td>
                          <div className="target-cell">
                            {row.targetType === 'tattoo' && (
                              row.previewImage
                                ? <img className="target-thumb" src={row.previewImage} alt="" />
                                : <div className="target-thumb target-thumb-empty" />
                            )}
                            <div className="target-meta">
                              <div className="target-title">{row.targetLabel}</div>
                              <div className="target-id">{row.targetId}</div>
                            </div>
                          </div>
                        </td>
                        <td>{row.artistName || '-'}</td>
                        <td>{formatNumber(row.openReportCount)}</td>
                        <td><span className={`status-badge ${statusClass}`}>{row.moderationStatus}</span></td>
                        <td>{reportedAt}</td>
                        <td>
                          <div className="moderation-actions">
                            <button className="action-btn approve-btn" onClick={() => handleModAction('approve', row.targetType, row.targetId)}>Allow Back</button>
                            <button className="action-btn remove-btn"  onClick={() => handleModAction('remove',  row.targetType, row.targetId)}>Ban</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="card status-card" style={{ color: statusError ? '#ff6b6b' : undefined }}>
          {statusMsg}
        </section>
      </main>
    </>
  );
}
