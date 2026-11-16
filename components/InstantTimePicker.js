'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDay, formatLength, formatMoney, formatTime, todayIn, zoneNote } from '../lib/booking-instant.mjs';
import { depositCharge, money } from '../lib/booking-fee.mjs';
import { addMonths, lastMonth, loadMonth, monthGrid, monthLabel, monthOf, prefetchMonth, timesPlace, weekOf } from '../lib/open-times.mjs';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Instant booking: pick an appointment type, then one of the artist's open times.
// info is GET /artists/{id}/instant-booking.
// hideTypes: the appointment was already chosen on an earlier step; only the time is picked here.
export default function InstantTimePicker({ backend, artistId, info, typeId, onType, start, onStart, hideTypes = false }) {
  const zone = info.timezone;
  const today = useMemo(() => todayIn(zone), [zone]);
  const viewerZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
  const place = timesPlace(info);
  // Coming back to this step with a time chosen opens its week; otherwise this month.
  const startDay = start ? todayIn(zone, new Date(start)) : '';
  const [view, setView] = useState(startDay ? 'week' : 'month');
  const [month, setMonth] = useState(monthOf(startDay || today));
  const [day, setDay] = useState(startDay);
  const [weekStart, setWeekStart] = useState(weekOf(startDay || today)[0]);
  // Open times by month: { 'YYYY-MM': { date: [slots] } }.
  const [times, setTimes] = useState({});
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const week = useMemo(() => weekOf(weekStart), [weekStart]);
  const months = useMemo(() => (view === 'month' ? [month] : [...new Set(week.map(monthOf))]), [view, month, week]);
  const missing = months.filter(m => !times[`${typeId}|${m}`]);

  useEffect(() => {
    if (!typeId) return;
    let live = true;
    const args = { backend, artistId, place, typeId, today };
    setError('');
    Promise.all(months.map(m => loadMonth({ ...args, month: m }).then(data => [m, data])))
      .then(loaded => {
        if (!live) return;
        setTimes(prev => {
          const next = { ...prev };
          for (const [m, data] of loaded) next[`${typeId}|${m}`] = data;
          return next;
        });
        // The month after is fetched ahead, so moving on doesn't wait.
        const after = addMonths(months[months.length - 1], 1);
        if (after <= lastMonth(today)) prefetchMonth({ ...args, month: after });
      })
      .catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [backend, artistId, place, typeId, today, months, reload]);

  const slotsOn = date => times[`${typeId}|${monthOf(date)}`]?.[date] || [];
  const loaded = date => Boolean(times[`${typeId}|${monthOf(date)}`]);

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
  function backToMonth() {
    setMonth(monthOf(day || weekStart));
    setView('month');
  }

  const note = zoneNote(zone, viewerZone);
  const loading = missing.length > 0 && !error;
  const thisMonth = monthOf(today);
  const finalMonth = lastMonth(today);
  const monthOpen = !loading && monthGrid(month).flat().some(d => d && d >= today && slotsOn(d).length);
  const daySlots = day ? slotsOn(day) : [];

  return (
    <div>
      <h2 style={st.heading}>Pick a time</h2>
      {hideTypes ? (() => {
        const chosen = info.types.find(t => t.id === typeId);
        const free = chosen && !(Number(chosen.deposit) > 0);
        return <p style={st.sub}>{chosen ? `Times for your ${chosen.name} (${formatLength(chosen.duration_minutes)}). ` : ''}{free ? 'It’s free, so there’s nothing to pay: you’re booked as soon as you confirm.' : 'Your time is held while you pay the deposit and the Vanta booking fee.'}</p>;
      })() : <>
      <p style={st.sub}>Choose your appointment, then a time. {info.types.every(t => !(Number(t.deposit) > 0))
        ? 'There’s nothing to pay: you’re booked as soon as you confirm.'
        : 'A deposit and the Vanta booking fee lock in your time; free appointments are booked straight away. Prices below are what you pay now.'}</p>

      <div style={st.label}>APPOINTMENT</div>
      <div role="radiogroup" aria-label="Appointment" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {info.types.map(t => {
          const on = t.id === typeId;
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} style={{ ...st.type, ...(on ? st.typeOn : {}) }}
              onClick={() => { if (!on) { onType(t.id); onStart(''); setView('month'); setMonth(thisMonth); setDay(''); } }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...st.typeName, ...(on ? { color: 'var(--paper)' } : {}) }}>{t.name}</span>
                {t.description && (
                  <span style={{ ...st.typeMeta, display: 'block', margin: '2px 0', lineHeight: 1.45, whiteSpace: 'normal', ...(on ? { color: 'rgba(var(--paper-rgb), 0.7)' } : { color: 'rgba(var(--ink-rgb), 0.75)' }) }}>{t.description}</span>
                )}
                <span style={{ ...st.typeMeta, ...(on ? { color: 'rgba(var(--paper-rgb), 0.55)' } : {}) }}>{formatLength(t.duration_minutes)}</span>
              </span>
              {Number(t.deposit) > 0
                ? <span style={{ ...st.typeMeta, ...(on ? { color: 'rgba(var(--paper-rgb), 0.65)' } : {}), flexShrink: 0 }}>{money(depositCharge(t.deposit).total)} to book<span style={{ display: 'block', fontSize: 11, textAlign: 'right' }}>{formatMoney(t.deposit)} deposit + {money(depositCharge(t.deposit).fee)} fee</span></span>
                : <span style={{ ...st.typeMeta, ...(on ? { color: 'rgba(var(--paper-rgb), 0.65)' } : {}), flexShrink: 0 }}>Free<span style={{ display: 'block', fontSize: 11, textAlign: 'right' }}>no deposit</span></span>}
            </button>
          );
        })}
      </div>
      </>}

      {typeId && view === 'month' && (
        <section aria-label="Choose a day" style={{ marginTop: hideTypes ? 4 : 24 }}>
          <div style={st.calHead}>
            <span style={st.calTitle} aria-live="polite">{monthLabel(month)}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button type="button" aria-label="Previous month" disabled={month <= thisMonth} style={{ ...st.pager, ...(month <= thisMonth ? st.pagerOff : {}) }}
                onClick={() => setMonth(m => addMonths(m, -1))}><Chevron left /></button>
              <button type="button" aria-label="Next month" disabled={month >= finalMonth} style={{ ...st.pager, ...(month >= finalMonth ? st.pagerOff : {}) }}
                onClick={() => setMonth(m => addMonths(m, 1))}><Chevron /></button>
            </span>
          </div>
          <div style={st.weekdays} aria-hidden="true">{WEEKDAYS.map(w => <span key={w}>{w.slice(0, 1)}</span>)}</div>
          <div role="grid" aria-busy={loading} style={st.monthGrid}>
            {monthGrid(month).flat().map((date, i) => {
              if (!date) return <span key={`blank-${i}`} />;
              const open = !loading && date >= today && slotsOn(date).length > 0;
              const isToday = date === today;
              return (
                <button key={date} type="button" disabled={!open} onClick={() => openDay(date)}
                  aria-label={`${formatDay(date)}${open ? `, ${slotsOn(date).length} ${slotsOn(date).length === 1 ? 'time' : 'times'}` : ', no times'}`}
                  className={loading ? 'bk-cal-loading' : undefined}
                  style={{ ...st.calDay, ...(open ? st.calDayOpen : st.calDayOff), ...(date === startDay ? st.calDayChosen : {}) }}>
                  <span style={{ fontWeight: open ? 650 : 500, textDecoration: isToday ? 'underline' : 'none', textUnderlineOffset: 3 }}>{Number(date.slice(8))}</span>
                  {open && <span aria-hidden="true" style={{ ...st.calDot, ...(date === startDay ? { background: 'var(--paper)' } : {}) }} />}
                </button>
              );
            })}
          </div>
          {error ? (
            <p role="alert" style={{ ...st.error, marginTop: 14 }}>{error} <button type="button" style={st.link} onClick={() => setReload(n => n + 1)}>Try again</button></p>
          ) : loading ? (
            <p style={{ ...st.sub, margin: '14px 0 0', display: 'flex', alignItems: 'center', gap: 8 }} aria-live="polite">
              <span className="bk-spinner" aria-hidden="true" style={{ width: 12, height: 12 }} /> Finding open times…
            </p>
          ) : !monthOpen ? (
            <p style={{ ...st.sub, margin: '14px 0 0' }}>
              No open times in {monthLabel(month).split(' ')[0]}.{' '}
              {month < finalMonth && <button type="button" style={st.link} onClick={() => setMonth(m => addMonths(m, 1))}>See {monthLabel(addMonths(month, 1)).split(' ')[0]}</button>}
            </p>
          ) : (
            <p style={{ ...st.sub, margin: '14px 0 0' }}>Days with a dot have open times.</p>
          )}
        </section>
      )}

      {typeId && view === 'week' && (
        <section aria-label="Choose a time" style={{ marginTop: hideTypes ? 4 : 24 }}>
          <div style={st.calHead}>
            <button type="button" onClick={backToMonth} style={st.backLink}>
              <Chevron left /> {monthLabel(monthOf(day || weekStart))}
            </button>
            <span style={{ display: 'flex', gap: 6 }}>
              <button type="button" aria-label="Previous week" disabled={weekStart <= weekOf(today)[0]} style={{ ...st.pager, ...(weekStart <= weekOf(today)[0] ? st.pagerOff : {}) }}
                onClick={() => setWeekStart(w => weekOf(addDaysTo(w, -7))[0])}><Chevron left /></button>
              <button type="button" aria-label="Next week" disabled={monthOf(weekStart) > finalMonth} style={{ ...st.pager, ...(monthOf(weekStart) > finalMonth ? st.pagerOff : {}) }}
                onClick={() => setWeekStart(w => weekOf(addDaysTo(w, 7))[0])}><Chevron /></button>
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
          {error ? (
            <p role="alert" style={{ ...st.error, marginTop: 14 }}>{error} <button type="button" style={st.link} onClick={() => setReload(n => n + 1)}>Try again</button></p>
          ) : loading ? (
            <p style={{ ...st.sub, margin: '16px 0 0', display: 'flex', alignItems: 'center', gap: 8 }} aria-live="polite">
              <span className="bk-spinner" aria-hidden="true" style={{ width: 12, height: 12 }} /> Finding open times…
            </p>
          ) : !daySlots.length ? (
            <p style={{ ...st.sub, margin: '16px 0 0' }}>No open times this week. <button type="button" style={st.link} onClick={() => setWeekStart(w => weekOf(addDaysTo(w, 7))[0])}>Next week</button></p>
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
          )}
        </section>
      )}
    </div>
  );
}

function addDaysTo(date, offset) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
}

function Chevron({ left = false }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ transform: left ? 'scaleX(-1)' : undefined }}>
      <path d="M5 2.5 9.5 7 5 11.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const st = {
  heading: { fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--main)', margin: 0, lineHeight: 1.3 },
  sub: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(var(--ink-rgb), 0.45)', margin: '6px 0 20px', lineHeight: 1.55 },
  label: { fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: 0.8, color: 'rgba(var(--ink-rgb), 0.4)', marginBottom: 8 },
  type: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', width: '100%', textAlign: 'left', background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 14, cursor: 'pointer', transition: 'background-color 150ms ease, border-color 150ms ease' },
  typeOn: { background: 'var(--ink)', border: '1px solid var(--ink)' },
  typeName: { display: 'block', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--main)' },
  typeMeta: { display: 'block', fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(var(--ink-rgb), 0.45)', marginTop: 2 },
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
  error: { fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--danger)', margin: 0, padding: '10px 14px', background: 'rgba(255,60,60,0.08)', borderRadius: 8, border: '1px solid rgba(255,60,60,0.15)' },
  link: { background: 'none', border: 'none', padding: 0, color: 'var(--main)', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit', cursor: 'pointer' },
};
