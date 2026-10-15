'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { websiteAuth } from '../../../../lib/website-auth';
import SocialSignIn from '../../../../components/SocialSignIn';
import { bookingHeaders, proposalState, proposalTimes, bookingReceipt } from '../../../../lib/booking-state.mjs';

const BACKEND_URL = 'https://inkspire-backend-xa2a.onrender.com';

const supabase = websiteAuth();

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  });
}

export default function ConfirmBookingPage({ params, receiptOnly = false }) {
  const searchParams = useSearchParams();
  const { id: pathId } = use(params);
  const id = pathId === '_' ? (searchParams.get('id') ?? pathId) : pathId;

  const [session, setSession] = useState(null);
  const [view, setView] = useState('loading'); // loading | auth | selecting | submitting | confirmed | error
  const [booking, setBooking] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auth state
  const [authEmail, setAuthEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadBooking(session.access_token);
      } else {
        setView('auth');
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) loadBooking(session.access_token);
    });
    return () => subscription.unsubscribe();
  }, [id]);

  async function loadBooking(token) {
    setView('loading');
    try {
      const res = await fetch(`${BACKEND_URL}/bookings/${id}`, {
        headers: { ...bookingHeaders, Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(res.status === 404 ? 'Booking not found.' : res.status === 403 ? 'Please sign in with the email address your artist sent this booking to.' : 'Unable to load your booking. Please try again.');
      const data = await res.json();
      setBooking(data);
      if (receiptOnly || ['confirmed', 'completed', 'requires_confirmation', 'awaiting_payment', 'awaiting_deposit'].includes(data.status)) {
        setView('receipt');
        return;
      }
      const state = proposalState(data);
      if (state !== 'selecting') {
        setView('error');
        setErrorMsg(
          state === 'expired' ? 'This proposal has expired. Contact your artist for new times.' :
          'This booking is no longer awaiting your response.'
        );
        return;
      }
      setView('selecting');
    } catch (e) {
      setErrorMsg(e.message);
      setView('error');
    }
  }

  async function sendOtp() {
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithOtp({ email: authEmail, options: { shouldCreateUser: true } });
    if (error) {
      setAuthError('Unable to send a code. Please check the email address and try again.');
    } else {
      setOtpSent(true);
    }
    setAuthLoading(false);
  }

  async function verifyOtp() {
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.verifyOtp({ email: authEmail, token: otpCode, type: 'email' });
    if (error) setAuthError('Invalid code. Please try again.');
    setAuthLoading(false);
  }

  async function confirmBooking() {
    if (!chosen) return;
    if (proposalState(booking) !== 'selecting' || !proposalTimes(booking).includes(chosen)) {
      setErrorMsg('These proposed times are no longer available. Contact your artist for new times.');
      setView('error');
      return;
    }
    setView('submitting');
    try {
      const res = await fetch(`${BACKEND_URL}/bookings/${id}/web-accept`, {
        method: 'POST',
        headers: {
          ...bookingHeaders, 'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ chosen_time: chosen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Unable to confirm. Please try again.');
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        await loadBooking(session.access_token);
      }
    } catch (e) {
      setErrorMsg(e.message);
      setView('error');
    }
  }

  const times = proposalTimes(booking);
  const receipt = bookingReceipt(booking);

  const depositAmount = booking?.deposit_amount;
  const depositRequired = booking?.deposit_required;

  return (
    <main style={{ minHeight: '100vh', background: '#11151b', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <a href="https://www.vanta.tattoo" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textDecoration: 'none' }}>← vanta.tattoo</a>
        </div>

        {view === 'loading' && (
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</p>
        )}

        {view === 'auth' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{receiptOnly ? 'Sign in to view your booking' : 'Sign in to confirm'}</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32 }}>
              Enter the email address you used when making your booking.
            </p>
            <SocialSignIn disabled={authLoading} />
            <p style={{ color: '#bac1cb', fontSize: 13, marginTop: 24 }}>or continue with email</p>
            {!otpSent ? (
              <>
                <input
                  type="email"
                  aria-label="Booking email address"
                  autoComplete="email"
                  placeholder="Email address"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '14px 16px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: '#fff', fontSize: 16, marginBottom: 12, outline: 'none',
                  }}
                />
                {authError && <p style={{ color: '#ff6b6b', fontSize: 14, marginBottom: 12 }}>{authError}</p>}
                <button
                  onClick={sendOtp}
                  disabled={authLoading || !authEmail}
                  style={{
                    width: '100%', padding: '14px', background: '#fff', color: '#11151b',
                    border: 'none', borderRadius: 50, fontWeight: 600, fontSize: 15,
                    cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1,
                  }}
                >
                  {authLoading ? 'Sending…' : 'Send code'}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16 }}>
                  Enter the 6-digit code sent to <strong>{authEmail}</strong>
                </p>
                <input
                  type="text"
                  aria-label="Email verification code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '14px 16px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: '#fff', fontSize: 24, letterSpacing: 8,
                    marginBottom: 12, outline: 'none', textAlign: 'center',
                  }}
                />
                {authError && <p style={{ color: '#ff6b6b', fontSize: 14, marginBottom: 12 }}>{authError}</p>}
                <button
                  onClick={verifyOtp}
                  disabled={authLoading || otpCode.length < 6}
                  style={{
                    width: '100%', padding: '14px', background: '#fff', color: '#11151b',
                    border: 'none', borderRadius: 50, fontWeight: 600, fontSize: 15,
                    cursor: authLoading ? 'not-allowed' : 'pointer', opacity: (authLoading || otpCode.length < 6) ? 0.5 : 1,
                  }}
                >
                  {authLoading ? 'Verifying…' : 'Verify'}
                </button>
                <button onClick={() => { setOtpSent(false); setOtpCode(''); setAuthError(''); }}
                  style={{ marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer', width: '100%' }}>
                  Use a different email
                </button>
              </>
            )}
          </div>
        )}

        {view === 'selecting' && booking && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Choose your time</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32 }}>
              Your artist has proposed the following times. Select the one that works best for you.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {times.map((t) => (
                <button
                  key={t}
                  onClick={() => setChosen(t)}
                  aria-pressed={chosen === t}
                  style={{
                    padding: '18px 20px', borderRadius: 14, textAlign: 'left',
                    background: chosen === t ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                    border: chosen === t ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: chosen === t ? 600 : 400 }}>{formatTime(t)}</span>
                </button>
              ))}
            </div>

            {depositRequired && depositAmount && (
              <div style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '18px 20px', marginBottom: 32,
              }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 4 }}>Deposit required</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
                  ${depositAmount.toFixed(2)} AUD
                </p>
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  You'll be redirected to a secure payment page. The deposit is deducted from your total on the day.
                </p>
              </div>
            )}

            <button
              onClick={confirmBooking}
              disabled={!chosen}
              style={{
                width: '100%', padding: '16px', background: '#fff', color: '#11151b',
                border: 'none', borderRadius: 50, fontWeight: 600, fontSize: 15,
                cursor: chosen ? 'pointer' : 'not-allowed', opacity: chosen ? 1 : 0.4,
              }}
            >
              {depositRequired && depositAmount ? `Confirm & pay $${depositAmount.toFixed(2)}` : 'Confirm booking'}
            </button>
          </div>
        )}

        {view === 'submitting' && (
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Confirming your booking…</p>
        )}

        {view === 'receipt' && booking && (
          <section aria-live="polite">
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>{receipt.title}</h1>
            <p style={{ color: '#bbc0ca', lineHeight: 1.6 }}>{receipt.message}</p>
            <p>{booking.session_type === 'piercing' ? 'Piercing' : 'Tattoo appointment'}{booking.artist_name ? ` with ${booking.artist_name}` : ''}</p>
            {booking.chosen_time && <p>{formatTime(booking.chosen_time)}</p>}
            {booking.status === 'awaiting_payment' && !booking.deposit_paid_at && !booking.deposit_confirmed_at && booking.selection_token && (
              <p><a href={`/booking/_?token=${encodeURIComponent(booking.selection_token)}`} style={{ color: '#fff' }}>Continue to deposit payment</a></p>
            )}
            <button onClick={() => loadBooking(session.access_token)} style={{ minHeight: 44, padding: '10px 20px', borderRadius: 12 }}>Check again</button>
            {['confirmed', 'completed'].includes(booking.status) && <p><a href="https://www.vanta.tattoo" style={{ color: '#fff' }}>Get Vanta to chat with your artist and track your appointment</a></p>}
          </section>
        )}

        {view === 'error' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32 }}>{errorMsg}</p>
            {session && <button onClick={() => loadBooking(session.access_token)} style={{ minHeight: 44, padding: '10px 20px', marginRight: 16, borderRadius: 12 }}>Try again</button>}
            {session && <button onClick={async () => { await supabase.auth.signOut(); setSession(null); setOtpSent(false); setOtpCode(''); setAuthError(''); setView('auth'); }} style={{ minHeight: 44, padding: '10px 20px', marginRight: 16, borderRadius: 12 }}>Use a different email</button>}
            <a href="https://www.vanta.tattoo" style={{ color: '#fff', fontSize: 14 }}>Back to home</a>
          </div>
        )}
      </div>
    </main>
  );
}
