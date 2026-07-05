'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aznxvdnpvbcofaqxgmtu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SrxxKBifFjEUF8Is9ipQwQ_HVvvLPn_';
const BACKEND_URL = 'https://inkspire-backend-xa2a.onrender.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function ConfirmBookingPage({ params }) {
  const { id } = use(params);

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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Booking not found');
      const data = await res.json();
      setBooking(data);
      if (data.status !== 'proposed') {
        setView('error');
        setErrorMsg(
          data.status === 'confirmed' ? 'This booking is already confirmed.' :
          data.status === 'awaiting_deposit' ? 'Waiting for payment confirmation.' :
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
    const { error } = await supabase.auth.signInWithOtp({ email: authEmail, options: { shouldCreateUser: false } });
    if (error) {
      setAuthError('No account found for that email. Please check the address and try again.');
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
    setView('submitting');
    try {
      const res = await fetch(`${BACKEND_URL}/bookings/${id}/web-accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ chosen_time: chosen }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        window.location.href = `/bookings/${id}/confirmed`;
      }
    } catch (e) {
      setErrorMsg(e.message);
      setView('error');
    }
  }

  const times = booking ? [
    booking.proposed_time_primary,
    booking.proposed_time_alt1,
    booking.proposed_time_alt2,
  ].filter(Boolean) : [];

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
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Sign in to confirm</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32 }}>
              Enter the email address you used when making your booking.
            </p>
            {!otpSent ? (
              <>
                <input
                  type="email"
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

        {view === 'error' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32 }}>{errorMsg}</p>
            <a href="https://www.vanta.tattoo" style={{ color: '#fff', fontSize: 14 }}>Back to home</a>
          </div>
        )}
      </div>
    </main>
  );
}
