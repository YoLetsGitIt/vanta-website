'use client';

import DateOfBirthInput from '@/components/DateOfBirthInput';
import { resolveBookingArtist, subdomainReference } from '../../lib/booking-artist.mjs';
import { flashBookingState, flashNotice, flashPrefill, flashPriceLabel, isFlashReference } from '../../lib/booking-flash.mjs';
import { bookingStudios, scheduleForStudio, windowsFitSchedule } from '../../lib/booking-studios.mjs';
import { formQuestion, parsePreviewForm } from '../../lib/booking-form.mjs';
import { depositCharge, money, payWays, BOOKING_FEE_NOTE } from '../../lib/booking-fee.mjs';
import { formatLength, formatMoney, formatWhen, paymentReturn, returnURL } from '../../lib/booking-instant.mjs';
import InstantTimePicker from '../../components/InstantTimePicker';
import AppPromo from '../../components/AppPromo';
import { COUNTRIES, DEFAULT_COUNTRY, fullPhone, joinName, splitName, splitPhone, validEmail, validPhone } from '../../lib/booking-contact.mjs';
import { offeredTypes, sessionTypeFor } from '../../lib/booking-types.mjs';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { websiteAuth, createAccountAndSignIn } from '../../lib/website-auth';
import SocialSignIn from '../../components/SocialSignIn';
import BrandLoader, { Wordmark } from '../../components/BrandLoader';

const REMEMBERED_CONTACT_KEY = 'vanta-booking-contact';
const BACKEND_URL = process.env.NEXT_PUBLIC_BOOKING_API_URL || 'https://inkspire-backend-xa2a.onrender.com';

const supabase = websiteAuth();

const PIERCING_PLACEMENTS = ['Earlobe', 'Helix', 'Tragus', 'Conch', 'Daith', 'Rook', 'Industrial', 'Nostril', 'Septum', 'Eyebrow', 'Lip', 'Tongue', 'Navel', 'Nipple', 'Other'];

const SESSION_TYPES = [
  { value: 'piercing', label: 'Piercing', desc: 'Piercing placement and jewellery', duration: '30–60 min', size: null },
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

const COLOUR_STYLES = ['Black & Grey', 'Color'];
// The same choices as a studio's booking form on Vanta Studio.
const SKIN_TONES = ['Very light', 'Light', 'Medium', 'Olive', 'Brown', 'Dark'];
// Saved values stay as the backend expects; people see these labels.
const colourLabel = value => ({ 'Black & Grey': 'Black & grey', Color: 'Colour' }[value] || value);

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
  // On an artist's own address (matthew.vanta.tattoo) the artist comes from the address.
  const [hostReference] = useState(() => (typeof window === 'undefined' ? '' : subdomainReference(window.location.hostname)));
  const artistReference = searchParams.get('artist') || hostReference || null;
  const flashReference = searchParams.get('flash');
  // The artist previewing unsaved choices from the app: their questions, nothing sent.
  const [previewForm] = useState(() => parsePreviewForm(searchParams.get('preview_form')));
  const previewing = Boolean(previewForm);
  // A flash post shared with ?flash=<id>: attached to the request like "Book this flash" in the app.
  const [flash, setFlash] = useState(null);
  const [flashMessage, setFlashMessage] = useState('');
  const [artistId, setArtistId] = useState(null);

  const [artist, setArtist] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const [session, setSession] = useState(null);
  // Like Acuity: clients book straight away, no account needed. Signing in is optional
  // (?signin=1, so the browser Back button returns to the form); a session takes precedence.
  const guest = searchParams.get('signin') !== '1';
  const setGuest = on => {
    const url = new URL(window.location.href);
    url.searchParams.delete('guest');
    if (on) url.searchParams.delete('signin'); else url.searchParams.set('signin', '1');
    window.history.pushState(null, '', url);
  };
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [contactDob, setContactDob] = useState('');
  const [view, setView] = useState('loading'); // loading|auth|form|success|error|payment

  // Instant booking: the artist's open times, booked by paying the deposit.
  const [instantInfo, setInstantInfo] = useState(null);
  const [instantType, setInstantType] = useState('');
  // What GET /instant-booking says about the place being booked, whether or not it takes
  // instant bookings: its appointment types are offered for requests too.
  const [placeInfo, setPlaceInfo] = useState(null);
  // The artist's appointment type the client chose (instant booking or a request).
  const [appointmentTypeId, setAppointmentTypeId] = useState('');
  // Each studio's details, loaded while the client is still on the first step.
  const placeCache = useRef({});
  const [instantStart, setInstantStart] = useState('');
  // Back from payment: { result, booking, token, state: checking|booked|waiting|closed|released, ... }
  const [payment, setPayment] = useState(null);
  // Booked here wherever the artist takes it, including a studio on Vanta Studio: the
  // booking is passed to that studio and the client stays on this page.
  const instantMode = Boolean(instantInfo?.available);
  const instantChoice = instantMode ? instantInfo.types.find(t => t.id === instantType) : null;
  useEffect(() => {
    if (session) return;
    if (guest && view === 'auth') setView('form');
    if (!guest && view === 'form') setView('auth');
  }, [guest, session, view]);
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
  const isPiercing = sessionType === 'piercing';

  // Step 1 – design
  const [designDetails, setDesignDetails] = useState('');
  const [bodyLocations, setBodyLocations] = useState([]);
  // Asked when the artist's form (or the studio's) has them on.
  const [tattooSize, setTattooSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState('cm');
  const [skinTone, setSkinTone] = useState('');
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
  const [selectedStudioId, setSelectedStudioId] = useState('');
  const studios = bookingStudios(artist);
  const selectedStudio = studios.find(studio => studio.id === selectedStudioId);
  const studioSchedule = scheduleForStudio(artistSchedule, studios, selectedStudioId);
  const restrictSchedule = studios.length > 0 || artistSchedule.length > 0;
  // An artist at more than one studio: the client picks the studio first, since the
  // studio decides instant booking or request, its hours, deposit and questions.
  const studioStep = studios.length > 1 ? 1 : 0;
  const totalSteps = TOTAL_STEPS + studioStep;
  const page = step - studioStep; // -1 is the studio step
  // The studio whose instant booking details are loaded (or '' while loading).
  const [placeReady, setPlaceReady] = useState('');
  const latestStudio = useRef('');

  // Step 3 – contact
  // First and last name; saved together as one name.
  const [contactFirst, setContactFirst] = useState('');
  const [contactLast, setContactLast] = useState('');
  const contactName = joinName(contactFirst, contactLast);
  // Accepts a full name (or an updater), as prefills give one.
  function setContactName(update) {
    const next = typeof update === 'function' ? update(contactName) : update;
    if (next === contactName) return;
    const parts = splitName(next);
    setContactFirst(parts.first);
    setContactLast(parts.last);
  }
  const [contactEmail, setContactEmail] = useState('');
  // Phone: the country code and the number typed; saved as "+61 412 345 678".
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const contactPhone = fullPhone(phoneCountry, phoneNumber);
  // Accepts a saved phone (or an updater), as prefills give one.
  function setContactPhone(update) {
    const next = typeof update === 'function' ? update(contactPhone) : update;
    if (next === contactPhone) return;
    const parts = splitPhone(next);
    setPhoneCountry(parts.code);
    setPhoneNumber(parts.number);
  }
  // "Send me SMS reminders", ticked unless the client unticks it. It becomes their setting.
  const [smsReminders, setSmsReminders] = useState(true);
  // "Create a Vanta account with these details", ticked like the reminders box; needs a password.
  const [createAccount, setCreateAccount] = useState(true);
  const [accountPassword, setAccountPassword] = useState('');
  // The booking's studio has its own booking form: ask the questions it asks.
  const [studioForm, setStudioForm] = useState(null);
  // The artist's own booking form: which questions they ask (Settings > Your forms).
  const [artistForm, setArtistForm] = useState(null);
  const [allergies, setAllergies] = useState('');
  const [homeAddress, setHomeAddress] = useState('');

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
    if (!artistReference) { setView('error'); return; }
    const controller = new AbortController();
    let active = true;
    setView('loading');
    setArtistId(null);

    async function init() {
      const resolvedArtistId = await resolveBookingArtist(artistReference, BACKEND_URL, fetch, controller.signal);
      const [artistData, refData, scheduleData, { data: { session } }, flashPost, instant, formData] = await Promise.all([
        fetch(`${BACKEND_URL}/artists/${resolvedArtistId}`, { signal: controller.signal }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${BACKEND_URL}/artists/${resolvedArtistId}/referral-code`, { signal: controller.signal }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch(`${BACKEND_URL}/artists/${resolvedArtistId}/work-schedule`, { signal: controller.signal }).then(r => r.ok ? r.json() : { schedule: [] }).catch(() => ({ schedule: [] })),
        supabase.auth.getSession(),
        isFlashReference(flashReference)
          ? fetch(`${BACKEND_URL}/tattoos/${flashReference.trim()}`, { signal: controller.signal, cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),
        fetch(`${BACKEND_URL}/artists/${resolvedArtistId}/instant-booking`, { signal: controller.signal, cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${BACKEND_URL}/artists/${resolvedArtistId}/booking-form`, { signal: controller.signal, cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (!active) return;
      if (!artistData || artistData.error) { setView('error'); return; }
      if (flashReference) {
        const state = flashBookingState(flashPost, resolvedArtistId);
        if (state.status === 'ok') {
          const prefill = flashPrefill(state.post);
          setFlash(state.post);
          setFlashMessage('');
          setDesignDetails(prefill.designDetails);
          setBodyLocations(prefill.bodyLocations);
          setColourStyle(prefill.colourStyle);
          setColourDetails(prefill.colourDetails);
        } else {
          setFlash(null);
          setFlashMessage(flashNotice(state, artistData.name));
        }
      }
      setArtistId(resolvedArtistId);
      setArtist(artistData);
      const locations = bookingStudios(artistData);
      setSelectedStudioId(locations.length === 1 ? locations[0].id : '');
      setAvailabilityWindows([]);
      setPushToLater(false);
      setEarliestDate('');
      setReferralCode(refData?.referral_code || null);
      const sched = scheduleData?.schedule || [];
      setArtistSchedule(sched);
      setInstantInfo(instant);
      setPlaceInfo(instant);
      setArtistForm(previewForm || formData?.fields || null);
      // Several studios: load each one now, so choosing one on the first step is instant.
      if (locations.length > 1) {
        placeCache.current = {};
        for (const place of locations) {
          placeCache.current[place.id] = fetch(`${BACKEND_URL}/artists/${resolvedArtistId}/instant-booking?studio_id=${encodeURIComponent(place.id)}`, { cache: 'no-store' })
            .then(r => (r.ok ? r.json() : null)).catch(() => null);
        }
      }
      const back = paymentReturn(new URLSearchParams(window.location.search));
      if (back) { setPayment({ ...back, state: 'checking' }); setView('payment'); if (session) setSession(session); return; }
      if (session) { setSession(session); prefillContact(session); setView('form'); }
      else { prefillRemembered(); setView(guest ? 'form' : 'auth'); }
    }
    init().catch(err => {
      if (!active) return;
      if (err?.redirectTo) { window.location.replace(err.redirectTo); return; }
      setView('error');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      // Covers email-confirmation redirects and any other path that establishes
      // a session outside handleAuth (which already calls this itself).
      if (event === 'SIGNED_IN') createProfile(session, '');
      setSession(session); prefillContact(session);
      setView(current => current === 'auth' ? 'form' : current);
    });
    return () => { active = false; controller.abort(); subscription.unsubscribe(); };
  }, [artistReference, flashReference]);

  // A returning guest's details, saved on this device after their last booking.
  function prefillRemembered() {
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBERED_CONTACT_KEY) || 'null');
      if (!saved) return;
      setContactName(n => n || saved.name || '');
      setContactEmail(e => e || saved.email || '');
      setContactPhone(p => p || saved.phone || '');
      setContactDob(d => d || saved.dob || '');
    } catch {}
  }

  async function prefillContact(session) {
    const meta = session.user?.user_metadata;
    setContactName(n => n || meta?.full_name || '');
    setContactEmail(e => e || session.user?.email || '');
    try {
      const res = await fetch(`${BACKEND_URL}/auth/users/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const profile = await res.json();
        if (profile.phone) setContactPhone(p => p || profile.phone);
      }
    } catch {}
    try {
      const response = await fetch(`${BACKEND_URL}/auth/users/me/contact-email`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      if (response.ok) {
        const { contact_email } = await response.json();
        if (contact_email) setContactEmail(current => !current || current === session.user?.email ? contact_email : current);
      }
    } catch {}
  }

  useEffect(() => {
    function updateContact(event) {
      if (event.detail?.userId !== session?.user?.id || !event.detail?.email) return;
      setContactEmail(current => !current || current === session.user?.email ? event.detail.email : current);
    }
    window.addEventListener('vanta:contact-email-updated', updateContact);
    return () => window.removeEventListener('vanta:contact-email-updated', updateContact);
  }, [session?.user?.id]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function createProfile(session, name, code = '', complete = false) {
    try {
      const profileResponse = await fetch(`${BACKEND_URL}/auth/users/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: name || 'User', accountType: 'user', termsAcceptedVersion: '1.0' }),
      });
      if (profileResponse.ok && complete) await fetch(`${BACKEND_URL}/referral/signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
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
        // Idempotent on the backend (returns the existing profile if one's already
        // there) -- covers a returning client whose profile never got created,
        // e.g. because the signup-time call below failed silently.
        await createProfile(data.session, '', '', true);
        setSession(data.session);
        prefillContact(data.session);
        setView('form');
      } else {
        let session;
        try {
          session = await createAccountAndSignIn({ email: authEmail, password: authPassword, name: authName });
        } catch (err) {
          if (err.code === 'exists') setAuthMode('login');
          throw err;
        }
        await createProfile(session, authName, referralCode || '', true);
        await patchReferralSource(session, 'artist');
        setContactName(authName || '');
        setContactEmail(authEmail);
        setSession(session);
        setView('form');
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
    switch (page) {
      case -1: return Boolean(selectedStudio) && placeReady === selectedStudio.id;
      case 0: return types.length ? Boolean(chosenType) && !!sessionType : !!sessionType;
      // A piercing always needs its details and placement; a tattoo what the form requires.
      case 1: return (isPiercing ? designDetails.trim() : (!needs('design_details') || designDetails.trim())) &&
        (isPiercing ? bodyLocations.length > 0 : (!needs('body_location') || bodyLocations.length > 0)) &&
        (isPiercing || !needs('size') || tattooSize.trim()) &&
        (isPiercing || !needs('skin_tone') || skinTone) &&
        (isPiercing || !needs('color') || colourStyle) &&
        (isPiercing || !needs('image_paths') || photoFiles.length > 0) &&
        (!needs('notes') || notes.trim());
      case 2: if (instantMode) return Boolean(instantChoice && instantStart);
        return (!studios.length || !!selectedStudio) && (
          !asks('availability_windows') ||
          windowsFitSchedule(availabilityWindows, studioSchedule, restrictSchedule) || (pushToLater && earliestDate) ||
          (!needs('availability_windows') && !availabilityWindows.length));
      case 3: return contactFirst.trim() && contactLast.trim() && validEmail(contactEmail) &&
        (phoneNumber.trim() ? validPhone(phoneCountry, phoneNumber) : !guest) &&
        (!guest || contactDob) &&
        (session || !createAccount || accountPassword.length >= 6) &&
        (!needs('allergies') || allergies.trim()) && (!needs('address') || homeAddress.trim());
      default: return true;
    }
  }

  // The artist's appointment types at this place (empty: the standard sizes).
  const types = offeredTypes(instantMode ? instantInfo : placeInfo, instantMode);
  const chosenType = types.find(t => t.id === appointmentTypeId) || null;
  function chooseType(type) {
    setAppointmentTypeId(type.id);
    const size = sessionTypeFor(type, artist?.serviceType);
    if ((sessionType === 'piercing') !== (size === 'piercing')) setBodyLocations([]);
    setSessionType(size);
    if (instantMode && type.id !== instantType) { setInstantType(type.id); setInstantStart(''); }
  }

  // Instant booking at another of the artist's places: its own types, times and deposit.
  async function chooseInstantPlace(studioId) {
    if ((instantInfo?.studio_id || null) === studioId) return;
    const param = studioId || 'personal';
    const next = await fetch(`${BACKEND_URL}/artists/${artistId}/instant-booking?studio_id=${encodeURIComponent(param)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null)).catch(() => null);
    if (!next?.available) { setSubmitError('That place isn\u2019t taking instant bookings right now.'); return; }
    setInstantInfo(next);
    setPlaceInfo(next);
    setInstantType('');
    setAppointmentTypeId('');
    setInstantStart('');
    setSubmitError('');
  }

  // Which studio the booking goes to: the one picked, or the instant booking's place.
  const bookingStudioId = (instantMode ? instantInfo?.studio_id : selectedStudio?.id) || '';
  useEffect(() => {
    if (!bookingStudioId) { setStudioForm(null); return; }
    const controller = new AbortController();
    fetch(`${BACKEND_URL}/studios/${bookingStudioId}/form-config`, { signal: controller.signal, cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null)).then(cfg => setStudioForm(cfg?.fields || null)).catch(() => {});
    return () => controller.abort();
  }, [bookingStudioId]);
  const asks = key => formQuestion(artistForm, studioForm, key).asked;
  const needs = key => formQuestion(artistForm, studioForm, key).required;

  function chooseStudio(id) {
    if (id === selectedStudioId) return;
    setSelectedStudioId(id);
    setAvailabilityWindows([]);
    setPushToLater(false);
    setEarliestDate('');
    setSubmitError('');
  }

  // Studio step: that studio's instant booking and appointment types, loaded when the
  // page opened. Not taking instant bookings there → a request.
  async function chooseBookingStudio(id) {
    if (id === selectedStudioId) return;
    chooseStudio(id);
    latestStudio.current = id;
    setPlaceReady('');
    setInstantType('');
    setInstantStart('');
    setAppointmentTypeId('');
    const loading = placeCache.current[id] || fetch(`${BACKEND_URL}/artists/${artistId}/instant-booking?studio_id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null)).catch(() => null);
    placeCache.current[id] = loading;
    const next = await loading;
    if (latestStudio.current !== id) return; // the client picked another studio meanwhile
    setInstantInfo(next?.available ? next : null);
    setPlaceInfo(next);
    setPlaceReady(id);
  }

  function handleNext() {
    setStepError('');
    if (step < totalSteps - 1) { setStep(s => s + 1); }
    else if (!previewing) { handleSubmit(); }
  }

  function handleBack() {
    setStepError('');
    if (step === 0) { /* can't go back from first step */ } else { setStep(s => s - 1); }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if ((!session && !guest) || !artistId) return;
    const wantsAccount = !session && createAccount;
    if (wantsAccount && accountPassword.length < 6) { setSubmitError('Choose a password of at least 6 characters, or untick "Create a Vanta account".'); return; }
    if (!instantMode && studios.length && !selectedStudio) { setSubmitError('Choose a studio for your booking.'); return; }
    if (!instantMode && availabilityWindows.length && !windowsFitSchedule(availabilityWindows, studioSchedule, restrictSchedule)) {
      setSubmitError('Choose availability within the working hours at your selected studio.'); return;
    }
    setSubmitting(true);
    setSubmitError('');
    setSubmitProgress(0);
    setSubmitPhase('');

    let activeSession = session;
    try {
      // Their account first (instant, no email code), then the booking is made under it.
      if (wantsAccount) {
        setSubmitPhase('Creating your account…');
        try {
          activeSession = await createAccountAndSignIn({ email: contactEmail, password: accountPassword, name: contactName });
        } catch (err) {
          if (err.code === 'exists') throw new Error('You already have a Vanta account with this email. Sign in, or untick "Create a Vanta account" to book as a guest.');
          throw err;
        }
        await createProfile(activeSession, contactName.trim(), referralCode || '', true);
        await patchReferralSource(activeSession, 'artist');
        setSession(activeSession);
      }
      const asGuest = !activeSession;
      let refImages = [];

      if (photoFiles.length > 0) {
        setSubmitPhase('Preparing photos…');
        setSubmitProgress(0.05);

        const signRes = await fetch(`${BACKEND_URL}/bookings/${asGuest ? 'guest/' : ''}uploads/sign`, {
          method: 'POST',
          headers: asGuest ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json', Authorization: `Bearer ${activeSession.access_token}` },
          body: JSON.stringify({
            artist_id: artistId,
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
        ...(selectedStudio && !instantMode ? { studio_id: selectedStudio.id } : {}),
        // Instant: the place the time was picked at (none = the artist's own bookings).
        ...(instantMode && instantInfo.studio_id ? { studio_id: instantInfo.studio_id } : {}),
        requester_name: contactName.trim(),
        requester_email: contactEmail.trim(),
        requester_phone: contactPhone.trim(),
        sms_reminder_opt_in: smsReminders && !!contactPhone.trim(),
        ...(asks('allergies') && allergies.trim() ? { allergies: allergies.trim() } : {}),
        ...(asks('address') && homeAddress.trim() ? { address: homeAddress.trim() } : {}),
        session_type: sessionType,
        design_details: isPiercing || asks('design_details') ? designDetails.trim() : '',
        body_location: isPiercing || asks('body_location') ? bodyLocations.join(', ') : '',
        color: isPiercing || !asks('color') ? undefined : colourValue,
        ...(!isPiercing && asks('size') && tattooSize.trim() ? { size: `${tattooSize.trim()}${sizeUnit}`, size_unit: sizeUnit } : {}),
        ...(!isPiercing && asks('skin_tone') && skinTone ? { skin_tone: skinTone } : {}),
        availability_windows: (asks('availability_windows') ? availabilityWindows : []).map(w => ({
          day_of_week: w.dayOfWeek,
          start_time: w.startTime,
          end_time: w.endTime,
        })),
        push_to_later: pushToLater,
        reference_images: refImages,
        source: 'personal',
        ...(asGuest ? { dob: contactDob } : {}),
        ...(flash ? { flash_tattoo_id: flash.id } : {}),
        // A request for one of the artist's appointment types.
        ...(!instantMode && chosenType ? { appointment_type_id: chosenType.id } : {}),
      };
      if (asks('notes') && notes.trim()) body.additional_notes = notes.trim();
      if (!pushToLater && earliestDate) body.earliest_date = earliestDate;
      if (pushToLater && earliestDate) body.earliest_date = earliestDate;
      if (instantMode) {
        // The picked time instead of availability; the client pays next to lock it in.
        body.availability_windows = [];
        body.push_to_later = false;
        delete body.earliest_date;
        body.instant = { appointment_type_id: instantType, start_time: instantStart, return_url: returnURL(window.location.href) };
        setSubmitPhase('Holding your time…');
      }

      const res = await fetch(`${BACKEND_URL}/bookings${asGuest ? '/guest' : ''}`, {
        method: 'POST',
        headers: asGuest ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json', Authorization: `Bearer ${activeSession.access_token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        clearInterval(ticker);
        const err = await res.json().catch(() => ({}));
        if (instantMode && res.status === 409) {
          // Someone else got the time first: pick another.
          setInstantStart('');
          setStep(2 + studioStep);
          setStepError(err.error || 'That time was just taken. Pick another time.');
          return;
        }
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      clearInterval(ticker);
      const created = await res.json().catch(() => ({}));
      if (instantMode && created.instant?.checkout_url) {
        setSubmitPhase('Opening payment…');
        setSubmitProgress(1);
        window.location.assign(created.instant.checkout_url);
        return;
      }
      setSubmitProgress(1);
      if (asGuest) {
        try {
          localStorage.setItem(REMEMBERED_CONTACT_KEY, JSON.stringify({
            name: contactName.trim(), email: contactEmail.trim(), phone: contactPhone.trim(), dob: contactDob,
          }));
        } catch {}
      }
      setView('success');
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
      setSubmitPhase('');
    }
  }

  // ── Back from payment ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!payment || payment.state !== 'checking') return;
    let live = true;
    const { booking, token, result } = payment;
    if (result === 'cancelled') {
      // They left payment: give the time back straight away.
      fetch(`${BACKEND_URL}/bookings/${booking}/instant-release`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
        .catch(() => {})
        .finally(() => { if (live) setPayment(p => ({ ...p, state: 'released' })); });
      return () => { live = false; };
    }
    // Paid: the payment confirms the booking a moment later.
    let tries = 0;
    async function check() {
      const res = await fetch(`${BACKEND_URL}/bookings/${booking}/instant-status?t=${encodeURIComponent(token)}`, { cache: 'no-store' }).catch(() => null);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (!live) return;
      if (data?.state === 'booked' || data?.state === 'closed') { setPayment(p => ({ ...p, ...data })); return; }
      if (++tries >= 15) { setPayment(p => ({ ...p, ...(data || {}), state: 'waiting' })); return; }
      setTimeout(check, 2000);
    }
    check();
    return () => { live = false; };
  }, [payment]);

  function bookAgain() {
    window.location.assign(returnURL(window.location.href));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (view === 'loading') {
    return (
      <BrandLoader />
    );
  }

  if (view === 'error') {
    return (
      <div className="booking-page" style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={s.card}>
          <p style={{ margin: '0 0 20px' }}><Wordmark size={24} /></p>
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

          {flash && <FlashCard post={flash} />}
          {!flash && flashMessage && view !== 'success' && <p style={s.flashNotice}>{flashMessage}</p>}

          {/* Artists at a Vanta Studio studio are booked instantly through the studio's form. */}
          {/* ── Back from payment ── */}
          {view === 'payment' && payment && (
            <div aria-live="polite">
              {payment.state === 'checking' && (
                <>
                  <h1 style={s.heading}>{payment.result === 'paid' ? 'Confirming your booking…' : 'One moment…'}</h1>
                  <p style={s.muted}>This only takes a few seconds.</p>
                </>
              )}
              {payment.state === 'booked' && (
                <>
                  <div style={s.successIcon}>✓</div>
                  <h1 style={s.heading}>You’re booked in</h1>
                  <p style={s.muted}>
                    {payment.chosen_time && instantInfo?.timezone ? `${formatWhen(payment.chosen_time, instantInfo.timezone)} with ${artist?.name || 'your artist'}. ` : ''}
                    Your deposit is paid and a confirmation is on its way to your email.
                  </p>
                  <AppPromo />
                </>
              )}
              {payment.state === 'waiting' && (
                <>
                  <div style={s.successIcon}>✓</div>
                  <h1 style={s.heading}>Payment received</h1>
                  <p style={s.muted}>We’re confirming your booking now. You’ll get an email as soon as it’s done.</p>
                  <AppPromo />
                </>
              )}
              {payment.state === 'closed' && (
                <>
                  <h1 style={s.heading}>This time is no longer held</h1>
                  <p style={s.muted}>The hold ran out before payment finished, so you haven’t been charged for it. Pick a time again to book.</p>
                  <button type="button" style={{ ...s.submitBtn, marginTop: 8 }} onClick={bookAgain}>Pick a time</button>
                </>
              )}
              {payment.state === 'released' && (
                <>
                  <h1 style={s.heading}>Payment cancelled</h1>
                  <p style={s.muted}>You haven’t been charged and the time wasn’t booked. You can pick a time again whenever you’re ready.</p>
                  <button type="button" style={{ ...s.submitBtn, marginTop: 8 }} onClick={bookAgain}>Book again</button>
                </>
              )}
            </div>
          )}

          {/* ── Auth ── */}
          {view === 'auth' && (
            <>
              <h1 style={s.heading}>Sign in</h1>
              <p style={s.muted}>Optional: your details are filled in for you, and your bookings are in the Vanta app.</p>

              <button type="button" style={{ ...s.submitBtn, marginTop: 4 }} onClick={() => setGuest(true)}>
                Back to booking
              </button>

              <SocialSignIn consentAccepted disabled={authLoading} />
              <p style={{ ...s.muted, fontSize: 12, marginTop: 12 }}>
                By continuing with Apple or Google, you agree to the{' '}
                <a href="https://www.vanta.tattoo/terms" target="_blank" rel="noopener noreferrer" style={s.consentLink}>Terms of Use</a> and{' '}
                <a href="https://www.vanta.tattoo/privacy" target="_blank" rel="noopener noreferrer" style={s.consentLink}>Privacy Policy</a>.
              </p>

              {!showEmailAuth && (
                // One tap each: returning clients go straight to log-in, new ones to sign-up.
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <button type="button" style={{ ...s.emailAuthLink, margin: 0, padding: '0 4px' }} onClick={() => { setAuthMode('login'); setShowEmailAuth(true); }}>
                    Log in with email
                  </button>
                  <span aria-hidden="true" style={{ color: 'rgba(var(--ink-rgb), 0.3)' }}>·</span>
                  <button type="button" style={{ ...s.emailAuthLink, margin: 0, padding: '0 4px' }} onClick={() => { setAuthMode('signup'); setShowEmailAuth(true); }}>
                    Create account
                  </button>
                </div>
              )}

              {showEmailAuth && <>
              <div style={s.authDivider}>
                <div style={s.authDividerLine} />
                <span style={s.authDividerLabel}>or use email</span>
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
              </>}

              <a
                href="https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...s.appCta, marginTop: 24 }}
              >
                <img src="/vanta-app-icon.png" alt="Vanta" style={s.appCtaIcon} />
                <span>Have the Vanta app? Book directly from there</span>
              </a>
            </>
          )}

          {/* ── Multi-step booking form ── */}
          {view === 'form' && (
            <>
              {previewing && (
                <p role="status" style={{ ...s.muted, fontSize: 13, margin: '0 0 16px', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'rgba(var(--ink-rgb), 0.04)' }}>
                  <strong style={{ color: 'var(--main)' }}>Preview</strong> · This is how clients see your booking form. Nothing is sent.
                </p>
              )}
              <h1 style={{ ...s.heading, marginBottom: guest && !session && step === 0 && !previewing ? 12 : 24 }}>{flash ? 'Book this flash' : 'Make a booking'}</h1>
              {guest && !session && step === 0 && !previewing && (
                <p style={{ ...s.muted, fontSize: 14, margin: '0 0 24px' }}>
                  Have a Vanta account?{' '}
                  <button type="button" onClick={() => setGuest(false)} style={{ ...s.emailAuthLink, display: 'inline', margin: 0, minHeight: 0, fontSize: 14 }}>Sign in</button>
                  {' '}to fill in your details.
                </p>
              )}

              {/* Progress header */}
              <div style={s.progressHeader}>
                <div style={s.progressTop}>
                  <button style={s.backBtn} onClick={handleBack} disabled={step === 0}>
                    {step > 0 ? '‹' : ''}
                  </button>
                  <span style={s.stepTitle}>{page === -1 ? 'Studio' : page === 2 && (instantMode || !asks('availability_windows')) ? 'Time' : STEP_TITLES[page]}</span>
                  <div style={s.stepDots}>
                    {Array.from({ length: totalSteps }, (_, i) => (
                      <div key={i} style={{ ...s.dot, ...(i === step ? s.dotActive : i < step ? s.dotDone : {}) }} />
                    ))}
                  </div>
                </div>
                <div style={s.progressTrack}>
                  <div style={{ ...s.progressFill, width: `${step === totalSteps - 1 ? 100 : (step / totalSteps) * 100}%` }} />
                </div>
              </div>

              {/* Step content */}
              <div style={{ marginTop: 28 }}>
                {page === -1 && <StepStudio studios={studios} selectedStudio={selectedStudio} onChoose={chooseBookingStudio} />}
                {page === 0 && types.length > 0 && <StepAppointmentType types={types} chosen={chosenType} onChoose={chooseType} instant={instantMode} />}
                {page === 0 && !types.length && <StepSessionType hideLength={instantMode} services={artist?.serviceType} sessionType={sessionType} setSessionType={type => { if ((sessionType === 'piercing') !== (type === 'piercing')) setBodyLocations([]); setSessionType(type); }} />}
                {page === 1 && (
                  <StepDesign
                    isPiercing={isPiercing}
                    designDetails={designDetails} setDesignDetails={setDesignDetails}
                    bodyLocations={bodyLocations} setBodyLocations={setBodyLocations}
                    colourStyle={colourStyle} setColourStyle={setColourStyle}
                    colourDetails={colourDetails} setColourDetails={setColourDetails}
                    notes={notes} setNotes={setNotes}
                    photoPreviews={photoPreviews} photoFiles={photoFiles}
                    photoInputRef={photoInputRef}
                    onAddPhoto={handlePhotoChange} onRemovePhoto={removePhoto}
                    showBodyPicker={showBodyPicker} setShowBodyPicker={setShowBodyPicker}
                    design={formQuestion(artistForm, studioForm, 'design_details')}
                    placement={formQuestion(artistForm, studioForm, 'body_location')}
                    size={{ ...formQuestion(artistForm, studioForm, 'size'), value: tattooSize, set: setTattooSize, unit: sizeUnit, setUnit: setSizeUnit }}
                    skinTone={{ ...formQuestion(artistForm, studioForm, 'skin_tone'), value: skinTone, set: setSkinTone }}
                    photos={formQuestion(artistForm, studioForm, 'image_paths')}
                    colour={formQuestion(artistForm, studioForm, 'color')}
                    notesQuestion={formQuestion(artistForm, studioForm, 'notes')}
                  />
                )}
                {page === 2 && instantMode && !studioStep && (instantInfo.places?.length || 0) > 1 && (
                  <InstantPlacePicker places={instantInfo.places} current={instantInfo.studio_id || null}
                    artistName={artist?.name} onChoose={chooseInstantPlace} />
                )}
                {page === 2 && instantMode && (
                  <InstantTimePicker key={instantInfo.studio_id || 'personal'} backend={BACKEND_URL} artistId={artistId} info={instantInfo}
                    typeId={instantType} onType={setInstantType} start={instantStart} onStart={setInstantStart} hideTypes />
                )}
                {page === 2 && !instantMode && (
                  <StepAvailability
                    availabilityWindows={availabilityWindows} setAvailabilityWindows={setAvailabilityWindows}
                    pushToLater={pushToLater} setPushToLater={setPushToLater}
                    earliestDate={earliestDate} setEarliestDate={setEarliestDate}
                    sessionType={sessionType} appointment={chosenType}
                    artistSchedule={studioSchedule}
                    studios={studioStep ? [] : studios} selectedStudio={selectedStudio}
                    onChooseStudio={chooseStudio} restrictSchedule={restrictSchedule}
                    availability={formQuestion(artistForm, studioForm, 'availability_windows')} artistName={artist?.name}
                  />
                )}
                {page === 3 && (
                  <StepContact
                    first={contactFirst} setFirst={setContactFirst} last={contactLast} setLast={setContactLast}
                    email={contactEmail} setEmail={setContactEmail}
                    phoneCountry={phoneCountry} setPhoneCountry={setPhoneCountry} phone={phoneNumber} setPhone={setPhoneNumber}
                    smsReminders={smsReminders} setSmsReminders={setSmsReminders}
                    account={session ? null : { on: createAccount, setOn: setCreateAccount, password: accountPassword, setPassword: setAccountPassword }}
                    studioQuestions={{
                      allergies: asks('allergies') ? { value: allergies, set: setAllergies, required: needs('allergies') } : null,
                      address: asks('address') ? { value: homeAddress, set: setHomeAddress, required: needs('address') } : null,
                    }}
                    guest={guest && !session} dob={contactDob} setDob={setContactDob}
                  />
                )}
                {page === 4 && (
                  <StepReview
                    sessionType={sessionType} appointment={chosenType}
                    designDetails={designDetails} bodyLocations={bodyLocations}
                    size={!isPiercing && asks('size') && tattooSize.trim() ? `${tattooSize.trim()} ${sizeUnit}` : ''}
                    skinTone={!isPiercing && asks('skin_tone') ? skinTone : ''}
                    colourStyle={colourStyle} colourDetails={colourDetails}
                    notes={notes} photoPreviews={photoPreviews}
                    availabilityWindows={availabilityWindows} pushToLater={pushToLater}
                    earliestDate={earliestDate}
                    name={contactName} email={contactEmail} phone={contactPhone}
                    smsReminders={smsReminders}
                    studio={instantMode && !studioStep ? null : selectedStudio}
                    instant={instantChoice && instantStart ? { type: instantChoice, start: instantStart, zone: instantInfo.timezone } : null}
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
                  ...(!nextEnabled() || submitting || (previewing && step >= totalSteps - 1) ? s.submitBtnDisabled : {}),
                }}
                onClick={handleNext}
                disabled={!nextEnabled() || submitting || (previewing && step >= totalSteps - 1)}
              >
                {submitting ? (
                  <span>
                    {Math.round(submitProgress * 100)}%{submitPhase ? ` · ${submitPhase}` : ''}
                  </span>
                ) : step < totalSteps - 1 ? 'Continue' : previewing ? 'End of preview' : instantMode ? `Pay ${money(depositCharge(instantChoice?.deposit).total)}` : 'Send Request'}
              </button>
            </>
          )}

          {/* ── Success ── */}
          {view === 'success' && (
            <>
              <div style={s.successIcon}>✓</div>
              <h1 style={s.heading}>Request sent!</h1>
              <p style={s.muted}>
                {artist?.name} will review your request{flash ? ` for "${flash.title}"` : ''} and propose available times. You'll receive an email when they respond.
              </p>

              <AppPromo />

              <a
                href="https://www.vanta.tattoo"
                style={{ display: 'block', textAlign: 'center', marginTop: 16, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'rgba(var(--ink-rgb), 0.35)', textDecoration: 'none' }}
              >
                Back to home
              </a>
            </>
          )}

          <p style={s.wordmarkFooter}><Wordmark size={18} muted /></p>
        </div>
      </div>
    </div>
  );
}

// ─── Studio (artists at more than one studio) ────────────────────────────────

function StepStudio({ studios, selectedStudio, onChoose }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={s.stepHeading}>Where would you like to book?</h2>
      <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend style={{ ...s.label, marginBottom: 12 }}>This artist works at more than one studio.</legend>
        <div style={{ display: 'grid', gap: 10 }}>
          {studios.map(studio => {
            const on = selectedStudio?.id === studio.id;
            return (
              <label key={studio.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                border: on ? '1px solid rgba(var(--ink-rgb), 0.65)' : '1px solid rgba(var(--ink-rgb), 0.12)',
                background: on ? 'rgba(var(--ink-rgb), 0.08)' : 'rgba(var(--ink-rgb), 0.03)',
                borderRadius: 12, padding: 16, cursor: 'pointer' }}>
                <input type="radio" name="booking-studio-first" value={studio.id} checked={on}
                  onChange={() => onChoose(studio.id)} style={{ width: 18, minWidth: 18, maxWidth: 18, height: 18, padding: 0, margin: 0, flex: '0 0 18px', accentColor: 'var(--ink)' }} />
                <span style={{ display: 'grid', gap: 5, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{studio.name}</span>
                  {studio.addressString && <span style={{ ...s.label, lineHeight: 1.5 }}>{studio.addressString}</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

// ─── Step 0: The artist's appointment types ─────────────────────────────────

// instant: the time is booked straight away, so the total to pay is shown.
function StepAppointmentType({ types, chosen, onChoose, instant }) {
  return (
    <div>
      <h2 style={s.stepHeading}>What appointment would you like?</h2>
      <div role="radiogroup" aria-label="Appointment" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {types.map(t => {
          const selected = chosen?.id === t.id;
          return (
            <button key={t.id} type="button" role="radio" aria-checked={selected}
              style={{ ...s.sessionCard, ...(selected ? s.sessionCardActive : {}) }}
              onClick={() => onChoose(t)}>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ ...s.sessionCardLabel, ...(selected ? { color: 'var(--paper)' } : {}) }}>{t.name}</div>
                {t.description && <div style={{ ...s.sessionCardDesc, whiteSpace: 'normal', lineHeight: 1.45, ...(selected ? { color: 'rgba(var(--paper-rgb), 0.6)' } : {}) }}>{t.description}</div>}
                <div style={{ ...s.sessionCardDuration, marginTop: 4, ...(selected ? { color: 'rgba(var(--paper-rgb), 0.45)' } : {}) }}>{formatLength(t.duration_minutes)}</div>
              </div>
              {Number(t.price) > 0 && (
                // The artist's quote for this appointment.
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ ...s.sessionCardMeta, ...(selected ? { color: 'rgba(var(--paper-rgb), 0.75)' } : {}) }}>{formatMoney(t.price)}</div>
                  <div style={{ ...s.sessionCardDuration, ...(selected ? { color: 'rgba(var(--paper-rgb), 0.45)' } : {}) }}>quote</div>
                </div>
              )}
              <div style={{ ...s.sessionCheckCircle, ...(selected ? s.sessionCheckCircleActive : {}) }}>
                {selected && <span style={{ fontSize: 12, color: 'var(--ink)' }}>✓</span>}
              </div>
            </button>
          );
        })}
      </div>
      {instant && <p style={{ ...s.muted, fontSize: 12, marginTop: 14 }}>You’ll pick a time next.</p>}
    </div>
  );
}

// ─── Step 0: Session type ────────────────────────────────────────────────────

// hideLength: with instant booking the appointment type sets the length instead.
// Only what the artist offers: tattoo artists don't take piercings, piercers don't tattoo.
function offeredSessionTypes(services) {
  if (services === 'piercing') return SESSION_TYPES.filter(t => t.value === 'piercing');
  if (services === 'both') return SESSION_TYPES;
  return SESSION_TYPES.filter(t => t.value !== 'piercing');
}

function StepSessionType({ sessionType, setSessionType, services, hideLength = false }) {
  return (
    <div>
      <h2 style={s.stepHeading}>What appointment would you like?</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {offeredSessionTypes(services).map(t => {
          const selected = sessionType === t.value;
          return (
            <button
              key={t.value}
              style={{ ...s.sessionCard, ...(selected ? s.sessionCardActive : {}) }}
              onClick={() => setSessionType(t.value)}
            >
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ ...s.sessionCardLabel, ...(selected ? { color: 'var(--paper)' } : {}) }}>{t.label}</div>
                <div style={{ ...s.sessionCardDesc, ...(selected ? { color: 'rgba(var(--paper-rgb), 0.55)' } : {}) }}>{t.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {t.size && <div style={{ ...s.sessionCardMeta, ...(selected ? { color: 'rgba(var(--paper-rgb), 0.65)' } : {}) }}>{t.size}</div>}
                {!hideLength && <div style={{ ...s.sessionCardDuration, ...(selected ? { color: 'rgba(var(--paper-rgb), 0.4)' } : {}) }}>{t.duration}</div>}
              </div>
              <div style={{ ...s.sessionCheckCircle, ...(selected ? s.sessionCheckCircleActive : {}) }}>
                {selected && <span style={{ fontSize: 12, color: 'var(--ink)' }}>✓</span>}
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
  isPiercing,
  designDetails, setDesignDetails, bodyLocations, setBodyLocations,
  colourStyle, setColourStyle, colourDetails, setColourDetails,
  notes, setNotes, photoPreviews, photoFiles, photoInputRef,
  onAddPhoto, onRemovePhoto, showBodyPicker, setShowBodyPicker,
  design, placement, size, skinTone, photos, colour, notesQuestion,
}) {
  // A piercing is always described and placed; a tattoo as the form asks.
  const designAsked = isPiercing || design.asked;
  const designOptional = !isPiercing && !design.required;
  const placementAsked = isPiercing || placement.asked;
  const placementOptional = !isPiercing && !placement.required;
  // Piercing requests never need photos; a tattoo needs them when the artist asks.
  const photosRequired = photos.required && !isPiercing;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={s.stepHeading}>{isPiercing ? 'Tell us about your piercing' : 'Tell us about your design'}</h2>

      {/* Reference photos */}
      {photos.asked && <div>
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
            <span style={s.photoDropzoneSub}>Up to 5 images · {photosRequired ? 'Required' : 'Optional'}</span>
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
      </div>}

      {/* Design description */}
      {designAsked && <div style={s.field}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ ...s.sectionLabel, marginBottom: 0 }}>{isPiercing ? 'PIERCING DETAILS' : 'DESIGN DESCRIPTION'}</label>
          {designOptional && <span style={s.optionalBadge}>Optional</span>}
        </div>
        <textarea
          style={{ ...s.input, ...s.textarea }}
          placeholder={isPiercing ? 'e.g. Left nostril, one piercing, jewellery preference…' : 'e.g. Japanese dragon on the upper arm with waves…'}
          value={designDetails}
          onChange={e => setDesignDetails(e.target.value)}
          rows={4}
        />
      </div>}

      {/* Body placement */}
      {placementAsked && <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ ...s.sectionLabel, marginBottom: 0 }}>BODY PLACEMENT</div>
          {placementOptional && <span style={s.optionalBadge}>Optional</span>}
        </div>
        <button style={s.placementBtn} onClick={() => setShowBodyPicker(true)}>
          <span style={bodyLocations.length ? { color: 'var(--main)' } : { color: 'rgba(var(--ink-rgb), 0.35)' }}>
            {bodyLocations.length ? bodyLocations.join(', ') : 'Select placement…'}
          </span>
          <span style={{ color: 'rgba(var(--ink-rgb), 0.3)', fontSize: 12 }}>›</span>
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
                  style={{ ...s.modalDone, ...(bodyLocations.length === 0 && !placementOptional ? { opacity: 0.3, pointerEvents: 'none' } : {}) }}
                  onClick={() => setShowBodyPicker(false)}
                >
                  Done
                </button>
              </div>
              <div style={s.bodyGrid}>
                {(isPiercing ? PIERCING_PLACEMENTS : BODY_PARTS).map(part => {
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
      </div>}

      {/* Size */}
      {!isPiercing && size.asked && <div style={s.field}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="booking-size" style={{ ...s.sectionLabel, marginBottom: 0 }}>SIZE</label>
          {!size.required && <span style={s.optionalBadge}>Optional</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            id="booking-size"
            style={{ ...s.input, flex: 1, minWidth: 0 }}
            type="text" inputMode="decimal" placeholder="e.g. 10"
            value={size.value}
            onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) size.set(v); }}
          />
          <div role="group" aria-label="Size unit" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {['cm', 'in'].map(u => (
              <button key={u} type="button" aria-pressed={size.unit === u}
                style={{ ...s.colourBtn, flex: '0 0 auto', padding: '0 16px', height: 46, minWidth: 52, ...(size.unit === u ? s.colourBtnActive : {}) }}
                onClick={() => size.setUnit(u)}>{u}</button>
            ))}
          </div>
        </div>
      </div>}

      {/* Skin tone */}
      {!isPiercing && skinTone.asked && <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ ...s.sectionLabel, marginBottom: 0 }}>SKIN TONE</div>
          {!skinTone.required && <span style={s.optionalBadge}>Optional</span>}
        </div>
        <div role="radiogroup" aria-label="Skin tone" style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {SKIN_TONES.map(tone => {
            const selected = skinTone.value === tone;
            return (
              <button key={tone} type="button" role="radio" aria-checked={selected}
                style={{ ...s.bodyPill, ...(selected ? s.bodyPillActive : {}) }}
                onClick={() => skinTone.set(selected ? '' : tone)}>{tone}</button>
            );
          })}
        </div>
      </div>}

      {/* Colour */}
      {!isPiercing && colour.asked && <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ ...s.sectionLabel, marginBottom: 0 }}>COLOUR</div>
          {!colour.required && <span style={s.optionalBadge}>Optional</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {COLOUR_STYLES.map(c => {
            const selected = colourStyle === c;
            return (
              <button
                key={c}
                style={{ ...s.colourBtn, ...(selected ? s.colourBtnActive : {}) }}
                onClick={() => { setColourStyle(selected ? '' : c); if (c !== 'Color') setColourDetails(''); }}
              >
                {colourLabel(c)}
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

      }

      {/* Notes */}
      {notesQuestion.asked && <div style={s.field}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ ...s.sectionLabel, marginBottom: 0 }}>ADDITIONAL NOTES</label>
          {!notesQuestion.required && <span style={s.optionalBadge}>Optional</span>}
        </div>
        <textarea
          style={{ ...s.input, ...s.textarea }}
          placeholder="Allergies, size constraints, style preferences…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />
      </div>}
    </div>
  );
}

// ─── Step 2: Availability ────────────────────────────────────────────────────

// Which of the artist's studios the booking is at.
function StudioChoice({ studios, selectedStudio, onChooseStudio }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend style={{ ...s.label, marginBottom: 12 }}>{studios.length > 1 ? 'Choose a studio to see the artist’s working hours.' : 'Your appointment location'}</legend>
        <div style={{ display: 'grid', gap: 10 }}>
          {studios.map(studio => <label key={studio.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
            border: selectedStudio?.id === studio.id ? '1px solid rgba(var(--ink-rgb), 0.65)' : '1px solid rgba(var(--ink-rgb), 0.12)',
            background: selectedStudio?.id === studio.id ? 'rgba(var(--ink-rgb), 0.08)' : 'rgba(var(--ink-rgb), 0.03)',
            borderRadius: 12, padding: 16, cursor: 'pointer' }}>
            <input type="radio" name="booking-studio" value={studio.id} checked={selectedStudio?.id === studio.id}
              onChange={() => onChooseStudio(studio.id)} style={{ width: 18, minWidth: 18, maxWidth: 18, height: 18, padding: 0, margin: 0, flex: '0 0 18px', accentColor: 'var(--ink)' }} />
            <span style={{ display: 'grid', gap: 5, minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{studio.name}</span>
              {studio.addressString && <span style={{ ...s.label, lineHeight: 1.5 }}>{studio.addressString}</span>}
            </span>
          </label>)}
        </div>
    </fieldset>
  );
}

function StepAvailability({ availabilityWindows, setAvailabilityWindows, pushToLater, setPushToLater, earliestDate, setEarliestDate, sessionType, appointment, artistSchedule, studios, selectedStudio, onChooseStudio, restrictSchedule, availability = { asked: true, required: true }, artistName }) {
  const st = SESSION_TYPES.find(t => t.value === sessionType);
  const ready = !studios.length || !!selectedStudio;
  // The artist doesn't ask for weekly availability: they send times to choose from.
  if (!availability.asked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h2 style={s.stepHeading}>{studios.length ? 'Where would you like to book?' : 'Choosing a time'}</h2>
        {studios.length > 0 && <StudioChoice studios={studios} selectedStudio={selectedStudio} onChooseStudio={onChooseStudio} />}
        {ready && <p style={{ ...s.muted, margin: 0 }}>Once {artistName || 'the artist'} has looked at your request, they’ll send you times to choose from.</p>}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={s.stepHeading}>{studios.length ? 'Where would you like to book?' : 'When are you available?'}</h2>
      {studios.length > 0 && <StudioChoice studios={studios} selectedStudio={selectedStudio} onChooseStudio={onChooseStudio} />}
      {ready && <>
      {studios.length > 0 && <h3 style={{ ...s.stepHeading, fontSize: 20 }}>When are you available?</h3>}
      {selectedStudio?.timezone && <p style={{ ...s.label, margin: 0 }}>Studio local time · {selectedStudio.timezone.replaceAll('_', ' ')}</p>}

      <div>
        {appointment ? (
          <p style={{ ...s.muted, marginBottom: 4 }}>
            Your {appointment.name} takes around {formatLength(appointment.duration_minutes)}. Drag to select windows that fit.
          </p>
        ) : st && (
          <p style={{ ...s.muted, marginBottom: 4 }}>
            Your {st.label.toLowerCase()} session takes around {st.duration} — drag to select windows that fit.
          </p>
        )}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(var(--ink-rgb), 0.35)', margin: 0 }}>
          Drag to select · tap a block to remove it{availability.required ? '' : ' · Optional'}
        </p>
      </div>

      {restrictSchedule && !artistSchedule.length
        ? <p role="status" style={{ ...s.muted, margin: 0 }}>Weekly hours haven’t been set for this studio. You can request a later date for the artist to arrange.</p>
        : <AvailabilityGrid key={selectedStudio?.id || 'independent'} windows={availabilityWindows} setWindows={setAvailabilityWindows} schedule={artistSchedule} />}

      {/* Push to later */}
      <div style={s.pushCard}>
        <div style={{ flex: 1 }}>
          <div style={s.pushTitle}>Earliest available date</div>
          <div style={s.pushSub}>Not available in the coming weeks? Set a later start date.</div>
        </div>
        <button
          style={{ ...s.toggle, ...(pushToLater ? s.toggleOn : {}) }}
          onClick={() => setPushToLater(p => !p)}
          role="switch"
          aria-checked={pushToLater}
          aria-label="Earliest available date"
        >
          <div style={{ ...s.toggleThumb, ...(pushToLater ? s.toggleThumbOn : {}) }} />
        </button>
      </div>

      {pushToLater && (
        <div style={s.field}>
          <label style={s.label}>First available day</label>
          <input
            style={s.input}
            type="date"
            value={earliestDate}
            onChange={e => setEarliestDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      )}
      </>}
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
    return (h - startHour) * (60 / AV_SLOT_MINS) + (m || 0) / AV_SLOT_MINS;
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
    const artistStart = Math.ceil(timeToSlot(sched.start_time));
    const artistEnd = Math.floor(timeToSlot(sched.end_time));
    return Math.max(artistStart, Math.min(artistEnd - 1, slot));
  }

  function getSlotFromY(y) {
    return Math.max(0, Math.min(totalSlots - 1, Math.floor(y / AV_SLOT_H)));
  }

  function onColPointerDown(e, dayIndex, dayOfWeek, colEl) {
    e.preventDefault();
    colEl.setPointerCapture?.(e.pointerId);
    const rect = colEl.getBoundingClientRect();
    const rawSlot = getSlotFromY(e.clientY - rect.top);
    const day = scheduleMap[dayOfWeek];
    if (hasSchedule && (!day || rawSlot < Math.ceil(timeToSlot(day.start_time)) || rawSlot >= Math.floor(timeToSlot(day.end_time)))) return;
    const slot = clampToArtistRange(rawSlot, dayOfWeek);
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
              color: isOpen ? 'rgba(var(--ink-rgb), 0.65)' : 'rgba(var(--ink-rgb), 0.2)',
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
              fontFamily: 'var(--font-body)', fontSize: 8, color: 'rgba(var(--ink-rgb), 0.4)',
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
          const artistStartSlot = (hasSchedule && sched) ? Math.ceil(timeToSlot(sched.start_time)) : (isOpen ? 0 : -1);
          const artistEndSlot = (hasSchedule && sched) ? Math.floor(timeToSlot(sched.end_time)) : (isOpen ? totalSlots : -1);
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
              isOpen={isOpen && artistEndSlot > artistStartSlot}
              label={`${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayOfWeek]} availability`}
              onToggleDay={() => setWindows(previous => previous.some(window => window.dayOfWeek === dayOfWeek)
                ? previous.filter(window => window.dayOfWeek !== dayOfWeek)
                : [...previous, { dayOfWeek, startTime: slotToTime(artistStartSlot), endTime: slotToTime(artistEndSlot) }])}
              artistStartSlot={artistStartSlot}
              artistEndSlot={artistEndSlot}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(var(--ink-rgb), 0.85)' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(var(--ink-rgb), 0.4)' }}>Your selection</span>
        </div>
        {hasSchedule && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(var(--ink-rgb), 0.12)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(var(--ink-rgb), 0.4)' }}>Artist available</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AvDayColumn({ label, onToggleDay, dayIndex, dayOfWeek, windows, drag, onPointerDown, onPointerMove, onPointerUp, totalSlots, timeToSlot, isOpen, artistStartSlot, artistEndSlot }) {
  const colRef = useRef(null);
  const isDragging = drag?.dayIndex === dayIndex && !drag.isDelete;
  const dragLo = isDragging ? Math.min(drag.startSlot, drag.currentSlot) : -1;
  const dragHi = isDragging ? Math.max(drag.startSlot, drag.currentSlot) : -1;

  const slots = Array.from({ length: totalSlots }, (_, i) => i);

  return (
    <div
      ref={colRef}
      role="button" aria-label={label} aria-disabled={!isOpen} aria-pressed={windows.length > 0}
      tabIndex={isOpen ? 0 : -1}
      aria-description="Press Enter or Space to select the full working day. Drag to select specific times."
      onClick={event => { if (isOpen && event.detail === 0) onToggleDay(); }}
      onKeyDown={event => { if (isOpen && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onToggleDay(); } }}
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
            background: inArtistRange ? 'rgba(var(--ink-rgb), 0.09)' : 'rgba(var(--ink-rgb), 0.02)',
            borderTop: slot % 2 === 0 ? '1px solid rgba(var(--ink-rgb), 0.07)' : 'none',
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
            background: 'rgba(var(--ink-rgb), 0.88)', borderRadius: 4, pointerEvents: 'none',
          }} />
        );
      })}

      {/* Drag preview */}
      {isDragging && dragLo >= 0 && (
        <div style={{
          position: 'absolute',
          top: dragLo * AV_SLOT_H, left: 2, right: 2,
          height: (dragHi - dragLo + 1) * AV_SLOT_H,
          background: 'rgba(var(--ink-rgb), 0.4)', borderRadius: 4, pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

// ─── Step 3: Contact info ────────────────────────────────────────────────────

// "AU" → 🇦🇺 (regional indicator letters).
function flagOf(code) {
  return String(code || '').toUpperCase().replace(/[A-Z]/g, ch => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65));
}

function StepContact({ first, setFirst, last, setLast, email, setEmail, phoneCountry, setPhoneCountry, phone, setPhone, smsReminders, setSmsReminders, studioQuestions, account, guest, dob, setDob }) {
  // Checked once the client leaves a field, so it doesn't complain while they type.
  const [touched, setTouched] = useState({});
  const touch = key => () => setTouched(t => ({ ...t, [key]: true }));
  const country = COUNTRIES.find(c => c.code === phoneCountry) || COUNTRIES[0];
  const emailError = touched.email && email.trim() && !validEmail(email) ? 'Enter a valid email address, like jane@example.com.' : '';
  const phoneError = touched.phone && phone.trim() && !validPhone(phoneCountry, phone)
    ? `Enter a valid phone number for ${country.name}.`
    : '';
  return (
    <div className="bk-contact">
      <h2 style={{ ...s.stepHeading, marginBottom: 6 }}>Your contact details</h2>
      <p style={{ ...s.muted, fontSize: 14, marginBottom: 24 }}>
        {guest ? 'So the studio can confirm your booking. All fields are required.' : 'So the studio can confirm your booking.'}
      </p>

      <div className="bk-fields">
        <div className="bk-row">
          <div className="bk-field">
            <label className="bk-label" htmlFor="contact-first">First name</label>
            <input id="contact-first" className="bk-input" type="text" autoComplete="given-name" autoCapitalize="words" enterKeyHint="next"
              value={first} onChange={e => setFirst(e.target.value)} />
          </div>
          <div className="bk-field">
            <label className="bk-label" htmlFor="contact-last">Last name</label>
            <input id="contact-last" className="bk-input" type="text" autoComplete="family-name" autoCapitalize="words" enterKeyHint="next"
              value={last} onChange={e => setLast(e.target.value)} />
          </div>
        </div>

        <div className="bk-field">
          <label className="bk-label" htmlFor="contact-email">Email</label>
          <input id="contact-email" className="bk-input" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            autoComplete="email" enterKeyHint="next" placeholder="jane@example.com"
            value={email} onChange={e => setEmail(e.target.value)} onBlur={touch('email')}
            aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'contact-email-error' : undefined} />
          {emailError && <p id="contact-email-error" role="alert" className="bk-error">{emailError}</p>}
        </div>

        <div className="bk-field">
          <label className="bk-label" htmlFor="contact-phone">Mobile number</label>
          <div className="bk-phone" data-invalid={Boolean(phoneError) || undefined}>
            {/* The closed picker shows just the flag and code; the list names each country. */}
            <span className="bk-country">
              <span aria-hidden="true">{flagOf(country.code)} {country.dial}</span>
              <svg aria-hidden="true" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <select value={phoneCountry} onChange={e => setPhoneCountry(e.target.value)} aria-label="Country code">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.dial})</option>)}
              </select>
            </span>
            <input id="contact-phone" type="tel" inputMode="tel" autoComplete="tel-national" enterKeyHint="next"
              placeholder={phoneCountry === 'AU' ? '0412 345 678' : 'Phone number'}
              value={phone} onChange={e => setPhone(e.target.value)} onBlur={touch('phone')}
              aria-invalid={Boolean(phoneError)} aria-describedby={phoneError ? 'contact-phone-error' : undefined} />
          </div>
          {phoneError && <p id="contact-phone-error" role="alert" className="bk-error">{phoneError}</p>}
        </div>

        {guest && (
          <div className="bk-field">
            <span className="bk-label" id="contact-dob-label">Date of birth</span>
            <DateOfBirthInput id="contact-dob" value={dob} onChange={setDob} className="bk-input" />
          </div>
        )}
      </div>

      {studioQuestions?.allergies && (
        <StudioQuestion label="Allergies or medical conditions" placeholder={studioQuestions.allergies.required ? 'Write none if there aren\u2019t any' : ''} {...studioQuestions.allergies} />
      )}
      {studioQuestions?.address && (
        <StudioQuestion label="Home address" placeholder="Street, suburb, postcode" {...studioQuestions.address} />
      )}

      <label style={s.reminderOption}>
        <input
          type="checkbox"
          checked={smsReminders}
          onChange={e => setSmsReminders(e.target.checked)}
          style={s.reminderCheckbox}
        />
        <span>
          <span style={{ display: 'block', color: 'var(--ink)', fontWeight: 600, fontSize: 14 }}>Send me SMS reminders</span>
          <span style={{ display: 'block', ...s.muted, fontSize: 12, margin: '2px 0 0', lineHeight: 1.5 }}>
            A text before your appointment. Reply STOP to any reminder to turn them off.
          </span>
        </span>
      </label>

      {account && (
        <div style={{ ...s.reminderOption, flexDirection: 'column', gap: 12, marginTop: 12, cursor: 'default' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={account.on} onChange={e => account.setOn(e.target.checked)} style={s.reminderCheckbox} />
            <span>
              <span style={{ display: 'block', color: 'var(--ink)', fontWeight: 600, fontSize: 14 }}>Create a Vanta account with these details</span>
              <span style={{ display: 'block', ...s.muted, fontSize: 12, margin: '2px 0 0', lineHeight: 1.5 }}>
                Track your bookings and book faster next time.
              </span>
            </span>
          </label>
          {account.on && (
            <>
              <input className="bk-input" type="password" autoComplete="new-password" placeholder="Choose a password (6+ characters)" value={account.password}
                onChange={e => account.setPassword(e.target.value)} minLength={6} aria-label="Account password" />
              <span style={{ ...s.muted, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                By creating an account you agree to the{' '}
                <a href="https://www.vanta.tattoo/terms" target="_blank" rel="noopener noreferrer" style={s.consentLink}>Terms of Use</a> and{' '}
                <a href="https://www.vanta.tattoo/privacy" target="_blank" rel="noopener noreferrer" style={s.consentLink}>Privacy Policy</a>.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Review ──────────────────────────────────────────────────────────

function StepReview({ sessionType, appointment, designDetails, bodyLocations, size, skinTone, colourStyle, colourDetails, notes, photoPreviews, availabilityWindows, pushToLater, earliestDate, name, email, phone, smsReminders, studio, instant }) {
  const st = SESSION_TYPES.find(t => t.value === sessionType);
  const colourValue = sessionType === 'piercing' ? '' : colourStyle === 'Color' && colourDetails ? `Colour — ${colourDetails}` : colourLabel(colourStyle);

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
      <h2 style={{ ...s.stepHeading, marginBottom: instant ? 6 : 20 }}>{instant ? 'Review and pay' : 'Review your request'}</h2>
      {instant && <p style={{ ...s.muted, fontSize: 13, margin: '0 0 20px' }}>Your time is held for 30 minutes while you pay. It’s booked once the deposit goes through.</p>}

      {/* Session type */}
      {(appointment || st) && !instant && (
        <div style={{ ...s.reviewGroup, marginBottom: 16 }}>
          <div style={s.reviewRow}>
            <span style={s.reviewLabel}>{appointment ? 'Appointment' : 'Session'}</span>
            <span style={s.reviewValue}>{appointment ? `${appointment.name} · ${formatLength(appointment.duration_minutes)}` : `${st.label} · ${st.duration}`}</span>
          </div>
        </div>
      )}
      {!appointment && st && instant && (
        <div style={{ ...s.reviewGroup, marginBottom: 16 }}>
          <div style={s.reviewRow}>
            <span style={s.reviewLabel}>Session</span>
            <span style={s.reviewValue}>{st.label}</span>
          </div>
        </div>
      )}

      <ReviewGroup title={sessionType === 'piercing' ? 'PIERCING' : 'DESIGN'} rows={[
        designDetails.trim() && { label: 'Details', value: designDetails },
        bodyLocations.length > 0 && { label: 'Placement', value: bodyLocations.join(', ') },
        size && { label: 'Size', value: size },
        skinTone && { label: 'Skin tone', value: skinTone },
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

      {studio && <ReviewGroup title="STUDIO" rows={[
        { label: 'Location', value: studio.name },
        studio.addressString && { label: 'Address', value: studio.addressString },
        studio.timezone && { label: 'Time zone', value: studio.timezone.replaceAll('_', ' ') },
      ].filter(Boolean)} />}

      {instant && <ReviewGroup title="APPOINTMENT" rows={[
        { label: 'Type', value: `${instant.type.name} · ${formatLength(instant.type.duration_minutes)}` },
        { label: 'Time', value: formatWhen(instant.start, instant.zone) },
        { label: 'Deposit', value: money(instant.type.deposit) },
        { label: 'Vanta booking fee', value: money(depositCharge(instant.type.deposit).fee) },
        { label: 'Total to pay now', value: `${money(depositCharge(instant.type.deposit).total)} AUD` },
      ]} />}
      {instant && <p style={{ ...s.muted, fontSize: 12, margin: '-8px 0 20px' }}>{BOOKING_FEE_NOTE} {payWays(false)}</p>}

      {!instant && (availabilityWindows.length > 0 || (pushToLater && earliestDate)) && <ReviewGroup title="AVAILABILITY" rows={[
        ...availabilityWindows.map(w => {
          const dayIdx = DAY_VALUES.indexOf(w.dayOfWeek);
          const day = DAYS[dayIdx] ?? '?';
          return { label: day, value: `${w.startTime}–${w.endTime}` };
        }),
        pushToLater && earliestDate && { label: 'From', value: earliestDate },
      ].filter(Boolean)} />}

      <ReviewGroup title="CONTACT" rows={[
        { label: 'Name', value: name },
        { label: 'Email', value: email },
        phone && { label: 'Phone', value: phone },
        phone && { label: 'SMS reminders', value: smsReminders ? 'Yes' : 'No' },
      ].filter(Boolean)} />
    </div>
  );
}

// ─── Page wrapper ────────────────────────────────────────────────────────────

export default function BookingPage() {
  return (
    <Suspense fallback={<BrandLoader />}>
      <BookingContent />
    </Suspense>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

// Summary of the flash being booked, matching the app's flash card.
function FlashCard({ post }) {
  const price = flashPriceLabel(post);
  const details = [price, post.flash_size].filter(Boolean).join(' · ');
  const image = Array.isArray(post.images) ? post.images[0] : null;
  return (
    <div style={s.flashCard} aria-label={`Flash: ${post.title}`}>
      {image ? <img src={image} alt="" style={s.flashImage} /> : <div style={s.flashImage} />}
      <div style={{ minWidth: 0 }}>
        <div style={s.flashEyebrow}>{post.flash_one_off ? 'ONE-OFF FLASH' : 'FLASH'}</div>
        <div style={s.flashTitle}>{post.title}</div>
        {details && <div style={s.flashDetails}>{details}</div>}
      </div>
    </div>
  );
}

const s = {
  flashCard: {
    display: 'flex', alignItems: 'center', gap: 14, padding: 12, marginBottom: 24,
    borderRadius: 16, background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
    animation: 'booking-fade-in 0.35s ease',
  },
  flashImage: { width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: 'rgba(var(--ink-rgb), 0.06)' },
  flashEyebrow: { fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(var(--ink-rgb), 0.45)' },
  flashTitle: { fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' },
  flashDetails: { fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'rgba(var(--ink-rgb), 0.6)', marginTop: 4 },
  flashNotice: {
    fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: 'rgba(var(--ink-rgb), 0.7)',
    padding: '10px 12px', borderRadius: 12, background: 'rgba(255,200,80,0.08)', border: '1px solid rgba(255,200,80,0.2)', margin: '0 0 20px',
  },
  pageInner: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 20px 80px',
  },
  card: {
    width: '100%',
    maxWidth: 520,
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
    background: 'rgba(var(--ink-rgb), 0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarInitial: {
    fontSize: 18, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.5)',
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
    fontSize: 15, color: 'rgba(var(--ink-rgb), 0.45)',
    margin: '0 0 20px', lineHeight: 1.65,
  },
  wordmarkFooter: {
    marginTop: 48, textAlign: 'center',
  },

  // Auth
  appCta: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(var(--ink-rgb), 0.06)',
    border: '1px solid rgba(var(--ink-rgb), 0.12)',
    borderRadius: 12, padding: '13px 16px',
    textDecoration: 'none', color: 'var(--main)',
    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
  },
  appCtaIcon: { width: 32, height: 32, borderRadius: 8, flexShrink: 0 },
  emailAuthLink: {
    background: 'none', border: 'none', color: 'rgba(var(--ink-rgb), 0.7)', cursor: 'pointer', minHeight: 44,
    fontFamily: 'var(--font-body)', fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 3,
    display: 'block', margin: '12px auto 0', padding: 0, boxShadow: 'none', borderRadius: 0,
  },
  authDivider: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 20px' },
  authDividerLine: { flex: 1, height: 1, background: 'rgba(var(--ink-rgb), 0.07)' },
  authDividerLabel: { fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(var(--ink-rgb), 0.25)', whiteSpace: 'nowrap' },
  tabs: {
    display: 'flex', background: 'rgba(var(--ink-rgb), 0.05)',
    borderRadius: 10, padding: 3, marginBottom: 24,
  },
  tab: {
    flex: 1, padding: '9px 0', background: 'transparent', border: 'none',
    borderRadius: 8, color: 'rgba(var(--ink-rgb), 0.4)',
    fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer',
  },
  tabActive: { background: 'rgba(var(--ink-rgb), 0.1)', color: 'var(--main)' },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: {
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
    color: 'rgba(var(--ink-rgb), 0.55)', letterSpacing: 0.2,
  },
  sectionLabel: {
    fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
    letterSpacing: 1.4, color: 'rgba(var(--ink-rgb), 0.3)', marginBottom: 8, display: 'block',
  },
  input: {
    width: '100%', background: 'rgba(var(--ink-rgb), 0.05)',
    border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 10,
    // iOS Safari auto-zooms on focus for inputs under 16px; keep at/above it
    // so the zoom doesn't carry over into later client-side-routed steps.
    padding: '12px 14px', color: 'var(--main)', fontSize: 16,
    fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
  },
  textarea: { resize: 'vertical', minHeight: 80 },
  consentLabel: {
    display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 13,
    color: 'rgba(var(--ink-rgb), 0.45)', lineHeight: 1.5,
  },
  checkbox: {
    width: 16, height: 16, minWidth: 16,
    accentColor: 'var(--ink)', cursor: 'pointer',
    marginTop: 2, flexShrink: 0,
    padding: 0, border: 'none', background: 'none', borderRadius: 0,
  },
  consentLink: { color: 'rgba(var(--ink-rgb), 0.7)', textDecoration: 'underline', textUnderlineOffset: 2 },
  error: {
    fontFamily: 'var(--font-body)', fontSize: 14,
    color: 'var(--danger)', margin: 0,
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
    width: 32, height: 32, background: 'none', border: 'none', boxShadow: 'none',
    color: 'rgba(var(--ink-rgb), 0.5)', fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, flexShrink: 0,
  },
  stepTitle: {
    fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
    color: 'var(--main)', position: 'absolute', left: '50%', transform: 'translateX(-50%)',
  },
  stepDots: { display: 'flex', gap: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: '50%', background: 'rgba(var(--ink-rgb), 0.15)' },
  dotActive: { width: 7, height: 7, background: 'rgba(var(--ink-rgb), 1)' },
  dotDone: { background: 'rgba(var(--ink-rgb), 0.45)' },
  progressTrack: { height: 3, background: 'rgba(var(--ink-rgb), 0.1)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--main)', borderRadius: 2, transition: 'width 0.3s ease' },
  stepHeading: {
    fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700,
    color: 'var(--main)', margin: 0, lineHeight: 1.3,
  },

  // Session type cards
  sessionCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', width: '100%', textAlign: 'left',
    background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
    borderRadius: 14, cursor: 'pointer',
  },
  sessionCardActive: { background: 'var(--ink)', border: '1px solid var(--ink)' },
  sessionCardLabel: { fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--main)' },
  sessionCardDesc: { fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(var(--ink-rgb), 0.45)', marginTop: 2 },
  sessionCardMeta: { fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.55)' },
  sessionCardDuration: { fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(var(--ink-rgb), 0.3)', marginTop: 2 },
  sessionCheckCircle: {
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    border: '1.5px solid rgba(var(--ink-rgb), 0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sessionCheckCircleActive: { background: 'rgba(var(--paper-rgb), 0.7)', border: 'none' },

  // Photos
  photoDropzone: {
    width: '100%', border: '1px dashed rgba(var(--ink-rgb), 0.2)',
    borderRadius: 12, padding: '28px 20px',
    background: 'rgba(var(--ink-rgb), 0.03)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    cursor: 'pointer',
  },
  photoDropzoneIcon: { fontSize: 28, color: 'rgba(var(--ink-rgb), 0.3)' },
  photoDropzoneText: { fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'rgba(var(--ink-rgb), 0.45)' },
  photoDropzoneSub: { fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(var(--ink-rgb), 0.25)' },
  photoThumb: { width: 88, height: 88, borderRadius: 10, objectFit: 'cover', display: 'block' },
  photoRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: '50%',
    background: 'rgba(var(--paper-rgb), 0.75)', border: 'none',
    color: 'var(--ink)', fontSize: 10, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  photoAddMore: {
    width: 88, height: 88, borderRadius: 10,
    background: 'rgba(var(--ink-rgb), 0.05)',
    border: '1px dashed rgba(var(--ink-rgb), 0.15)',
    color: 'rgba(var(--ink-rgb), 0.45)', fontSize: 22, cursor: 'pointer',
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
    background: 'var(--sheet)', borderRadius: '20px 20px 0 0',
    maxHeight: '70vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(var(--ink-rgb), 0.07)',
  },
  modalTitle: { fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--main)' },
  modalSub: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(var(--ink-rgb), 0.4)', marginTop: 2 },
  modalDone: { fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--main)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' },
  bodyGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
    padding: 20, overflowY: 'auto',
  },
  bodyPill: {
    padding: '11px 8px', borderRadius: 12,
    background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
    color: 'rgba(var(--ink-rgb), 0.75)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
  },
  bodyPillActive: { background: 'var(--ink)', border: '1px solid var(--ink)', color: 'var(--paper)', fontWeight: 600 },

  // Colour
  placementBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 14px', width: '100%',
    background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
    borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14,
  },
  colourBtn: {
    flex: 1, padding: '11px 0',
    background: 'rgba(var(--ink-rgb), 0.06)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
    borderRadius: 10, color: 'rgba(var(--ink-rgb), 0.65)',
    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  colourBtnActive: { background: 'var(--ink)', border: '1px solid var(--ink)', color: 'var(--paper)', fontWeight: 600 },
  optionalBadge: {
    fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
    color: 'rgba(var(--ink-rgb), 0.25)',
    padding: '2px 6px', background: 'rgba(var(--ink-rgb), 0.06)', borderRadius: 50,
    letterSpacing: 0.3,
  },

  // Availability
  pushCard: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '14px 16px', background: 'rgba(var(--ink-rgb), 0.05)',
    border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 14,
  },
  pushTitle: { fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--main)' },
  pushSub: { fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(var(--ink-rgb), 0.4)', marginTop: 2 },
  toggle: {
    width: 44, height: 26, borderRadius: 13, background: 'rgba(var(--ink-rgb), 0.15)',
    border: 'none', cursor: 'pointer', padding: 3, flexShrink: 0,
    display: 'flex', alignItems: 'center', transition: 'background 0.2s',
  },
  toggleOn: { background: 'var(--main)' },
  toggleThumb: {
    width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)',
    transition: 'transform 0.2s', transform: 'translateX(0)',
  },
  toggleThumbOn: { transform: 'translateX(18px)' },

  // Contact group
  reminderOption: {
    display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 20, padding: '14px 16px',
    borderRadius: 12, border: '1px solid rgba(var(--ink-rgb), 0.1)', background: 'rgba(var(--ink-rgb), 0.03)', cursor: 'pointer',
  },
  // Undo the site-wide text-input styles (min-width 260px, padding).
  reminderCheckbox: { width: 18, height: 18, minWidth: 0, padding: 0, margin: '2px 0 0', accentColor: 'var(--ink)', flexShrink: 0, cursor: 'pointer' },

  // Review
  reviewGroup: {
    background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
    borderRadius: 14, overflow: 'hidden',
  },
  reviewDivider: { height: 1, background: 'rgba(var(--ink-rgb), 0.07)', margin: '0 14px' },
  reviewRow: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 14px',
  },
  reviewLabel: {
    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
    color: 'rgba(var(--ink-rgb), 0.4)', width: 70, flexShrink: 0,
  },
  reviewValue: {
    fontFamily: 'var(--font-body)', fontSize: 13,
    color: 'rgba(var(--ink-rgb), 0.85)', flex: 1, wordBreak: 'break-word',
  },

  // Success
  successIcon: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(var(--success-rgb), 0.12)', border: '1px solid rgba(var(--success-rgb), 0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, color: 'rgba(var(--success-rgb), 0.9)', marginBottom: 20,
  },
  appCard: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
    background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.1)',
    borderRadius: 14, padding: '18px 18px', marginBottom: 4,
  },
  appCardIcon: {
    width: 44, height: 44, borderRadius: 12, background: 'rgba(var(--ink-rgb), 0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-heading)',
    color: 'var(--main)', flexShrink: 0, letterSpacing: 2,
  },
  appCardTitle: { fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--main)', marginBottom: 8 },
  appCardFeature: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(var(--ink-rgb), 0.45)', lineHeight: 1.75 },
};

// Where to book instantly, when the artist takes instant bookings in more than one place.
function InstantPlacePicker({ places, current, artistName, onChoose }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ ...s.label, margin: '0 0 8px' }}>Where</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {places.map(place => {
          const id = place.studio_id || null;
          const on = id === current;
          return (
            <button key={id || 'personal'} type="button" onClick={() => onChoose(id)} aria-pressed={on}
              style={{
                padding: '9px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                border: on ? '1px solid rgba(var(--ink-rgb), 0.65)' : '1px solid rgba(var(--ink-rgb), 0.12)',
                background: on ? 'rgba(var(--ink-rgb), 0.1)' : 'rgba(var(--ink-rgb), 0.03)', color: 'var(--ink)',
              }}>
              {place.name || `With ${artistName || 'the artist'}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// One of the studio's own booking-form questions.
function StudioQuestion({ label, placeholder, value, set, required }) {
  return (
    <label className="bk-field" style={{ marginTop: 18 }}>
      <span className="bk-label">{label}{!required && <span className="bk-optional"> (optional)</span>}</span>
      <textarea className="bk-input bk-textarea" value={value} onChange={e => set(e.target.value)} placeholder={placeholder} rows={2} />
    </label>
  );
}
