'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aznxvdnpvbcofaqxgmtu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SrxxKBifFjEUF8Is9ipQwQ_HVvvLPn_';
const BACKEND_URL = 'https://inkspire-backend-xa2a.onrender.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SESSION_LABELS = { touch_up: 'Touch-up', small: 'Small', medium: 'Medium', large: 'Large' };
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmtTime(h, m = 0) {
  const min = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
  if (h === 0) return `12${min} AM`;
  if (h < 12) return `${h}${min} AM`;
  if (h === 12) return `12${min} PM`;
  return `${h - 12}${min} PM`;
}

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' });
}

function fmtDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}hr`;
  return `${h}hr ${m}min`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookingSelectionClient() {
  // gh-pages only serves booking/_.html so Next.js params are always '_'.
  // Read the real token directly from the browser URL on mount.
  const [token, setToken] = useState(null);
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search).get('token');
    const seg = window.location.pathname.split('/').filter(Boolean).pop();
    setToken((qs && qs !== '_') ? qs : (seg && seg !== '_' ? seg : '_'));
  }, []);

  const [view, setView] = useState('loading'); // loading|invalid|expired|auth|select|success|already-done
  const [ctx, setCtx] = useState(null);        // SelectionContext from backend
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authConsent, setAuthConsent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  // Selection state
  const [step, setStep] = useState(0); // 0=artist 1=time 2=review
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistWorkDays, setArtistWorkDays] = useState(null); // Set of day-of-week numbers, or null while loading
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Load context ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token || token === '_') return;
    async function load() {
      try {
        const res = await fetch(`${BACKEND_URL}/booking/${token}`);
        if (res.status === 404) { setView('invalid'); return; }
        if (res.status === 410) { setView('expired'); return; }
        if (!res.ok) { setView('invalid'); return; }
        const data = await res.json();
        setCtx(data);
        if (data.booking.status !== 'pending' && data.booking.status !== 'awaiting_payment') {
          setView('already-done');
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { setSession(session); setView('select'); }
        else { setView('auth'); }
      } catch { setView('invalid'); }
    }
    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => {
      if (sess) { setSession(sess); setView(v => v === 'auth' || v === 'loading' ? 'select' : v); }
    });
    return () => subscription.unsubscribe();
  }, [token]);

  // ── Load artist work schedule when artist selected ────────────────────────────

  useEffect(() => {
    if (!selectedArtist) { setArtistWorkDays(null); return; }
    fetch(`${BACKEND_URL}/artists/${selectedArtist.id}/work-schedule`)
      .then(r => r.ok ? r.json() : { schedule: [] })
      .then(data => {
        const days = new Set((data.schedule || []).map(s => s.day_of_week));
        setArtistWorkDays(days);
      })
      .catch(() => setArtistWorkDays(new Set()));
  }, [selectedArtist]);

  // ── Load time slots when date selected ───────────────────────────────────────

  useEffect(() => {
    if (!selectedDate || !selectedArtist || !token) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    setAvailableSlots([]);

    const dateStr = [
      selectedDate.getFullYear(),
      String(selectedDate.getMonth() + 1).padStart(2, '0'),
      String(selectedDate.getDate()).padStart(2, '0'),
    ].join('-');

    fetch(`${BACKEND_URL}/booking/${token}/slots?date=${dateStr}&artist_id=${selectedArtist.id}`)
      .then(r => r.ok ? r.json() : { slots: [] })
      .then(data => {
        // Slots come back as "HH:MM" local-time strings. Combine with the
        // selected date in the browser's local timezone so displayed times match
        // the studio's timezone (assuming client and studio share a timezone).
        const now = new Date();
        const durationMs = (ctx?.booking?.duration_minutes ?? 60) * 60 * 1000;
        const slots = (data.slots || [])
          .map(timeStr => {
            const [h, m] = timeStr.split(':').map(Number);
            const d = new Date(selectedDate);
            d.setHours(h, m, 0, 0);
            return d;
          })
          .filter(d => d.getTime() + durationMs > now.getTime());
        setAvailableSlots(slots);
        setSlotsLoading(false);
      })
      .catch(() => setSlotsLoading(false));
  }, [selectedDate, selectedArtist, token]);

  // ── Auth ──────────────────────────────────────────────────────────────────────

  async function createProfile(sess, name) {
    try {
      await fetch(`${BACKEND_URL}/auth/users/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.access_token}` },
        body: JSON.stringify({ name: name || 'User', accountType: 'user', termsAcceptedVersion: '1.0' }),
      });
    } catch {}
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError('');
    if (authMode === 'signup' && !authConsent) { setAuthError('Please agree to the terms.'); return; }
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setSession(data.session);
        setView('select');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail, password: authPassword,
          options: { data: { full_name: authName } },
        });
        if (error) throw error;
        if (data.session) {
          await createProfile(data.session, authName);
          setSession(data.session);
          setView('select');
        } else {
          setConfirmEmail(true);
        }
      }
    } catch (err) { setAuthError(err.message || 'Something went wrong'); }
    finally { setAuthLoading(false); }
  }

  // ── Submit selection ──────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!session || !selectedArtist || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`${BACKEND_URL}/booking/${token}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ artist_id: selectedArtist.id, chosen_time: selectedSlot.toISOString() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      setView('success');
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Calendar helpers ──────────────────────────────────────────────────────────

  function calendarDays() {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // ── Render ────────────────────────────────────────────────────────────────────

  if (view === 'loading') {
    return (
      <div className="booking-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={s.spinner} />
      </div>
    );
  }

  if (view === 'invalid') {
    return (
      <Shell studio={null}>
        <h1 style={s.heading}>Link not found</h1>
        <p style={s.muted}>This booking link is invalid or has already been used. Contact your studio for a new one.</p>
      </Shell>
    );
  }

  if (view === 'expired') {
    return (
      <Shell studio={ctx?.studio}>
        <h1 style={s.heading}>Link expired</h1>
        <p style={s.muted}>This booking link has expired. Contact {ctx?.studio?.name ?? 'the studio'} for a new one.</p>
      </Shell>
    );
  }

  if (view === 'already-done') {
    return (
      <Shell studio={ctx?.studio}>
        <div style={s.successIcon}>✓</div>
        <h1 style={s.heading}>Already submitted</h1>
        <p style={s.muted}>
          {ctx?.booking?.status === 'requires_confirmation'
            ? `${ctx.studio?.name ?? 'The studio'} will confirm your appointment shortly.`
            : ctx?.booking?.status === 'confirmed'
            ? 'Your appointment is confirmed.'
            : 'This booking has already been processed.'}
        </p>
        {ctx?.booking?.chosen_time && (
          <div style={s.summaryCard}>
            <div style={s.summaryLabel}>YOUR TIME</div>
            <div style={s.summaryValue}>{fmtDateTime(ctx.booking.chosen_time)}</div>
          </div>
        )}
      </Shell>
    );
  }

  if (view === 'auth') {
    if (confirmEmail) {
      return (
        <Shell studio={ctx?.studio}>
          <h1 style={s.heading}>Check your email</h1>
          <p style={s.muted}>
            We sent a confirmation to <strong style={{ color: 'var(--main)' }}>{authEmail}</strong>.
            Confirm your email then come back to choose your appointment.
          </p>
        </Shell>
      );
    }
    return (
      <Shell studio={ctx?.studio}>
        <h1 style={s.heading}>Sign in to book</h1>
        <p style={s.muted}>
          {ctx?.studio?.name
            ? `${ctx.studio.name} has reserved a spot for you. Sign in to choose your time.`
            : 'Sign in to choose your appointment time.'}
        </p>

        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(authMode === 'login' ? s.tabActive : {}) }} onClick={() => { setAuthMode('login'); setAuthError(''); }}>
            Log in
          </button>
          <button style={{ ...s.tab, ...(authMode === 'signup' ? s.tabActive : {}) }} onClick={() => { setAuthMode('signup'); setAuthError(''); }}>
            Create account
          </button>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {authMode === 'signup' && (
            <div style={s.field}>
              <label style={s.label}>Name</label>
              <input style={s.input} type="text" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          {authMode === 'signup' && (
            <label style={s.consentLabel}>
              <input type="checkbox" checked={authConsent} onChange={e => setAuthConsent(e.target.checked)} style={s.checkbox} />
              <span>
                I agree to the{' '}
                <a href="https://www.vanta.tattoo/terms" target="_blank" rel="noopener noreferrer" style={s.consentLink}>Terms</a>
                {' '}and{' '}
                <a href="https://www.vanta.tattoo/privacy" target="_blank" rel="noopener noreferrer" style={s.consentLink}>Privacy Policy</a>
              </span>
            </label>
          )}
          {authError && <p style={s.error}>{authError}</p>}
          <button style={{ ...s.btn, ...(authLoading ? s.btnDisabled : {}) }} type="submit" disabled={authLoading}>
            {authLoading ? 'Please wait…' : authMode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </Shell>
    );
  }

  if (view === 'success') {
    return (
      <Shell studio={ctx?.studio}>
        <div style={s.successIcon}>✓</div>
        <h1 style={s.heading}>Appointment requested!</h1>
        <p style={s.muted}>{ctx?.studio?.name ?? 'The studio'} will confirm your appointment within 48 hours.</p>
        {selectedSlot && (
          <div style={s.summaryCard}>
            <div style={s.summaryLabel}>YOUR REQUESTED TIME</div>
            <div style={s.summaryValue}>{fmtDateTime(selectedSlot.toISOString())}</div>
            {selectedArtist && <div style={{ ...s.summaryLabel, marginTop: 14 }}>ARTIST</div>}
            {selectedArtist && <div style={s.summaryValue}>{selectedArtist.name}</div>}
          </div>
        )}
      </Shell>
    );
  }

  // ── Selection steps ───────────────────────────────────────────────────────────

  return (
    <Shell studio={ctx?.studio}>
      {ctx?.booking && (
        <div style={s.bookingSummary}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {ctx.booking.session_type && (
              <span style={s.sessionBadge}>{SESSION_LABELS[ctx.booking.session_type] ?? ctx.booking.session_type}</span>
            )}
            {ctx.booking.duration_minutes && (
              <span style={s.sessionBadge}>{fmtDuration(ctx.booking.duration_minutes)}</span>
            )}
            {selectedArtist && step > 0 && (
              <span style={s.sessionBadge}>{selectedArtist.name}</span>
            )}
          </div>
          {ctx.booking.design_details && (
            <p style={s.designSnippet}>{ctx.booking.design_details}</p>
          )}
        </div>
      )}

      <div style={s.steps}>
        {['Artist', 'Date & Time', 'Confirm'].map((label, i) => (
          <div key={i} style={{ ...s.stepDot, ...(i <= step ? s.stepDotActive : {}) }}>
            <div style={{ ...s.stepNum, ...(i === step ? s.stepNumActive : i < step ? s.stepNumDone : {}) }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ ...s.stepLabel, ...(i === step ? { color: 'var(--main)' } : {}) }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Step 0: Choose artist */}
      {step === 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={s.stepHeading}>Choose an artist</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {(ctx?.artists ?? []).map(artist => {
              const sel = selectedArtist?.id === artist.id;
              return (
                <button
                  key={artist.id}
                  style={{ ...s.artistCard, ...(sel ? s.artistCardActive : {}) }}
                  onClick={() => setSelectedArtist(artist)}
                >
                  {artist.profile_image ? (
                    <img src={artist.profile_image} alt={artist.name} style={s.artistAvatar} />
                  ) : (
                    <div style={s.artistAvatarPlaceholder}>
                      <span style={s.avatarInitial}>{(artist.name || 'A')[0].toUpperCase()}</span>
                    </div>
                  )}
                  <span style={{ ...s.artistName, ...(sel ? { color: '#000' } : {}) }}>{artist.name}</span>
                  <div style={{ ...s.checkCircle, ...(sel ? s.checkCircleActive : {}) }}>
                    {sel && <span style={{ fontSize: 11, color: '#fff' }}>✓</span>}
                  </div>
                </button>
              );
            })}
            {(ctx?.artists ?? []).length === 0 && (
              <p style={s.muted}>No artists available at this studio yet.</p>
            )}
          </div>
          <button
            style={{ ...s.btn, marginTop: 28, ...(!selectedArtist ? s.btnDisabled : {}) }}
            disabled={!selectedArtist}
            onClick={() => setStep(1)}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 1: Choose date and time */}
      {step === 1 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={s.stepHeading}>Choose a date</h2>

          <div style={s.calHeader}>
            <button style={s.calNav} onClick={() => setCalMonth(m => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n; })}>‹</button>
            <span style={s.calTitle}>{MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
            <button style={s.calNav} onClick={() => setCalMonth(m => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n; })}>›</button>
          </div>

          <div style={s.calGrid}>
            {DAY_NAMES.map(d => <div key={d} style={s.calDowHeader}>{d}</div>)}
            {calendarDays().map((date, i) => {
              if (!date) return <div key={`e-${i}`} />;
              const isPast = date < today;
              const isUnavailable = artistWorkDays !== null && !artistWorkDays.has(date.getDay());
              const isDisabled = isPast || isUnavailable;
              const isSel = selectedDate && date.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={date.toISOString()}
                  disabled={isDisabled}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    ...s.calDay,
                    ...(isDisabled ? s.calDayPast : {}),
                    ...(isUnavailable && !isPast ? s.calDayUnavailable : {}),
                    ...(isSel ? s.calDaySelected : {}),
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div style={{ marginTop: 24 }}>
              <h2 style={s.stepHeading}>
                {selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              {(ctx?.booking?.duration_minutes || ctx?.booking?.estimated_quote) && (
                <p style={{ ...s.muted, fontSize: 13, marginBottom: 12 }}>
                  {ctx.booking.duration_minutes && <>Showing start times for a {fmtDuration(ctx.booking.duration_minutes)} appointment</>}
                  {ctx.booking.duration_minutes && ctx.booking.estimated_quote && ' · '}
                  {ctx.booking.estimated_quote && <><strong style={{ color: 'var(--text)' }}>Est. ${Math.round(ctx.booking.estimated_quote)}</strong></>}
                </p>
              )}
              {slotsLoading && <div style={{ ...s.spinner, margin: '20px auto' }} />}
              {!slotsLoading && availableSlots.length === 0 && (
                <p style={s.muted}>No available slots on this day. Try another date.</p>
              )}
              {!slotsLoading && availableSlots.length > 0 && (
                <div style={s.slotGrid}>
                  {availableSlots.map((slot, i) => {
                    const sel = selectedSlot && slot.toISOString() === selectedSlot.toISOString();
                    return (
                      <button
                        key={i}
                        style={{ ...s.slotBtn, ...(sel ? s.slotBtnActive : {}) }}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {fmtTime(slot.getHours(), slot.getMinutes())}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={s.btnRow}>
            <button style={s.btnSecondary} onClick={() => { setStep(0); setSelectedDate(null); setSelectedSlot(null); }}>
              Back
            </button>
            <button
              style={{ ...s.btn, width: 'auto', flex: 1, ...(!selectedSlot ? s.btnDisabled : {}) }}
              disabled={!selectedSlot}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={s.stepHeading}>Confirm your appointment</h2>

          <div style={s.reviewCard}>
            <ReviewRow label="Artist" value={selectedArtist?.name} />
            <div style={s.reviewDivider} />
            <ReviewRow label="Date & Time" value={fmtDateTime(selectedSlot?.toISOString())} />
            {ctx?.booking?.duration_minutes && (
              <>
                <div style={s.reviewDivider} />
                <ReviewRow label="Duration" value={fmtDuration(ctx.booking.duration_minutes)} />
              </>
            )}
            {ctx?.booking?.estimated_quote && (
              <>
                <div style={s.reviewDivider} />
                <ReviewRow label="Estimated Quote" value={`$${Math.round(ctx.booking.estimated_quote)}`} />
              </>
            )}
            {ctx?.booking?.session_type && (
              <>
                <div style={s.reviewDivider} />
                <ReviewRow label="Session" value={SESSION_LABELS[ctx.booking.session_type] ?? ctx.booking.session_type} />
              </>
            )}
            {ctx?.studio?.name && (
              <>
                <div style={s.reviewDivider} />
                <ReviewRow label="Studio" value={ctx.studio.name} />
              </>
            )}
          </div>

          <p style={{ ...s.muted, marginTop: 20 }}>
            The studio will confirm your appointment. You'll receive an email once it's locked in.
          </p>

          {submitError && <p style={s.error}>{submitError}</p>}

          <div style={s.btnRow}>
            <button style={s.btnSecondary} onClick={() => { setStep(1); setSubmitError(''); }}>
              Back
            </button>
            <button
              style={{ ...s.btn, width: 'auto', flex: 1, ...(submitting ? s.btnDisabled : {}) }}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Submitting…' : 'Request appointment'}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function Shell({ studio, children }) {
  return (
    <div className="booking-page" style={{ animation: 'booking-fade-in 0.3s ease' }}>
      <div style={s.pageInner}>
        <div style={s.card}>
          {studio && (
            <div style={s.studioHeader}>
              <p style={s.wordmark}>VANTA</p>
              <h2 style={s.studioName}>{studio.name}</h2>
              {studio.address && <p style={s.studioAddress}>{studio.address}</p>}
            </div>
          )}
          {!studio && <p style={s.wordmark}>VANTA</p>}
          {children}
          <p style={s.wordmarkFooter}>VANTA</p>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.4)', width: 70, flexShrink: 0, fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{value}</span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  pageInner: { display: 'flex', justifyContent: 'center', padding: '40px 20px 80px' },
  card: { width: '100%', maxWidth: 480 },
  spinner: {
    width: 28, height: 28,
    border: '2px solid rgba(255,255,255,0.12)',
    borderTopColor: 'rgba(255,255,255,0.6)',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  },
  wordmark: {
    fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700,
    letterSpacing: 5, color: 'rgba(255,255,255,0.3)', margin: '0 0 24px',
  },
  wordmarkFooter: {
    fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
    letterSpacing: 5, color: 'rgba(255,255,255,0.15)', marginTop: 48, textAlign: 'center',
  },
  studioHeader: { marginBottom: 28 },
  studioName: { fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: 'var(--main)', margin: '0 0 4px' },
  studioAddress: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 },
  heading: { fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: 'var(--main)', margin: '0 0 12px' },
  muted: { fontFamily: 'var(--font-body)', fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 20px', lineHeight: 1.65 },
  stepHeading: { fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--main)', margin: '0 0 4px' },
  backLink: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
    fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer',
    padding: '0 0 16px', display: 'block',
  },
  bookingSummary: { marginBottom: 24 },
  sessionBadge: {
    display: 'inline-block', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
    letterSpacing: 1.2, color: 'rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: '3px 10px', marginBottom: 8,
  },
  designSnippet: {
    fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(255,255,255,0.55)',
    margin: 0, lineHeight: 1.5,
    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  },
  steps: { display: 'flex', alignItems: 'center', gap: 0, marginBottom: 4 },
  stepDot: { display: 'flex', alignItems: 'center', gap: 6, flex: 1 },
  stepDotActive: {},
  stepNum: {
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 600,
    background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)',
  },
  stepNumActive: { background: 'var(--main)', color: '#000' },
  stepNumDone: { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' },
  stepLabel: { fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  tabs: {
    display: 'flex', background: 'rgba(255,255,255,0.05)',
    borderRadius: 10, padding: 3, marginBottom: 24,
  },
  tab: {
    flex: 1, padding: '9px 0', background: 'transparent', border: 'none',
    borderRadius: 8, color: 'rgba(255,255,255,0.4)',
    fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer',
  },
  tabActive: { background: 'rgba(255,255,255,0.1)', color: 'var(--main)' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
    padding: '12px 14px', color: 'var(--main)', fontSize: 15,
    fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
  },
  consentLabel: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.45)',
  },
  checkbox: { width: 16, height: 16, accentColor: 'white', marginTop: 2, flexShrink: 0 },
  consentLink: { color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' },
  error: {
    fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(255,100,100,0.85)',
    padding: '10px 14px', background: 'rgba(255,60,60,0.08)',
    borderRadius: 8, border: '1px solid rgba(255,60,60,0.15)', margin: 0,
  },
  btnRow: { display: 'flex', gap: 10, marginTop: 28 },
  btn: {
    width: '100%', padding: '15px 0',
    background: 'var(--main)', color: 'var(--background)',
    border: 'none', borderRadius: 50, fontSize: 16, fontWeight: 600,
    fontFamily: 'var(--font-body)', cursor: 'pointer',
  },
  btnSecondary: {
    flex: '0 0 auto', padding: '15px 24px',
    background: 'transparent', color: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50,
    fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  artistCard: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, cursor: 'pointer',
  },
  artistCardActive: { background: '#fff', border: '1px solid #fff' },
  artistAvatar: { width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  artistAvatarPlaceholder: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarInitial: { fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-heading)' },
  artistName: { flex: 1, textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--main)' },
  checkCircle: {
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    border: '1.5px solid rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  checkCircleActive: { background: 'rgba(0,0,0,0.7)', border: 'none' },
  calHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 20 },
  calNav: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
    fontSize: 20, cursor: 'pointer', padding: '4px 10px',
  },
  calTitle: { fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--main)' },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
  calDowHeader: {
    textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 11,
    color: 'rgba(255,255,255,0.3)', paddingBottom: 4, fontWeight: 500,
  },
  calDay: {
    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--main)',
  },
  calDayPast: { opacity: 0.25, cursor: 'not-allowed', pointerEvents: 'none' },
  calDayUnavailable: { opacity: 0.2, cursor: 'not-allowed', pointerEvents: 'none', background: 'rgba(255,255,255,0.02)' },
  calDaySelected: { background: 'var(--main)', color: '#000', border: '1px solid var(--main)', fontWeight: 700 },
  slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 },
  slotBtn: {
    padding: '12px 0', borderRadius: 10,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--main)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
  },
  slotBtnActive: { background: 'var(--main)', color: '#000', border: '1px solid var(--main)', fontWeight: 600 },
  reviewCard: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, overflow: 'hidden', marginTop: 20,
  },
  reviewDivider: { height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 14px' },
  successIcon: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(50,200,100,0.12)', border: '1px solid rgba(50,200,100,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, color: 'rgba(50,200,100,0.9)', marginBottom: 20,
  },
  summaryCard: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '16px 18px', marginTop: 20,
  },
  summaryLabel: {
    fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
    letterSpacing: 1.4, color: 'rgba(255,255,255,0.3)', marginBottom: 4,
  },
  summaryValue: { fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--main)' },
};
