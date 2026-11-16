'use client';

// The client moves their own booking from the emailed link: once, and not too close to
// the appointment. Where the artist takes instant bookings they pick an open time;
// otherwise they ask the studio for a new one.
import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { BACKEND_URL, formatWhen, noticeText } from '../policyText';
import TimeCalendar from '../../../../components/TimeCalendar';
import { cachedMonth, monthOf } from '../../../../lib/open-times.mjs';
import { formatWhen as shortWhen } from '../../../../lib/booking-instant.mjs';

const s = {
  wrap: { background: 'var(--page)', color: 'var(--ink)', fontFamily: 'var(--font-body)' },
  inner: { maxWidth: 480, margin: '0 auto', padding: '48px 16px' },
  heading: { fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, color: 'var(--main)', margin: '0 0 10px', lineHeight: 1.25, maxWidth: 'none' },
  sub: { color: 'rgba(var(--ink-rgb), 0.6)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 },
  current: { background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 12, padding: '14px 16px', marginBottom: 24 },
  label: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(var(--ink-rgb), 0.45)', marginBottom: 4 },
  slot: { padding: '12px 14px', borderRadius: 10, background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.08)', color: 'rgba(var(--ink-rgb), 0.85)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, cursor: 'pointer', minWidth: 84 },
  slotOn: { background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--paper)', fontWeight: 600 },
  // The booking form's main button.
  primary: { display: 'block', width: '100%', background: 'var(--main)', color: 'var(--background)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, padding: '15px 0', borderRadius: 50, border: 'none', cursor: 'pointer', marginTop: 28 },
  secondary: { display: 'block', width: '100%', background: 'rgba(var(--ink-rgb), 0.08)', color: 'var(--ink)', fontWeight: 500, fontSize: 15, padding: '14px', borderRadius: 50, border: '1px solid rgba(var(--ink-rgb), 0.12)', cursor: 'pointer', marginTop: 12 },
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
  textarea: { width: '100%', boxSizing: 'border-box', minHeight: 110, borderRadius: 12, border: '1px solid rgba(var(--ink-rgb), 0.15)', background: 'rgba(var(--ink-rgb), 0.04)', color: 'var(--ink)', padding: 12, fontSize: 16, fontFamily: 'inherit' },
  err: { color: 'var(--danger)', fontSize: 14, marginTop: 12 },
  link: { color: 'var(--gold)', textDecoration: 'none' },
  muted: { color: 'rgba(var(--ink-rgb), 0.5)', fontSize: 14 },
};

// Why the booking can't be moved online: a heading, the reason, and the tone of the notice.
function refusal(opts) {
  const who = opts.business_name || 'your studio or artist';
  switch (opts.reason) {
    case 'late': {
      const notice = opts.notice_hours > 0 ? noticeText(opts.notice_hours) : '';
      return {
        tone: 'warn', title: 'It’s too late to reschedule online',
        text: notice
          ? `Bookings with ${who} can be moved online up to ${notice} before the appointment, and yours is less than ${notice} away.`
          : 'Your appointment is too close to move it online.',
      };
    }
    case 'used':
      return { tone: 'warn', title: 'This booking has already been moved', text: 'A booking can be moved online once. To change the time again, contact ' + who + '.' };
    case 'off':
      return { tone: 'warn', title: 'Online rescheduling isn’t available', text: `${who} doesn’t move bookings online. Contact them to change your time.` };
    case 'requested':
      return { tone: 'info', title: 'Your request is with ' + who, text: 'You’ve asked for a new time. They’ll be in touch, and your booking stays as it is until then.' };
    case 'not_booked':
      return { tone: 'info', title: 'There’s no time to move yet', text: 'This booking doesn’t have a confirmed time. You’ll be able to move it once it does.' };
    default:
      return { tone: 'warn', title: 'This booking can’t be moved online', text: `Contact ${who} to change your time.` };
  }
}

// A wall-clock date and time in a time zone, as an ISO time with the right offset.
function zonedISO(date, time, timeZone) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(guess)).map(p => [p.type, p.value]));
  const asZone = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (asZone - guess)).toISOString();
}

function todayIn(timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export default function RescheduleClient({ params }) {
  const searchParams = useSearchParams();
  const { id: pathId } = use(params);
  const id = pathId === '_' ? (searchParams.get('id') ?? pathId) : pathId;
  const tok = searchParams.get('t') ?? '';
  const base = `${BACKEND_URL}/bookings/${encodeURIComponent(id)}`;
  const q = `t=${encodeURIComponent(tok)}`;
  const cancelHref = `/bookings/_/cancel?id=${encodeURIComponent(id)}&${q}`;

  const [view, setView] = useState('loading'); // loading | invalid | load-error | ready | done
  const [opts, setOpts] = useState(null);
  const [picked, setPicked] = useState('');
  const [calendarView, setCalendarView] = useState('month');
  const [message, setMessage] = useState('');
  // A particular time the client would like (optional); the studio can approve it.
  const [wantDate, setWantDate] = useState('');
  const [wantTime, setWantTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [doneText, setDoneText] = useState('');
  const [attempt, setAttempt] = useState(0);

  // A month of open times to move to, fetched once (the same calendar as the booking form).
  function loadTimes(month, timeZone) {
    return cachedMonth({
      key: `reschedule|${id}`, month, today: todayIn(timeZone),
      fetchDays: (start, days) => fetch(`${base}/reschedule?${q}&date=${start}&days=${days}`, { cache: 'no-store' })
        .then(res => { if (!res.ok) throw new Error('Times could not be loaded. Please try again.'); return res.json(); }),
    });
  }

  useEffect(() => {
    if (!id || !tok || id === '_') { setView('invalid'); return; }
    setView('loading');
    fetch(`${base}/reschedule?${q}`, { cache: 'no-store' })
      .then(r => {
        if ([400, 401, 403, 404].includes(r.status)) return null;
        if (!r.ok) throw new Error('load');
        return r.json();
      })
      .then(async data => {
        if (!data) { setView('invalid'); return; }
        setOpts(data);
        // This month's times start loading now; the calendar shows them when they arrive.
        if (data.allowed && data.mode === 'pick') loadTimes(monthOf(todayIn(data.timezone)), data.timezone).catch(() => {});
        setView('ready');
      })
      .catch(() => setView('load-error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tok, attempt]);

  async function submit(path, body, okText) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${base}/${path}?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Something went wrong. Please try again.'); return; }
      setDoneText(okText);
      setView('done');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const page = children => <main className="page-scroll" style={s.wrap}><div style={s.inner}>{children}</div></main>;

  if (view === 'loading') return page(<p style={{ ...s.muted, textAlign: 'center', paddingTop: 40 }}>Loading…</p>);
  if (view === 'invalid') return page(<><h1 style={s.heading}>Link not found</h1><p style={s.sub}>This link is invalid. Check the latest email about your booking.</p></>);
  if (view === 'load-error') {
    return page(<div role="alert">
      <h1 style={s.heading}>Unable to load your booking</h1>
      <p style={s.sub}>Please check your connection and try again.</p>
      <button style={s.secondary} onClick={() => setAttempt(a => a + 1)}>Try again</button>
    </div>);
  }
  if (view === 'done') {
    return page(<div style={{ textAlign: 'center', paddingTop: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
      <h1 style={s.heading}>{opts?.mode === 'request' ? 'Request sent' : 'Booking moved'}</h1>
      <p style={s.sub}>{doneText}</p>
    </div>);
  }

  const tz = opts?.timezone;
  const current = opts?.chosen_time && (
    <div style={s.current}>
      <div style={s.label}>Currently booked</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{formatWhen(opts.chosen_time, tz)}</div>
    </div>
  );

  if (!opts.allowed) {
    const why = refusal(opts);
    const warn = why.tone === 'warn';
    const who = opts.business_name || 'your studio or artist';
    return page(<>
      <div role="status" style={{
        display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 18px', borderRadius: 16, marginBottom: 20,
        background: warn ? 'color-mix(in srgb, var(--warning) 9%, transparent)' : 'rgba(var(--ink-rgb), 0.05)',
        border: `1px solid ${warn ? 'color-mix(in srgb, var(--warning) 35%, transparent)' : 'rgba(var(--ink-rgb), 0.1)'}`,
      }}>
        <span aria-hidden="true" style={{
          flex: 'none', width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: warn ? 'color-mix(in srgb, var(--warning) 16%, transparent)' : 'rgba(var(--ink-rgb), 0.08)',
          color: warn ? 'var(--warning)' : 'var(--ink)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, margin: '6px 0 6px', maxWidth: 'none' }}>{why.title}</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: 'rgba(var(--ink-rgb), 0.75)' }}>{why.text}</p>
        </div>
      </div>
      {current}
      {opts.reason !== 'requested' && opts.reason !== 'not_booked' && (
        <>
          <div style={s.label}>What you can do</div>
          <p style={{ ...s.sub, marginTop: 6 }}>Contact {who} directly to change your booking. If you can’t make it at all, you can cancel instead.</p>
          <a href={cancelHref} style={{ ...s.secondary, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Cancel my booking</a>
        </>
      )}
    </>);
  }

  if (opts.mode === 'request') {
    return page(<>
      <h1 style={s.heading}>Ask for a new time</h1>
      {current}
      <p style={s.sub}>Tell the studio when suits you better. Your booking and deposit stay as they are until they move it. You can move a booking once.</p>
      <div style={s.label}>A time that suits you <span style={{ fontWeight: 400 }}>(optional)</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 8, marginBottom: 16 }}>
        <input type="date" aria-label="Preferred date" style={{ ...s.textarea, minHeight: 0, minWidth: 0 }} min={todayIn(opts.timezone || 'Australia/Sydney')} value={wantDate} onChange={e => setWantDate(e.target.value)} />
        <input type="time" aria-label="Preferred time" step={900} style={{ ...s.textarea, minHeight: 0, minWidth: 0 }} value={wantTime} onChange={e => setWantTime(e.target.value)} />
      </div>
      <label htmlFor="msg" style={s.label}>Anything else?</label>
      <textarea id="msg" style={s.textarea} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Any weekday afternoon the week after" />
      <button style={{ ...s.primary, ...(saving || (wantDate && !wantTime) ? s.disabled : {}) }} disabled={saving || Boolean(wantDate && !wantTime)}
        onClick={() => submit('reschedule-request', {
          message,
          ...(wantDate && wantTime ? { preferred_time: zonedISO(wantDate, wantTime, opts.timezone || 'Australia/Sydney') } : {}),
        }, wantDate && wantTime
          ? 'We’ve asked the studio to move you to that time. They’ll confirm it or send you other times to choose from. Your booking stays as it is until then.'
          : 'The studio will be in touch with times to choose from. Your booking stays as it is until then.')}>
        {saving ? 'Sending…' : 'Ask for a new time'}
      </button>
      {error && <p style={s.err}>{error}</p>}
    </>);
  }


  // The studio or artist offered times: choose one.
  if (opts.mode === 'choose') {
    const offered = opts.offered || [];
    return page(<>
      <h1 style={s.heading}>Choose a new time</h1>
      {current}
      <p style={s.sub}>These times were offered for your booking. Your deposit moves with it. You can move a booking once, so choose a time you're sure about.</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {offered.map(at => (
          <button key={at} style={{ ...s.slot, textAlign: 'left', padding: '14px 16px', ...(picked === at ? s.slotOn : {}) }} aria-pressed={picked === at} onClick={() => setPicked(at)}>
            {formatWhen(at, tz)}
          </button>
        ))}
      </div>
      <button style={{ ...s.primary, ...(!picked || saving ? s.disabled : {}) }} disabled={!picked || saving}
        onClick={() => submit('client-reschedule', { start_time: picked }, `You're now booked for ${formatWhen(picked, tz)}. We've emailed you the new time.`)}>
        {saving ? 'Moving…' : picked ? `Move to ${formatWhen(picked, tz)}` : 'Choose a time'}
      </button>
      {error && <p style={s.err}>{error}</p>}
    </>);
  }

  return page(<>
    <h1 style={s.heading}>{calendarView === 'month' ? 'Pick a new day' : 'Pick a new time'}</h1>
    {current}
    <p style={s.sub}>Your deposit moves with your booking. You can move a booking once, so pick a time you're sure about.</p>
    <TimeCalendar zone={tz} source={`reschedule|${id}`} start={picked} onStart={setPicked} onView={setCalendarView}
      loadMonth={month => loadTimes(month, tz)} prefetch={month => { loadTimes(month, tz).catch(() => {}); }} />
    <button style={{ ...s.primary, ...(!picked || saving ? s.disabled : {}) }} disabled={!picked || saving}
      onClick={() => submit('client-reschedule', { start_time: picked }, `You're now booked for ${formatWhen(picked, tz)}. We've emailed you the new time.`)}>
      {saving ? 'Moving…' : picked ? `Move to ${shortWhen(picked, tz)}` : 'Choose a time'}
    </button>
    {error && <p style={s.err}>{error}</p>}
  </>);
}
