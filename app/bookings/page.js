'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aznxvdnpvbcofaqxgmtu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SrxxKBifFjEUF8Is9ipQwQ_HVvvLPn_';
const BACKEND_URL = 'https://inkspire-backend-xa2a.onrender.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SESSION_TYPES = [
  { value: 'touch_up', label: 'Touch-up', desc: 'Small fixes, colour fills', duration: '1–2 hrs', size: null },
  { value: 'small',    label: 'Small',    desc: 'Simple designs, freehand',      duration: '2–3 hrs', size: '5–10 cm' },
  { value: 'medium',   label: 'Medium',   desc: 'Detailed pieces, large scripts', duration: '3–5 hrs', size: '10–20 cm' },
  { value: 'large',    label: 'Large',    desc: 'Full sleeves, back pieces',      duration: '5+ hrs',  size: '20+ cm' },
];

const BODY_PARTS = [
  'Ankle','Arm','Back','Calf','Chest','Foot','Forearm',
  'Hand','Head','Hip','Knee','Neck','Ribs','Shoulder',
  'Stomach','Thigh','Wrist','Other',
];

const COLOUR_STYLES = ['Black', 'Color', 'Grey'];

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_VALUES = [1,2,3,4,5,6,0]; // ISO weekday → JS dayOfWeek (0=Sun)

const STEP_TITLES = ['Session Type','Design Details','Availability','Contact Info','Review'];
const TOTAL_STEPS = 5;

// Availability grid (static constants; dynamic range is computed inside AvailabilityGrid)
const AV_SLOT_MINS  = 30;
const AV_SLOT_H     = 22;  // px per slot
const AV_TIME_W     = 38;  // px for time-label column

// ─── Helpers ────────────────────────────────────────────────────────────────

function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

function uploadFileXHR(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    });
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.send(file);
  });
}

// ─── Main component ──────────────────────────────────────────────────────────

function BookingContent() {
  const searchParams = useSearchParams();
  const artistId = searchParams.get('artist');

  const [artist, setArtist] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const [session, setSession] = useState(null);
  const [view, setView] = useState('loading'); // loading|auth|confirm-email|form|success|error
  const [authMode, setAuthMode] = useState('signup');

  // Auth fields
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authConsent, setAuthConsent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Step state
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState('');

  // Step 0 – session type
  const [sessionType, setSessionType] = useState(null);

  // Step 1 – design
  const [designDetails, setDesignDetails] = useState('');
  const [bodyLocations, setBodyLocations] = useState([]);
  const [colourStyle, setColourStyle] = useState('');
  const [colourDetails, setColourDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [showBodyPicker, setShowBodyPicker] = useState(false);
  const photoInputRef = useRef(null);

  // Step 2 – availability
  const [availabilityWindows, setAvailabilityWindows] = useState([]);
  const [pushToLater, setPushToLater] = useState(false);
  const [earliestDate, setEarliestDate] = useState('');
  const [artistSchedule, setArtistSchedule] = useState([]);

  // Step 3 – contact
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitPhase, setSubmitPhase] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Unlock scroll — global CSS locks html/body overflow for the marketing pages
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!artistId) { setView('error'); return; }

    async function init() {
      const [artistData, refData, scheduleData, { data: { session } }] = await Promise.all([
        fetch(`${BACKEND_URL}/artists/${artistId}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${BACKEND_URL}/artists/${artistId}/referral-code`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch(`${BACKEND_URL}/artists/${artistId}/work-schedule`).then(r => r.ok ? r.json() : { schedule: [] }).catch(() => ({ schedule: [] })),
        supabase.auth.getSession(),
      ]);
      if (!artistData || artistData.error) { setView('error'); return; }
      setArtist(artistData);
      setReferralCode(refData?.referral_code || null);
      const sched = scheduleData?.schedule || [];
      console.log('[Booking] work-schedule:', sched);
      setArtistSchedule(sched);
      if (session) { setSession(session); prefillContact(session); setView('form'); }
      else { setView('auth'); }
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setSession(session); prefillContact(session); setView('form'); }
    });
    return () => subscription.unsubscribe();
  }, [artistId]);

  async function prefillContact(session) {
    const meta = session.user?.user_metadata;
    setContactName(n => n || meta?.full_name || '');
    setContactEmail(e => e || session.user?.email || '');
    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const profile = await res.json();
        if (profile.phone) setContactPhone(p => p || profile.phone);
      }
    } catch {}
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function createProfile(session, name) {
    try {
      await fetch(`${BACKEND_URL}/auth/users/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: name || 'User', accountType: 'user', termsAcceptedVersion: '1.0' }),
      });
    } catch {}
  }

  async function redeemReferral(session, code) {
    try {
      await fetch(`${BACKEND_URL}/referral/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ code }),
      });
    } catch {}
  }

  async function patchReferralSource(session, source) {
    try {
      await fetch(`${BACKEND_URL}/auth/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ referralSource: source }),
      });
    } catch {}
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError('');
    if (authMode === 'signup' && !authConsent) {
      setAuthError('You must agree to the Terms of Use and Privacy Policy.');
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setSession(data.session);
        prefillContact(data.session);
        setView('form');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail, password: authPassword,
          options: { data: { full_name: authName } },
        });
        if (error) throw error;
        if (data.session) {
          await createProfile(data.session, authName);
          if (referralCode) await redeemReferral(data.session, referralCode);
          await patchReferralSource(data.session, 'artist');
          setContactName(authName || '');
          setContactEmail(authEmail);
          setSession(data.session);
          setView('form');
        } else {
          setView('confirm-email');
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  // ── Photos ────────────────────────────────────────────────────────────────

  async function handlePhotoChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 5 - photoFiles.length;
    const toAdd = files.slice(0, remaining);
    const previews = await Promise.all(toAdd.map(readFileAsDataURL));
    setPhotoFiles(prev => [...prev, ...toAdd]);
    setPhotoPreviews(prev => [...prev, ...previews]);
    e.target.value = '';
  }

  function removePhoto(idx) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function nextEnabled() {
    switch (step) {
      case 0: return !!sessionType;
      case 1: return designDetails.trim() && bodyLocations.length > 0 && colourStyle && photoFiles.length > 0;
      case 2: return availabilityWindows.length > 0 || (pushToLater && earliestDate);
      case 3: return contactName.trim() && contactEmail.trim() && contactEmail.includes('@');
      default: return true;
    }
  }

  function handleNext() {
    setStepError('');
    if (step < TOTAL_STEPS - 1) { setStep(s => s + 1); }
    else { handleSubmit(); }
  }

  function handleBack() {
    setStepError('');
    if (step === 0) { /* can't go back from first step */ } else { setStep(s => s - 1); }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!session) return;
    setSubmitting(true);
    setSubmitError('');
    setSubmitProgress(0);
    setSubmitPhase('');

    try {
      let refImages = [];

      if (photoFiles.length > 0) {
        setSubmitPhase('Preparing photos…');
        setSubmitProgress(0.05);

        const signRes = await fetch(`${BACKEND_URL}/bookings/uploads/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            files: photoFiles.map(f => ({
              mime_type: f.type === 'image/png' ? 'image/png' : 'image/jpeg',
              byte_size: f.size,
            })),
          }),
        });
        if (!signRes.ok) throw new Error('Failed to prepare photo upload.');
        const { uploads } = await signRes.json();

        setSubmitPhase('Uploading photos…');
        setSubmitProgress(0.1);

        const fileProgress = new Array(uploads.length).fill(0);
        await Promise.all(uploads.map((slot, idx) =>
          uploadFileXHR(slot.upload_token, photoFiles[idx], (ratio) => {
            fileProgress[idx] = ratio;
            const overall = fileProgress.reduce((a, b) => a + b, 0) / uploads.length;
            setSubmitProgress(0.1 + overall * 0.6);
          })
        ));

        refImages = uploads.map(slot => ({
          storage_bucket: slot.storage_bucket,
          storage_object_path: slot.storage_object_path,
          mime_type: slot.mime_type,
        }));
        setSubmitProgress(0.7);
      }

      setSubmitPhase('Sending request…');
      setSubmitProgress(photoFiles.length > 0 ? 0.72 : 0.3);
      // tick slowly while the server processes so the bar keeps moving
      const ticker = setInterval(() => {
        setSubmitProgress(p => p < 0.92 ? p + 0.02 : p);
      }, 200);

      const colourValue = colourStyle === 'Color' && colourDetails.trim()
        ? `Color (${colourDetails.trim()})`
        : colourStyle || undefined;

      const body = {
        artist_id: artistId,
        requester_name: contactName.trim(),
        requester_email: contactEmail.trim(),
        requester_phone: contactPhone.trim(),
        session_type: sessionType,
        design_details: designDetails.trim(),
        body_location: bodyLocations.join(', '),
        color: colourValue,
        availability_windows: availabilityWindows.map(w => ({
          day_of_week: w.dayOfWeek,
          start_time: w.startTime,
          end_time: w.endTime,
        })),
        push_to_later: pushToLater,
        reference_images: refImages,
        source: 'personal',
      };
      if (notes.trim()) body.additional_notes = notes.trim();
      if (!pushToLater && earliestDate) body.earliest_date = earliestDate;
      if (pushToLater && earliestDate) body.earliest_date = earliestDate;

      const res = await fetch(`${BACKEND_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        clearInterval(ticker);
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      clearInterval(ticker);
      setSubmitProgress(1);
      setView('success');
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
      setSubmitPhase('');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (view === 'loading') {
    return (
      <div className="booking-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <p style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 17, fontWeight: 700, letterSpacing: 6,
          color: 'rgba(255,255,255,0.75)', margin: 0,
        }}>VANTA</p>
        <div style={{ ...s.spinner, animation: 'spin 0.9s linear infinite' }} />
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="booking-page" style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={s.card}>
          <p style={s.wordmark}>VANTA</p>
          <h1 style={s.heading}>Artist not found</h1>
          <p style={s.muted}>This booking link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page" style={{ animation: 'booking-fade-in 0.35s ease' }}>
      <div style={s.pageInner}>
        <div style={s.card}>

          {/* Artist header */}
          {artist && (
            <div style={s.artistHeader}>
              {artist.profileImage ? (
                <img src={artist.profileImage} alt={artist.name} style={s.avatar} />
              ) : (
                <div style={s.avatarPlaceholder}>
                  <span style={s.avatarInitial}>{(artist.name || 'A')[0].toUpperCase()}</span>
                </div>
              )}
              <div style={s.artistName}>{artist.name}</div>
            </div>
          )}

          {/* ── Auth ── */}
          {view === 'auth' && (
            <>
              <h1 style={s.heading}>
                {authMode === 'signup' ? 'Create an account to book' : 'Log in to book'}
              </h1>
              <p style={s.muted}>
                {authMode === 'signup'
                  ? "You'll need a Vanta account to send a booking request."
                  : 'Welcome back. Log in to continue.'}
              </p>

              <a
                href="https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738"
                target="_blank"
                rel="noopener noreferrer"
                style={s.appCta}
              >
                <img src="/vanta-app-icon.png" alt="Vanta" style={s.appCtaIcon} />
                <span>Have the Vanta app? Book directly from there</span>
              </a>

              <div style={s.authDivider}>
                <div style={s.authDividerLine} />
                <span style={s.authDividerLabel}>or continue on web</span>
                <div style={s.authDividerLine} />
              </div>

              <div style={s.tabs}>
                <button style={{ ...s.tab, ...(authMode === 'signup' ? s.tabActive : {}) }} onClick={() => { setAuthMode('signup'); setAuthError(''); }}>
                  Create account
                </button>
                <button style={{ ...s.tab, ...(authMode === 'login' ? s.tabActive : {}) }} onClick={() => { setAuthMode('login'); setAuthError(''); }}>
                  Log in
                </button>
              </div>

              <form onSubmit={handleAuth} style={s.form}>
                {authMode === 'signup' && (
                  <div style={s.field}>
                    <label style={s.label}>Name</label>
                    <input style={s.input} type="text" placeholder="Your name" value={authName} onChange={e => setAuthName(e.target.value)} />
                  </div>
                )}
                <div style={s.field}>
                  <label style={s.label}>Email</label>
                  <input style={s.input} type="email" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Password</label>
                  <input style={s.input} type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required minLength={6} />
                </div>
                {authMode === 'signup' && (
                  <label style={s.consentLabel}>
                    <input type="checkbox" checked={authConsent} onChange={e => setAuthConsent(e.target.checked)} style={s.checkbox} />
                    <span>
                      I agree to the{' '}
                      <a href="https://www.vanta.tattoo/terms" target="_blank" rel="noopener noreferrer" style={s.consentLink}>Terms of Use</a>
                      {' '}and{' '}
                      <a href="https://www.vanta.tattoo/privacy" target="_blank" rel="noopener noreferrer" style={s.consentLink}>Privacy Policy</a>
                    </span>
                  </label>
                )}
                {authError && <p style={s.error}>{authError}</p>}
                <button style={{ ...s.submitBtn, ...(authLoading ? s.submitBtnDisabled : {}) }} type="submit" disabled={authLoading}>
                  {authLoading ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Log in'}
                </button>
              </form>
            </>
          )}

          {/* ── Confirm email ── */}
          {view === 'confirm-email' && (
            <>
              <h1 style={s.heading}>Check your email</h1>
              <p style={s.muted}>
                We sent a confirmation link to{' '}
                <strong style={{ color: 'var(--main)' }}>{authEmail}</strong>.
                Confirm your email, then come back to complete your booking.
              </p>
            </>
          )}

          {/* ── Multi-step booking form ── */}
          {view === 'form' && (
            <>
              <h1 style={{ ...s.heading, marginBottom: 24 }}>Make a booking</h1>

              {/* Progress header */}
              <div style={s.progressHeader}>
                <div style={s.progressTop}>
                  <button style={s.backBtn} onClick={handleBack} disabled={step === 0}>
                    {step > 0 ? '‹' : ''}
                  </button>
                  <span style={s.stepTitle}>{STEP_TITLES[step]}</span>
                  <div style={s.stepDots}>
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                      <div key={i} style={{ ...s.dot, ...(i === step ? s.dotActive : i < step ? s.dotDone : {}) }} />
                    ))}
                  </div>
                </div>
                <div style={s.progressTrack}>
                  <div style={{ ...s.progressFill, width: `${step === TOTAL_STEPS - 1 ? 100 : (step / TOTAL_STEPS) * 100}%` }} />
                </div>
              </div>

              {/* Step content */}
              <div style={{ marginTop: 28 }}>
                {step === 0 && <StepSessionType sessionType={sessionType} setSessionType={setSessionType} />}
                {step === 1 && (
                  <StepDesign
                    designDetails={designDetails} setDesignDetails={setDesignDetails}
                    bodyLocations={bodyLocations} setBodyLocations={setBodyLocations}
                    colourStyle={colourStyle} setColourStyle={setColourStyle}
                    colourDetails={colourDetails} setColourDetails={setColourDetails}
                    notes={notes} setNotes={setNotes}
                    photoPreviews={photoPreviews} photoFiles={photoFiles}
                    photoInputRef={photoInputRef}
                    onAddPhoto={handlePhotoChange} onRemovePhoto={removePhoto}
                    showBodyPicker={showBodyPicker} setShowBodyPicker={setShowBodyPicker}
                  />
                )}
                {step === 2 && (
                  <StepAvailability
                    availabilityWindows={availabilityWindows} setAvailabilityWindows={setAvailabilityWindows}
                    pushToLater={pushToLater} setPushToLater={setPushToLater}
                    earliestDate={earliestDate} setEarliestDate={setEarliestDate}
                    sessionType={sessionType}
                    artistSchedule={artistSchedule}
                  />
                )}
                {step === 3 && (
                  <StepContact
                    name={contactName} setName={setContactName}
                    email={contactEmail} setEmail={setContactEmail}
                    phone={contactPhone} setPhone={setContactPhone}
                  />
                )}
                {step === 4 && (
                  <StepReview
                    sessionType={sessionType}
                    designDetails={designDetails} bodyLocations={bodyLocations}
                    colourStyle={colourStyle} colourDetails={colourDetails}
                    notes={notes} photoPreviews={photoPreviews}
                    availabilityWindows={availabilityWindows} pushToLater={pushToLater}
                    earliestDate={earliestDate}
                    name={contactName} email={contactEmail} phone={contactPhone}
                  />
                )}
              </div>

              {stepError && <p style={{ ...s.error, marginTop: 16 }}>{stepError}</p>}
              {submitError && <p style={{ ...s.error, marginTop: 16 }}>{submitError}</p>}

              {/* Next / Submit button */}
              <button
                style={{
                  ...s.submitBtn,
                  marginTop: 32,
                  ...(!nextEnabled() || submitting ? s.submitBtnDisabled : {}),
                }}
                onClick={handleNext}
                disabled={!nextEnabled() || submitting}
              >
                {submitting ? (
                  <span>
                    {Math.round(submitProgress * 100)}%{submitPhase ? ` · ${submitPhase}` : ''}
                  </span>
                ) : step < TOTAL_STEPS - 1 ? 'Continue' : 'Send Request'}
              </button>
            </>
          )}

          {/* ── Success ── */}
          {view === 'success' && (
            <>
              <div style={s.successIcon}>✓</div>
              <h1 style={s.heading}>Request sent!</h1>
              <p style={s.muted}>
                {artist?.name} will review your request and propose available times. You'll receive an email when they respond.
              </p>

              <div style={s.appCard}>
                <div style={s.appCardIcon}>V</div>
                <div>
                  <div style={s.appCardTitle}>Manage your booking in the app</div>
                  <div style={s.appCardFeature}>· Accept or decline proposed times</div>
                  <div style={s.appCardFeature}>· Chat directly with your artist</div>
                  <div style={s.appCardFeature}>· Get push notifications for updates</div>
                </div>
              </div>

              <a
                href="https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...s.submitBtn, textDecoration: 'none', display: 'block', textAlign: 'center', marginTop: 16 }}
              >
                Download Vanta on the App Store
              </a>

              <a
                href="https://www.vanta.tattoo"
                style={{ display: 'block', textAlign: 'center', marginTop: 16, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
              >
                Back to home
              </a>
            </>
          )}

          <p style={s.wordmarkFooter}>VANTA</p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 0: Session type ────────────────────────────────────────────────────

function StepSessionType({ sessionType, setSessionType }) {
  return (
    <div>
      <h2 style={s.stepHeading}>What size is your piece?</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {SESSION_TYPES.map(t => {
          const selected = sessionType === t.value;
          return (
            <button
              key={t.value}
              style={{ ...s.sessionCard, ...(selected ? s.sessionCardActive : {}) }}
              onClick={() => setSessionType(t.value)}
            >
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ ...s.sessionCardLabel, ...(selected ? { color: '#000' } : {}) }}>{t.label}</div>
                <div style={{ ...s.sessionCardDesc, ...(selected ? { color: 'rgba(0,0,0,0.55)' } : {}) }}>{t.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {t.size && <div style={{ ...s.sessionCardMeta, ...(selected ? { color: 'rgba(0,0,0,0.65)' } : {}) }}>{t.size}</div>}
                <div style={{ ...s.sessionCardDuration, ...(selected ? { color: 'rgba(0,0,0,0.4)' } : {}) }}>{t.duration}</div>
              </div>
              <div style={{ ...s.sessionCheckCircle, ...(selected ? s.sessionCheckCircleActive : {}) }}>
                {selected && <span style={{ fontSize: 12, color: '#fff' }}>✓</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Design details ──────────────────────────────────────────────────

function StepDesign({
  designDetails, setDesignDetails, bodyLocations, setBodyLocations,
  colourStyle, setColourStyle, colourDetails, setColourDetails,
  notes, setNotes, photoPreviews, photoFiles, photoInputRef,
  onAddPhoto, onRemovePhoto, showBodyPicker, setShowBodyPicker,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={s.stepHeading}>Tell us about your design</h2>

      {/* Reference photos */}
      <div>
        <div style={s.sectionLabel}>REFERENCE PHOTOS</div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={onAddPhoto}
        />
        {photoPreviews.length === 0 ? (
          <button style={s.photoDropzone} onClick={() => photoInputRef.current?.click()}>
            <span style={s.photoDropzoneIcon}>+</span>
            <span style={s.photoDropzoneText}>Add reference photos</span>
            <span style={s.photoDropzoneSub}>Up to 5 images · Required</span>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {photoPreviews.map((src, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={src} alt="" style={s.photoThumb} />
                <button style={s.photoRemove} onClick={() => onRemovePhoto(i)}>✕</button>
              </div>
            ))}
            {photoFiles.length < 5 && (
              <button style={s.photoAddMore} onClick={() => photoInputRef.current?.click()}>+</button>
            )}
          </div>
        )}
      </div>

      {/* Design description */}
      <div style={s.field}>
        <label style={s.sectionLabel}>DESIGN DESCRIPTION</label>
        <textarea
          style={{ ...s.input, ...s.textarea }}
          placeholder="e.g. Japanese dragon on the upper arm with waves…"
          value={designDetails}
          onChange={e => setDesignDetails(e.target.value)}
          rows={4}
        />
      </div>

      {/* Body placement */}
      <div>
        <div style={s.sectionLabel}>BODY PLACEMENT</div>
        <button style={s.placementBtn} onClick={() => setShowBodyPicker(true)}>
          <span style={bodyLocations.length ? { color: 'var(--main)' } : { color: 'rgba(255,255,255,0.35)' }}>
            {bodyLocations.length ? bodyLocations.join(', ') : 'Select placement…'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>›</span>
        </button>

        {/* Body picker modal */}
        {showBodyPicker && (
          <div style={s.modalOverlay} onClick={() => setShowBodyPicker(false)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <div style={s.modalHeader}>
                <div>
                  <div style={s.modalTitle}>Body Placement</div>
                  <div style={s.modalSub}>Select all that apply</div>
                </div>
                <button
                  style={{ ...s.modalDone, ...(bodyLocations.length === 0 ? { opacity: 0.3, pointerEvents: 'none' } : {}) }}
                  onClick={() => setShowBodyPicker(false)}
                >
                  Done
                </button>
              </div>
              <div style={s.bodyGrid}>
                {BODY_PARTS.map(part => {
                  const selected = bodyLocations.includes(part);
                  return (
                    <button
                      key={part}
                      style={{ ...s.bodyPill, ...(selected ? s.bodyPillActive : {}) }}
                      onClick={() => setBodyLocations(prev =>
                        selected ? prev.filter(p => p !== part) : [...prev, part]
                      )}
                    >
                      {part}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Colour */}
      <div>
        <div style={s.sectionLabel}>COLOUR</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {COLOUR_STYLES.map(c => {
            const selected = colourStyle === c;
            return (
              <button
                key={c}
                style={{ ...s.colourBtn, ...(selected ? s.colourBtnActive : {}) }}
                onClick={() => { setColourStyle(selected ? '' : c); if (c !== 'Color') setColourDetails(''); }}
              >
                {c}
              </button>
            );
          })}
        </div>
        {colourStyle === 'Color' && (
          <input
            style={{ ...s.input, marginTop: 10 }}
            type="text"
            placeholder="e.g. deep red, gold highlights…"
            value={colourDetails}
            onChange={e => setColourDetails(e.target.value)}
          />
        )}
      </div>

      {/* Notes */}
      <div style={s.field}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ ...s.sectionLabel, marginBottom: 0 }}>ADDITIONAL NOTES</label>
          <span style={s.optionalBadge}>Optional</span>
        </div>
        <textarea
          style={{ ...s.input, ...s.textarea }}
          placeholder="Allergies, size constraints, style preferences…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}

// ─── Step 2: Availability ────────────────────────────────────────────────────

function StepAvailability({ availabilityWindows, setAvailabilityWindows, pushToLater, setPushToLater, earliestDate, setEarliestDate, sessionType, artistSchedule }) {
  const st = SESSION_TYPES.find(t => t.value === sessionType);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={s.stepHeading}>When are you available?</h2>

      <div>
        {st && (
          <p style={{ ...s.muted, marginBottom: 4 }}>
            Your {st.label.toLowerCase()} session takes around {st.duration} — drag to select windows that fit.
          </p>
        )}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Drag to select · tap a block to remove it
        </p>
      </div>

      <AvailabilityGrid windows={availabilityWindows} setWindows={setAvailabilityWindows} schedule={artistSchedule} />

      {/* Push to later */}
      <div style={s.pushCard}>
        <div style={{ flex: 1 }}>
          <div style={s.pushTitle}>Push to later</div>
          <div style={s.pushSub}>I'm not available for the next few weeks</div>
        </div>
        <button
          style={{ ...s.toggle, ...(pushToLater ? s.toggleOn : {}) }}
          onClick={() => setPushToLater(p => !p)}
          aria-label="Toggle push to later"
        >
          <div style={{ ...s.toggleThumb, ...(pushToLater ? s.toggleThumbOn : {}) }} />
        </button>
      </div>

      {pushToLater && (
        <div style={s.field}>
          <label style={s.label}>Earliest available date</label>
          <input
            style={s.input}
            type="date"
            value={earliestDate}
            onChange={e => setEarliestDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      )}
    </div>
  );
}

// ─── Availability grid (drag-to-select, schedule-aware, matches mobile) ─────

function AvailabilityGrid({ windows, setWindows, schedule }) {
  const [drag, setDrag] = useState(null);

  // Build per-day schedule map: { [day_of_week]: {start_time, end_time} }
  const scheduleMap = {};
  (schedule || []).forEach(e => { scheduleMap[e.day_of_week] = e; });
  const hasSchedule = Object.keys(scheduleMap).length > 0;

  // Derive time range from schedule (default 9–19)
  const allEntries = Object.values(scheduleMap);
  const startHour = hasSchedule
    ? Math.min(...allEntries.map(e => parseInt(e.start_time, 10)))
    : 9;
  const endHour = hasSchedule
    ? Math.max(...allEntries.map(e => {
        const [h, m] = e.end_time.split(':').map(Number);
        return h + (m > 0 ? 1 : 0);
      }))
    : 19;
  const totalSlots = (endHour - startHour) * (60 / AV_SLOT_MINS);

  function slotToTime(slot) {
    const mins = startHour * 60 + slot * AV_SLOT_MINS;
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  function timeToSlot(time) {
    const [h, m] = (time || '00:00').split(':').map(Number);
    return (h - startHour) * (60 / AV_SLOT_MINS) + Math.floor((m || 0) / AV_SLOT_MINS);
  }
  function commitDrag(wins, dayOfWeek, startSlot, endSlot) {
    const lo = Math.min(startSlot, endSlot);
    const hi = Math.max(startSlot, endSlot) + 1;
    const touching = wins.filter(w =>
      w.dayOfWeek === dayOfWeek && (
        timeToSlot(w.endTime) === lo || timeToSlot(w.startTime) === hi ||
        (timeToSlot(w.startTime) < hi && timeToSlot(w.endTime) > lo)
      )
    );
    const mergedLo = touching.reduce((acc, w) => Math.min(acc, timeToSlot(w.startTime)), lo);
    const mergedHi = touching.reduce((acc, w) => Math.max(acc, timeToSlot(w.endTime)), hi);
    const remaining = wins.filter(w => !(
      w.dayOfWeek === dayOfWeek && (
        timeToSlot(w.endTime) === lo || timeToSlot(w.startTime) === hi ||
        (timeToSlot(w.startTime) < hi && timeToSlot(w.endTime) > lo)
      )
    ));
    return [...remaining, { dayOfWeek, startTime: slotToTime(mergedLo), endTime: slotToTime(mergedHi) }];
  }

  function clampToArtistRange(slot, dayOfWeek) {
    const sched = scheduleMap[dayOfWeek];
    if (!sched) return slot;
    const artistStart = timeToSlot(sched.start_time);
    const artistEnd = timeToSlot(sched.end_time);
    return Math.max(artistStart, Math.min(artistEnd - 1, slot));
  }

  function getSlotFromY(y) {
    return Math.max(0, Math.min(totalSlots - 1, Math.floor(y / AV_SLOT_H)));
  }

  function onColPointerDown(e, dayIndex, dayOfWeek, colEl) {
    e.preventDefault();
    colEl.setPointerCapture?.(e.pointerId);
    const rect = colEl.getBoundingClientRect();
    const slot = clampToArtistRange(getSlotFromY(e.clientY - rect.top), dayOfWeek);
    const insideBlock = windows.some(w =>
      w.dayOfWeek === dayOfWeek &&
      timeToSlot(w.startTime) <= slot && timeToSlot(w.endTime) > slot
    );
    setDrag({ dayIndex, dayOfWeek, startSlot: slot, currentSlot: slot, isDelete: insideBlock });
  }

  function onColPointerMove(e, dayIndex, colEl) {
    if (!drag || drag.dayIndex !== dayIndex || drag.isDelete) return;
    e.preventDefault();
    const rect = colEl.getBoundingClientRect();
    const slot = clampToArtistRange(getSlotFromY(e.clientY - rect.top), drag.dayOfWeek);
    setDrag(d => d ? { ...d, currentSlot: slot } : null);
  }

  function onColPointerUp(e, dayIndex, dayOfWeek) {
    if (!drag || drag.dayIndex !== dayIndex) return;
    if (drag.isDelete) {
      setWindows(prev => prev.filter(w => !(
        w.dayOfWeek === dayOfWeek &&
        timeToSlot(w.startTime) <= drag.startSlot && timeToSlot(w.endTime) > drag.startSlot
      )));
    } else if (Math.abs(drag.currentSlot - drag.startSlot) < 1) {
      setWindows(prev => prev.filter(w => !(
        w.dayOfWeek === dayOfWeek &&
        timeToSlot(w.startTime) <= drag.startSlot && timeToSlot(w.endTime) > drag.startSlot
      )));
    } else {
      setWindows(prev => commitDrag(prev, dayOfWeek, drag.startSlot, drag.currentSlot));
    }
    setDrag(null);
  }

  const hourTicks = [];
  for (let i = 0; i <= totalSlots; i += 2) {
    const totalMins = startHour * 60 + i * AV_SLOT_MINS;
    const h = Math.floor(totalMins / 60);
    hourTicks.push({ slot: i, label: h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm` });
  }

  return (
    <div>
      {/* Day headers */}
      <div style={{ display: 'flex', marginBottom: 6 }}>
        <div style={{ width: AV_TIME_W, flexShrink: 0 }} />
        {DAYS.map((d, i) => {
          const dow = DAY_VALUES[i];
          const isOpen = !hasSchedule || !!scheduleMap[dow];
          return (
            <div key={d} style={{
              flex: 1, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
              color: isOpen ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.2)',
            }}>
              {d}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', height: totalSlots * AV_SLOT_H, position: 'relative' }}>
        {/* Time labels */}
        <div style={{ width: AV_TIME_W, flexShrink: 0, position: 'relative' }}>
          {hourTicks.map(({ slot, label }) => (
            <div key={slot} style={{
              position: 'absolute', top: slot * AV_SLOT_H - 5, right: 4,
              fontFamily: 'var(--font-body)', fontSize: 8, color: 'rgba(255,255,255,0.4)',
              lineHeight: 1, userSelect: 'none',
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAY_VALUES.map((dayOfWeek, dayIndex) => {
          const sched = scheduleMap[dayOfWeek];
          const isOpen = !hasSchedule || !!sched;
          // Only highlight artist range when day is open AND schedule is configured
          const artistStartSlot = (hasSchedule && sched) ? timeToSlot(sched.start_time) : (isOpen ? 0 : -1);
          const artistEndSlot = (hasSchedule && sched) ? timeToSlot(sched.end_time) : (isOpen ? totalSlots : -1);
          return (
            <AvDayColumn
              key={dayIndex}
              dayIndex={dayIndex}
              dayOfWeek={dayOfWeek}
              windows={windows.filter(w => w.dayOfWeek === dayOfWeek)}
              drag={drag}
              onPointerDown={onColPointerDown}
              onPointerMove={onColPointerMove}
              onPointerUp={onColPointerUp}
              totalSlots={totalSlots}
              timeToSlot={timeToSlot}
              isOpen={isOpen}
              artistStartSlot={artistStartSlot}
              artistEndSlot={artistEndSlot}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(255,255,255,0.85)' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Your selection</span>
        </div>
        {hasSchedule && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(255,255,255,0.12)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Artist available</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AvDayColumn({ dayIndex, dayOfWeek, windows, drag, onPointerDown, onPointerMove, onPointerUp, totalSlots, timeToSlot, isOpen, artistStartSlot, artistEndSlot }) {
  const colRef = useRef(null);
  const isDragging = drag?.dayIndex === dayIndex && !drag.isDelete;
  const dragLo = isDragging ? Math.min(drag.startSlot, drag.currentSlot) : -1;
  const dragHi = isDragging ? Math.max(drag.startSlot, drag.currentSlot) : -1;

  const slots = Array.from({ length: totalSlots }, (_, i) => i);

  return (
    <div
      ref={colRef}
      style={{
        flex: 1, position: 'relative',
        touchAction: 'none', userSelect: 'none',
        cursor: isOpen ? 'crosshair' : 'default',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
      onPointerDown={e => colRef.current && onPointerDown(e, dayIndex, dayOfWeek, colRef.current)}
      onPointerMove={e => colRef.current && onPointerMove(e, dayIndex, colRef.current)}
      onPointerUp={e => onPointerUp(e, dayIndex, dayOfWeek)}
    >
      {/* Slot background rows — match iOS: 0.09 for artist range, 0.02 otherwise */}
      {slots.map(slot => {
        const inArtistRange = isOpen && slot >= artistStartSlot && slot < artistEndSlot;
        return (
          <div key={slot} style={{
            position: 'absolute', top: slot * AV_SLOT_H, left: 1, right: 1, height: AV_SLOT_H,
            background: inArtistRange ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.02)',
            borderTop: slot % 2 === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
          }} />
        );
      })}

      {/* Committed windows */}
      {windows.map((w, i) => {
        const top = timeToSlot(w.startTime) * AV_SLOT_H;
        const height = (timeToSlot(w.endTime) - timeToSlot(w.startTime)) * AV_SLOT_H;
        return (
          <div key={i} style={{
            position: 'absolute', top, left: 2, right: 2, height: Math.max(AV_SLOT_H, height),
            background: 'rgba(255,255,255,0.88)', borderRadius: 4, pointerEvents: 'none',
          }} />
        );
      })}

      {/* Drag preview */}
      {isDragging && dragLo >= 0 && (
        <div style={{
          position: 'absolute',
          top: dragLo * AV_SLOT_H, left: 2, right: 2,
          height: (dragHi - dragLo + 1) * AV_SLOT_H,
          background: 'rgba(255,255,255,0.4)', borderRadius: 4, pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

// ─── Step 3: Contact info ────────────────────────────────────────────────────

function StepContact({ name, setName, email, setEmail, phone, setPhone }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <h2 style={{ ...s.stepHeading, marginBottom: 8 }}>Your contact details</h2>
      <p style={{ ...s.muted, marginBottom: 24 }}>We need your details to confirm the booking.</p>

      <div style={s.contactGroup}>
        <div style={s.contactRow}>
          <span style={s.contactIcon}>👤</span>
          <span style={s.contactFieldLabel}>Name</span>
          <input
            style={s.contactInput}
            type="text"
            placeholder="Jane Smith"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div style={s.contactDivider} />
        <div style={s.contactRow}>
          <span style={s.contactIcon}>✉</span>
          <span style={s.contactFieldLabel}>Email</span>
          <input
            style={s.contactInput}
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div style={s.contactDivider} />
        <div style={s.contactRow}>
          <span style={s.contactIcon}>📞</span>
          <span style={s.contactFieldLabel}>Phone</span>
          <input
            style={s.contactInput}
            type="tel"
            placeholder="+1 555 0100"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Review ──────────────────────────────────────────────────────────

function StepReview({ sessionType, designDetails, bodyLocations, colourStyle, colourDetails, notes, photoPreviews, availabilityWindows, pushToLater, earliestDate, name, email, phone }) {
  const st = SESSION_TYPES.find(t => t.value === sessionType);
  const colourValue = colourStyle === 'Color' && colourDetails ? `Color — ${colourDetails}` : colourStyle;

  function ReviewGroup({ title, rows }) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...s.sectionLabel, marginBottom: 8 }}>{title}</div>
        <div style={s.reviewGroup}>
          {rows.map((row, i) => row && (
            <div key={i}>
              {i > 0 && <div style={s.reviewDivider} />}
              <div style={s.reviewRow}>
                <span style={s.reviewLabel}>{row.label}</span>
                <span style={s.reviewValue}>{row.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ ...s.stepHeading, marginBottom: 20 }}>Review your request</h2>

      {/* Session type */}
      {st && (
        <div style={{ ...s.reviewGroup, marginBottom: 16 }}>
          <div style={s.reviewRow}>
            <span style={s.reviewLabel}>Session</span>
            <span style={s.reviewValue}>{st.label} · {st.duration}</span>
          </div>
        </div>
      )}

      <ReviewGroup title="DESIGN" rows={[
        { label: 'Details', value: designDetails },
        { label: 'Placement', value: bodyLocations.join(', ') },
        colourValue && { label: 'Colour', value: colourValue },
        notes && { label: 'Notes', value: notes },
      ].filter(Boolean)} />

      {photoPreviews.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...s.sectionLabel, marginBottom: 8 }}>PHOTOS</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {photoPreviews.map((src, i) => (
              <img key={i} src={src} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
            ))}
          </div>
        </div>
      )}

      <ReviewGroup title="AVAILABILITY" rows={[
        ...availabilityWindows.map(w => {
          const dayIdx = DAY_VALUES.indexOf(w.dayOfWeek);
          const day = DAYS[dayIdx] ?? '?';
          return { label: day, value: `${w.startTime}–${w.endTime}` };
        }),
        pushToLater && earliestDate && { label: 'Earliest', value: earliestDate },
      ].filter(Boolean)} />

      <ReviewGroup title="CONTACT" rows={[
        { label: 'Name', value: name },
        { label: 'Email', value: email },
        phone && { label: 'Phone', value: phone },
      ].filter(Boolean)} />
    </div>
  );
}

// ─── Page wrapper ────────────────────────────────────────────────────────────

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="booking-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.6)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  pageInner: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 20px 80px',
  },
  card: {
    width: '100%',
    maxWidth: 520,
  },
  spinner: {
    width: 28, height: 28,
    border: '2px solid rgba(255,255,255,0.12)',
    borderTopColor: 'rgba(255,255,255,0.6)',
    borderRadius: '50%',
  },
  artistHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  avatar: {
    width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
  },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarInitial: {
    fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
    fontFamily: 'var(--font-heading)',
  },
  artistName: {
    fontFamily: 'var(--font-heading)',
    fontSize: 17, fontWeight: 700,
    color: 'var(--main)', letterSpacing: 0.2,
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontSize: 26, fontWeight: 700,
    color: 'var(--main)', margin: '0 0 10px', lineHeight: 1.25,
  },
  muted: {
    fontFamily: 'var(--font-body)',
    fontSize: 15, color: 'rgba(255,255,255,0.45)',
    margin: '0 0 20px', lineHeight: 1.65,
  },
  wordmarkFooter: {
    fontFamily: 'var(--font-heading)',
    fontSize: 12, fontWeight: 700, letterSpacing: 5,
    color: 'rgba(255,255,255,0.15)', marginTop: 48, textAlign: 'center',
  },

  // Auth
  appCta: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12, padding: '13px 16px',
    textDecoration: 'none', color: 'var(--main)',
    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
  },
  appCtaIcon: { width: 32, height: 32, borderRadius: 8, flexShrink: 0 },
  authDivider: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 20px' },
  authDividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' },
  authDividerLabel: { fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' },
  tabs: {
    display: 'flex', background: 'rgba(255,255,255,0.05)',
    borderRadius: 10, padding: 3, marginBottom: 24,
  },
  tab: {
    flex: 1, padding: '9px 0', background: 'transparent', border: 'none',
    borderRadius: 8, color: 'rgba(255,255,255,0.4)',
    fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer',
  },
  tabActive: { background: 'rgba(255,255,255,0.1)', color: 'var(--main)' },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: {
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
    color: 'rgba(255,255,255,0.55)', letterSpacing: 0.2,
  },
  sectionLabel: {
    fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
    letterSpacing: 1.4, color: 'rgba(255,255,255,0.3)', marginBottom: 8, display: 'block',
  },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
    // iOS Safari auto-zooms on focus for inputs under 16px; keep at/above it
    // so the zoom doesn't carry over into later client-side-routed steps.
    padding: '12px 14px', color: 'var(--main)', fontSize: 16,
    fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
  },
  textarea: { resize: 'vertical', minHeight: 80 },
  consentLabel: {
    display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 13,
    color: 'rgba(255,255,255,0.45)', lineHeight: 1.5,
  },
  checkbox: {
    width: 16, height: 16, minWidth: 16,
    accentColor: 'white', cursor: 'pointer',
    marginTop: 2, flexShrink: 0,
    padding: 0, border: 'none', background: 'none', borderRadius: 0,
  },
  consentLink: { color: 'rgba(255,255,255,0.7)', textDecoration: 'underline', textUnderlineOffset: 2 },
  error: {
    fontFamily: 'var(--font-body)', fontSize: 14,
    color: 'rgba(255,100,100,0.85)', margin: 0,
    padding: '10px 14px', background: 'rgba(255,60,60,0.08)',
    borderRadius: 8, border: '1px solid rgba(255,60,60,0.15)',
  },
  submitBtn: {
    width: '100%', padding: '15px 0',
    background: 'var(--main)', color: 'var(--background)',
    border: 'none', borderRadius: 50, fontSize: 16, fontWeight: 600,
    fontFamily: 'var(--font-body)', cursor: 'pointer',
  },
  submitBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },

  // Progress header
  progressHeader: { marginBottom: 0 },
  progressTop: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, position: 'relative',
  },
  backBtn: {
    width: 32, height: 32, background: 'none', border: 'none',
    color: 'rgba(255,255,255,0.5)', fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, flexShrink: 0,
  },
  stepTitle: {
    fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
    color: 'var(--main)', position: 'absolute', left: '50%', transform: 'translateX(-50%)',
  },
  stepDots: { display: 'flex', gap: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' },
  dotActive: { width: 7, height: 7, background: 'rgba(255,255,255,1)' },
  dotDone: { background: 'rgba(255,255,255,0.45)' },
  progressTrack: { height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--main)', borderRadius: 2, transition: 'width 0.3s ease' },
  stepHeading: {
    fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700,
    color: 'var(--main)', margin: 0, lineHeight: 1.3,
  },

  // Session type cards
  sessionCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', width: '100%', textAlign: 'left',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, cursor: 'pointer',
  },
  sessionCardActive: { background: '#fff', border: '1px solid #fff' },
  sessionCardLabel: { fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--main)' },
  sessionCardDesc: { fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  sessionCardMeta: { fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' },
  sessionCardDuration: { fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  sessionCheckCircle: {
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    border: '1.5px solid rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sessionCheckCircleActive: { background: 'rgba(0,0,0,0.7)', border: 'none' },

  // Photos
  photoDropzone: {
    width: '100%', border: '1px dashed rgba(255,255,255,0.2)',
    borderRadius: 12, padding: '28px 20px',
    background: 'rgba(255,255,255,0.03)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    cursor: 'pointer',
  },
  photoDropzoneIcon: { fontSize: 28, color: 'rgba(255,255,255,0.3)' },
  photoDropzoneText: { fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.45)' },
  photoDropzoneSub: { fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.25)' },
  photoThumb: { width: 88, height: 88, borderRadius: 10, objectFit: 'cover', display: 'block' },
  photoRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: '50%',
    background: 'rgba(0,0,0,0.75)', border: 'none',
    color: '#fff', fontSize: 10, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  photoAddMore: {
    width: 88, height: 88, borderRadius: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px dashed rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.45)', fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Body picker modal
  modalOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    width: '100%', maxWidth: 520,
    background: '#141820', borderRadius: '20px 20px 0 0',
    maxHeight: '70vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  modalTitle: { fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--main)' },
  modalSub: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  modalDone: { fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--main)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' },
  bodyGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
    padding: 20, overflowY: 'auto',
  },
  bodyPill: {
    padding: '11px 8px', borderRadius: 12,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
  },
  bodyPillActive: { background: '#fff', border: '1px solid #fff', color: '#000', fontWeight: 600 },

  // Colour
  placementBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 14px', width: '100%',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14,
  },
  colourBtn: {
    flex: 1, padding: '11px 0',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, color: 'rgba(255,255,255,0.65)',
    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  colourBtnActive: { background: '#fff', border: '1px solid #fff', color: '#000', fontWeight: 600 },
  optionalBadge: {
    fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
    color: 'rgba(255,255,255,0.25)',
    padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 50,
    letterSpacing: 0.3,
  },

  // Availability
  pushCard: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '14px 16px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
  },
  pushTitle: { fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--main)' },
  pushSub: { fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  toggle: {
    width: 44, height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.15)',
    border: 'none', cursor: 'pointer', padding: 3, flexShrink: 0,
    display: 'flex', alignItems: 'center', transition: 'background 0.2s',
  },
  toggleOn: { background: 'var(--main)' },
  toggleThumb: {
    width: 20, height: 20, borderRadius: '50%', background: '#fff',
    transition: 'transform 0.2s', transform: 'translateX(0)',
  },
  toggleThumbOn: { transform: 'translateX(18px)' },

  // Contact group
  contactGroup: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, overflow: 'hidden',
  },
  contactRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px',
  },
  contactIcon: { fontSize: 13, flexShrink: 0, width: 18, textAlign: 'center', opacity: 0.45 },
  contactFieldLabel: {
    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
    color: 'rgba(255,255,255,0.45)', width: 46, flexShrink: 0,
  },
  contactInput: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: 'var(--main)', fontFamily: 'var(--font-body)', fontSize: 14,
    textAlign: 'right', minWidth: 0,
  },
  contactDivider: { height: 1, background: 'rgba(255,255,255,0.07)', marginLeft: 46 },

  // Review
  reviewGroup: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, overflow: 'hidden',
  },
  reviewDivider: { height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 14px' },
  reviewRow: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 14px',
  },
  reviewLabel: {
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
    color: 'rgba(255,255,255,0.4)', width: 70, flexShrink: 0,
  },
  reviewValue: {
    fontFamily: 'var(--font-body)', fontSize: 13,
    color: 'rgba(255,255,255,0.85)', flex: 1, wordBreak: 'break-word',
  },

  // Success
  successIcon: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(50,200,100,0.12)', border: '1px solid rgba(50,200,100,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, color: 'rgba(50,200,100,0.9)', marginBottom: 20,
  },
  appCard: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14, padding: '18px 18px', marginBottom: 4,
  },
  appCardIcon: {
    width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-heading)',
    color: 'var(--main)', flexShrink: 0, letterSpacing: 2,
  },
  appCardTitle: { fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--main)', marginBottom: 8 },
  appCardFeature: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75 },
};
