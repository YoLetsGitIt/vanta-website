'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';

const BACKEND_URL = 'https://inkspire-backend-xa2a.onrender.com';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function isoDateStr(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toHHMM(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const s = {
  wrap: { minHeight: '100vh', background: '#11151b', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  inner: { maxWidth: 440, margin: '0 auto', padding: '48px 24px' },
  heading: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 32 },
  label: { display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 6 },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#fff', fontSize: 16, padding: '12px 14px', boxSizing: 'border-box',
    outline: 'none', appearance: 'none',
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  btn: {
    display: 'block', width: '100%', background: '#fff', color: '#11151b',
    fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 50,
    border: 'none', cursor: 'pointer', marginTop: 8,
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  err: { color: '#ff6b6b', fontSize: 14, marginTop: 12 },
  success: { textAlign: 'center', paddingTop: 32 },
};

export default function RescheduleClient({ params }) {
  const searchParams = useSearchParams();
  const { id: pathId } = use(params);
  const id = pathId === '_' ? (searchParams.get('id') ?? pathId) : pathId;
  const tok = searchParams.get('t') ?? '';

  const [view, setView] = useState('loading');
  const [booking, setBooking] = useState(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !tok) { setView('invalid'); return; }
    fetch(`${BACKEND_URL}/bookings/${id}/manage?t=${tok}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setView('invalid'); return; }
        setBooking(data);
        if (!data.can_reschedule) { setView('expired'); return; }
        if (data.chosen_time) {
          setDate(isoDateStr(data.chosen_time));
          setStartTime(toHHMM(data.chosen_time));
        }
        setView('form');
      })
      .catch(() => setView('invalid'));
  }, [id, tok]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!date || !startTime || !endTime) { setError('Please fill in date, start time, and end time.'); return; }
    if (endTime <= startTime) { setError('End time must be after start time.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/bookings/${id}/client-reschedule?t=${tok}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_date: date, new_start: startTime, new_end: endTime }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Failed to reschedule. Please try again.'); return; }
      setView('done');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (view === 'loading') {
    return (
      <main style={s.wrap}>
        <div style={{ ...s.inner, textAlign: 'center', paddingTop: 80 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>
        </div>
      </main>
    );
  }

  if (view === 'invalid') {
    return (
      <main style={s.wrap}>
        <div style={{ ...s.inner, textAlign: 'center', paddingTop: 80 }}>
          <p style={{ fontSize: 20, marginBottom: 12 }}>Link not found</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>This reschedule link is invalid or has expired.</p>
        </div>
      </main>
    );
  }

  if (view === 'expired') {
    return (
      <main style={s.wrap}>
        <div style={{ ...s.inner, textAlign: 'center', paddingTop: 80 }}>
          <p style={{ fontSize: 20, marginBottom: 12 }}>Rescheduling closed</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            The reschedule window for this booking has passed. Please contact the studio directly.
          </p>
        </div>
      </main>
    );
  }

  if (view === 'done') {
    return (
      <main style={s.wrap}>
        <div style={{ ...s.inner, ...s.success }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Booking rescheduled</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
            Your appointment time has been updated. You'll receive a confirmation shortly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={s.wrap}>
      <div style={s.inner}>
        <h1 style={s.heading}>Reschedule appointment</h1>
        <p style={s.sub}>
          {booking?.chosen_time ? `Currently scheduled for ${formatDate(booking.chosen_time)}` : ''}
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>Date</label>
            <input
              type="date"
              style={s.input}
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>Start time</label>
              <input
                type="time"
                style={s.input}
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={s.label}>End time</label>
              <input
                type="time"
                style={s.input}
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <p style={s.err}>{error}</p>}
          <button
            type="submit"
            style={{ ...s.btn, ...(saving ? s.btnDisabled : {}) }}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Confirm new time'}
          </button>
        </form>
      </div>
    </main>
  );
}
