'use client';

// The client moves their own booking from the emailed link: once, and not too close to
// the appointment. Where the artist takes instant bookings they pick an open time;
// otherwise they ask the studio for a new one.
import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { BACKEND_URL, formatWhen } from '../policyText';

const s = {
  wrap: { background: 'var(--page)', color: 'var(--ink)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  inner: { maxWidth: 480, margin: '0 auto', padding: '48px 16px' },
  heading: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: 'rgba(var(--ink-rgb), 0.6)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 },
  current: { background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 12, padding: '14px 16px', marginBottom: 24 },
  label: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(var(--ink-rgb), 0.45)', marginBottom: 4 },
  day: { fontSize: 14, fontWeight: 600, margin: '20px 0 10px' },
  slots: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  slot: { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(var(--ink-rgb), 0.15)', background: 'transparent', color: 'var(--ink)', fontSize: 14, cursor: 'pointer', minWidth: 84 },
  slotOn: { background: 'var(--gold)', borderColor: 'var(--gold)', color: '#111', fontWeight: 600 },
  primary: { display: 'block', width: '100%', background: 'var(--gold)', color: '#111', fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 50, border: 'none', cursor: 'pointer', marginTop: 24 },
  secondary: { display: 'block', width: '100%', background: 'rgba(var(--ink-rgb), 0.08)', color: 'var(--ink)', fontWeight: 500, fontSize: 15, padding: '14px', borderRadius: 50, border: '1px solid rgba(var(--ink-rgb), 0.12)', cursor: 'pointer', marginTop: 12 },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  textarea: { width: '100%', boxSizing: 'border-box', minHeight: 110, borderRadius: 12, border: '1px solid rgba(var(--ink-rgb), 0.15)', background: 'rgba(var(--ink-rgb), 0.04)', color: 'var(--ink)', padding: 12, fontSize: 16, fontFamily: 'inherit' },
  err: { color: 'var(--danger)', fontSize: 14, marginTop: 12 },
  link: { color: 'var(--gold)', textDecoration: 'none' },
  muted: { color: 'rgba(var(--ink-rgb), 0.5)', fontSize: 14 },
};

const REFUSALS = {
  used: 'This booking has already been moved once, so it can’t be moved again online.',
  late: 'It’s too close to your appointment to move it online.',
  requested: 'You’ve already asked for a new time. The studio will be in touch, and your booking stays as it is until then.',
  not_booked: 'This booking doesn’t have a confirmed time to move.',
};

function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
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
  const [days, setDays] = useState([]);
  const [nextFrom, setNextFrom] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [picked, setPicked] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [doneText, setDoneText] = useState('');
  const [attempt, setAttempt] = useState(0);

  async function loadDays(from, tz) {
    const res = await fetch(`${base}/reschedule?${q}&date=${from}&days=14`, { cache: 'no-store' });
    if (!res.ok) throw new Error('times');
    const data = await res.json();
    setDays(prev => [...prev, ...(data.days || []).filter(d => d.slots.length > 0)]);
    setNextFrom(addDays(from, 14));
    return data;
  }

  useEffect(() => {
    if (!id || !tok || id === '_') { setView('invalid'); return; }
    setView('loading');
    setDays([]);
    fetch(`${base}/reschedule?${q}`, { cache: 'no-store' })
      .then(r => {
        if ([400, 401, 403, 404].includes(r.status)) return null;
        if (!r.ok) throw new Error('load');
        return r.json();
      })
      .then(async data => {
        if (!data) { setView('invalid'); return; }
        setOpts(data);
        if (data.allowed && data.mode === 'pick') await loadDays(todayIn(data.timezone), data.timezone);
        setView('ready');
      })
      .catch(() => setView('load-error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tok, attempt]);

  async function more() {
    setLoadingMore(true);
    try { await loadDays(nextFrom, opts.timezone); } catch { setError('Times could not be loaded. Please try again.'); }
    setLoadingMore(false);
  }

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
      <h1 style={s.heading}>{opts?.mode === 'pick' ? 'Booking moved' : 'Request sent'}</h1>
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
    return page(<>
      <h1 style={s.heading}>Need a different time?</h1>
      {current}
      <p style={s.sub}>{REFUSALS[opts.reason] || 'This booking can’t be moved online.'} Contact your studio or artist if you need to change it{opts.reason === 'requested' ? '' : <>, or <a style={s.link} href={cancelHref}>cancel your booking</a></>}.</p>
    </>);
  }

  if (opts.mode === 'request') {
    return page(<>
      <h1 style={s.heading}>Ask for a new time</h1>
      {current}
      <p style={s.sub}>Tell the studio when suits you better. Your booking and deposit stay as they are until they move it. You can move a booking once.</p>
      <label htmlFor="msg" style={s.label}>When would suit you?</label>
      <textarea id="msg" style={s.textarea} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Any weekday afternoon the week after" />
      <button style={{ ...s.primary, ...(saving ? s.disabled : {}) }} disabled={saving}
        onClick={() => submit('reschedule-request', { message }, 'The studio will be in touch with a new time. Your booking stays as it is until then.')}>
        {saving ? 'Sending…' : 'Ask for a new time'}
      </button>
      {error && <p style={s.err}>{error}</p>}
    </>);
  }

  const timeLabel = iso => new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
  const dayLabel = ymd => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  return page(<>
    <h1 style={s.heading}>Pick a new time</h1>
    {current}
    <p style={s.sub}>Your deposit moves with your booking. You can move a booking once, so pick a time you're sure about.</p>
    {days.length === 0 && <p style={s.muted}>No open times in the next two weeks.</p>}
    {days.map(d => (
      <div key={d.date}>
        <div style={s.day}>{dayLabel(d.date)}</div>
        <div style={s.slots}>
          {d.slots.map(slot => (
            <button key={slot} style={{ ...s.slot, ...(picked === slot ? s.slotOn : {}) }} aria-pressed={picked === slot} onClick={() => setPicked(slot)}>
              {timeLabel(slot)}
            </button>
          ))}
        </div>
      </div>
    ))}
    <button style={{ ...s.secondary, ...(loadingMore ? s.disabled : {}) }} disabled={loadingMore} onClick={more}>
      {loadingMore ? 'Loading…' : 'Show later dates'}
    </button>
    <button style={{ ...s.primary, ...(!picked || saving ? s.disabled : {}) }} disabled={!picked || saving}
      onClick={() => submit('client-reschedule', { start_time: picked }, `You're now booked for ${formatWhen(picked, tz)}. We've emailed you the new time.`)}>
      {saving ? 'Moving…' : picked ? `Move to ${timeLabel(picked)}, ${dayLabel(picked.slice(0, 10))}` : 'Choose a time'}
    </button>
    {error && <p style={s.err}>{error}</p>}
  </>);
}
