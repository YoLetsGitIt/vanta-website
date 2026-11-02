'use client';

import { useEffect, useRef, useState } from 'react';
import { DayCalendarBackdrop, NativeBookingsPreview } from './ArtistDayCalendar';
import styles from './artists.module.css';

const features = [
  { id: 'calendar', title: 'Working hours & calendar', mobileTitle: 'Calendar', mobileDescription: 'Set your hours, block time off and keep your appointments together.', description: 'Set your working hours, block time off and see confirmed appointments in one place.' },
  { id: 'policies', title: 'Deposits & consent forms', mobileTitle: 'Deposits & consent', mobileDescription: 'Collect deposits and share consent terms as part of each booking.', description: 'Collect deposits and let clients review your consent terms as part of their booking.' },
  { id: 'appointment', title: 'Add appointments on the go', mobileTitle: 'Add appointments', mobileDescription: 'Add walk-ins and bookings from your messages, with the client, details and time together.', description: 'A walk-in or a booking from your messages? Add the client, appointment details and time in the app.' },
];
const previewSequences = {
  policies: [
    { label: 'Deposit', name: 'Preview deposit confirmation' },
    { label: 'Consent', name: 'Preview consent form' },
  ],
  appointment: ['Client', 'Details', 'Date & time'].map((label, index) => ({ label, name: `Preview step ${index + 1}: ${label}` })),
};

function FeatureIcon({ type }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === 'calendar' ? <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 10h18m-13 5 2 2 4-4" /></> : type === 'policies' ? <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 0v6h6M8 13h4m-4 4 2 2 5-5" /></> : <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 10h18M12 13v5m-2.5-2.5h5" /></>}
  </svg>;
}

export default function ArtistDayShowcase() {
  const [selected, setSelected] = useState(0);
  const [frame, setFrame] = useState({ id: 'calendar', index: 0 });
  const [paused, setPaused] = useState({ policies: false, appointment: false });
  const [reducedMotion, setReducedMotion] = useState(true);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const scene = useRef(null);
  const controls = useRef([]);
  const featureId = features[selected].id;
  const sequence = previewSequences[featureId];
  const previewStep = frame.id === featureId ? frame.index : 0;
  const previewName = featureId === 'policies' ? 'deposit and consent' : 'appointment';
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const viewport = window.matchMedia('(max-width: 760px)');
    const syncMotion = () => setReducedMotion(preference.matches);
    const syncLayout = () => setCompact(viewport.matches);
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncMotion(); syncVisibility(); syncLayout();
    preference.addEventListener('change', syncMotion);
    viewport.addEventListener('change', syncLayout);
    document.addEventListener('visibilitychange', syncVisibility);
    const observer = window.IntersectionObserver ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .35 }) : null;
    observer?.observe(scene.current);
    return () => { observer?.disconnect(); preference.removeEventListener('change', syncMotion); viewport.removeEventListener('change', syncLayout); document.removeEventListener('visibilitychange', syncVisibility); };
  }, []);
  useEffect(() => {
    setFrame({ id: features[selected].id, index: 0 });
    setReady(false);
    if (!previewSequences[features[selected].id]) return;
    let cancelled = false;
    const images = [...scene.current.querySelectorAll(`[data-day-screen="${features[selected].id}"] [data-preview-frame] img`)];
    images.forEach(image => { image.loading = 'eager'; });
    Promise.all(images.map(image => image.decode())).then(() => { if (!cancelled) setReady(true); }).catch(() => {});
    return () => { cancelled = true; };
  }, [selected]);
  useEffect(() => {
    if (!sequence || paused[featureId] || reducedMotion || !inView || !pageVisible || !ready) return;
    const timer = window.setTimeout(() => setFrame({ id: featureId, index: (previewStep + 1) % sequence.length }), 2400);
    return () => window.clearTimeout(timer);
  }, [featureId, sequence, paused, reducedMotion, inView, pageVisible, ready, previewStep]);
  function navigate(event, index) {
    const next = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? (index + 1) % features.length
      : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? (index + features.length - 1) % features.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? features.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setSelected(next);
    controls.current[next]?.focus({ preventScroll: true });
  }
  return <div className={styles.dayComposition} data-artist-reveal="day-scene">
    <div className={styles.dayDetails} role="tablist" aria-label="Explore your everyday tools" aria-orientation={compact ? 'horizontal' : 'vertical'}>
      {features.map((feature, index) => <div key={feature.id} data-day-detail="">
        <button className={styles.dayOption} type="button" role="tab" id={`artist-day-${feature.id}`} aria-selected={index === selected} aria-controls="artist-day-preview" aria-label={feature.title} aria-describedby={`artist-day-description-${feature.id}`} tabIndex={index === selected ? 0 : -1} ref={node => { controls.current[index] = node; }} onClick={() => setSelected(index)} onKeyDown={event => navigate(event, index)}>
          <span className={styles.dayOptionTitle}><FeatureIcon type={feature.id} /><span className={styles.dayOptionLabel}>{feature.title}</span><span className={styles.dayOptionMobileLabel} aria-hidden="true">{feature.mobileTitle}</span><span className={styles.dayOptionIndicator} aria-hidden="true">↗</span></span>
          <span className={styles.dayOptionCopy} id={`artist-day-description-${feature.id}`}>{feature.description}</span>
        </button>
      </div>)}
    </div>
    <p className={styles.daySelectedCopy} id="artist-day-summary" data-day-detail="">{features[selected].mobileDescription}</p>
    <div ref={scene} className={styles.dayScene} role="tabpanel" id="artist-day-preview" aria-labelledby={`artist-day-${features[selected].id}`} aria-describedby="artist-day-summary" tabIndex={0}>
      <DayCalendarBackdrop />
      <NativeBookingsPreview className={styles.appScreen} screen={featureId} appointmentStep={previewStep} policyStep={previewStep} />
      {sequence && <div className={styles.dayPreviewControls} role="group" aria-label={featureId === 'policies' ? 'Deposit and consent preview screens' : 'New appointment preview steps'}>
        {sequence.map(({ label, name }, index) => <button key={label} type="button" aria-label={name} aria-pressed={index === previewStep} onClick={() => { setFrame({ id: featureId, index }); setPaused(value => ({ ...value, [featureId]: true })); }}><span>{index + 1}</span><span className={styles.dayPreviewStepLabel}>{label}</span></button>)}
        {!reducedMotion && <button type="button" aria-label={`${paused[featureId] ? 'Play' : 'Pause'} ${previewName} preview`} onClick={() => setPaused(value => ({ ...value, [featureId]: !value[featureId] }))}>{paused[featureId] ? '▶' : 'Ⅱ'}</button>}
      </div>}
    </div>
  </div>;
}
