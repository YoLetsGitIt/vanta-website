'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';

const BACKEND_URL = 'https://inkspire-backend-xa2a.onrender.com';

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

const s = {
  wrap: { minHeight: '100vh', background: '#11151b', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  inner: { maxWidth: 440, margin: '0 auto', padding: '48px 24px' },
  heading: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 24 },
  warning: {
    background: 'rgba(255,100,60,0.1)', border: '1px solid rgba(255,100,60,0.25)',
    borderRadius: 10, padding: '16px', marginBottom: 28, fontSize: 14,
    color: 'rgba(255,255,255,0.75)', lineHeight: 1.5,
  },
  btnCancel: {
    display: 'block', width: '100%', background: 'rgba(255,80,60,0.9)', color: '#fff',
    fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 50,
    border: 'none', cursor: 'pointer', marginBottom: 12,
  },
  btnBack: {
    display: 'block', width: '100%', background: 'rgba(255,255,255,0.08)', color: '#fff',
    fontWeight: 500, fontSize: 15, padding: '14px', borderRadius: 50,
    border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  confirm: {
    background: 'rgba(255,80,60,0.12)', border: '1px solid rgba(255,80,60,0.3)',
    borderRadius: 12, padding: '20px', marginBottom: 20,
  },
  confirmText: { fontSize: 15, fontWeight: 600, marginBottom: 8 },
  confirmSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 },
  err: { color: '#ff6b6b', fontSize: 14, marginTop: 12 },
  success: { textAlign: 'center', paddingTop: 32 },
};

export default function CancelClient({ params }) {
  const searchParams = useSearchParams();
  const { id: pathId } = use(params);
  const id = pathId === '_' ? (searchParams.get('id') ?? pathId) : pathId;
  const tok = searchParams.get('t') ?? '';

  const [view, setView] = useState('loading');
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState('info'); // info | confirm
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !tok) { setView('invalid'); return; }
    fetch(`${BACKEND_URL}/bookings/${id}/manage?t=${tok}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setView('invalid'); return; }
        if (data.status === 'cancelled') { setView('already_cancelled'); return; }
        setBooking(data);
        setView('form');
      })
      .catch(() => setView('invalid'));
  }, [id, tok]);

  async function handleCancel() {
    setCancelling(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/bookings/${id}/client-cancel?t=${tok}`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Failed to cancel. Please try again.'); return; }
      setView('done');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCancelling(false);
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
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>This cancellation link is invalid.</p>
        </div>
      </main>
    );
  }

  if (view === 'already_cancelled') {
    return (
      <main style={s.wrap}>
        <div style={{ ...s.inner, textAlign: 'center', paddingTop: 80 }}>
          <p style={{ fontSize: 20, marginBottom: 12 }}>Already cancelled</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>This booking has already been cancelled.</p>
        </div>
      </main>
    );
  }

  if (view === 'done') {
    return (
      <main style={s.wrap}>
        <div style={{ ...s.inner, ...s.success }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Booking cancelled</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
            Your booking has been cancelled. Please note that your deposit is non-refundable.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={s.wrap}>
      <div style={s.inner}>
        <h1 style={s.heading}>Cancel appointment</h1>
        <p style={s.sub}>
          {booking?.chosen_time ? formatTime(booking.chosen_time) : ''}
        </p>

        <div style={s.warning}>
          <strong>Your deposit will not be refunded.</strong> Cancelling this booking means you will lose your deposit. This action cannot be undone.
        </div>

        {step === 'info' && (
          <>
            <button style={s.btnCancel} onClick={() => setStep('confirm')}>
              Cancel booking
            </button>
            <button style={s.btnBack} onClick={() => window.history.back()}>
              Keep my appointment
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div style={s.confirm}>
              <p style={s.confirmText}>Are you sure you want to cancel?</p>
              <p style={s.confirmSub}>Your deposit is non-refundable and this cannot be undone.</p>
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
