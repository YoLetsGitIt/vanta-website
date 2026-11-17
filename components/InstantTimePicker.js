'use client';

import { useState } from 'react';
import { formatLength, formatMoney, todayIn } from '../lib/booking-instant.mjs';
import { depositCharge, money } from '../lib/booking-fee.mjs';
import { loadMonth, prefetchMonth, timesPlace } from '../lib/open-times.mjs';
import TimeCalendar from './TimeCalendar';

// Instant booking: pick an appointment type, then a day and one of the artist's open
// times. info is GET /artists/{id}/instant-booking.
// hideTypes: the appointment was already chosen on an earlier step; only the time is picked here.
export default function InstantTimePicker({ backend, artistId, info, typeId, onType, start, onStart, hideTypes = false }) {
  const zone = info.timezone;
  const place = timesPlace(info);
  const [view, setView] = useState('month');
  const args = { backend, artistId, place, typeId, today: todayIn(zone) };

  return (
    <div>
      <h2 style={st.heading}>{typeId && view === 'month' ? 'Pick a day' : 'Pick a time'}</h2>
      {hideTypes ? (() => {
        const chosen = info.types.find(t => t.id === typeId);
        const free = chosen && !(Number(chosen.deposit) > 0);
        return <p style={st.sub}>{chosen ? `Times for your ${chosen.name} (${formatLength(chosen.duration_minutes)}). ` : ''}{free ? 'It’s free, so there’s nothing to pay: you’re booked as soon as you confirm.' : info.fee_absorbed ? 'Your time is held while you pay the deposit.' : 'Your time is held while you pay the deposit and the Vanta booking fee.'}</p>;
      })() : <>
      <p style={st.sub}>Choose your appointment, then a time. {info.types.every(t => !(Number(t.deposit) > 0))
        ? 'There’s nothing to pay: you’re booked as soon as you confirm.'
        : info.fee_absorbed ? 'A deposit locks in your time; free appointments are booked straight away. Prices below are what you pay now.' : 'A deposit and the Vanta booking fee lock in your time; free appointments are booked straight away. Prices below are what you pay now.'}</p>

      <div style={st.label}>APPOINTMENT</div>
      <div role="radiogroup" aria-label="Appointment" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {info.types.map(t => {
          const on = t.id === typeId;
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} style={{ ...st.type, ...(on ? st.typeOn : {}) }}
              onClick={() => { if (!on) { onType(t.id); onStart(''); } }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...st.typeName, ...(on ? { color: 'var(--paper)' } : {}) }}>{t.name}</span>
                {t.description && (
                  <span style={{ ...st.typeMeta, display: 'block', margin: '2px 0', lineHeight: 1.45, whiteSpace: 'normal', ...(on ? { color: 'rgba(var(--paper-rgb), 0.7)' } : { color: 'rgba(var(--ink-rgb), 0.75)' }) }}>{t.description}</span>
                )}
                <span style={{ ...st.typeMeta, ...(on ? { color: 'rgba(var(--paper-rgb), 0.55)' } : {}) }}>{formatLength(t.duration_minutes)}</span>
              </span>
              {Number(t.deposit) > 0
                ? <span style={{ ...st.typeMeta, ...(on ? { color: 'rgba(var(--paper-rgb), 0.65)' } : {}), flexShrink: 0 }}>{money(depositCharge(t.deposit, { fee_absorbed: info.fee_absorbed }).total)} to book<span style={{ display: 'block', fontSize: 11, textAlign: 'right' }}>{info.fee_absorbed ? 'deposit, no booking fee' : `${formatMoney(t.deposit)} deposit + ${money(depositCharge(t.deposit).fee)} fee`}</span></span>
                : <span style={{ ...st.typeMeta, ...(on ? { color: 'rgba(var(--paper-rgb), 0.65)' } : {}), flexShrink: 0 }}>Free<span style={{ display: 'block', fontSize: 11, textAlign: 'right' }}>no deposit</span></span>}
            </button>
          );
        })}
      </div>
      </>}

      {typeId && (
        <div style={{ marginTop: hideTypes ? 4 : 24 }}>
          <TimeCalendar zone={zone} source={`${place}|${typeId}`} start={start} onStart={onStart} onView={setView}
            loadMonth={month => loadMonth({ ...args, month })} prefetch={month => prefetchMonth({ ...args, month })} />
        </div>
      )}
    </div>
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
};
