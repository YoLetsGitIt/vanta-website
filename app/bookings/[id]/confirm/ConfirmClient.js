'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { websiteAuth } from '../../../../lib/website-auth';
import SocialSignIn from '../../../../components/SocialSignIn';
import DepositBreakdown from '../../../../components/DepositBreakdown';
import { depositCharge, money } from '../../../../lib/booking-fee.mjs';
import ManualDepositDetails, { hasManualDeposit } from '../../../../components/ManualDepositDetails';
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
  // Emails carry a private link token, so clients confirm without an account or code.
  const linkToken = searchParams.get('t') || '';

  const [session, setSession] = useState(null);
  const [view, setView] = useState('loading'); // loading | auth | selecting | submitting | confirmed | error
  const [booking, setBooking] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeNotice, setTimeNotice] = useState('');
  // Studio offers with a deposit: picking a time saves nothing; the client pays on the
  // next screen and only then is the time booked.
  const [payment, setPayment] = useState(null); // { deposit_amount, deposit_options }
  const [paying, setPaying] = useState('');
  const [payError, setPayError] = useState('');
  const [claimed, setClaimed] = useState('');

  const [linkSent, setLinkSent] = useState(false);
  const [linkSending, setLinkSending] = useState(false);

  useEffect(() => {
    if (linkToken) { loadBooking(null); return; }
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
  }, [id, linkToken]);

  const reload = () => loadBooking(session?.access_token ?? null);

  async function loadBooking(token) {
    setView('loading');
    try {
      const res = linkToken
        ? await fetch(`${BACKEND_URL}/bookings/${id}/proposal?t=${encodeURIComponent(linkToken)}`, { headers: bookingHeaders, cache: 'no-store' })
        : await fetch(`${BACKEND_URL}/bookings/${id}`, {
          headers: { ...bookingHeaders, Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
      if (!res.ok) throw new Error(res.status === 404 ? (linkToken ? 'This link is no longer valid. Use the latest email from your artist.' : 'Booking not found.') : res.status === 403 ? 'Please sign in with the email address your artist sent this booking to.' : 'Unable to load your booking. Please try again.');
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
      if (linkToken && data.deposit_required) {
        const p = await fetch(`${BACKEND_URL}/bookings/${id}/proposal/payment?t=${encodeURIComponent(linkToken)}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
        if (p?.deposit_amount) setPayment(p);
      }
      setView('selecting');
    } catch (e) {
      setErrorMsg(e.message);
      setView('error');
    }
  }

  // Older emails had no link token: send a fresh link to the booking's email address.
  async function emailNewLink() {
    setLinkSending(true);
    await fetch(`${BACKEND_URL}/bookings/${id}/proposal/resend`, { method: 'POST' }).catch(() => {});
    setLinkSending(false);
    setLinkSent(true);
  }

  const needsDeposit = Boolean(linkToken && payment?.deposit_amount);

  // payment: '' (no deposit), 'card', 'payid' or 'bank_transfer'.
  async function confirmBooking(method = '') {
    if (!chosen) return;
    if (proposalState(booking) !== 'selecting' || !proposalTimes(booking).includes(chosen)) {
      setErrorMsg('These proposed times are no longer available. Contact your artist for new times.');
      setView('error');
      return;
    }
    if (method) { setPaying(method); setPayError(''); } else setView('submitting');
    setTimeNotice('');
    try {
      const res = await fetch(linkToken ? `${BACKEND_URL}/bookings/${id}/proposal/accept?t=${encodeURIComponent(linkToken)}` : `${BACKEND_URL}/bookings/${id}/web-accept`, {
        method: 'POST',
        headers: {
          ...bookingHeaders, 'Content-Type': 'application/json',
          ...(linkToken ? {} : { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ chosen_time: chosen, ...(method ? { payment: method } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402 && data.deposit_options) {
        setPayment(p => ({ deposit_amount: p?.deposit_amount ?? booking?.deposit_amount, deposit_options: data.deposit_options }));
        setView('paying');
        return;
      }
      if (res.status === 409 && linkToken) {
        // Usually the time was just taken: show the times that are still open.
        setChosen(null);
        await reload();
        setTimeNotice(data.error || 'That time is no longer available. Please choose another.');
        return;
      }
      if (!res.ok) throw new Error(data.error || data.message || 'Unable to confirm. Please try again.');
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      if (data.deposit_url) {
        window.location.href = data.deposit_url;
        return;
      }
      if (method === 'payid' || method === 'bank_transfer') setClaimed(method);
      await reload();
    } catch (e) {
      if (method) setPayError(e.message);
      else { setErrorMsg(e.message); setView('error'); }
    } finally {
      setPaying('');
    }
  }

  const times = proposalTimes(booking);
  const receipt = bookingReceipt(booking);

  const depositAmount = booking?.deposit_amount;
  const depositRequired = booking?.deposit_required;

  return (
    <main className="page-scroll" style={{ background: '#11151b', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <a href="https://www.vanta.tattoo" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textDecoration: 'none' }}>← vanta.tattoo</a>
        </div>

        {view === 'loading' && (
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</p>
        )}

        {view === 'auth' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{receiptOnly ? 'View your booking' : 'Confirm your booking'}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              Open the link in the latest email from your artist, or we can email you a new one. No account needed.
            </p>
            {linkSent ? (
              <p role="status" style={{ color: '#fff', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
                If this booking is waiting on you, we’ve emailed a new link to the address on the booking.
              </p>
            ) : (
              <button
                onClick={emailNewLink}
                disabled={linkSending}
                style={{
                  width: '100%', minHeight: 52, padding: '14px', background: '#fff', color: '#11151b',
                  border: 'none', borderRadius: 50, fontWeight: 600, fontSize: 15, marginBottom: 24,
                  cursor: linkSending ? 'wait' : 'pointer', opacity: linkSending ? 0.7 : 1,
                }}
              >
                {linkSending ? 'Sending…' : 'Email me a new link'}
              </button>
            )}
            <p style={{ color: '#bac1cb', fontSize: 13, margin: '0 0 12px' }}>Have a Vanta account? Sign in instead</p>
            <SocialSignIn />
          </div>
        )}

        {view === 'selecting' && booking && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Choose your time</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32 }}>
              Your artist has proposed the following times. Select the one that works best for you.
            </p>
            {timeNotice && (
              <p role="alert" style={{ margin: '0 0 20px', padding: '12px 16px', borderRadius: 12, background: 'rgba(224,168,79,0.12)', border: '1px solid rgba(224,168,79,0.4)', color: '#f1d3a1', fontSize: 14, lineHeight: 1.5 }}>{timeNotice}</p>
            )}
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
              <div style={{ marginBottom: 32 }}>
                <p style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Deposit required</p>
                <DepositBreakdown charge={depositCharge(depositAmount, payment?.deposit_options)} />
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  {needsDeposit ? 'Pay it on the next screen to lock in your time. The deposit comes off your total on the day.' : 'After you confirm, you’ll go to the payment page. The deposit comes off your total on the day.'}
                </p>
              </div>
            )}

            <button
              onClick={() => (needsDeposit ? setView('paying') : confirmBooking())}
              disabled={!chosen}
              style={{
                width: '100%', padding: '16px', background: '#fff', color: '#11151b',
                border: 'none', borderRadius: 50, fontWeight: 600, fontSize: 15,
                cursor: chosen ? 'pointer' : 'not-allowed', opacity: chosen ? 1 : 0.4,
              }}
            >
              {needsDeposit ? 'Continue to pay deposit' : depositRequired && depositAmount ? `Confirm & pay ${money(depositCharge(depositAmount, payment?.deposit_options).total)}` : 'Confirm booking'}
            </button>
          </div>
        )}

        {view === 'paying' && booking && chosen && payment && (() => {
          const options = payment.deposit_options || {};
          // Paid through Vanta or straight to the studio, never both on one page.
          const manual = !options.card && hasManualDeposit(options) ? options.manual : null;
          const amount = Number(payment.deposit_amount);
          const charge = depositCharge(amount, options);
          const hasBank = manual && manual.bank_account_name && manual.bank_bsb && manual.bank_account_number;
          const btn = { width: '100%', minHeight: 52, padding: '14px', borderRadius: 50, fontWeight: 600, fontSize: 15, border: 'none', cursor: paying ? 'wait' : 'pointer', opacity: paying ? 0.7 : 1 };
          return (
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Pay your deposit</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
                Your time is booked once the deposit is paid. The deposit comes off your total on the day.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Your time</p>
                <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600 }}>{formatTime(chosen)}</p>
              </div>
              <DepositBreakdown charge={charge} style={{ marginBottom: 24 }} />
              {payError && <p role="alert" style={{ color: '#ff8a8a', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>{payError}</p>}
              {options.card && (
                <button onClick={() => confirmBooking('card')} disabled={Boolean(paying)} style={{ ...btn, background: '#fff', color: '#11151b', marginBottom: manual ? 8 : 0 }}>
                  {paying === 'card' ? 'Opening secure payment…' : `Pay ${money(charge.total)}`}
                </button>
              )}
              {manual && (
                <>
                  <ManualDepositDetails options={options} amount={amount} />
                  <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
                    {manual.payid && (
                      <button onClick={() => confirmBooking('payid')} disabled={Boolean(paying)} style={{ ...btn, background: options.card ? 'rgba(255,255,255,0.1)' : '#fff', color: options.card ? '#fff' : '#11151b' }}>
                        {paying === 'payid' ? 'Booking…' : 'I’ve paid by PayID'}
                      </button>
                    )}
                    {hasBank && (
                      <button onClick={() => confirmBooking('bank_transfer')} disabled={Boolean(paying)} style={{ ...btn, background: options.card || manual.payid ? 'rgba(255,255,255,0.1)' : '#fff', color: options.card || manual.payid ? '#fff' : '#11151b' }}>
                        {paying === 'bank_transfer' ? 'Booking…' : 'I’ve paid by bank transfer'}
                      </button>
                    )}
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>Tap this once you’ve sent the money. Your time is booked and the studio checks the payment arrived.</p>
                  </div>
                </>
              )}
              {!options.card && !manual && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>The studio hasn’t set up a way to pay online yet. Please contact them to pay your deposit.</p>}
              <button onClick={() => { setView('selecting'); setPayError(''); }} disabled={Boolean(paying)} style={{ background: 'none', border: 0, color: 'rgba(255,255,255,0.7)', fontSize: 14, padding: '16px 0', cursor: 'pointer', textDecoration: 'underline' }}>
                Choose a different time
              </button>
            </div>
          );
        })()}

        {view === 'submitting' && (
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Confirming your booking…</p>
        )}

        {view === 'receipt' && booking && (
          <section aria-live="polite">
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>{claimed && booking.status === 'confirmed' ? 'Booking confirmed' : receipt.title}</h1>
            <p style={{ color: '#bbc0ca', lineHeight: 1.6 }}>{claimed && booking.status === 'confirmed'
              ? `Thanks — you told the studio you paid the deposit by ${claimed === 'payid' ? 'PayID' : 'bank transfer'}. They’ll check it’s arrived.`
              : receipt.message}</p>
            <p>{booking.session_type === 'piercing' ? 'Piercing' : 'Tattoo appointment'}{booking.artist_name ? ` with ${booking.artist_name}` : ''}</p>
            {booking.chosen_time && <p>{formatTime(booking.chosen_time)}</p>}
            {booking.status === 'awaiting_payment' && !booking.deposit_paid_at && !booking.deposit_confirmed_at && booking.selection_token && (
              <p><a href={`/booking/_?token=${encodeURIComponent(booking.selection_token)}`} style={{ color: '#fff' }}>Continue to deposit payment</a></p>
            )}
            <button onClick={reload} style={{ minHeight: 44, padding: '10px 20px', borderRadius: 12 }}>Check again</button>
            {['confirmed', 'completed'].includes(booking.status) && <p><a href="https://www.vanta.tattoo" style={{ color: '#fff' }}>Get Vanta to chat with your artist and track your appointment</a></p>}
          </section>
        )}

        {view === 'error' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32 }}>{errorMsg}</p>
            {(session || linkToken) && <button onClick={reload} style={{ minHeight: 44, padding: '10px 20px', marginRight: 16, borderRadius: 12 }}>Try again</button>}
            {session && !linkToken && <button onClick={async () => { await supabase.auth.signOut(); setSession(null); setView('auth'); }} style={{ minHeight: 44, padding: '10px 20px', marginRight: 16, borderRadius: 12 }}>Use a different account</button>}
            <a href="https://www.vanta.tattoo" style={{ color: '#fff', fontSize: 14 }}>Back to home</a>
          </div>
        )}
      </div>
    </main>
  );
}
