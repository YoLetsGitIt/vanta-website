'use client';

// The artist page built for phones. It is a separate set of screens, not the desktop page squeezed:
// one idea per screen, toggles instead of side-by-side columns, swipeable screenshots, settings that
// open as bottom sheets, and a download bar that stays under the thumb. The content and the
// interactive pieces (client form, lock screen, settings list) are shared with the desktop page, so
// both say the same thing. Shown at 720px and narrower; the desktop page is hidden there.
import { appScreens, HomeScreen } from './AppScreens';
import BookingPagePreview, { stepForSetting } from './BookingPagePreview';
import { useEffect, useRef, useState } from 'react';
import a from './artists.module.css';
import m from './mobile.module.css';
import {
  appStore, androidBeta, artist, work, useIsAndroid, Downloads, BookingFormPreview, DaySheet, heroDay, fullDay,
  questions, typicalSetup, ClientPreview, TryBadge, LiveLabel, SettingIcon, useQuizGate, SessionTypeScreens, AllSettings, formQuestions, formGroups, modes,
  proPerks, LockPhone,
} from './ArtistsPage';

/* ---------- Small native-feeling parts ---------- */

// A segmented control, like the app's: one choice at a time, the panels below switch with it.
function Segmented({ label, options, value, onChange }) {
  return <div className={m.segmented} role="tablist" aria-label={label} style={{ '--count': options.length, '--index': options.findIndex(([key]) => key === value) }}>
    <i className={m.segmentThumb} aria-hidden="true"/>
    {options.map(([key, text]) => <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)}>{text}</button>)}
  </div>;
}

// A segmented control over panels that also swipe sideways, like paged views in an app. Tapping a segment pages
// the track; swiping it moves the segment. The panels share one row, so the tallest one sets the height.
function SwipePanels({ label, options, value, onChange, children, className }) {
  const track = useRef(null);
  const index = Math.max(0, options.findIndex(([key]) => key === value));
  const current = useRef(value);
  const change = useRef(onChange);
  const swiped = useRef(false);
  current.current = value; change.current = onChange;
  useEffect(() => {
    const root = track.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const key = options[Number(entry.target.dataset.panel)]?.[0];
      if (key && key !== current.current) { swiped.current = true; change.current(key); }
    }), { root, threshold: 0.6 });
    root.querySelectorAll(':scope > [data-panel]').forEach(panel => observer.observe(panel));
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (swiped.current) { swiped.current = false; return; }
    const root = track.current;
    if (!root) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    root.scrollTo({ left: index * root.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  }, [index]);
  return <div className={className}>
    <Segmented label={label} options={options} value={value} onChange={onChange}/>
    <div ref={track} className={m.swipeTrack}>
      {[].concat(children).map((child, i) => <div key={i} data-panel={i} className={m.swipePanel} inert={i === index ? undefined : ''}>{child}</div>)}
    </div>
  </div>;
}

// A bottom sheet on the native <dialog>: Esc, the Done button or a tap on the dim area closes it.
function Sheet({ sheetRef, title, children }) {
  const close = () => sheetRef.current?.close();
  return <dialog ref={sheetRef} className={m.sheet} aria-label={title} onClick={event => { if (event.target === sheetRef.current) close(); }}>
    <div className={m.sheetInner}>
      <i className={m.grabber} aria-hidden="true"/>
      <div className={m.sheetHead}><b>{title}</b><button type="button" onClick={close}>Done</button></div>
      {children}
    </div>
  </dialog>;
}

function SectionHead({ kicker, id, title, text }) {
  return <header className={m.head}>
    <p className={a.kicker}>{kicker}</p>
    <h2 id={id}>{title}</h2>
    {text && <p className={m.lead}>{text}</p>}
  </header>;
}

/* ---------- 1. First screen: the headline and a phone that shows both sides ---------- */

const sides = [
  ['clients', 'What clients see', 'Your work and your booking form in one place. They see what they can get and book it straight away.'],
  ['you', 'What you see', 'One app for your day to day: requests, quotes, deposits, consent, reminders and your calendar.'],
];

function Hero({ isAndroid }) {
  const [side, setSide] = useState('clients');
  // One composed first screen, the height of the phone: the words at the top, the phone rising from the bottom edge
  // with the two sides to swipe between, and the download button floating over its foot, under the thumb.
  return <section id="m-top" className={m.hero} aria-labelledby="m-artist-heading">
    <div className={m.heroCopy}>
      <p className={a.kicker}>Vanta for tattoo artists</p>
      <h1 id="m-artist-heading"><span>Show your work.</span> <span>Get booked.</span> <em>Vanta runs the rest.</em></h1>
      <p className={m.heroLead}>Your portfolio, your booking form and your whole day, in one free app.</p>
    </div>
    <SwipePanels className={m.heroStage} label="Which side of the booking" options={sides.map(([key, text]) => [key, text])} value={side} onChange={setSide}>
      <div className={m.heroPanel} data-side="clients">
        <div className={m.heroPhone} role="img" aria-label={sides[0][2]}><div className={m.phoneScreen} data-shown="" aria-hidden="true"><BookingFormPreview/></div></div>
      </div>
      <div className={m.heroPanel} data-side="you">
        <div className={`${m.heroPhone} ${m.heroPhoneApp}`} role="img" aria-label={sides[1][2]}><div className={m.heroApp} data-shown="" aria-hidden="true"><HomeScreen/></div></div>
      </div>
    </SwipePanels>
    <div className={m.heroDock}>
      <a className={m.primary} href={isAndroid ? androidBeta : appStore} {...(isAndroid ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
      {isAndroid
        ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 3.2c-.3.3-.5.8-.5 1.4v14.8c0 .6.2 1.1.5 1.4L13 12 4.5 3.2Zm9.6 9.9 2.4 2.4-10.3 5.9 7.9-8.3Zm0-2.2L6.2 2.6l10.3 5.9-2.4 2.4Zm3.7-1.6 2.9 1.7c.9.5.9 1.6 0 2.1l-2.9 1.7-2.6-2.7 2.6-2.8Z"/></svg>
        : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6 1.3-.1 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.3 3-2.5 1-1.4 1.3-2.7 1.4-2.8-.1 0-2.4-.9-2.4-4.2ZM13.9 4.9c.7-.9 1.2-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3.1 1.1.1 2.2-.6 2.9-1.4Z"/></svg>}
      {isAndroid ? 'Request the Android beta' : <><span className={m.longLabel}>Download free on the App Store</span><span className={m.shortLabel}>Free on the App Store</span></>}
      </a>
    </div>
  </section>;
}

/* ---------- 2. Your rules: two questions, then your setup as a settings list ---------- */

// Each row of the setup list, with the short value shown on the row and the choices in its sheet.
const setupRows = [
  { key: 'time', label: 'How clients book', options: [['instant', 'Book a slot'], ['avail', 'When they’re free']] },
  { key: 'type', label: 'Pricing', options: [['fixed', 'Set rate', '$250 for 2 hours'], ['quote', 'Quote each piece'], ['mix', 'Both', 'Set prices for flash, quotes for custom']] },
  { key: 'photos', label: 'Reference photos', options: [['req', 'Required'], ['opt', 'Optional'], ['off', 'Off']] },
  { key: 'dep', label: 'Deposit', options: [['30', '$30'], ['50', '$50'], ['100', '$100'], ['0', 'No deposit']] },
  { key: 'consent', label: 'Consent form', options: [['mine', 'Before booking'], ['none', 'None']] },
  { key: 'notice', label: 'Cancel or move', options: [['24', '24 hours before'], ['48', '48 hours before'], ['72', '72 hours before'], ['168', '7 days before']] },
  { key: 'cancel', label: 'Deposit refund', options: [['never', 'Never'], ['refund', 'If they cancel in time']] },
];

// The intro fills the screen; Start opens a second screen that pages sideways: question one, question two (it
// appears once question one is answered), then the booking page clients get, as the product draws it. You can
// swipe back, never ahead of an unanswered question, so nothing past the questions is reachable before them.
// "Your setup" opens every setting in a sheet that leaves the page in view; a change jumps the page to the step
// it shows on.
function Rules() {
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  // Nothing past the intro exists until Start is pressed, so the page ends there until then.
  const [started, setStarted] = useState(false);
  const [slide, setSlide] = useState(0);
  const [setup, setSetup] = useState(typicalSetup);
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const flow = useRef(null);
  const track = useRef(null);
  const headings = useRef([]);
  const pending = useRef(null);
  const target = useRef(null);
  const pageBody = useRef(null);
  const sheetRef = useRef(null);
  const answered = questions.filter(question => answers[question.key]).length;
  const resultSlide = questions.length;
  const reachable = done ? resultSlide : answered;
  const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Page the track to a slide once it exists (slides appear as questions are answered), and focus its heading.
  function goSlide(index) { pending.current = index; setSlide(index); }
  useEffect(() => {
    const index = pending.current;
    const box = track.current;
    if (index == null || !box || !box.children[index]) return;
    pending.current = null;
    target.current = index;
    // A swipe during the slide takes over; stop waiting for the chosen slide after the slide's own time.
    setTimeout(() => { if (target.current === index) target.current = null; }, 900);
    requestAnimationFrame(() => {
      box.scrollTo({ left: index * box.clientWidth, behavior: reduce() ? 'auto' : 'smooth' });
      headings.current[index]?.focus({ preventScroll: true });
    });
  });
  // Swiping the track moves the current slide (and the step indicator) with it.
  function onTrackScroll() {
    const box = track.current;
    if (!box || pending.current != null) return;
    // While the track slides to a chosen slide, the slides it passes are not the current one.
    if (target.current != null) {
      if (Math.abs(box.scrollLeft - target.current * box.clientWidth) > 2) return;
      target.current = null;
    }
    const index = Math.round(box.scrollLeft / box.clientWidth);
    if (index !== slide) setSlide(index);
  }
  function start() {
    setStarted(true);
    goSlide(Math.min(reachable, resultSlide));
    requestAnimationFrame(() => requestAnimationFrame(() => flow.current?.scrollIntoView({ block: 'start', behavior: reduce() ? 'auto' : 'smooth' })));
  }
  function answer(question, index, value) {
    const next = { ...answers, [question.key]: value };
    setAnswers(next);
    if (done) { setSetup(current => ({ ...current, [question.key]: value })); goSlide(index < questions.length - 1 ? index + 1 : resultSlide); return; }
    if (index < questions.length - 1) goSlide(index + 1);
    else { setSetup({ ...typicalSetup, ...next }); setStep(0); setDone(true); goSlide(resultSlide); }
  }
  function change(key, value) {
    setSetup(current => ({ ...current, [key]: value }));
    setStep(stepForSetting[key]);
    setLit(current => ({ key, n: (current?.n || 0) + 1 }));
  }
  function restart() {
    setSheetOpen(false); setAnswers({}); setDone(false); setSetup(typicalSetup); setStep(0); setLit(null);
    goSlide(0);
  }
  // A changed setting scrolls its part of the booking page into view above the open sheet.
  useEffect(() => {
    const box = pageBody.current;
    const part = box?.querySelector('[data-lit]');
    if (!box || !part) return;
    box.scrollTop = 0;
    box.scrollTo({ top: Math.max(0, part.getBoundingClientRect().top - box.getBoundingClientRect().top - 14), behavior: reduce() ? 'auto' : 'smooth' });
  }, [lit]);
  // The sheet: focus moves into it; Escape closes it and focus returns to the button that opened it.
  useEffect(() => {
    if (!sheetOpen) return;
    sheetRef.current?.querySelector('button')?.focus({ preventScroll: true });
    // Escape closes the sheet, unless a dialog opened from it (Every setting) is on top: that one closes first.
    const onKey = event => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { setSheetOpen(false); document.getElementById('m-setup-open')?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);
  const gate = useQuizGate(done);
  const lock = <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>;
  const stepLabels = [...questions.map((question, index) => `Question ${index + 1}`), 'Your booking page'];
  return <section ref={gate} id="m-rules" className={m.rulesB} aria-labelledby="m-rules-heading">
    <div className={m.pane}>
      <p className={a.kicker}>Your bookings</p>
      <h2 id="m-rules-heading">Your rules. <em>Your way.</em></h2>
      <p className={m.paneLead}>Two questions, then you’ll see the booking page your clients get.</p>
      <ol className={m.paneSteps}>
        {questions.map((question, index) => <li key={question.key} data-done={answers[question.key] ? '' : undefined}><span>{index + 1}</span>{question.title}</li>)}
        <li data-result=""><span><SettingIcon name="eye"/></span>Your booking page, as clients see it</li>
      </ol>
      <button type="button" className={m.paneStart} data-quiz-card={started ? undefined : ''} onClick={start}>{done ? 'See your booking page' : answered ? 'Carry on' : 'Start'}<i aria-hidden="true">↓</i></button>
    </div>
    {started && <div ref={flow} className={m.flow}>
      <nav className={m.flowSteps} aria-label="Steps">
        {stepLabels.map((label, index) => <button key={label} type="button" aria-label={label} aria-current={slide === index ? 'step' : undefined} disabled={index > reachable} data-done={index < reachable || (done && index < resultSlide) || undefined} onClick={() => goSlide(index)}>
          <i aria-hidden="true"/><span aria-hidden="true">{index < resultSlide ? index + 1 : <SettingIcon name="eye"/>}</span>
        </button>)}
      </nav>
      <div ref={track} className={m.flowTrack} onScroll={onTrackScroll}>
        {questions.map((question, index) => index <= reachable && <div key={question.key} className={m.flowSlide} inert={slide === index ? undefined : ''}>
          <p className={m.paneStep}>{index + 1} of {questions.length}</p>
          <h3 ref={el => { headings.current[index] = el; }} tabIndex={-1} className={m.paneQuestion}>{question.title}</h3>
          <div className={m.bigAnswers} role="group" aria-label={question.title} data-quiz-card={index === answered && !done ? '' : undefined}>
            {question.options.map(([value, title]) => <button key={value} type="button" aria-pressed={answers[question.key] === value} onClick={() => answer(question, index, value)}>{title}</button>)}
          </div>
          <div className={m.paneFoot}>
            {index > 0 ? <button type="button" onClick={() => goSlide(index - 1)}>Back</button> : <span/>}
            <span>Nothing is saved.</span>
          </div>
          {!done && index === answered && <p className={a.gateNote}>{lock}Answer {answered ? 'this' : 'both'} to see the rest of the page.</p>}
        </div>)}
        {done && <div className={`${m.flowSlide} ${m.resultSlide}`} inert={slide === resultSlide ? undefined : ''}>
          <div className={m.resultHead}>
            <h3 ref={el => { headings.current[resultSlide] = el; }} tabIndex={-1}>Your booking page</h3>
            <LiveLabel/>
          </div>
          <figure className={m.browser} aria-label="Your booking page, as clients see it">
            <div className={m.address} aria-hidden="true"><span><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="5.5" width="8" height="5.5" rx="1.3"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5"/></svg>vanta.tattoo/b/{artist.name.toLowerCase()}</span></div>
            <div ref={pageBody} className={m.browserBody} data-sheet={sheetOpen || undefined}>
              <BookingPagePreview setup={setup} step={step} onStep={next => { setLit(null); setStep(Math.max(0, Math.min(4, next))); }} lit={lit}/>
            </div>
          </figure>
          <button id="m-setup-open" type="button" className={m.setupButton} onClick={() => setSheetOpen(true)} aria-haspopup="dialog" aria-expanded={sheetOpen}>
            <span className={m.switchIcon}><SettingIcon name="sliders"/></span>
            <span><b>Your setup</b><small>{setupRows.length} settings · tap to change any</small></span>
            <i aria-hidden="true">Edit</i>
          </button>
        </div>}
      </div>
    </div>}
    {done && sheetOpen && <div ref={sheetRef} className={m.setupSheet} role="dialog" aria-modal="false" aria-labelledby="m-setup-title">
      <i className={m.grabber} aria-hidden="true"/>
      <div className={m.setupSheetHead}>
        <p id="m-setup-title"><b>Your setup</b><small>Changes show on the page above</small></p>
        <button type="button" onClick={() => { setSheetOpen(false); document.getElementById('m-setup-open')?.focus(); }}>Done</button>
      </div>
      <div className={m.setupSheetList}>
        {setupRows.map(row => <div key={row.key} className={m.settingGroup}>
          <span id={`m-set-${row.key}`}>{row.label}</span>
          <div className={m.pills} role="radiogroup" aria-labelledby={`m-set-${row.key}`}>
            {row.options.map(([value, title]) => <button key={value} type="button" role="radio" aria-checked={setup[row.key] === value} onClick={() => change(row.key, value)}>{title}</button>)}
          </div>
        </div>)}
        <div className={m.settingMore}><AllSettings variant="row"/></div>
      </div>
      <div className={m.setupSheetFoot}><span>Nothing is saved.</span><button type="button" onClick={restart}>Start again</button></div>
    </div>}
  </section>;
}

/* ---------- 3. Booking form: the questions and the form clients see, one tap apart ---------- */


// One screen: every question as a chip in two columns; a tap moves it Required → Optional → Off. The form
// clients get opens in a sheet, so the list never has to share the screen with it.
const modeCycle = { required: 'optional', optional: 'off', off: 'required' };
const modeNames = { required: 'Required', optional: 'Optional', off: 'Off' };

function FormBuilder() {
  const [chosen, setChosen] = useState(() => Object.fromEntries(formQuestions.map(question => [question.key, question.mode])));
  const [changed, setChanged] = useState(null);
  const sheet = useRef(null);
  const asked = formQuestions.filter(question => chosen[question.key] !== 'off');
  const total = asked.length + 4;
  function cycle(key) { setChosen(current => ({ ...current, [key]: modeCycle[current[key]] })); setChanged(key); }
  return <section id="m-form" className={m.form} aria-labelledby="m-form-heading">
    <SectionHead kicker="Your booking form" id="m-form-heading" title={<>Ask what <em>you</em> need to know.</>} text="Tap a question to make it required, optional or off."/>
    <div className={m.formCard}>
      <p className={m.formAlways}><SettingIcon name="checklist"/>Name, email, phone and date of birth are always asked.</p>
      {formGroups.map(([group, label]) => <div key={group} className={m.chipGroup}>
        <p className={m.chipLabel}>{label}</p>
        <div className={m.qChips}>
          {formQuestions.filter(question => question.group === group).map(question => <button key={question.key} type="button" className={m.qChip} data-mode={chosen[question.key]} data-changed={changed === question.key || undefined}
            aria-label={`${question.title}: ${modeNames[chosen[question.key]]}. Tap to change.`} onClick={() => cycle(question.key)}>
            <b>{question.title}</b><small><i aria-hidden="true"/>{modeNames[chosen[question.key]]}</small>
          </button>)}
        </div>
      </div>)}
      <button type="button" className={m.seeForm} onClick={() => sheet.current?.showModal()} aria-haspopup="dialog">See the form clients get <span>{total}<span className={m.longCount}> questions</span></span></button>
    </div>
    <p className={m.note}>Booking at a studio on Vanta Studio? Clients also answer the questions that studio requires.</p>
    <Sheet sheetRef={sheet} title="The form clients get">
      <div className={m.formSheetBody}>
        <figure className={a.clientPreview} aria-label="Your booking form, as clients see it">
          <div className={a.who}><img src={artist.avatar} alt="" width="72" height="72"/><div><b>Book with {artist.name}</b><span>Tell me about your tattoo</span></div></div>
          {asked.map(question => <div key={question.key} className={a.formField} data-new={changed === question.key}>
            <span className={a.fieldLabel}>{question.title}<em>{chosen[question.key] === 'optional' ? 'Optional' : ''}</em></span>
            {question.key === 'photos'
              ? <span className={a.fieldPhotos}><img src={work.peony.src} alt="" width="120" height="120"/><img src={work.olive.src} alt="" width="120" height="120"/><i>+</i></span>
              : <span className={a.fieldInput}>{question.sample}</span>}
          </div>)}
          <span className={a.fakeButton}>Continue</span>
        </figure>
      </div>
    </Sheet>
  </section>;
}

/* ---------- 4. Every request: swipe through what lands in the app ---------- */

function Carousel({ label, slides }) {
  const track = useRef(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const root = track.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) setActive(Number(entry.target.dataset.index));
    }), { root, threshold: 0.6 });
    root.querySelectorAll('[data-index]').forEach(slide => observer.observe(slide));
    return () => observer.disconnect();
  }, []);
  const go = index => { const slide = track.current?.querySelector(`[data-index="${index}"]`); slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); };
  return <div className={m.carousel} role="region" aria-roledescription="carousel" aria-label={label}>
    <div ref={track} className={m.track}>
      {slides.map((slide, index) => <figure key={slide.title} data-index={index} className={m.slide} aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}>
        <div className={m.slideArt}>{slide.art}</div>
        <figcaption className={a.placard}><strong>{slide.title}</strong><span>{slide.note}</span></figcaption>
      </figure>)}
    </div>
    <div className={m.dots}>{slides.map((slide, index) => <button key={slide.title} type="button" aria-label={`Show ${slide.title}`} aria-current={active === index} onClick={() => go(index)}/>)}</div>
  </div>;
}

function Day() {
  return <section id="m-day" className={m.day} aria-labelledby="m-day-heading">
    <SectionHead kicker="For you" id="m-day-heading" title={<>Every request arrives with <em>everything you need.</em></>} text="The idea, the photos, the deposit and the signed consent, before the client walks in. Vanta sends the reminders."/>
    <Carousel label="Your day in the Vanta app" slides={appScreens.map(({ title, note, Screen }) => ({ title, note, art: <div className={m.appShot}><Screen/></div> }))}/>
  </section>;
}

/* ---------- 5. Your work: the feed, or the booking form ---------- */

const channels = [
  ['feed', 'In the feed', 'Get discovered', 'Clients browse by style and save what they love. Every piece links back to you, and flash can be booked straight from the photo.'],
  ['form', 'In your form', 'Win the booking', 'Clients who open your link are ready to book. Each appointment shows your example work, and they can tap a piece and say “I want this one”.'],
];

function Work() {
  const [channel, setChannel] = useState('feed');
  return <section id="m-work" className={m.work} aria-labelledby="m-work-heading">
    <SectionHead kicker="Your work" id="m-work-heading" title={<>Your work, seen <em>where it counts.</em></>} text="Upload once. It reaches new clients in the feed, and sits in front of the ones already booking."/>
    <SwipePanels className={m.workPanels} label="Where your work is seen" options={channels.map(([key, tab]) => [key, tab])} value={channel} onChange={setChannel}>
      {channels.map(([key, , title, text]) => <article key={key} className={m.channel}>
        <div className={m.channelText}><h3>{title}</h3><p>{text}</p></div>
        <div className={m.channelArt} data-channel={key}>
          {key === 'feed' ? <>
            <img className={m.feedShot} src="/home/discover-feed.webp" alt="The Vanta feed of tattoo photos that clients browse" width="560" height="1218" loading="lazy"/>
            <figure className={m.flashCard} aria-hidden="true"><img src={work.flash.src} alt="" width={work.flash.width} height={work.flash.height} loading="lazy"/><span>Bookable flash</span></figure>
          </> : <SessionTypeScreens/>}
        </div>
      </article>)}
    </SwipePanels>
  </section>;
}

/* ---------- 6. Vanta Pro: the client's lock screen, perks as chips, plans as a toggle ---------- */

function Pro() {
  const [focus, setFocus] = useState('remind');
  const [plan, setPlan] = useState('pro');
  const perk = proPerks.find(item => item.key === focus);
  return <section id="m-pro" className={m.pro} aria-labelledby="m-pro-heading">
    <header className={m.head}>
      <p className={a.proBadge}>Vanta Pro</p>
      <h2 id="m-pro-heading">Fewer no-shows. <em>Reminders from you.</em></h2>
    </header>
    <div className={m.perkSwitch}>
      <Segmented label="What Vanta Pro adds" options={[['remind', 'Reminders'], ['inbox', 'Your inbox'], ['link', 'Your link']]} value={focus} onChange={setFocus}/>
    </div>
    <p className={m.perkText} aria-live="polite" key={focus}><b>{perk.title}.</b> {perk.text}</p>
    <div className={m.lockWrap}>
      <LockPhone focus={focus}/>
      <p className={a.bioLink} data-on={focus === 'link' ? 'true' : undefined}><span>Link in bio</span><b>mia.vanta.tattoo</b></p>
    </div>
    <div className={m.planCard}>
      <Segmented label="Plans" options={[['free', 'Free'], ['pro', 'Pro · A$9.99/mo']]} value={plan} onChange={setPlan}/>
      {plan === 'free'
        ? <ul className={m.planList}><li>Portfolio in the feed</li><li>Booking link and form</li><li>Deposits</li><li>Consent forms</li><li>Confirmation emails</li><li>Calendar</li></ul>
        : <ul className={m.planList}><li>Everything in Free</li><li data-pro="true">Reminder emails</li><li data-pro="true">SMS the day before</li><li data-pro="true">Emails from your inbox</li><li data-pro="true">yourname.vanta.tattoo</li></ul>}
      <p className={m.planPrice}>{plan === 'free' ? <><b>Free</b> always</> : <><b>A$9.99</b> a month · cancel anytime</>}</p>
    </div>
    <p className={m.note}>Turn on Pro any time in the app, under Client notifications. Up to 100 texts every 30 days. Referral months you’ve earned are used first. At a studio on Vanta Studio, the studio covers reminders and SMS for bookings there.</p>
  </section>;
}

/* ---------- The phone page ---------- */

// The tab bar's sections, in page order, with the short name the top bar shows while one is on screen.
const dockTabs = [
  ['m-rules', 'Rules', 'Your rules', 'sliders'],
  ['m-form', 'Form', 'Booking form', 'checklist'],
  ['m-day', 'Day', 'Your day', 'clock'],
  ['m-work', 'Work', 'Your work', 'image'],
  ['m-pro', 'Pro', 'Vanta Pro', 'sparkle'],
];

export default function MobileArtists() {
  const page = useRef(null);
  const isAndroid = useIsAndroid();
  const [showBar, setShowBar] = useState(false);
  const [locked, setLocked] = useState(true);
  const [current, setCurrent] = useState(null);
  const [passed, setPassed] = useState({});
  // The tab bar shows once the first screen has scrolled away, and steps aside at the closing call to action.
  useEffect(() => {
    const root = page.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const seen = {};
    // "top" counts once the whole first screen has scrolled up under the top bar (watching the section, not a
    // thin marker, so a fast flick past it still counts); "end" while the closing section is on screen.
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const key = entry.target.id === 'm-top' ? 'top' : 'end';
        seen[key] = key === 'top' ? !entry.isIntersecting && entry.boundingClientRect.top < 0 : entry.isIntersecting;
      });
      setShowBar(Boolean(seen.top) && !seen.end);
    }, { root, threshold: 0, rootMargin: '-72px 0px 0px 0px' });
    ['m-top', 'm-get'].forEach(id => { const el = root.querySelector('#' + id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);
  // The sections stay hidden until the two questions are answered; the tab bar follows the same lock.
  useEffect(() => {
    const root = page.current;
    if (!root) return;
    const read = () => setLocked(root.hasAttribute('data-quiz-locked'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['data-quiz-locked'] });
    return () => observer.disconnect();
  }, []);
  // The section crossing the middle of the screen is the current tab, and its name goes in the top bar.
  useEffect(() => {
    const root = page.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) setCurrent(entry.target.id);
      else if (entry.target.id === 'm-rules' && entry.boundingClientRect.top > 0) setCurrent(null);
    }), { root, rootMargin: '-45% 0px -54% 0px' });
    ['m-top', ...dockTabs.map(([id]) => id), 'm-get'].forEach(id => { const el = root.querySelector('#' + id); if (el) observer.observe(el); });
    // Like an app's large title: the small title only appears once the section's own heading has gone under the
    // bar. Read on scroll (one frame at a time), so a fast flick past a heading still counts.
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = {};
      dockTabs.forEach(([id]) => { const h = root.querySelector(`#${id} h2`); next[id] = Boolean(h) && h.getBoundingClientRect().bottom < 72; });
      setPassed(was => (dockTabs.every(([id]) => was[id] === next[id]) ? was : next));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    root.addEventListener('scroll', onScroll, { passive: true });
    measure();
    return () => { observer.disconnect(); root.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [locked]);
  const go = id => {
    const el = page.current?.querySelector('#' + id);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  const tab = dockTabs.find(([id]) => id === current && passed[id]);
  return <main ref={page} className={`gallery ${a.page} ${m.page}`} aria-label="Vanta for artists" data-quiz-locked="">
    <header className={m.topBar} data-titled={tab ? '' : undefined}>
      <a href="/" aria-label="Vanta home" className={m.wordmark}>vanta</a>
      <p className={m.barTitle} aria-hidden="true">{tab?.[2]}</p>
      <nav aria-label="Vanta products"><a href="/">For clients</a><a href="/studio">For studios</a></nav>
    </header>

    <Hero isAndroid={isAndroid}/>
    <Rules/>
    <FormBuilder/>
    <Day/>
    <Work/>
    <Pro/>

    <section id="m-get" className={m.cta} aria-labelledby="m-cta-heading">
      <img src="/home/app-icon.webp" alt="" width="64" height="64" className={m.ctaIcon}/>
      <h2 id="m-cta-heading">Start taking bookings <em>your way.</em></h2>
      <p>Free to download. Add your work, set your rules and share your link.</p>
      <Downloads/>
      <div className={m.ctaArt} aria-hidden="true">
        {[work.flash, work.peony, work.wings].map(piece => <img key={piece.title} src={piece.src} alt="" width={piece.width} height={piece.height} loading="lazy"/>)}
      </div>
    </section>

    <footer className={m.footer}>
      <a href="/" aria-label="Vanta home" className={m.footerMark}>vanta</a>
      <nav aria-label="Footer"><a href="/">Vanta for clients</a><a href="/studio">Vanta Studio</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:support@vanta.tattoo">Contact</a></nav>
      <span>© {new Date().getFullYear()} Vanta Ink</span>
    </footer>

    {/* Under the thumb: before the questions are answered, the app and a Get button; after, a tab bar for the
        page's sections with the Get button at its end. */}
    <aside className={m.appBar} data-show={showBar} data-tabs={locked ? undefined : ''} aria-label="Get the Vanta app" inert={showBar ? undefined : ''}>
      {locked ? <>
        <img src="/home/app-icon.webp" alt="" width="44" height="44"/>
        <p><strong>Vanta for artists</strong><span>{isAndroid ? 'Android beta · by invite' : 'Free on iPhone'}</span></p>
      </> : <nav className={m.dockTabs} aria-label="Sections">
        {dockTabs.map(([id, label, , icon]) => <button key={id} type="button" aria-current={current === id ? 'true' : undefined} onClick={() => go(id)}>
          <SettingIcon name={icon}/><span>{label}</span>
        </button>)}
      </nav>}
      <a href={isAndroid ? androidBeta : appStore} {...(isAndroid ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{isAndroid ? 'Request' : 'Get'}</a>
    </aside>
  </main>;
}
