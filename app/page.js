'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './home.module.css';

const appStore = 'https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738';
const googlePlay = 'https://play.google.com/store/apps/details?id=vanta.tattoo';
const googlePlayTesting = 'https://play.google.com/apps/testing/vanta.tattoo';
const tattooColumns = [
  [[1, 'tall'], [3, 'medium'], [5, 'compact'], [2, 'tall']],
  [[4, 'medium'], [2, 'tall'], [1, 'compact'], [5, 'medium']],
  [[3, 'compact'], [5, 'tall'], [4, 'medium'], [1, 'compact']],
  [[2, 'medium'], [4, 'tall'], [3, 'compact'], [5, 'medium']],
  [[5, 'tall'], [1, 'compact'], [2, 'medium'], [4, 'tall']],
];

function TattooWall() {
  const [reducedMotion, setReducedMotion] = useState(null);
  const enabled = reducedMotion === false;
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setReducedMotion(preference.matches);
    setReducedMotion(preference.matches);
    preference.addEventListener('change', syncPreference);
    const update = () => setRunning(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => { document.removeEventListener('visibilitychange', update); preference.removeEventListener('change', syncPreference); };
  }, []);
  return <div className={styles.background}>
    <div className={styles.tattooWall} data-motion={enabled} data-running={running && enabled} aria-hidden="true">
      <div className={styles.wallColumns}>
        {tattooColumns.map((column, index) => <div key={index} className={styles.wallColumn} style={{ '--duration': `${[70, 62, 76, 64, 72][index]}s`, '--offset': `${[-8, -19, -12, -30, -16][index]}s` }}>
          <div className={styles.wallTrack}>
            {[0, 1].map(copy => <div key={copy} className={styles.wallStack}>
              {column.map(([image, size], card) => <div key={card} className={styles.wallCard} data-size={size}>
                <img src={`/welcome/wall-${image}.webp`} alt="" decoding="async"/>
              </div>)}
            </div>)}
          </div>
        </div>)}
      </div>
      <div className={styles.wallShade}/>
    </div>
    </div>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>;
}
function Downloads() {
  const [isAndroid, setIsAndroid] = useState(false);
  const googlePlayLink = isAndroid ? googlePlay : googlePlayTesting;
  useEffect(() => {
    setIsAndroid(navigator.userAgentData?.platform === 'Android' || /Android/i.test(navigator.userAgent));
  }, []);

  return <div className={styles.downloads} aria-label="Get the Vanta app">
    <a href={appStore} className={styles.storeBadge} data-preferred={!isAndroid} target="_blank" rel="noopener noreferrer" aria-label="Download Vanta on the App Store">
      <svg viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.3 143.1-317 284-317 74.9 0 137.2 48.3 184.4 48.3 44.9 0 117.1-51.5 200.3-51.5 32.3 0 117.1 2.6 178.1 97.3zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
      <span><small>Download on the</small><strong>App Store</strong></span>
    </a>
    <a href={googlePlayLink} className={styles.storeBadge} data-preferred={isAndroid} target="_blank" rel="noopener noreferrer" aria-label="Join the Vanta Android beta on Google Play">
      <svg viewBox="0 0 24 26" aria-hidden="true" fill="currentColor"><path d="M2 2.2v21.6L13 13 2 2.2Zm1.8-.7 12 6.8-2.2 2.8L3.8 1.5Zm0 23 9.8-9.6 2.2 2.8-12 6.8ZM15 13l2.7-3.3 4.4 2.5c.6.4.6 1.2 0 1.6l-4.4 2.5L15 13Z"/></svg>
      <span><small>Join the beta on</small><strong>Google Play</strong></span>
    </a>
  </div>;
}
function Wordmark() {
  return <span className={styles.wordmark}>vanta<span>.</span></span>;
}
const chapters = [
  { label: 'The connection', short: 'Discover', title: 'The work catches your eye. The artist makes it yours.', description: 'Explore portfolios, save the pieces you love and get to know the person behind the work. Find an artist who feels right for your idea.', image: '/home/artist-profile.webp', alt: 'Vanta artist profile showing a portfolio and options to message or book', note: 'Meet the artist behind the ink', details: ['Explore portfolios', 'Save your favourites', 'Start a conversation'] },
  { label: 'The idea', short: 'Your idea', title: 'A rough idea is a perfectly good start.', description: 'A reference photo. A placement. A story you want to tell. Bring it together in a booking request and give your artist something to work with.', image: '/home/booking-request.webp', alt: 'Vanta booking request with reference photos, design description and placement', note: 'Your idea, in your own words', details: ['Add reference photos', 'Choose the placement', 'Share the details'] },
  { label: 'The appointment', short: 'Book it', title: 'That someday tattoo? Put a date on it.', description: 'Review your artist’s quote and proposed times. Choose a session that works for you and pay the required deposit to confirm your booking.', image: '/home/appointment.webp', alt: 'Vanta appointment proposal showing a quote, deposit and available time', note: 'The next step is yours', details: ['Review your quote', 'Choose a time', 'Confirm your booking'] },
];
function AppJourney() {
  const [chapter, setChapter] = useState(0);
  const active = chapters[chapter];
  function navigate(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % chapters.length;
    if (event.key === 'ArrowLeft') next = (index + chapters.length - 1) % chapters.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = chapters.length - 1;
    if (next !== undefined) {
      event.preventDefault(); setChapter(next);
      document.getElementById(`journey-tab-${next}`)?.focus();
    }
  }
  return <section id="the-experience" className={styles.journey} aria-labelledby="journey-heading" data-reveal>
    <header className={styles.journeyHeading}><span className={styles.eyebrow}>YOUR IDEA. YOUR ARTIST. YOUR NEXT CHAPTER.</span><h2 id="journey-heading">From a saved piece<br/>to <em>a real connection.</em></h2><p>The good part is finding the art.<br/>Vanta brings the next steps together.</p></header>
    <div className={styles.journeyBody}>
      <div className={styles.chapterContent}>
        <div className={styles.chapterTabs} role="tablist" aria-label="Your tattoo journey">
          {chapters.map((item, index) => <button key={item.short} type="button" role="tab" id={`journey-tab-${index}`} aria-selected={index === chapter} aria-controls="journey-panel" tabIndex={index === chapter ? 0 : -1} onClick={() => setChapter(index)} onKeyDown={event => navigate(event, index)}><span>0{index + 1}</span>{item.short}</button>)}
        </div>
        <div role="tabpanel" id="journey-panel" aria-labelledby={`journey-tab-${chapter}`} className={styles.chapterPanel} tabIndex={0}>
          <div key={chapter} className={styles.chapterCopy}>
            <span className={styles.chapterLabel}>{active.label}</span>
            <h3>{active.title}</h3><p>{active.description}</p>
            <ul>{active.details.map(detail => <li key={detail}><span aria-hidden="true">✓</span>{detail}</li>)}</ul>
          </div>
          <div className={styles.appPreview}>
            <span className={styles.orbit} aria-hidden="true"/>
            <span className={styles.previewMark} aria-hidden="true">v.</span>
            <div className={styles.phone}><img key={active.image} src={active.image} alt={active.alt} width="1393" height="3029" loading="lazy"/></div>
            <div className={styles.previewCaption}><span className={styles.captionDot}/><span>{active.note}</span></div>
            <span className={styles.actualApp}>A LOOK INSIDE VANTA</span>
          </div>
        </div>
        <div className={styles.chapterFooter}><span>Go at your own pace.</span><button type="button" onClick={() => setChapter((chapter + 1) % chapters.length)} aria-label={chapter === 2 ? 'Back to Discover' : `Next: ${chapters[chapter + 1].short}`}>{chapter === 2 ? 'Back to the beginning' : 'Next chapter'}<Arrow/></button></div>
      </div>
    </div>
  </section>;
}
export default function Home() {
  const page = useRef(null);
  useEffect(() => {
    const root = page.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.setAttribute('data-visible', 'true'); observer.unobserve(entry.target); }
    }), { root, threshold: 0.08 });
    root.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return <main ref={page} className={styles.page} aria-label="Vanta home">
    <TattooWall/>
    <header className={styles.navigation}>
      <Link href="/" aria-label="Vanta home"><Wordmark/></Link>
      <nav aria-label="Vanta products"><Link href="/artists">For artists</Link><Link href="/studio">For studios</Link></nav>
    </header>
    <section className={styles.hero} aria-labelledby="home-heading">
      <div className={styles.heroCopy}>
        <h1 id="home-heading">Find your<br/><em>next tattoo.</em></h1>
        <svg className={styles.inkAccent} viewBox="0 0 360 30" fill="none" aria-hidden="true">
          <path className={styles.inkStroke} pathLength="1" d="M3 20C73 8 199 9 307 15M39 25C117 18 205 17 270 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M335 2C336 12 339 15 350 16C339 17 336 20 335 29C334 20 331 17 321 16C331 15 334 12 335 2Z" fill="currentColor"/>
        </svg>
        <p className={styles.heroDescription}>Discover artists, save inspiration, and book your tattoo—all in one app.</p>
        <Downloads/>

      </div>
      <figure className={styles.heroPreview}>
        <div className={styles.previewStage}>
          <div className={styles.previewArtwork} aria-hidden="true">
            <div className={styles.artworkUpper}><img src="/welcome/wall-2.webp" alt="" decoding="async"/></div>
            <div className={styles.artworkLower}><img src="/welcome/wall-4.webp" alt="" decoding="async"/></div>
            <svg className={styles.previewFlourish} viewBox="0 0 64 64" fill="none"><path d="M32 3C34 23 41 30 61 32C41 34 34 41 32 61C30 41 23 34 3 32C23 30 30 23 32 3Z" stroke="currentColor"/><path d="M32 18v28M18 32h28" stroke="currentColor"/></svg>
          </div>
          <div className={styles.heroDevice}>
            <img src="/home/artist-profile.webp" alt="Inside Vanta: an artist’s tattoo portfolio with Message and Book options" width="560" height="1218" decoding="async"/>
          </div>
        </div>
        <figcaption><span/>Art you connect with. An artist to make it yours.</figcaption>
      </figure>
    </section>
    <AppJourney/>
    <section id="get-vanta" className={styles.invitation} aria-labelledby="download-heading" data-reveal>
      <div className={styles.invitationArt} aria-hidden="true"><img src="/welcome/wall-2.webp" alt="" loading="lazy"/><img src="/welcome/wall-4.webp" alt="" loading="lazy"/></div>
      <div className={styles.invitationCopy}><span className={styles.eyebrow}>KEEP THE INSPIRATION CLOSE.</span><h2 id="download-heading">Your next tattoo<br/>starts with <em>a feeling.</em></h2><p>Follow it. Find your artist on Vanta.</p><Downloads/><span className={styles.downloadNote}>Available on iPhone · Android beta now open</span></div>
    </section>
    <footer className={styles.footer}>
      <div className={styles.footerBrand}><Link href="/" aria-label="Vanta home"><Wordmark/></Link><span>A home for your next tattoo.</span></div>
      <nav className={styles.makerLinks} aria-label="For tattoo professionals"><span>On the other side of the needle?</span><Link href="/artists">Vanta Artist <Arrow/></Link><Link href="/studio">Vanta Studio <Arrow/></Link></nav>
      <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Vanta Ink</span><nav aria-label="Footer"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:support@vanta.tattoo">Contact</a></nav></div>
    </footer>
  </main>;
}
