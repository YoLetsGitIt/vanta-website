'use client';

import { useEffect, useRef, useState } from 'react';
import ArtistAppPreview from './ArtistAppPreview';
import styles from './artists.module.css';

const steps = [
  { title: 'Your own booking link', label: 'Booking link', text: 'One link for your bio, website or messages. A direct way for clients to book you.', mobileText: 'Share one booking link in your bio, website or messages.', screen: 'portfolio', alt: 'Artist profile where clients can explore work and start a booking' },
  { title: 'Detailed booking requests', label: 'Requests', text: 'The idea, placement and reference photos arrive together, before you reply.', mobileText: 'Get the idea, placement and reference photos together before you reply.', screen: 'request-form', alt: 'Vanta booking request with the tattoo idea, placement and reference photos' },
  { title: 'Quotes & proposed times', label: 'Quote & time', text: 'Send your quote, session length and available times for the client to choose from.', mobileText: 'Send a quote and available times for your client to choose from.', screen: 'proposal', alt: 'Vanta booking proposal showing a quote, deposit and available appointment time' },
];

export default function ArtistBookingShowcase() {
  const [compact, setCompact] = useState(false);
  const [selected, setSelected] = useState(0);
  const buttons = useRef([]);
  useEffect(() => {
    const viewport = window.matchMedia('(max-width: 760px)');
    const sync = () => setCompact(viewport.matches);
    sync();
    viewport.addEventListener('change', sync);
    return () => viewport.removeEventListener('change', sync);
  }, []);
  function navigate(event, index) {
    const next = ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % steps.length
      : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index + steps.length - 1) % steps.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? steps.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus({ preventScroll: true });
  }
  return <div className={styles.bookingShowcase} data-mobile-ready={compact}>
    <div className={styles.bookingMobileTabs} role="tablist" aria-label="Booking steps" aria-orientation="horizontal">
      {steps.map((step, index) => <button key={step.screen} ref={node => { buttons.current[index] = node; }} type="button" role="tab" id={`artist-booking-tab-${index + 1}`} aria-label={step.title} aria-controls={`artist-booking-panel-${index + 1}`} aria-selected={index === selected} tabIndex={index === selected ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={event => navigate(event, index)}>
        <span className={styles.bookingTabNumber} aria-hidden="true">0{index + 1}</span><span>{step.label}</span>
      </button>)}
    </div>
    <div className={styles.bookingScroll} data-booking-scroll="" data-mobile-step={compact ? selected + 1 : undefined}>
      <div className={styles.bookingSteps}>
        {steps.map((step, index) => <article key={step.screen} id={`artist-booking-panel-${index + 1}`} className={styles.bookingStep} data-booking-step={index + 1} data-mobile-selected={index === selected} role={compact ? 'tabpanel' : undefined} aria-labelledby={compact ? `artist-booking-tab-${index + 1}` : undefined} tabIndex={compact ? 0 : undefined}>
          <span data-artist-reveal="rise" className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
          <dl data-artist-reveal="rise" data-reveal-delay={index * 60}><div><dt>{step.title}</dt><dd><span className={styles.bookingDesktopCopy}>{step.text}</span><span className={styles.bookingMobileCopy}>{step.mobileText}</span></dd></div></dl>
          <figure data-artist-reveal="phone" data-reveal-delay={index * 70}><ArtistAppPreview screen={step.screen} label={step.alt} className={styles.appScreen} /></figure>
        </article>)}
      </div>
    </div>
  </div>;
}
