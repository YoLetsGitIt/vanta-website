'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { BACKEND_URL, cancelConsequence, cancelledText, formatWhen as formatTime } from '../policyText';

const s = {
  wrap: { background: 'var(--page)', color: 'var(--ink)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  inner: { maxWidth: 440, margin: '0 auto', padding: '48px 24px' },
  heading: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: 'rgba(var(--ink-rgb), 0.5)', fontSize: 15, marginBottom: 24 },
  warning: {
    background: 'rgba(255,100,60,0.1)', border: '1px solid rgba(255,100,60,0.25)',
    borderRadius: 10, padding: '16px', marginBottom: 28, fontSize: 14,
    color: 'rgba(var(--ink-rgb), 0.75)', lineHeight: 1.5,
  },
  btnCancel: {
    display: 'block', width: '100%', background: 'var(--danger)', color: 'var(--ink)',
    fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 50,
    border: 'none', cursor: 'pointer', marginBottom: 12,
  },
  btnBack: {
    display: 'block', width: '100%', background: 'rgba(var(--ink-rgb), 0.08)', color: 'var(--ink)',
    fontWeight: 500, fontSize: 15, padding: '14px', borderRadius: 50,
    border: '1px solid rgba(var(--ink-rgb), 0.12)', cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  confirm: {
    background: 'rgba(255,80,60,0.12)', border: '1px solid rgba(255,80,60,0.3)',
    borderRadius: 12, padding: '20px', marginBottom: 20,
  },
  confirmText: { fontSize: 15, fontWeight: 600, marginBottom: 8 },
  confirmSub: { fontSize: 13, color: 'rgba(var(--ink-rgb), 0.5)', marginBottom: 16 },
  err: { color: 'var(--danger)', fontSize: 14, marginTop: 12 },
  success: { textAlign: 'center', paddingTop: 32 },
  good: {
    background: 'rgba(80,200,120,0.1)', border: '1px solid rgba(80,200,120,0.3)',
    borderRadius: 10, padding: '16px', marginBottom: 28, fontSize: 14,
    color: 'rgba(var(--ink-rgb), 0.8)', lineHeight: 1.5,
  },
  move: { display: 'block', textAlign: 'center', color: 'var(--gold)', fontSize: 14, marginTop: 20, textDecoration: 'none' },
};

export default function CancelClient({ params }) {
  const searchParams = useSearchParams();
  const { id: pathId } = use(params);
  const id = pathId === '_' ? (searchParams.get('id') ?? pathId) : pathId;
  const tok = searchParams.get('t') ?? '';

  const [view, setView] = useState('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState('info'); // info | confirm
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    setView('loading');
    if (!id || !tok) { setView('invalid'); return; }
    fetch(`${BACKEND_URL}/bookings/${id}/manage?t=${tok}`)
      .then(r => {
        if ([400, 401, 403, 404, 410].includes(r.status)) return null;
        if (!r.ok) throw new Error('Unable to load booking');
        return r.json();
      })
      .then(data => {
        if (!data) { setView('invalid'); return; }
        if (['cancelled', 'completed', 'rejected', 'declined', 'timed_out'].includes(data.status)) { setView('already_cancelled'); return; }
        setBooking(data);
        setView('form');
      })
      .catch(() => setView('load-error'));
  }, [id, tok, loadAttempt]);

  async function handleCancel() {
    setCancelling(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/bookings/${id}/client-cancel?t=${tok}`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Failed to cancel. Please try again.'); return; }
      setResult(data);
      setView('done');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  if (view === 'loading') {
    return (
      <main className="page-scroll" style={s.wrap}>
        <div style={{ ...s.inner, textAlign: 'center', paddingTop: 80 }}>
          <p style={{ color: 'rgba(var(--ink-rgb), 0.4)' }}>Loading…</p>
        </div>
      </main>
    );
  }

  if (view === 'load-error') {
    return (
      <main className="page-scroll" style={s.wrap}>
        <div style={s.inner} role="alert">
          <h1 style={{ fontSize: 24 }}>Unable to load your booking</h1>
          <p>Please check your connection and try again.</p>
          <button style={s.btnBack} onClick={() => setLoadAttempt(value => value + 1)}>Try again</button>
        </div>
      </main>
    );
  }

  if (view === 'invalid') {
    return (
      <main className="page-scroll" style={s.wrap}>
        <div style={{ ...s.inner, textAlign: 'center', paddingTop: 80 }}>
          <p style={{ fontSize: 20, marginBottom: 12 }}>Link not found</p>
          <p style={{ color: 'rgba(var(--ink-rgb), 0.4)', fontSize: 14 }}>This cancellation link is invalid.</p>
        </div>
      </main>
    );
  }

  if (view === 'already_cancelled') {
    return (
      <main className="page-scroll" style={s.wrap}>
        <div style={{ ...s.inner, textAlign: 'center', paddingTop: 80 }}>
          <p style={{ fontSize: 20, marginBottom: 12 }}>Already cancelled</p>
          <p style={{ color: 'rgba(var(--ink-rgb), 0.4)', fontSize: 14 }}>This booking has already been cancelled or has ended.</p>
        </div>
      </main>
    );
  }

  if (view === 'done') {
    return (
      <main className="page-scroll" style={s.wrap}>
        <div style={{ ...s.inner, ...s.success }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Booking cancelled</h1>
          <p style={{ color: 'rgba(var(--ink-rgb), 0.5)', fontSize: 15, lineHeight: 1.5 }}>
            Your booking has been cancelled. {cancelledText(result)} We've emailed you a copy.
          </p>
        </div>
      </main>
    );
  }

  const consequence = cancelConsequence(booking?.cancellation);

  return (
    <main className="page-scroll" style={s.wrap}>
      <div style={s.inner}>
        <h1 style={s.heading}>Cancel appointment</h1>
        <p style={s.sub}>
          {booking?.chosen_time ? formatTime(booking.chosen_time) : ''}
        </p>

        {consequence.text && (
          <div style={consequence.tone === 'good' ? s.good : s.warning}>{consequence.text}</div>
        )}

        {step === 'info' && (
          <>
            <button style={s.btnCancel} onClick={() => setStep('confirm')}>
              Cancel booking
            </button>
            <button style={s.btnBack} onClick={() => window.history.back()}>
              Keep my appointment
            </button>
            {booking?.can_reschedule && (
              <a style={s.move} href={`/bookings/_/reschedule?id=${encodeURIComponent(id)}&t=${encodeURIComponent(tok)}`}>
                Need a different time? Move it instead
              </a>
            )}
          </>
        )}

        {step === 'confirm' && (
          <>
            <div style={s.confirm}>
              <p style={s.confirmText}>Are you sure you want to cancel?</p>
              <p style={s.confirmSub}>{consequence.tone === 'warn' ? 'Your deposit won’t be refunded. ' : ''}This can’t be undone.</p>
              <button
                style={{ ...s.btnCancel, ...(cancelling ? s.btnDisabled : {}) }}
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling…' : 'Yes, cancel my booking'}
              </button>
            </div>
            <button style={s.btnBack} onClick={() => setStep('info')}>
              Go back
            </button>
            {error && <p style={s.err}>{error}</p>}
          </>
        )}
      </div>
    </main>
  );
}
