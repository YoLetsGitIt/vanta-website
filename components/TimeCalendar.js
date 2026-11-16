'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDay, formatTime, todayIn, zoneNote } from '../lib/booking-instant.mjs';
import { addMonths, lastMonth, monthGrid, monthLabel, monthOf, weekOf } from '../lib/open-times.mjs';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Picking an open time: a day on the month calendar, then a time in that day's week.
// Used by the booking form and the reschedule page, so both look and work the same.
//   zone      the artist's time zone; times show in it
//   loadMonth (month 'YYYY-MM') => Promise<{ 'YYYY-MM-DD': [RFC3339 start, …] }>,
//             cached by the caller; called again for a month already loaded
//   prefetch  (month) => void: fetch a month ahead (optional)
//   source    changes when the times change (another appointment): starts over
//   start     the chosen time; onStart(time) chooses one
//   onView    ('month' | 'week') => void, for the heading
export default function TimeCalendar({ zone, loadMonth, prefetch, source, start, onStart, onView }) {
  const today = useMemo(() => todayIn(zone), [zone]);
  const viewerZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
  const startDay = start ? todayIn(zone, new Date(start)) : '';
  // Always opens on the month to pick a day; a time already chosen shows on its day.
  const [view, setViewState] = useState('month');
  const [month, setMonth] = useState(monthOf(startDay || today));
  const [day, setDay] = useState(startDay);
  const [weekStart, setWeekStart] = useState(weekOf(startDay || today)[0]);
  // Open times by source and month: { 'source|YYYY-MM': { date: [slots] } }.
  const [times, setTimes] = useState({});
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  function setView(next) {
    setViewState(next);
    onView?.(next);
  }

  // Another appointment: back to this month.
  const [seen, setSeen] = useState(source);
  if (seen !== source) {
    setSeen(source);
    setViewState('month');
    setMonth(monthOf(today));
    setDay('');
  }

  const week = useMemo(() => weekOf(weekStart), [weekStart]);
  const months = useMemo(() => (view === 'month' ? [month] : [...new Set(week.map(monthOf))]), [view, month, week]);
  const key = m => `${source}|${m}`;
  const missing = months.filter(m => !times[key(m)]);

  useEffect(() => {
    let live = true;
    setError('');
    Promise.all(months.map(m => loadMonth(m).then(data => [m, data])))
      .then(loaded => {
        if (!live) return;
        setTimes(prev => {
          const next = { ...prev };
          for (const [m, data] of loaded) next[`${source}|${m}`] = data;
          return next;
        });
        // The month after is fetched ahead, so moving on doesn't wait.
        const after = addMonths(months[months.length - 1], 1);
        if (prefetch && after <= lastMonth(today)) prefetch(after);
      })
      .catch(e => { if (live) setError(e.message || 'Times could not be loaded. Please try again.'); });
    return () => { live = false; };
    // loadMonth/prefetch change with the caller's renders; source says when they matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, today, months, reload]);

  const slotsOn = date => times[key(monthOf(date))]?.[date] || [];
  const loaded = date => Boolean(times[key(monthOf(date))]);

  // In the week view, keep a day with times picked: the chosen one, else the week's first.
  useEffect(() => {
    if (view !== 'week' || missing.length) return;
    if (week.includes(day) && slotsOn(day).length) return;
    const first = week.find(d => slotsOn(d).length) || '';
    if (first !== day) setDay(first);
  });

  function openDay(date) {
    setDay(date);
    setWeekStart(weekOf(date)[0]);
    setView('week');
  }

  const note = zoneNote(zone, viewerZone);
  const loading = missing.length > 0 && !error;
  const thisMonth = monthOf(today);
  const finalMonth = lastMonth(today);
  const monthOpen = !loading && monthGrid(month).flat().some(d => d && d >= today && slotsOn(d).length);
  const daySlots = day ? slotsOn(day) : [];
  const shiftWeek = n => setWeekStart(w => weekOf(plusDays(w, 7 * n))[0]);

  const status = error ? (
    <p role="alert" style={st.error}>{error} <button type="button" style={st.link} onClick={() => setReload(n => n + 1)}>Try again</button></p>
  ) : loading ? (
    <p style={{ ...st.sub, margin: '14px 0 0', display: 'flex', alignItems: 'center', gap: 8 }} aria-live="polite">
      <span className="bk-spinner" aria-hidden="true" style={{ width: 12, height: 12 }} /> Finding open times…
    </p>
  ) : null;

  if (view === 'month') {
    return (
      <section aria-label="Choose a day">
        <div style={st.calHead}>
          <span style={st.calTitle} aria-live="polite">{monthLabel(month)}</span>
          <span style={{ display: 'flex', gap: 6 }}>
            <button type="button" aria-label="Previous month" disabled={month <= thisMonth} style={{ ...st.pager, ...(month <= thisMonth ? st.pagerOff : {}) }}
              onClick={() => setMonth(m => addMonths(m, -1))}><Chevron left /></button>
            <button type="button" aria-label="Next month" disabled={month >= finalMonth} style={{ ...st.pager, ...(month >= finalMonth ? st.pagerOff : {}) }}
              onClick={() => setMonth(m => addMonths(m, 1))}><Chevron /></button>
          </span>
        </div>
        <div style={st.weekdays} aria-hidden="true">{WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}</div>
        <div role="grid" aria-busy={loading} style={st.monthGrid}>
          {monthGrid(month).flat().map((date, i) => {
            if (!date) return <span key={`blank-${i}`} />;
            const count = !loading && date >= today ? slotsOn(date).length : 0;
            const chosen = date === startDay;
            return (
              <button key={date} type="button" disabled={!count} onClick={() => openDay(date)}
                aria-label={`${formatDay(date)}${count ? `, ${count} ${count === 1 ? 'time' : 'times'}` : ', no times'}`}
                className={loading ? 'bk-cal-loading' : undefined}
                style={{ ...st.calDay, ...(count ? st.calDayOpen : st.calDayOff), ...(chosen ? st.calDayChosen : {}) }}>
                <span style={{ fontWeight: count ? 650 : 500, textDecoration: date === today ? 'underline' : 'none', textUnderlineOffset: 3 }}>{Number(date.slice(8))}</span>
                {count > 0 && <span aria-hidden="true" style={{ ...st.calDot, ...(chosen ? { background: 'var(--paper)' } : {}) }} />}
              </button>
            );
          })}
        </div>
        {status || (!monthOpen ? (
          <p style={{ ...st.sub, margin: '14px 0 0' }}>
            No open times in {monthLabel(month).split(' ')[0]}.{' '}
            {month < finalMonth && <button type="button" style={st.link} onClick={() => setMonth(m => addMonths(m, 1))}>See {monthLabel(addMonths(month, 1)).split(' ')[0]}</button>}
          </p>
        ) : <p style={{ ...st.sub, margin: '14px 0 0' }}>Days with a dot have open times.</p>)}
      </section>
    );
  }

  return (
    <section aria-label="Choose a time">
      <div style={st.calHead}>
        <button type="button" onClick={() => { setMonth(monthOf(day || weekStart)); setView('month'); }} style={st.backLink}>
          <Chevron left /> {monthLabel(monthOf(day || weekStart))}
        </button>
        <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" aria-label="Previous week" disabled={weekStart <= weekOf(today)[0]} style={{ ...st.pager, ...(weekStart <= weekOf(today)[0] ? st.pagerOff : {}) }}
            onClick={() => shiftWeek(-1)}><Chevron left /></button>
          <button type="button" aria-label="Next week" disabled={monthOf(weekStart) > finalMonth} style={{ ...st.pager, ...(monthOf(weekStart) > finalMonth ? st.pagerOff : {}) }}
            onClick={() => shiftWeek(1)}><Chevron /></button>
        </span>
      </div>
      <div role="radiogroup" aria-label="Day" aria-busy={loading} style={st.weekRow}>
        {week.map(date => {
          const open = loaded(date) && date >= today && slotsOn(date).length > 0;
          const on = date === day;
          const [weekday, num] = formatDay(date).split(' ');
          return (
            <button key={date} type="button" role="radio" aria-checked={on} disabled={!open}
              aria-label={`${formatDay(date)}${open ? '' : ', no times'}`}
              className={loading ? 'bk-cal-loading' : undefined}
              style={{ ...st.day, ...(on ? st.dayOn : {}), ...(!open ? st.dayOff : {}) }}
              onClick={() => setDay(date)}>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{weekday}</span>
              <span style={{ fontSize: 16, fontWeight: 650 }}>{num}</span>
            </button>
          );
        })}
      </div>
      {status || (!daySlots.length ? (
        <p style={{ ...st.sub, margin: '16px 0 0' }}>No open times this week. <button type="button" style={st.link} onClick={() => shiftWeek(1)}>Next week</button></p>
      ) : (
        <>
          <div style={{ ...st.label, marginTop: 20 }}>{formatDay(day).toUpperCase()}</div>
          <div role="radiogroup" aria-label="Start time" style={st.slotGrid}>
            {daySlots.map(slot => {
              const on = slot === start;
              return (
                <button key={slot} type="button" role="radio" aria-checked={on} style={{ ...st.slot, ...(on ? st.slotOn : {}) }} onClick={() => onStart(slot)}>
                  {formatTime(slot, zone)}
                </button>
              );
            })}
          </div>
          {note && <p style={{ ...st.sub, marginTop: 10 }}>{note}</p>}
        </>
      ))}
    </section>
  );
}

function plusDays(date, offset) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
}

export function Chevron({ left = false }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ transform: left ? 'scaleX(-1)' : undefined }}>
      <path d="M5 2.5 9.5 7 5 11.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const st = {
  sub: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(var(--ink-rgb), 0.45)', margin: '6px 0 20px', lineHeight: 1.55 },
  label: { fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: 0.8, color: 'rgba(var(--ink-rgb), 0.4)', marginBottom: 8 },
  pager: { width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'none', color: 'var(--main)', fontSize: 18, cursor: 'pointer', lineHeight: 1 },
  pagerOff: { opacity: 0.3, cursor: 'not-allowed' },
  calHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  calTitle: { fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 650, color: 'var(--main)' },
  backLink: { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 32, padding: '0 10px 0 6px', marginLeft: -6, borderRadius: 8, border: 'none', background: 'none', boxShadow: 'none', color: 'var(--main)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 650, cursor: 'pointer' },
  weekdays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: 0.6, color: 'rgba(var(--ink-rgb), 0.4)', marginBottom: 6 },
  monthGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
  calDay: { position: 'relative', aspectRatio: '1 / 1', minHeight: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: 0, borderRadius: 12, border: '1px solid transparent', fontFamily: 'var(--font-body)', fontSize: 15, fontVariantNumeric: 'tabular-nums', transition: 'background-color 150ms ease, color 150ms ease' },
  calDayOpen: { background: 'rgba(var(--ink-rgb), 0.07)', border: '1px solid rgba(var(--ink-rgb), 0.1)', color: 'var(--main)', cursor: 'pointer' },
  calDayOff: { background: 'none', boxShadow: 'none', color: 'rgba(var(--ink-rgb), 0.28)', cursor: 'default' },
  calDayChosen: { background: 'var(--ink)', border: '1px solid var(--ink)', color: 'var(--paper)' },
  calDot: { width: 4, height: 4, borderRadius: '50%', background: 'var(--main)' },
  weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 },
  day: { minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0', borderRadius: 12, background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.08)', color: 'var(--main)', fontFamily: 'var(--font-body)', cursor: 'pointer' },
  dayOn: { background: 'var(--ink)', border: '1px solid var(--ink)', color: 'var(--paper)' },
  dayOff: { opacity: 0.35, boxShadow: 'none', background: 'none', cursor: 'default' },
  slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 8 },
  slot: { padding: '12px 0', borderRadius: 10, background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.08)', color: 'rgba(var(--ink-rgb), 0.85)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' },
  slotOn: { background: 'var(--ink)', border: '1px solid var(--ink)', color: 'var(--paper)', fontWeight: 600 },
  error: { fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--danger)', margin: '14px 0 0', padding: '10px 14px', background: 'rgba(255,60,60,0.08)', borderRadius: 8, border: '1px solid rgba(255,60,60,0.15)' },
  link: { background: 'none', border: 'none', padding: 0, color: 'var(--main)', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit', cursor: 'pointer' },
};
