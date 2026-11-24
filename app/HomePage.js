'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { afterSiteIntro } from '../lib/siteIntro';
import styles from './home.module.css';

const appStore = 'https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738';
// The Android app is a closed beta on Google Play: only invited testers can install it, and the Play
// pages show "App not available" to everyone else. So the Android button asks people to email for an
// invite, with the Google account to add. On release, point this at the store page again.
const androidBeta = 'mailto:support@vanta.tattoo?subject=Vanta%20Android%20beta%20access&body=Hi%2C%20I%E2%80%99d%20like%20access%20to%20the%20Vanta%20Android%20beta.%20The%20Google%20account%20on%20my%20phone%20is%3A%20';

// The wall: real work, hung on one centre line, each with a gallery placard.
const pieces = [
  { id: 'peony', src: '/welcome/wall-1.webp', width: 720, height: 1080, title: 'Peony', style: 'Fine Line', placement: 'Inner forearm', tags: ['Fine Line'], alt: 'Fine-line peony tattoo on an inner forearm' },
  { id: 'headdress', src: '/welcome/wall-4.webp', width: 720, height: 1002, title: 'Headdress portrait', style: 'Realism', placement: 'Forearm', tags: ['Realism'], detail: { src: '/home/detail-headdress.webp', width: 720, height: 668 }, alt: 'Black and grey portrait tattoo of a woman in a feathered headdress on a forearm' },
  { id: 'sleeve', src: '/welcome/wall-3.webp', width: 720, height: 1080, title: 'Skull and rose', style: 'Old School', placement: 'Arm and hand', tags: ['Old School'], alt: 'Old school sleeve with a skull, a rose and lettering across the arm and hand' },
  { id: 'wings', src: '/welcome/wall-5.webp', width: 562, height: 1080, title: 'Winged piece', style: 'Blackwork', placement: 'Upper back', tags: ['Blackwork'], detail: { src: '/home/detail-wings.webp', width: 720, height: 669 }, alt: 'Blackwork winged tattoo across a woman’s upper back' },
  { id: 'olive', src: '/welcome/wall-2.webp', width: 720, height: 900, title: 'Olive branch', style: 'Fine Line', placement: 'Outer forearm', tags: ['Fine Line'], alt: 'Fine-line olive branch tattoo on an outer forearm' },
  { id: 'flash', src: '/studio/flash-sheet.webp', width: 1024, height: 1536, title: 'Flash sheet', style: 'Old School', placement: 'Ink on paper', tags: ['Old School'], alt: 'A sheet of tattoo flash: a dagger with a banner, a swallow, a peony, a snake, a moth, a sacred heart, a sprig, a star and a moon' },
];
// The app's tattoo styles, same names and order (vanta-ios TattooFilterOptions.styles).
const appStyles = ['Abstract', 'Blackwork', 'Cartoon', 'Dotwork', 'Fine Line', 'Geometric', 'Illustrative', 'Japanese', 'Lettering', 'Minimalist', 'New School', 'Old School', 'Ornamental', 'Realism', 'Tribal', 'Watercolor', 'Other'];
// The headline's last words choose the style: "Find your next tattoo in Fine Line". Only styles with
// work on the wall are offered, so a choice never empties it; tagging new photos adds their styles.
const styleFilters = [
  { id: 'all', label: 'any style' },
  ...appStyles.filter(style => pieces.some(piece => piece.tags.includes(style))).map(style => ({ id: style, label: style })),
];
const optionId = id => `style-${id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

function Arrow() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>;
}
// Android visitors get Google Play first; everyone else the App Store.
function useIsAndroid() {
  const [isAndroid, setIsAndroid] = useState(false);
  useEffect(() => {
    setIsAndroid(navigator.userAgentData?.platform === 'Android' || /Android/i.test(navigator.userAgent));
  }, []);
  return isAndroid;
}
function Downloads() {
  const isAndroid = useIsAndroid();

  return <div className={styles.downloads} aria-label="Get the Vanta app">
    <a href={appStore} className={styles.storeBadge} data-preferred={!isAndroid} target="_blank" rel="noopener noreferrer" aria-label="Download Vanta on the App Store">
      <svg viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.3 143.1-317 284-317 74.9 0 137.2 48.3 184.4 48.3 44.9 0 117.1-51.5 200.3-51.5 32.3 0 117.1 2.6 178.1 97.3zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
      <span><small>Download on the</small><strong>App Store</strong></span>
    </a>
    <a href={androidBeta} className={styles.storeBadge} data-preferred={isAndroid} aria-label="Request access to the Vanta Android beta by email">
      <svg viewBox="0 0 24 26" aria-hidden="true" fill="currentColor"><path d="M2 2.2v21.6L13 13 2 2.2Zm1.8-.7 12 6.8-2.2 2.8L3.8 1.5Zm0 23 9.8-9.6 2.2 2.8-12 6.8ZM15 13l2.7-3.3 4.4 2.5c.6.4.6 1.2 0 1.6l-4.4 2.5L15 13Z"/></svg>
      <span><small>Android beta</small><strong>Request access</strong></span>
    </a>
  </div>;
}
function Wordmark() {
  return <span className={styles.wordmark}>vanta</span>;
}

// Order the headline walks through on its own, ending back on the full wall.
const cycleOrder = [...styleFilters.slice(1).map(item => item.id), 'all'];
const CYCLE_MS = 2400; // about 2.4s per word; the word takes ~0.75s to sketch in

// The style word "sketches in" when it changes: violet linework wipes across, then the ink fills it.
function SketchWord({ label, animate }) {
  return <span className={styles.word} data-anim={animate}>
    <span className={styles.wordFill}>{label}</span>
    <span className={styles.wordLine} aria-hidden="true">{label}</span>
  </span>;
}

function StylePicker({ value, onChange, onOpenChange, onHold, animate }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const list = useRef(null);
  const current = styleFilters.find(item => item.id === value);
  useEffect(() => {
    if (!open) return;
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    list.current?.focus();
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  function show() { setActive(styleFilters.findIndex(item => item.id === value)); setOpen(true); }
  function choose(index) {
    onChange(styleFilters[index].id); setOpen(false);
    root.current?.querySelector('button')?.focus();
  }
  function onListKey(event) {
    const last = styleFilters.length - 1;
    const moves = { ArrowDown: Math.min(active + 1, last), ArrowUp: Math.max(active - 1, 0), Home: 0, End: last };
    if (event.key in moves) { event.preventDefault(); setActive(moves[event.key]); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(active); }
    else if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); setOpen(false); root.current?.querySelector('button')?.focus(); }
  }
  return <span className={styles.picker} ref={root} onPointerEnter={event => { if (event.pointerType === 'mouse') onHold?.('hover', true); }} onPointerLeave={() => onHold?.('hover', false)}
    onFocus={() => onHold?.('focus', true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onHold?.('focus', false); }}>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls="style-list" aria-label={`Tattoo style: ${current.label}`} onClick={() => (open ? setOpen(false) : show())}
      onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); show(); } }}>
      <SketchWord key={value} label={current.label} animate={animate}/><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    <ul id="style-list" ref={list} role="listbox" aria-label="Tattoo style" tabIndex={-1} hidden={!open} aria-activedescendant={open ? optionId(styleFilters[active].id) : undefined} onKeyDown={onListKey}>
      {styleFilters.map((item, index) => <li key={item.id} id={optionId(item.id)} role="option" aria-selected={item.id === value} data-active={index === active} onPointerEnter={() => setActive(index)} onClick={() => choose(index)}>{item.label}</li>)}
    </ul>
  </span>;
}

// Phones: the wall becomes a still strip of the pieces in the chosen style, hung side by side. When the
// style word changes, the strip flicks: the current set slides out to the left and the next slides in
// from the right, always the same way. It is the same work as the wall (which stays in the page for
// screen readers), so the strip itself is hidden from them.
const FLICK_MS = 650;
// Every style shows at least two pictures, like the others: a style with a single piece on the wall
// also shows a close-up of that same piece, labelled as a detail.
function stripPieces(filter) {
  const shown = pieces.filter(piece => filter === 'all' || piece.tags.includes(filter));
  if (shown.length !== 1 || !shown[0].detail) return shown;
  const [piece] = shown;
  return [piece, { ...piece, ...piece.detail, id: `${piece.id}-detail`, title: `${piece.title}, detail` }];
}
function FlickStrip({ filter }) {
  const [sets, setSets] = useState([{ id: 0, filter, state: 'rest' }]);
  const count = useRef(0);
  const current = useRef(filter);
  useEffect(() => {
    if (current.current === filter) return;
    current.current = filter;
    count.current += 1;
    setSets(previous => [{ ...previous[previous.length - 1], state: 'out' }, { id: count.current, filter, state: 'in' }]);
    const settle = window.setTimeout(() => setSets(previous => previous.filter(set => set.state !== 'out').map(set => ({ ...set, state: 'rest' }))), FLICK_MS);
    return () => window.clearTimeout(settle);
  }, [filter]);
  return <div className={styles.flick} aria-hidden="true">
    {sets.map(set => <div key={set.id} className={styles.flickSet} data-state={set.state}>
      {stripPieces(set.filter).map(piece => <figure key={piece.id} className={styles.flickPiece}>
        <img src={piece.src} alt="" width={piece.width} height={piece.height} decoding="async"/>
        <figcaption className={styles.placard}><strong>{piece.title}</strong><span>{piece.style}</span></figcaption>
      </figure>)}
    </div>)}
  </div>;
}

function GalleryWall({ filter, announce, onTouchHold }) {
  const matches = piece => filter === 'all' || piece.tags.includes(filter);
  const count = pieces.filter(matches).length;
  const wall = useRef(null);
  const touched = useRef(0);
  const release = useRef(0);
  // On a phone or tablet the wall is a swipe row that loops: the pieces are hung three times and the
  // row sits on the middle set. A new style always slides the row forward (leftward) to the next match,
  // never back, and once it drifts into a neighbouring set it is moved silently by one set's width.
  // The copies are decoration for the loop: hidden from screen readers and from the desktop wall.
  const setStart = copy => wall.current?.querySelector(`[data-copy="${copy}"][data-first]`)?.offsetLeft ?? 0;
  const isStrip = () => { const row = wall.current; return row && row.scrollWidth > row.clientWidth + 1; };
  useEffect(() => {
    const row = wall.current;
    if (!isStrip()) return;
    const padding = parseFloat(getComputedStyle(row).paddingLeft || 0);
    row.scrollLeft = setStart(1) - padding;
    let settle = 0;
    const recentre = () => {
      const span = setStart(2) - setStart(1);
      if (!span) return;
      const position = row.scrollLeft + padding;
      if (position >= setStart(2) - 1) row.scrollLeft -= span;
      else if (position < setStart(1) - span / 2) row.scrollLeft += span;
    };
    const onScroll = () => { window.clearTimeout(settle); settle = window.setTimeout(recentre, 160); };
    row.addEventListener('scroll', onScroll, { passive: true });
    return () => { row.removeEventListener('scroll', onScroll); window.clearTimeout(settle); };
  }, []);
  useEffect(() => {
    const row = wall.current;
    if (!isStrip() || Date.now() - touched.current < 4000) return;
    const padding = parseFloat(getComputedStyle(row).paddingLeft || 0);
    const here = row.scrollLeft + padding;
    const candidates = [...row.querySelectorAll(filter === 'all' ? '[data-first]' : '[data-dim=false]')];
    const next = candidates.find(item => item.offsetLeft > here + 4) ?? candidates[candidates.length - 1];
    if (!next) return;
    row.scrollTo({ left: next.offsetLeft - padding, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [filter]);
  function onTouch() {
    touched.current = Date.now();
    onTouchHold?.('touch', true);
    window.clearTimeout(release.current);
    release.current = window.setTimeout(() => onTouchHold?.('touch', false), 4000);
  }
  useEffect(() => () => window.clearTimeout(release.current), []);
  return <div className={styles.wallArea}>
    <span className={styles.visuallyHidden} aria-live="polite">{!announce ? '' : filter === 'all' ? `${pieces.length} pieces on the wall` : `${count} ${count === 1 ? 'piece' : 'pieces'} in ${styleFilters.find(item => item.id === filter).label}`}</span>
    <FlickStrip filter={filter}/>
    <ul ref={wall} className={styles.wall} aria-label="Tattoos on the wall" onPointerDown={onTouch} onWheel={event => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) onTouch(); }}>
      {[0, 1, 2].flatMap(copy => pieces.map((piece, index) => {
        const real = copy === 1;
        return <li key={`${copy}-${piece.id}`} className={styles.piece} data-piece={piece.id} data-dim={!matches(piece)} data-copy={copy} data-first={index === 0 ? '' : undefined}
          aria-hidden={real ? undefined : true} style={{ '--i': index, '--ratio': piece.width / piece.height }}>
          <figure>
            <img src={piece.src} alt={real ? piece.alt : ''} width={piece.width} height={piece.height} decoding="async" loading={real ? undefined : 'lazy'} fetchPriority={real && index < 3 ? 'high' : 'auto'}/>
            <figcaption className={styles.placard}><strong>{piece.title}</strong><span>{piece.style}</span></figcaption>
          </figure>
        </li>;
      }))}
    </ul>
  </div>;
}

const chapters = [
  { short: 'Discover', title: 'The work catches your eye. The artist makes it yours.', description: 'Explore portfolios, save the pieces you love and get to know the person behind the work. Find an artist who feels right for your idea.', screens: [
    { image: '/home/discover-feed.webp', screen: 'For you', alt: 'Vanta For you feed of tattoo photos from artists' },
    { image: '/home/discover-piece.webp', screen: 'Tattoo page', alt: 'Vanta tattoo page for a botanical blackwork piece, with its style and placement' },
    { image: '/home/artist-profile.webp', screen: 'Artist profile', alt: 'Vanta artist profile showing a portfolio and options to message or book' },
  ], details: ['Explore portfolios', 'Save your favourites', 'Start a conversation'] },
  { short: 'Your idea', title: 'A rough idea is a perfectly good start.', description: 'A reference photo. A placement. A story you want to tell. Bring it together in a booking request and give your artist something to work with.', screens: [
    { image: '/home/idea-piece.webp', screen: 'Saved piece', alt: 'Vanta tattoo page for an old school sleeve, with its style and body placement' },
    { image: '/home/booking-request.webp', screen: 'Booking request', alt: 'Vanta booking request with reference photos, design description and placement' },
  ], details: ['Add reference photos', 'Choose the placement', 'Share the details'] },
  { short: 'Book it', title: 'That someday tattoo? Put a date on it.', description: 'Review your artist’s quote and proposed times. Choose a session that works for you and pay the required deposit to confirm your booking.', screens: [
    { image: '/home/appointment.webp', screen: 'Appointment proposal', alt: 'Vanta appointment proposal showing a quote, deposit and available time' },
    { image: '/home/book-deposit.webp', screen: 'Deposit', alt: 'Vanta deposit screen showing the session, the deposit and booking fee, and a button to pay and confirm' },
  ], details: ['Review your quote', 'Choose a time', 'Confirm your booking'] },
];
// The three steps are the section's big type. The current one is violet, like the hero's style word,
// and they take turns on their own while the section fills most of the screen: the underline fills up
// as the time for each step runs out. A tap or a key press hands control to the visitor.
// What sits around the phone for each step: the saved work, the idea's reference and notes, the booking.
// Decoration only (the screen and copy carry the meaning), so it's hidden from screen readers.
function JourneyProps({ chapter }) {
  const on = index => String(index === chapter);
  return <div className={styles.props} aria-hidden="true">
    <figure className={`${styles.prop} ${styles.photo}`} data-on={on(0)} data-slot="d1"><img src="/welcome/wall-4.webp" alt="" width="720" height="1002" loading="lazy"/><figcaption>Headdress portrait<br/>Realism</figcaption></figure>
    <figure className={`${styles.prop} ${styles.photo}`} data-on={on(0)} data-slot="d2"><img src="/welcome/wall-5.webp" alt="" width="562" height="1080" loading="lazy"/><span className={styles.saved}><svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill="currentColor"/></svg>Saved</span></figure>
    <figure className={`${styles.prop} ${styles.photo}`} data-on={on(1)} data-slot="i1"><img src="/welcome/wall-1.webp" alt="" width="720" height="1080" loading="lazy"/><figcaption>Reference 1 of 3</figcaption></figure>
    <div className={`${styles.prop} ${styles.note}`} data-on={on(1)} data-slot="i2"><small>Placement</small>Inner forearm</div>
    <div className={`${styles.prop} ${styles.note}`} data-on={on(1)} data-slot="i3"><small>Colour</small>Black &amp; grey</div>
    <div className={`${styles.prop} ${styles.ticket}`} data-on={on(2)} data-slot="b1">
      <small>Booking confirmed</small>
      <strong>Sun 21 Jun</strong>
      <span>1:00 pm · Medium session</span>
      <span className={styles.ticketRow}><span>Deposit</span><b>$50.00</b></span>
    </div>
    <div className={`${styles.prop} ${styles.stamp}`} data-on={on(2)} data-slot="b2">Deposit<br/>paid</div>
  </div>;
}

const SCREEN_MS = 3200; // each screen in a step; a step with three screens runs about 10s
function AppJourney() {
  const [chapter, setChapter] = useState(0);
  const [shot, setShot] = useState(0);
  const [auto, setAuto] = useState(true);
  const [changed, setChanged] = useState(false);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState({ hover: false, focus: false });
  const section = useRef(null);
  const active = chapters[chapter];
  const screen = active.screens[shot] ?? active.screens[0];
  const playing = auto && inView && !held.hover && !held.focus;
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setAuto(false);
    const element = section.current;
    if (!element || !('IntersectionObserver' in window)) return;
    // "In view" means the section covers at least half the screen, so it never runs while just peeking in.
    const observer = new IntersectionObserver(([entry]) => {
      const screen = entry.rootBounds?.height || window.innerHeight;
      setInView(entry.isIntersecting && entry.intersectionRect.height >= screen * 0.5);
    }, { root: element.closest('main'), threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const hold = (key, value) => setHeld(current => current[key] === value ? current : { ...current, [key]: value });
  function pick(index) { setAuto(false); setChanged(true); setChapter(index); setShot(0); }
  function pickShot(index) { setAuto(false); setShot(index); }
  // The underline runs once per screen, filling its share of the word; after the last screen the next step starts.
  function advance() {
    if (shot < active.screens.length - 1) { setShot(shot + 1); return; }
    setChanged(true); setShot(0); setChapter((chapter + 1) % chapters.length);
  }
  function navigate(event, index) {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % chapters.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + chapters.length - 1) % chapters.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = chapters.length - 1;
    if (next !== undefined) {
      event.preventDefault(); pick(next);
      document.getElementById(`journey-tab-${next}`)?.focus();
    }
  }
  return <section id="the-experience" ref={section} className={styles.journey} aria-labelledby="journey-heading" data-reveal data-playing={playing}
    onFocus={() => hold('focus', true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) hold('focus', false); }}>
    <div className={`${styles.inner} ${styles.journeyGrid}`}>
      <div className={styles.journeyText} onPointerEnter={event => { if (event.pointerType === 'mouse') hold('hover', true); }} onPointerLeave={() => hold('hover', false)}>
        <h2 id="journey-heading" className={styles.journeyKicker}>From a saved piece to a booked session</h2>
        <div className={styles.steps} role="tablist" aria-label="Your tattoo journey" aria-orientation="vertical">
          {chapters.map((item, index) => {
            const on = index === chapter;
            return <button key={item.short} type="button" role="tab" id={`journey-tab-${index}`} aria-selected={on} aria-controls="journey-panel" tabIndex={on ? 0 : -1}
              onClick={() => pick(index)} onKeyDown={event => navigate(event, index)} data-timer={on && auto}>
              <span className={styles.stepWord}>
                {on ? <SketchWord key={chapter} label={item.short} animate={changed}/> : item.short}
                {on && auto && <span key={`timer-${chapter}-${shot}`} className={styles.stepTimer} style={{ animationDuration: `${SCREEN_MS}ms`, '--from': shot / item.screens.length, '--to': (shot + 1) / item.screens.length }} onAnimationEnd={advance} aria-hidden="true"/>}
              </span>
            </button>;
          })}
        </div>
        <div role="tabpanel" id="journey-panel" aria-labelledby={`journey-tab-${chapter}`} className={styles.chapterPanel}>
          {/* All three are laid out in one cell so the block keeps the tallest one's height and nothing below jumps */}
          {chapters.map((item, index) => <div key={item.short} className={styles.chapterCopy} data-on={index === chapter} aria-hidden={index !== chapter} inert={index !== chapter ? '' : undefined}>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <ul>{item.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
          </div>)}
        </div>
      </div>
      <div className={styles.stage} data-step={chapter}>
        <JourneyProps chapter={chapter}/>
        <figure className={styles.screen}>
          <div className={styles.phone}>
            {chapters.flatMap((item, index) => item.screens.map((view, viewIndex) => {
              const on = index === chapter && viewIndex === shot;
              return <img key={view.image} src={view.image} alt={on ? view.alt : ''} aria-hidden={!on} data-on={on} width="560" height="1218" loading="lazy"/>;
            }))}
          </div>
          <figcaption className={styles.screenCaption}>
            <span className={styles.placard}><strong>{screen.screen}</strong><span>Inside the Vanta app</span></span>
            {active.screens.length > 1 && <span className={styles.shots} role="group" aria-label={`${active.short} screens`}>
              {active.screens.map((view, index) => <button key={view.image} type="button" aria-label={`Show ${view.screen}`} aria-pressed={index === shot} onClick={() => pickShot(index)}><i/></button>)}
            </span>}
          </figcaption>
        </figure>
      </div>
    </div>
  </section>;
}

// The artist and studio products. Each feature line is also a control: it shows that part of the
// product on the screen beside it. Left alone, the lines take turns while the card is in view.
const makers = [
  { id: 'artist', href: '/artists', audience: 'For artists', where: 'In the app', name: 'Vanta Artist', frame: 'phone',
    body: 'Your whole tattoo business in your pocket. Get found, take bookings, collect deposits and consent, and keep your calendar, all in one app.',
    features: [
      { label: 'Booking link and requests', image: '/home/artist-request.webp', height: 1305, alt: 'Vanta booking request form where a client adds reference photos, a description and the placement' },
      { label: 'Quotes and deposits', image: '/home/artist-quote.webp', height: 1304, alt: 'Vanta new appointment screen with the duration, estimated quote of $300 and a $50 deposit' },
      { label: 'Consent forms', image: '/home/artist-consent.webp', height: 1304, alt: 'Vanta consent form a client reads and agrees to before their appointment' },
      { label: 'Calendar and reminders', image: '/home/artist-bookings.webp', height: 1304, alt: 'Vanta bookings calendar for October with the day’s three confirmed clients' },
      { label: 'Portfolio clients can find', image: '/home/artist-portfolio.webp', height: 1305, alt: 'Vanta artist profile with a grid of portfolio tattoos' },
    ] },
  { id: 'studio', href: '/studio', audience: 'For studios', where: 'On the web', name: 'Vanta Studio', frame: 'browser',
    body: 'One platform for the whole studio. Every artist’s schedule, clients, consent, payouts and reporting, set up for tattoo and body art.',
    features: [
      { label: 'Schedule by artist or station', image: '/home/studio-schedule.webp', height: 1117, alt: 'Vanta Studio day schedule split by station, with each client’s booking and artist' },
      { label: 'Client records and consent', image: '/home/studio-client.webp', height: 1035, alt: 'Vanta Studio client record showing sessions, contact details and a signed consent form' },
      { label: 'Deposits and artist payouts', image: '/home/studio-financial.webp', height: 1216, alt: 'Vanta Studio financial page with gross sales, deposits and remaining balances' },
      { label: 'Sales and analytics', image: '/home/studio-analytics.webp', height: 1216, alt: 'Vanta Studio analytics with appointment counts, no-shows and appointment revenue' },
      { label: 'Your team in one place', image: '/home/studio-artists.webp', height: 1147, alt: 'Vanta Studio list of the artists approved at the studio' },
    ] },
];
const FEATURE_MS = 3400;
function PhoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>;
}
function WebIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8.5 21h7M12 17v4"/></svg>;
}
function MakerCard({ maker }) {
  const [shown, setShown] = useState(0);
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState(false);
  const card = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setAuto(false); return; }
    const element = card.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio >= 0.5), { root: element.closest('main'), threshold: [0, 0.5, 1] });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!auto || !inView || held) return;
    const timer = window.setInterval(() => { if (!document.hidden) setShown(current => (current + 1) % maker.features.length); }, FEATURE_MS);
    return () => window.clearInterval(timer);
  }, [auto, inView, held, maker.features.length]);
  const screens = maker.features.map((feature, index) => <img key={feature.image} src={feature.image} alt={index === shown ? feature.alt : ''} aria-hidden={index !== shown} data-on={index === shown} width={maker.frame === 'phone' ? 600 : 700} height={feature.height} loading="lazy"/>);
  return <div ref={card} className={styles.makerCard} data-maker={maker.id}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHeld(true); }} onPointerLeave={() => setHeld(false)}
    onFocus={() => setHeld(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false); }}>
    <div className={styles.makerText}>
      <span className={styles.makerTag}>{maker.audience}<span aria-hidden="true">·</span><span className={styles.makerWhere}>{maker.frame === 'phone' ? <PhoneIcon/> : <WebIcon/>}{maker.where}</span></span>
      <h3>{maker.name}</h3>
      <p className={styles.makerBody}>{maker.body}</p>
      <ul className={styles.makerList} aria-label={`What ${maker.name} handles`}>
        {maker.features.map((feature, index) => <li key={feature.label}><button type="button" aria-pressed={index === shown} aria-controls={`${maker.id}-screen`} onClick={() => { setAuto(false); setShown(index); }}>{feature.label}</button></li>)}
      </ul>
      <a className={styles.makerCta} href={maker.href}>See {maker.name}<Arrow/></a>
    </div>
    <div className={styles.makerArt} id={`${maker.id}-screen`}>
      {maker.frame === 'phone'
        ? <span className={styles.phoneShot}>{screens}</span>
        : <span className={styles.browser}><span className={styles.browserBar} aria-hidden="true"><i/><i/><i/></span><span className={styles.browserScreens}>{screens}</span></span>}
    </div>
  </div>;
}

export default function HomePage() {
  const page = useRef(null);
  const [hung, setHung] = useState(false);
  const [filter, setFilter] = useState('all');
  // The headline changes style on its own until the visitor picks one. It rests only while the pointer
  // or keyboard focus is on the style words, the list is open, the wall row was just swiped, or the tab is hidden.
  // It never runs with reduced motion.
  const [autoCycle, setAutoCycle] = useState(true);
  const [held, setHeld] = useState({ hover: false, focus: false, open: false, touch: false });
  const [changed, setChanged] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const paused = held.hover || held.focus || held.open || held.touch;
  const hold = useCallback((key, value) => setHeld(current => current[key] === value ? current : { ...current, [key]: value }), []);
  const onOpenChange = useCallback(open => hold('open', open), [hold]);
  useEffect(() => {
    if (!hung || !autoCycle || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setChanged(true);
      setFilter(current => cycleOrder[(cycleOrder.indexOf(current) + 1) % cycleOrder.length]);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [hung, autoCycle, paused]);
  // Phones: once the hero's buttons have scrolled away, a download bar waits at the bottom of the
  // screen, and steps aside again at the closing download section.
  const isAndroid = useIsAndroid();
  const heroDownloads = useRef(null);
  const [cta, setCta] = useState({ hero: true, end: false, makers: false });
  useEffect(() => {
    const root = page.current;
    const end = root?.querySelector('#get-vanta');
    // The bar is for clients, so it also steps aside over the section for artists and studios
    const makers = root?.querySelector('section[aria-labelledby="makers-heading"]');
    if (!root || !end || !heroDownloads.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      const key = entry.target === end ? 'end' : entry.target === makers ? 'makers' : 'hero';
      // The closing section counts as reached once it's on screen or scrolled past
      const value = entry.isIntersecting || (key === 'end' && entry.boundingClientRect.top < 0);
      setCta(current => ({ ...current, [key]: value }));
    }), { root });
    observer.observe(heroDownloads.current); observer.observe(end); if (makers) observer.observe(makers);
    return () => observer.disconnect();
  }, []);
  const showBar = hung && !cta.hero && !cta.end && !cta.makers;
  function pickStyle(id) { setAutoCycle(false); setAnnounce(true); setChanged(true); setFilter(id); }
  useEffect(() => afterSiteIntro(() => setHung(true)), []);
  useEffect(() => {
    const root = page.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.setAttribute('data-visible', 'true'); observer.unobserve(entry.target); }
    }), { root, threshold: 0.08 });
    root.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return <main ref={page} className={`gallery ${styles.page}`} aria-label="Vanta home" data-hung={hung}>
    <header className={styles.navigation}>
      <a href="/" aria-label="Vanta home"><Wordmark/></a>
      <nav aria-label="Vanta products"><a href="/artists">For artists</a><a href="/studio">For studios</a><a href={isAndroid ? androidBeta : appStore} className={styles.navCta} {...(isAndroid ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>Get the app</a></nav>
    </header>
    <section className={styles.hero} aria-labelledby="home-heading">
      <div className={styles.heroTop}>
        <h1 id="home-heading"><span className={styles.headLine}>Find your next tattoo</span> <span className={styles.headLine}>in <StylePicker value={filter} onChange={pickStyle} onOpenChange={onOpenChange} onHold={hold} animate={changed}/></span></h1>
        <div className={styles.heroAside}>
          <p>Browse real work from tattoo artists, save the pieces you love and book your artist, all in the Vanta app.</p>
          <div ref={heroDownloads} className={styles.heroDownloads}><Downloads/></div>
        </div>
      </div>
      <GalleryWall filter={filter} announce={announce} onTouchHold={hold}/>
    </section>
    <AppJourney/>
    <section className={styles.makers} aria-labelledby="makers-heading" data-reveal>
      <div className={styles.inner}>
        <header className={styles.makersHead}>
          <h2 id="makers-heading">On the other side of the needle?</h2>
          <p>Run your whole tattoo business from one platform. Vanta handles the day to day and more, built around how tattooing and body art actually work.</p>
        </header>
        <div className={styles.makerLinks}>
          {makers.map(maker => <MakerCard key={maker.id} maker={maker}/>)}
        </div>
      </div>
    </section>
    <section id="get-vanta" className={styles.invitation} aria-labelledby="download-heading" data-reveal>
      <div className={styles.invitationCopy}>
        <h2 id="download-heading">Your next tattoo is already out there.</h2>
        <p>Find it, save it and book the artist who made it.</p>
        <Downloads/>
        <span className={styles.downloadNote}>Available on iPhone. Android is in beta: email us for an invite.</span>
      </div>
      <div className={styles.invitationArt}>
        <figure><img src="/home/detail-peony.webp" alt="Close-up of the fine-line peony's petals and leaves" width="900" height="1124" loading="lazy"/><figcaption className={styles.placard}><strong>Peony, detail</strong><span>Fine Line</span></figcaption></figure>
        <figure><img src="/home/detail-rose.webp" alt="Close-up of a black and grey rose on the back of a hand, with LUCE lettered across the fingers" width="900" height="900" loading="lazy"/><figcaption className={styles.placard}><strong>Rose and lettering, detail</strong><span>Old School</span></figcaption></figure>
      </div>
    </section>
    <footer className={styles.footer}>
      <a href="/" aria-label="Vanta home" className={styles.footerMark}>vanta</a>
      <div className={styles.footerBottom}>
        <span>© {new Date().getFullYear()} Vanta Ink</span>
        <nav aria-label="Footer"><a href="/artists">Vanta Artist</a><a href="/studio">Vanta Studio</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:support@vanta.tattoo">Contact</a></nav>
      </div>
    </footer>
    <aside className={styles.appBar} data-show={showBar} aria-label="Get the Vanta app" inert={showBar ? undefined : ''}>
      <img src="/home/app-icon.webp" alt="" width="44" height="44"/>
      <p><strong>Vanta</strong><span>{isAndroid ? 'Android beta · by invite' : 'Free on the App Store'}</span></p>
      <a href={isAndroid ? androidBeta : appStore} {...(isAndroid ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{isAndroid ? 'Request' : 'Get'}</a>
    </aside>
  </main>;
}
