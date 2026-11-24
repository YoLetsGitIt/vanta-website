'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './artists.module.css';

const appStore = 'https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738';
// The Android app is a closed beta on Google Play: only invited testers can install it, and the Play
// pages show "App not available" to everyone else. So the Android button asks people to email for an
// invite, with the Google account to add. On release, point this at the store page again.
const androidBeta = 'mailto:support@vanta.tattoo?subject=Vanta%20Android%20beta%20access&body=Hi%2C%20I%E2%80%99d%20like%20access%20to%20the%20Vanta%20Android%20beta.%20The%20Google%20account%20on%20my%20phone%20is%3A%20';

// The artist shown in the page's examples. The work is the same real work as the home page wall.
const artist = { name: 'Mia', styles: 'Blackwork · Fine Line · Melbourne', avatar: '/welcome/wall-4.webp' };
const work = {
  peony: { src: '/welcome/wall-1.webp', width: 720, height: 1080, title: 'Peony', style: 'Fine Line' },
  olive: { src: '/welcome/wall-2.webp', width: 720, height: 900, title: 'Olive branch', style: 'Fine Line' },
  sleeve: { src: '/welcome/wall-3.webp', width: 720, height: 1080, title: 'Skull and rose', style: 'Old School' },
  headdress: { src: '/welcome/wall-4.webp', width: 720, height: 1002, title: 'Headdress portrait', style: 'Realism' },
  wings: { src: '/welcome/wall-5.webp', width: 562, height: 1080, title: 'Winged piece', style: 'Blackwork' },
  flash: { src: '/studio/flash-sheet.webp', width: 1024, height: 1536, title: 'Flash sheet', style: 'Old School' },
};

function useIsAndroid() {
  const [isAndroid, setIsAndroid] = useState(false);
  useEffect(() => { setIsAndroid(navigator.userAgentData?.platform === 'Android' || /Android/i.test(navigator.userAgent)); }, []);
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

/* ---------- Hero: both sides of one booking ---------- */

// A drawing of the booking form clients see on an artist's link: their work to pick from, then Book.
function BookingFormPreview({ compact = false }) {
  return <div className={styles.bookingForm}>
    <div className={styles.browserBar}><i/><i/><i/><span>yourname.vanta.tattoo</span></div>
    <div className={styles.formBody}>
      <div className={styles.who}><img src={artist.avatar} alt="" width="72" height="72"/><div><b>Book with {artist.name}</b><span>{artist.styles}</span></div></div>
      <p className={styles.formQuestion}>What would you like?</p>
      <div className={styles.pick}>
        {[work.peony, work.wings, work.sleeve].map((piece, index) => <span key={piece.title} data-on={index === 0}><img src={piece.src} alt="" width="200" height="200"/><small>{piece.title}</small></span>)}
        <span className={styles.ownIdea}><i>+</i><small>My own idea</small></span>
      </div>
      {!compact && <div className={styles.typeRow}><b>Small tattoo</b><span>from $150 · $50 deposit</span></div>}
      <span className={styles.fakeButton}>Book</span>
    </div>
  </div>;
}

function DaySheet({ rows, title = 'Tue 17 Oct', className = '' }) {
  return <div className={`${styles.daySheet} ${className}`}>
    <div className={styles.sheetHead}><span>{title}</span><span>{rows.filter(row => row.time !== 'New').length} sessions</span></div>
    {rows.map(row => <div key={row.time + row.name} className={styles.sheetRow}>
      <span>{row.time}</span>
      <div><b>{row.name}</b>{row.detail && <small>{row.detail}</small>}</div>
      <span data-state={row.state}>{row.status}</span>
    </div>)}
  </div>;
}

const heroDay = [
  { time: '10:00', name: 'Sam Taylor', status: '✓ deposit', state: 'done' },
  { time: '14:00', name: 'Alex Morgan', status: '✓ consent', state: 'done' },
  { time: '16:30', name: 'Jamie Lee', status: '✓ reminded', state: 'done' },
];
const fullDay = [
  { time: '10:00', name: 'Sam Taylor', detail: 'Fine line peony · inner forearm · 3h', status: '✓ deposit paid', state: 'done' },
  { time: '14:00', name: 'Alex Morgan', detail: 'Old school rose · hand · 2h', status: '✓ consent signed', state: 'done' },
  { time: '16:30', name: 'Jamie Lee', detail: 'Consult · blackwork back piece', status: '✓ reminder sent', state: 'done' },
  { time: 'New', name: '2 requests', detail: 'Reference photos attached', status: 'Send a quote →', state: 'next' },
];

/* ---------- Your rules: a questionnaire that becomes a sentence ---------- */

// Every question maps to a setting in the Vanta app.
// Two questions: how you price, then how clients book. The rest start from a typical setup and can be
// changed in the sentence. Answers live only in this component's state: nothing is sent, stored or remembered.
const questions = [
  { key: 'type', title: 'Do you have a fixed rate, or do you quote each piece?', help: 'Each of your appointment types can have a set price, or you quote every client.',
    options: [['fixed', 'A fixed rate', 'Clients see the price before they book'], ['quote', 'I quote each piece', 'You send a price once you’ve seen the idea'], ['mix', 'A bit of both', 'Set prices for some work, quotes for the rest']] },
  { key: 'time', title: 'Do you want clients to book a slot straight away?', help: 'Or would you rather hear from them first and choose the time together?',
    options: [['instant', 'Yes, straight into a slot', 'They pick one of your open times and pay the deposit'], ['avail', 'They tell me when they’re free', 'You offer the times that suit you']] },
];
// The usual setup: a $50 deposit that's never refunded, and clients can cancel or move up to 48 hours before.
const typicalSetup = { time: 'instant', type: 'fixed', photos: 'req', dep: '50', consent: 'mine', notice: '48', cancel: 'never' };
const sentenceChoices = {
  time: [['instant', 'book an open time straight away'], ['avail', 'tell me when they’re free']],
  type: [['fixed', 'my set rate of $250 for 2 hours'], ['quote', 'a price I quote for each piece'], ['mix', 'set prices for flash, quotes for custom work']],
  photos: [['req', 'must add reference photos'], ['opt', 'can add reference photos'], ['off', 'skip reference photos']],
  dep: [['30', '$30 deposit'], ['50', '$50 deposit'], ['100', '$100 deposit'], ['0', 'no deposit']],
  consent: [['mine', 'my consent form'], ['none', 'nothing up front']],
  notice: [['24', '24 hours'], ['48', '48 hours'], ['72', '72 hours'], ['168', '7 days']],
  cancel: [['never', 'the deposit is never refunded'], ['refund', 'they get the deposit back']],
};
const typeLabels = { fixed: [['Session', '2h · $250']], quote: [['Custom piece', 'price quoted']], mix: [['Flash', '1h · $120'], ['Custom piece', 'price quoted']] };
const cancelLabels = { 24: '24 hours', 48: '48 hours', 72: '72 hours', 168: '7 days' };

// A violet phrase in the sentence that can be changed; it sizes itself to the chosen phrase.
function Choice({ name, label, value, onChange, after = '' }) {
  const measure = useRef(null);
  const [width, setWidth] = useState();
  const text = sentenceChoices[name].find(option => option[0] === value)[1];
  useEffect(() => {
    const fit = () => setWidth(measure.current ? Math.ceil(measure.current.getBoundingClientRect().width) + 34 : undefined);
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [text]);
  return <span className={styles.choice}>
    <span className={styles.choiceBox}>
      <select aria-label={label} value={value} onChange={event => onChange(name, event.target.value)} style={width ? { width } : undefined}>
        {sentenceChoices[name].map(option => <option key={option[0]} value={option[0]}>{option[1]}</option>)}
      </select>
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </span>
    <span ref={measure} className={styles.measure} aria-hidden="true">{text}</span>{after}
  </span>;
}

// Which part of the client's form each setting changes, so that part can flash when it does.
const previewPart = { time: 'time', type: 'type', photos: 'idea', consent: 'consent', dep: 'pay', notice: 'pay', cancel: 'pay' };

function ClientPreview({ setup, flash }) {
  const instant = setup.time === 'instant';
  const lit = part => (flash && previewPart[flash.key] === part ? String(flash.n) : undefined);
  const pay = setup.dep === '0' ? (instant ? 'Book' : 'Send request') : instant ? `Pay $${setup.dep} and book` : `Send request · $${setup.dep} deposit when you pick a time`;
  const notice = `Cancel or move your booking up to ${cancelLabels[setup.notice]} before.`;
  const fine = setup.dep === '0' ? notice : setup.cancel === 'never' ? `${notice} The deposit isn’t refunded.` : `${notice} Cancel in time to get the deposit back.`;
  return <figure className={styles.clientPreview} aria-label="What your clients would see">
    <div className={styles.who}><img src={artist.avatar} alt="" width="72" height="72"/><div><b>Book with {artist.name}</b><span>yourname.vanta.tattoo</span></div></div>
    <div className={styles.previewBox} data-flash={lit('type')} key={`type-${lit('type')}`}>{typeLabels[setup.type].map(([typeName, typeDetail]) => <div key={typeName} className={styles.previewTitle}>{typeName}<span>{typeDetail}</span></div>)}</div>
    <div className={styles.previewBox} data-flash={lit('time')} key={`time-${lit('time')}`}>
      {instant && <><div className={styles.previewTitle}>Pick a time<span>open times</span></div><div className={styles.slots}>{['Tue 10:00', 'Tue 14:00', 'Wed 11:00', 'Thu 10:00', 'Fri 13:00', 'Sat 10:00'].map((slot, index) => <span key={slot} data-on={index === 1}>{slot}</span>)}</div></>}
      {setup.time === 'avail' && <><div className={styles.previewTitle}>When are you free?<span>each week</span></div><div className={styles.days}>{[['Mon pm', true], ['Tue', false], ['Thu am', true], ['Sat', true], ['Sun', false]].map(([day, on]) => <span key={day} data-on={on}>{day}</span>)}</div></>}
    </div>
    <div className={styles.previewBox} data-flash={lit('idea')} key={`idea-${lit('idea')}`}>
      <div className={styles.previewTitle}>Your idea<span>{setup.photos === 'off' ? 'description and placement' : setup.photos === 'req' ? 'photos required' : 'photos optional'}</span></div>
    </div>
    {setup.consent === 'mine' && <div className={styles.previewBox} data-flash={lit('consent')} key={`consent-${lit('consent')}`}><div className={styles.previewTitle}>Consent form<span>before booking</span></div></div>}
    <div className={styles.payBlock} data-flash={lit('pay')} key={`pay-${lit('pay')}`}>
      <span className={styles.fakeButton}>{pay}</span>
      <p className={styles.fine}>{fine}</p>
    </div>
  </figure>;
}

// The booking form's appointment step, as clients see it: each appointment type with its price and the
// artist's example work; tapping a photo opens it, and "I want this one" picks it for the booking.
const sessionTypes = [
  { name: 'Consultation', length: '30 min', price: 'Free' },
  { name: 'Small tattoo', length: '2 hours', price: '$250', priceNote: 'quote', detail: 'Up to palm size, black and grey', work: [work.peony, work.olive] },
  { name: 'Half day', length: '4 hours', quoted: true, work: [work.headdress, work.wings] },
];
function Clock() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M8 4.8V8l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function SessionTypeScreens() {
  return <div className={styles.sessionScreens} aria-hidden="true">
    <div className={styles.sessionScreen}>
      <div className={styles.sessionTop}><span>‹</span><b>Session Type</b><i/></div>
      <div className={styles.sessionBar}><i/></div>
      <p className={styles.sessionQ}>What appointment would you like?</p>
      <p className={styles.sessionHelp}>Tap a photo to see it up close. If there’s a piece you’d like, you can pick it.</p>
      {sessionTypes.map(type => <div key={type.name} className={styles.sessionCard}>
        <i className={styles.radio}/>
        <div className={styles.sessionMain}>
          <b>{type.name}</b><span className={styles.sessionLen}><Clock/>{type.length}</span>
          {type.detail && <span className={styles.sessionDetail}>{type.detail}</span>}
          {type.work && <div className={styles.sessionWork}><small>Example work</small><div>{type.work.map(piece => <img key={piece.title} src={piece.src} alt="" width="120" height="120" loading="lazy" data-on={piece === work.peony}/>)}</div></div>}
        </div>
        <div className={styles.sessionPrice}>{type.quoted ? <small>Quoted on request</small> : <><b>{type.price}</b>{type.priceNote && <small>{type.priceNote}</small>}</>}</div>
      </div>)}
    </div>
    <div className={styles.pieceSheet}>
      <img src={work.peony.src} alt="" width={work.peony.width} height={work.peony.height} loading="lazy"/>
      <div className={styles.pieceInfo}><b>Peony, fine line</b><span>Small tattoo</span></div>
      <div className={styles.pieceButtons}><span>I want this one</span></div>
    </div>
  </div>;
}

function YourRules() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [setup, setSetup] = useState(typicalSetup);
  const [flash, setFlash] = useState(null);
  const heading = useRef(null);
  const question = questions[step];
  // While answering, the preview already follows the answers given so far.
  const shown = done ? setup : { ...typicalSetup, ...answers };
  useEffect(() => { if (heading.current && (done || step > 0)) heading.current.focus({ preventScroll: true }); }, [done, step]);
  const lightUp = key => setFlash(current => ({ key, n: (current?.n || 0) + 1 }));
  function finish(final) { setSetup({ ...typicalSetup, ...final }); setDone(true); }
  function answer(value) {
    const next = { ...answers, [question.key]: value };
    setAnswers(next); lightUp(question.key);
    if (step < questions.length - 1) setStep(step + 1); else finish(next);
  }
  function change(key, value) { setSetup({ ...setup, [key]: value }); lightUp(key); }
  function restart() { setAnswers({}); setStep(0); setDone(false); setFlash(null); }
  return <section id="your-rules" className={styles.rules} aria-labelledby="rules-heading" data-reveal>
    <div className={styles.inner}>
      <header className={styles.formHead}>
        <div><p className={styles.kicker}>Your bookings</p><h2 id="rules-heading">Your rules. <em>Your way.</em></h2></div>
        <p>Vanta doesn’t make you work one way. Answer two questions and see what your clients would get.</p>
      </header>
      <div className={styles.flow}>
        <div className={styles.flowMain}>
          {!done ? <div className={styles.quiz}>
            <p className={styles.stepCount}>{step + 1} / {questions.length}</p>
            <h3 key={`q-${step}`} ref={heading} tabIndex={-1} className={styles.question}>{question.title}</h3>
            <p className={styles.questionHelp}>{question.help}</p>
            <div key={`a-${step}`} className={styles.answers} role="group" aria-label={question.title}>
              {question.options.map(([value, title, detail]) => <button key={value} type="button" aria-pressed={answers[question.key] === value} onClick={() => answer(value)}><b>{title}</b>{detail && <span>{detail}</span>}<i aria-hidden="true">→</i></button>)}
            </div>
            <div className={styles.quizLinks}>{step > 0 && <button type="button" onClick={() => setStep(step - 1)}>← Back</button>}<button type="button" onClick={() => finish(answers)}>Skip to the result →</button><span className={styles.privacyNote}>Nothing you pick is saved or sent.</span></div>
          </div> : <div className={styles.result}>
            <h3 ref={heading} tabIndex={-1} className={styles.sentence}>
              Clients <Choice name="time" label="How clients pick a time" value={setup.time} onChange={change} after=","/>{' '}
              at <Choice name="type" label="Pricing" value={setup.type} onChange={change} after="."/>{' '}
              They <Choice name="photos" label="Reference photos" value={setup.photos} onChange={change} after=","/>{' '}
              pay a <Choice name="dep" label="Deposit" value={setup.dep} onChange={change} after=","/>{' '}
              sign <Choice name="consent" label="Consent form" value={setup.consent} onChange={change} after=","/>{' '}
              and can cancel or move it up to <Choice name="notice" label="Cancel and reschedule notice" value={setup.notice} onChange={change}/>{' '}
              before, but <Choice name="cancel" label="Deposit refund" value={setup.cancel} onChange={change} after="."/>
            </h3>
            <div className={styles.quizLinks}><button type="button" onClick={restart}>← Start again</button><span className={styles.privacyNote}>Tap a violet phrase to change it. Prices are examples.</span></div>
          </div>}
        </div>
        <div className={styles.flowPreview}>
          <ClientPreview setup={shown} flash={flash}/>
        </div>
      </div>
    </div>
  </section>;
}

/* ---------- The page ---------- */

// The booking form: every question can be required, optional or off, as in the app (Booking settings → Booking form).
const formQuestions = [
  { key: 'design', group: 'tattoo', title: 'Design description', mode: 'required', sample: 'Peony with a few leaves, fine line' },
  { key: 'placement', group: 'tattoo', title: 'Placement', mode: 'required', sample: 'Inner forearm' },
  { key: 'photos', group: 'tattoo', title: 'Reference photos', mode: 'required' },
  { key: 'size', group: 'tattoo', title: 'Size', mode: 'off', sample: 'About 12 cm' },
  { key: 'colour', group: 'tattoo', title: 'Colour', mode: 'required', sample: 'Black & grey' },
  { key: 'notes', group: 'tattoo', title: 'Additional notes', mode: 'optional', sample: 'Can work around an old scar' },
  { key: 'skin', group: 'client', title: 'Skin tone', mode: 'off', sample: 'Medium' },
  { key: 'allergies', group: 'client', title: 'Allergies', mode: 'off', sample: 'None' },
  { key: 'address', group: 'client', title: 'Home address', mode: 'off', sample: '12 Smith St, Fitzroy 3065' },
];
const formGroups = [['tattoo', 'Their tattoo'], ['client', 'About them']];
const modes = [['required', 'Required'], ['optional', 'Optional'], ['off', 'Off']];

function BookingFormBuilder({ header, note }) {
  const [chosen, setChosen] = useState(() => Object.fromEntries(formQuestions.map(question => [question.key, question.mode])));
  const [changed, setChanged] = useState(null);
  const asked = formQuestions.filter(question => chosen[question.key] !== 'off');
  function choose(key, value) { setChosen({ ...chosen, [key]: value }); setChanged(key); }
  return <div className={styles.builder}>
    <div className={styles.builderSide}>
      {header}
    <div className={styles.builderPreview}>
        <figure className={styles.clientPreview} aria-label="Your booking form, as clients see it">
          <div className={styles.who}><img src={artist.avatar} alt="" width="72" height="72"/><div><b>Book with {artist.name}</b><span>Tell me about your tattoo</span></div></div>
          {asked.map(question => <div key={question.key} className={styles.formField} data-new={changed === question.key}>
            <span className={styles.fieldLabel}>{question.title}<em>{chosen[question.key] === 'optional' ? 'Optional' : ''}</em></span>
            {question.key === 'photos'
              ? <span className={styles.fieldPhotos}><img src={work.peony.src} alt="" width="120" height="120"/><img src={work.olive.src} alt="" width="120" height="120"/><i>+</i></span>
              : <span className={styles.fieldInput}>{question.sample}</span>}
          </div>)}
          <span className={styles.fakeButton}>Continue</span>
        </figure>
        <p className={styles.placard}><strong>What clients see</strong><span>{asked.length + 4} questions on your form</span></p>
      </div>
    </div>
    <div className={styles.builderMain}>
    <div className={styles.builderBoard}>
        <div className={styles.builderGroup}><p className={styles.groupLabel}>Every booking</p><div className={styles.builderRow}><span>Name, email, phone, date of birth</span><span className={styles.alwaysChip}>Always asked</span></div></div>
        {formGroups.map(([group, label]) => <div key={group} className={styles.builderGroup} role="group" aria-label={label}>
          <p className={styles.groupLabel}>{label}</p>
          {formQuestions.filter(question => question.group === group).map(question => <div key={question.key} className={styles.builderRow} data-mode={chosen[question.key]}>
            <span>{question.title}</span>
            <span className={styles.segment} role="radiogroup" aria-label={question.title}>
              {modes.map(([value, text]) => <button key={value} type="button" role="radio" aria-checked={chosen[question.key] === value} onClick={() => choose(question.key, value)}>{text}</button>)}
            </span>
          </div>)}
        </div>)}
      </div>
      {note}
    </div>
  </div>;
}

// Vanta Pro, shown from the client's side: the day before the appointment their phone has the
// artist's reminder text and emails, all from the artist. Each perk lights up its notifications.
const proPerks = [
  { key: 'remind', title: 'Reminders that go out for you', text: 'Emails 7 days and 24 hours before, and a text the day before for clients who agree to SMS. Clients with the Vanta app get a notification instead.' },
  { key: 'inbox', title: 'Emails from your own inbox', text: 'Confirmations and reminders come from your Gmail or Outlook, so clients reply straight to you.' },
  { key: 'link', title: 'Your own booking address', text: 'A short link that’s yours, for your bio and your cards.' },
];
// Worded as Vanta sends them: texts come from Vanta's number with the artist's name first;
// reminder emails come from the artist's own mailbox.
const lockNotifications = [
  { app: 'Messages', icon: 'sms', when: 'now', from: 'Vanta', text: <>{artist.name}: Appointment reminder for Tue 17 Oct, 2:00pm AEDT. Details or stop SMS: <u>link</u></>, perks: ['remind'] },
  { app: 'Gmail', icon: 'mail', when: '2:00 pm', from: `${artist.name} <mia.tattoo@gmail.com>`, text: `Appointment reminder from ${artist.name} · Hi Sam, your appointment with ${artist.name} is on Tuesday 17 October at 2:00 pm.`, perks: ['remind', 'inbox'] },
  { app: 'Gmail', icon: 'mail', when: 'Tue 10 Oct', from: `${artist.name} <mia.tattoo@gmail.com>`, text: `Appointment reminder from ${artist.name} · Hi Sam, your appointment with ${artist.name} is on Tuesday 17 October.`, perks: ['remind', 'inbox'] },
];

function VantaPro() {
  const [focus, setFocus] = useState(null);
  return <section id="vanta-pro" className={styles.pro} aria-labelledby="pro-heading" data-reveal>
    <div className={styles.inner}>
      <div className={styles.proGrid}>
        <div className={styles.proCopy}>
          <p className={styles.proBadge}>Vanta Pro</p>
          <h2 id="pro-heading">Fewer no-shows. <em>Reminders from you.</em></h2>
          <ul className={styles.perkList} aria-label="What Vanta Pro adds">
            {proPerks.map((perk, index) => <li key={perk.key}>
              <button type="button" aria-pressed={focus === perk.key} onClick={() => setFocus(focus === perk.key ? null : perk.key)}>
                <i aria-hidden="true">{index + 1}</i><b>{perk.title}</b><span>{perk.text}</span>
              </button>
            </li>)}
          </ul>
          <div className={styles.proPrice}><b>A$9.99</b><span>a month · cancel anytime</span></div>
        </div>
        <div className={styles.lockStage}>
        <figure className={styles.lockPhone} data-focus={focus || undefined} aria-label="A client’s lock screen the day before their appointment, with reminders from their artist">
          <div className={styles.lockScreen}>
            <img className={styles.lockWallpaper} src={work.peony.src} alt="" width={work.peony.width} height={work.peony.height} loading="lazy"/>
            <div className={styles.lockInner}>
              <div className={styles.lockStatus} aria-hidden="true"><span>2:00</span><i/><span>5G</span></div>
              <p className={styles.lockDate}>Monday 16 October</p>
              <p className={styles.lockTime} aria-hidden="true">2:00</p>
              <div className={styles.lockStack}>
                {lockNotifications.map((note, index) => <div key={index} className={styles.notification} data-on={focus ? note.perks.includes(focus) : undefined}>
                  <span className={styles.noteIcon} data-icon={note.icon} aria-hidden="true">{note.icon === 'mail' ? 'M' : ''}</span>
                  <span className={styles.noteTop}>{note.app}<span>{note.when}</span></span>
                  <span className={styles.noteFrom}>{note.from}</span>
                  <span className={styles.noteText}>{note.text}</span>
                </div>)}
              </div>
            </div>
          </div>
        </figure>
          <p className={styles.bioLink} data-on={focus === 'link' ? 'true' : undefined}><span>Link in bio</span><b>mia.vanta.tattoo</b></p>
        </div>
      </div>
      <div className={styles.plans}>
        <div><h3>Free <span>always</span></h3><ul><li>Portfolio in the feed</li><li>Booking link and form</li><li>Deposits</li><li>Consent forms</li><li>Confirmation emails</li><li>Calendar</li></ul></div>
        <div><h3>Vanta Pro <span>A$9.99 a month</span></h3><ul><li>Everything in Free</li><li data-pro="true">Reminder emails</li><li data-pro="true">SMS the day before</li><li data-pro="true">Emails from your inbox</li><li data-pro="true">yourname.vanta.tattoo</li></ul></div>
      </div>
      <p className={styles.proNote}>Turn on Pro any time in the app, under Client notifications. Pro includes up to 100 texts every 30 days. Referral months you’ve earned are used first. Working at a studio on Vanta Studio? The studio covers reminders and SMS for bookings there.</p>
    </div>
  </section>;
}

export default function ArtistsPage() {
  const page = useRef(null);
  const isAndroid = useIsAndroid();
  useEffect(() => {
    const root = page.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.setAttribute('data-visible', 'true'); observer.unobserve(entry.target); }
    }), { root, threshold: 0.08 });
    root.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return <main ref={page} className={`gallery ${styles.page}`} aria-label="Vanta for artists">
    <header className={styles.navigation}>
      <a href="/" aria-label="Vanta home" className={styles.wordmark}>vanta</a>
      <nav aria-label="Vanta products"><a href="/">For clients</a><a href="/studio">For studios</a><a href={isAndroid ? androidBeta : appStore} className={styles.navCta} {...(isAndroid ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>Get the app</a></nav>
    </header>

    <section className={styles.hero} aria-labelledby="artist-heading">
      <div className={styles.heroCopy}>
        <p className={styles.kicker}>Vanta for tattoo artists</p>
        <h1 id="artist-heading"><span>Show your work.</span> <span>Get booked.</span> <em>Vanta runs the rest.</em></h1>
        <div className={styles.sides}>
          <div><p className={styles.kicker}>For your clients</p><p>Your work and your booking form in one place. They see what they can get and book it straight away.</p></div>
          <div><p className={styles.kicker}>For you</p><p>One app for your day to day: requests, quotes, deposits, consent, reminders and your calendar.</p></div>
        </div>
        <Downloads/>
      </div>
      <div className={styles.duo}>
        <figure className={styles.duoForm}><div aria-hidden="true"><BookingFormPreview/></div><figcaption className={styles.placard}><strong>What clients see</strong><span>Your work, then the Book button</span></figcaption></figure>
        <figure className={styles.duoDay}><div aria-hidden="true"><DaySheet rows={heroDay} className={styles.compactSheet}/></div><figcaption className={styles.placard}><strong>What you see</strong><span>Your day, already sorted</span></figcaption></figure>
      </div>
    </section>

    <YourRules/>

    <section id="your-form" className={styles.clients} aria-labelledby="form-heading" data-reveal>
      <div className={styles.inner}>
        <BookingFormBuilder
          header={<header className={styles.formHead}>
            <div><p className={styles.kicker}>Your booking form</p><h2 id="form-heading">Ask what <em>you</em> need to know.</h2></div>
            <p>Choose every question clients answer when they book: required, optional or off. Your form changes as you go.</p>
          </header>}
          note={<p className={styles.builderNote}>Booking at a studio on Vanta Studio? Clients also answer the questions that studio requires.</p>}
        />
      </div>
    </section>

    <section id="your-day" className={styles.day} aria-labelledby="day-heading" data-reveal>
      <div className={`${styles.inner} ${styles.dayGrid}`}>
        <div className={styles.dayCopy}>
          <p className={styles.kicker}>For you</p>
          <h2 id="day-heading">Every request arrives with <em>everything you need.</em></h2>
          <p>The idea, the photos, the deposit and the signed consent, before the client walks in. Vanta sends the reminders, and your day is laid out when you open the app.</p>
          <DaySheet rows={fullDay}/>
        </div>
        <div className={styles.phones}>
          <figure><img src="/home/artist-bookings.webp" alt="Vanta bookings calendar for October with the day’s three confirmed clients" width="600" height="1304" loading="lazy"/><figcaption className={styles.placard}><strong>Bookings</strong><span>Inside the Vanta app</span></figcaption></figure>
          <figure><img src="/home/booking-details.webp" alt="Vanta booking details with the quote, duration, deposit, booking fee, the proposed time and the client’s design and placement" width="600" height="1305" loading="lazy"/><figcaption className={styles.placard}><strong>Booking details</strong><span>Inside the Vanta app</span></figcaption></figure>
        </div>
      </div>
    </section>

    <section id="your-work" className={styles.work} aria-labelledby="work-heading" data-reveal>
      <div className={styles.inner}>
        <header className={styles.formHead}>
          <div><p className={styles.kicker}>Your work</p><h2 id="work-heading">Your work, seen <em>where it counts.</em></h2></div>
          <p>Upload once. Your portfolio reaches new clients in the feed, and sits in front of the ones already booking.</p>
        </header>
        <div className={styles.channels}>
          <article className={styles.channel}>
            <div className={styles.channelText}><p className={styles.kicker}>1 · In the Vanta feed</p><h3>Get discovered</h3><p>Clients browse by style and save what they love. Every piece links back to you, and flash can be booked straight from the photo.</p></div>
            <div className={styles.channelArt}>
              <img className={styles.feedShot} src="/home/discover-feed.webp" alt="The Vanta feed of tattoo photos that clients browse" width="560" height="1218" loading="lazy"/>
              <div className={styles.feedWall} aria-hidden="true">
                {[work.peony, work.flash, work.wings].map(piece => <figure key={piece.title}><img src={piece.src} alt="" width={piece.width} height={piece.height} loading="lazy"/>{piece === work.flash && <span className={styles.tag}>Bookable flash</span>}</figure>)}
              </div>
            </div>
          </article>
          <article className={styles.channel}>
            <div className={styles.channelText}><p className={styles.kicker}>2 · In your booking form</p><h3>Win the booking</h3><p>Clients who open your link are ready to book. Each appointment shows your example work, and they can tap a piece and say “I want this one”.</p></div>
            <div className={styles.channelArt}><SessionTypeScreens/></div>
          </article>
        </div>
      </div>
    </section>

    <VantaPro/>

    <section id="get-vanta" className={styles.cta} aria-labelledby="cta-heading" data-reveal>
      <div className={`${styles.inner} ${styles.ctaGrid}`}>
        <div className={styles.ctaCopy}>
          <img src="/home/app-icon.webp" alt="" width="64" height="64" className={styles.ctaIcon}/>
          <h2 id="cta-heading">Start taking bookings <em>your way.</em></h2>
          <p>Free to download. Add your work, set your rules and share your link.</p>
          <Downloads/>
        </div>
        <div className={styles.ctaArt} aria-hidden="true">
          {[work.flash, work.peony, work.wings].map(piece => <img key={piece.title} src={piece.src} alt="" width={piece.width} height={piece.height} loading="lazy"/>)}
        </div>
      </div>
    </section>

    <footer className={styles.footer}>
      <a href="/" aria-label="Vanta home" className={styles.footerMark}>vanta</a>
      <div className={styles.footerBottom}>
        <span>© {new Date().getFullYear()} Vanta Ink</span>
        <nav aria-label="Footer"><a href="/">Vanta for clients</a><a href="/studio">Vanta Studio</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:support@vanta.tattoo">Contact</a></nav>
      </div>
    </footer>
  </main>;
}
