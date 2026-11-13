'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, formatDay, formatLength, formatMoney, formatTime, todayIn, zoneNote } from '../lib/booking-instant.mjs';
import { depositCharge, money } from '../lib/booking-fee.mjs';

const DAYS_PER_PAGE = 14;

// Instant booking: pick an appointment type, then one of the artist's open times.
// info is GET /artists/{id}/instant-booking.
// hideTypes: the appointment was already chosen on an earlier step; only the time is picked here.
export default function InstantTimePicker({ backend, artistId, info, typeId, onType, start, onStart, hideTypes = false }) {
  const zone = info.timezone;
  const today = useMemo(() => todayIn(zone), [zone]);
  const [from, setFrom] = useState(today);
  const [days, setDays] = useState(null);
  const [error, setError] = useState('');
  const [day, setDay] = useState('');
  const [reload, setReload] = useState(0);
  const viewerZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';

  // Instant booking is set per place: the times are for this one (a studio, or the
  // artist's own bookings). Older servers don't say, and pick it themselves.
  const place = info.studio_id || (info.places ? 'personal' : '');

  useEffect(() => {
    if (!typeId) return;
    const controller = new AbortController();
    setDays(null);
    setError('');
    const placeParam = place ? `&studio_id=${encodeURIComponent(place)}` : '';
    fetch(`${backend}/artists/${artistId}/open-times?type_id=${typeId}&date=${from}&days=${DAYS_PER_PAGE}${placeParam}`, { signal: controller.signal, cache: 'no-store' })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Times could not be loaded. Please try again.');
        const list = data.days || [];
        setDays(list);
        // Keep the chosen day when it's on this page; otherwise the first day with times.
        setDay(current => (list.some(d => d.date === current && d.slots.length) ? current : list.find(d => d.slots.length)?.date || ''));
      })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [backend, artistId, typeId, from, reload, place]);

  const selectedDay = days?.find(d => d.date === day);
  const anyOpen = days?.some(d => d.slots.length);
  const note = zoneNote(zone, viewerZone);

  return (
    <div>
      <h2 style={st.heading}>Pick a time</h2>
      {hideTypes ? (() => {
        const chosen = info.types.find(t => t.id === typeId);
        return <p style={st.sub}>{chosen ? `Times for your ${chosen.name} (${formatLength(chosen.duration_minutes)}). ` : ''}Your time is held while you pay the deposit and the Vanta booking fee.</p>;
      })() : <>
      <p style={st.sub}>Choose your appointment, then a time. You’ll pay the deposit and the Vanta booking fee to lock it in. Prices below are the total you pay now.</p>

      <div style={st.label}>APPOINTMENT</div>
      <div role="radiogroup" aria-label="Appointment" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {info.types.map(t => {
          const on = t.id === typeId;
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} style={{ ...st.type, ...(on ? st.typeOn : {}) }}
              onClick={() => { if (!on) { onType(t.id); onStart(''); setFrom(today); } }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...st.typeName, ...(on ? { color: 'var(--paper)' } : {}) }}>{t.name}</span>
                {t.description && (
                  // The artist's note on what this appointment is.
                  <span style={{ ...st.typeMeta, display: 'block', margin: '2px 0', lineHeight: 1.45, whiteSpace: 'normal', ...(on ? { color: 'rgba(var(--paper-rgb), 0.7)' } : { color: 'rgba(var(--ink-rgb), 0.75)' }) }}>{t.description}</span>
                )}
                <span style={{ ...st.typeMeta, ...(on ? { color: 'rgba(var(--paper-rgb), 0.55)' } : {}) }}>{formatLength(t.duration_minutes)}</span>
              </span>
              <span style={{ ...st.typeMeta, ...(on ? { color: 'rgba(var(--paper-rgb), 0.65)' } : {}), flexShrink: 0 }}>{money(depositCharge(t.deposit).total)} to book<span style={{ display: 'block', fontSize: 11, textAlign: 'right' }}>{formatMoney(t.deposit)} deposit + {money(depositCharge(t.deposit).fee)} fee</span></span>
            </button>
          );
        })}
      </div>
      </>}

      {typeId && (
        <>
          <div style={{ ...st.label, marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>DAY</span>
            <span style={{ display: 'flex', gap: 4 }}>
              <button type="button" aria-label="Earlier days" disabled={from <= today} style={{ ...st.pager, ...(from <= today ? st.pagerOff : {}) }}
                onClick={() => setFrom(f => { const back = addDays(f, -DAYS_PER_PAGE); return back < today ? today : back; })}><Chevron left /></button>
              <button type="button" aria-label="Later days" style={st.pager} onClick={() => setFrom(f => addDays(f, DAYS_PER_PAGE))}><Chevron /></button>
            </span>
          </div>
          {error ? (
            <p role="alert" style={st.error}>{error} <button type="button" style={st.link} onClick={() => setReload(n => n + 1)}>Try again</button></p>
          ) : !days ? (
            <p style={st.sub} aria-live="polite">Loading times…</p>
          ) : !anyOpen ? (
            <p style={st.sub}>No open times in these two weeks. <button type="button" style={st.link} onClick={() => setFrom(f => addDays(f, DAYS_PER_PAGE))}>See the next two weeks</button></p>
          ) : (
            <>
              <div role="radiogroup" aria-label="Day" style={st.dayRow}>
                {days.map(d => {
                  const open = d.slots.length > 0;
                  const on = d.date === day;
                  const [weekday, ...rest] = formatDay(d.date).split(' ');
                  return (
                    <button key={d.date} type="button" role="radio" aria-checked={on} disabled={!open} aria-label={`${formatDay(d.date)}${open ? '' : ', no times'}`}
                      style={{ ...st.day, ...(on ? st.dayOn : {}), ...(!open ? st.dayOff : {}) }}
                      onClick={() => setDay(d.date)}>
                      <span style={{ fontSize: 11, opacity: 0.7 }}>{weekday}</span>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{rest.join(' ')}</span>
                    </button>
                  );
                })}
              </div>
              {selectedDay && (
                <>
                  <div style={{ ...st.label, marginTop: 20 }}>TIME</div>
                  <div role="radiogroup" aria-label="Start time" style={st.slotGrid}>
                    {selectedDay.slots.map(slot => {
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
            </>
          )}
        </>
      )}
    </div>
  );
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
  dayRow: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin', overscrollBehaviorX: 'contain' },
  day: { flex: '0 0 auto', width: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0', borderRadius: 12, background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.08)', color: 'var(--main)', fontFamily: 'var(--font-body)', cursor: 'pointer' },
  dayOn: { background: 'var(--ink)', border: '1px solid var(--ink)', color: 'var(--paper)' },
  dayOff: { opacity: 0.3, cursor: 'not-allowed' },
  slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 8 },
  slot: { padding: '12px 0', borderRadius: 10, background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.08)', color: 'rgba(var(--ink-rgb), 0.85)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' },
  slotOn: { background: 'var(--ink)', border: '1px solid var(--ink)', color: 'var(--paper)', fontWeight: 600 },
  error: { fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--danger)', margin: 0, padding: '10px 14px', background: 'rgba(255,60,60,0.08)', borderRadius: 8, border: '1px solid rgba(255,60,60,0.15)' },
  link: { background: 'none', border: 'none', padding: 0, color: 'var(--main)', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit', cursor: 'pointer' },
};
