'use client';

// The studio page's feature bentos. Each section is four tiles, and each tile is a piece of Vanta Studio
// drawn in the page from the real screens (the client booking form, Bookings, Needs action, the client
// panel, the consent form, Import, Financial, Payouts, Performance, Invite artists, Stations, the artist
// page, Appointment types): same words, chips and layout, with sample people and numbers. Nothing is sent
// or saved. A tile starts when it scrolls into view, plays once or loops while on screen, and answers taps.
// With reduced motion every tile shows its finished state.
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './bento.module.css';

const calm = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dollars = (value, cents = false) => `$${Number(value).toLocaleString('en-AU', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;
const STUDIO = 'Northside Tattoo';

// seen: has been on screen (starts the tile). visible: on screen now (loops pause when it is not).
function useView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (!('IntersectionObserver' in window)) { setSeen(true); setVisible(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setSeen(true);
    }, { threshold: 0.3 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, seen, visible];
}

// A timeline: `step` counts up to times.length, one step at each time (ms from the start). replay() runs it again.
function useScript(on, times) {
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const key = times.join();
  useEffect(() => {
    if (!on) return undefined;
    const list = key.split(',').map(Number);
    if (calm()) { setStep(list.length); return undefined; }
    setStep(0);
    const ids = list.map((time, index) => setTimeout(() => setStep(index + 1), time));
    return () => ids.forEach(clearTimeout);
  }, [on, run, key]);
  return [step, useCallback(() => setRun(count => count + 1), [])];
}

// A message that clears itself.
function useNote(ms = 1900) {
  const [note, setNote] = useState(null);
  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(null), ms);
    return () => clearTimeout(timer);
  }, [note, ms]);
  return [note, setNote];
}

function Typed({ text, on, speed = 34, placeholder = '' }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!on) { setCount(0); return undefined; }
    if (calm()) { setCount(text.length); return undefined; }
    setCount(0);
    let typed = 0;
    const timer = setInterval(() => { typed += 1; setCount(typed); if (typed >= text.length) clearInterval(timer); }, speed);
    return () => clearInterval(timer);
  }, [on, text, speed]);
  if (!on) return <span className={s.placeholder}>{placeholder}</span>;
  return <>{text.slice(0, count)}{count < text.length && <i className={s.caret} aria-hidden="true"/>}</>;
}

// A number that runs from where it was to `value`.
function Count({ value, on = true, format = dollars, ms = 900 }) {
  const [shown, setShown] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (!on) return undefined;
    if (calm()) { current.current = value; setShown(value); return undefined; }
    const from = current.current;
    const start = performance.now();
    let frame;
    const tick = now => {
      const progress = Math.min(1, (now - start) / ms);
      current.current = from + (value - from) * (1 - (1 - progress) ** 3);
      setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, on, ms]);
  return <>{format(shown)}</>;
}

function Check() {
  return <svg className={s.check} viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function Chevron() {
  return <svg className={s.chev} viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

const initials = name => name.split(' ').map(part => part[0]).join('');
// Status chips, in the Studio's own colours and words.
function Chip({ tone, children }) { return <span className={s.chip} data-tone={tone}>{children}</span>; }
function Avatar({ name, large }) { return <span className={s.avatar} data-large={large || undefined}>{large ? name[0] : initials(name)}</span>; }

function Tile({ view, size, tone = 'dark', title, text, children }) {
  return <article ref={view} className={s.tile} data-size={size} data-tone={tone}>
    <header className={s.cap}><h3>{title}</h3><p>{text}</p></header>
    <div className={s.art}>{children}</div>
  </article>;
}

/* ---------------- Bookings ---------------- */

const placements = ['Forearm', 'Upper arm', 'Back', 'Calf', 'Ribs', 'Hand'];

// The client booking form, as clients see it (light form colours).
function BookingForm() {
  const [view, seen] = useView();
  const [step, replay] = useScript(seen, [400, 900, 1500, 2300, 2900, 3500, 5100, 5700, 6200]);
  const missing = step < 1 ? 'your first name' : step < 3 ? 'your phone number' : step < 6 ? 'a design description' : null;
  return <Tile view={view} size="hero" title="Your booking form" text="Clients book from your link or your own website. The form asks only what your studio needs.">
    <div className={s.form}>
      <p className={s.formHead}><small>Studio booking</small><b>{STUDIO}</b></p>
      <p className={s.formSection}>Your details</p>
      <div className={s.two}>
        <span className={s.field}><span>First name *</span><span className={s.input}><Typed text="Mia" on={step >= 1} placeholder="First name"/></span></span>
        <span className={s.field}><span>Last name *</span><span className={s.input}><Typed text="Carter" on={step >= 2} placeholder="Last name"/></span></span>
      </div>
      <span className={s.field}><span>Phone *</span><span className={s.phone}><span className={s.input}>+61</span><span className={s.input}><Typed text="412 345 678" on={step >= 3} placeholder="555 0100"/></span></span></span>
      <p className={s.formSection}>Your appointment</p>
      <span className={s.field}><span>Artist preference <i>(optional)</i></span><span className={s.input} data-select>{step >= 4 ? 'Alex Morgan' : 'No preference — studio will assign'}</span></span>
      <span className={s.field}><span>Placement <i>{step >= 5 ? 1 : 0}/3</i></span><span className={s.places}>{placements.map(place => <span key={place} data-on={(step >= 5 && place === 'Forearm') || undefined}>{place}</span>)}</span></span>
      <span className={s.field}><span>Design description *</span><span className={s.input} data-tall><Typed text="Fine line peony with a few leaves, about palm size." on={step >= 6} speed={22} placeholder="Describe what you’d like…"/></span></span>
      <span className={s.field}><span>Colour</span><span className={s.split}><span data-on={step >= 7 || undefined}>Black &amp; grey</span><span>Colour</span></span></span>
      {missing && <p className={s.needed}><b>Still needed</b>Please provide {missing}.</p>}
      <button type="button" className={s.request} data-state={step >= 9 ? 'sent' : step >= 8 ? 'press' : step >= 7 ? 'ready' : undefined} onClick={replay} aria-label="Play the booking form again">
        {step >= 9 ? <><Check/>Request sent</> : 'Request booking'}
      </button>
    </div>
  </Tile>;
}

// A QR code drawn for the look only: fixed squares, not a code that scans.
const qr = (() => {
  const size = 21; const cells = [];
  let seed = 7;
  const finder = (x, y) => {
    for (const [ox, oy] of [[0, 0], [14, 0], [0, 14]]) {
      const dx = x - ox; const dy = y - oy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0;
    }
    return -1;
  };
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const f = finder(x, y);
    seed = (seed * 9301 + 49297) % 233280;
    if (f === 1 || (f === -1 && seed / 233280 > 0.52)) cells.push([x, y]);
  }
  return cells;
})();

function BookingLink() {
  const [view] = useView();
  const [copied, setCopied] = useNote(1800);
  return <Tile view={view} size="compact" title="Booking link" text="Share the link or QR code. Clients send you requests.">
    <div className={s.link}>
      <svg className={s.qr} viewBox="-1 -1 23 23" aria-hidden="true"><rect x="-1" y="-1" width="23" height="23" fill="#fff"/>{qr.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill="#111"/>)}</svg>
      <div className={s.linkText}>
        <p>vanta.tattoo/b/<b>northside</b></p>
        <button type="button" className={s.buttonLight} data-done={copied || undefined} onClick={() => setCopied(true)}>{copied ? <><Check/>Copied</> : 'Copy link'}</button>
      </div>
    </div>
  </Tile>;
}

// Instant booking on the booking form: an appointment with its price to book, then a time.
function InstantBooking() {
  const [view, seen] = useView();
  const [time, setTime] = useState(null);
  const [pay, setPay] = useState('idle');
  useEffect(() => {
    if (!seen) return undefined;
    if (calm()) { setTime(1); setPay('paid'); return undefined; }
    const pick = setTimeout(() => setTime(1), 800);
    const start = setTimeout(() => setPay('paying'), 1700);
    return () => { clearTimeout(pick); clearTimeout(start); };
  }, [seen]);
  useEffect(() => {
    if (pay !== 'paying') return undefined;
    const timer = setTimeout(() => setPay('paid'), calm() ? 0 : 1100);
    return () => clearTimeout(timer);
  }, [pay]);
  return <Tile view={view} size="compact" tone="form" title="Instant booking" text="Clients pick an open time and pay the deposit to book.">
    <div className={s.instant}>
      <p className={s.typeCard}><span><b>Flash</b><small>1 h</small></span><span><b>$100 to book</b><small>deposit, no booking fee</small></span></p>
      <div className={s.times}>{['11:00', '1:30', '3:00'].map((label, index) => <button type="button" key={label} data-on={time === index || undefined} onClick={() => { setTime(index); setPay('idle'); }}>{label}</button>)}</div>
      <button type="button" className={s.pay} data-state={pay} disabled={time === null} onClick={() => setPay(pay === 'idle' ? 'paying' : 'idle')}>
        <i aria-hidden="true"/><span>{pay === 'paid' ? <><Check/>Booked</> : 'Book and pay $100'}</span>
      </button>
    </div>
  </Tile>;
}

const statusChip = { pending: ['amber', 'Pending'], confirm: ['blue', 'Needs Confirmation'], confirmed: ['green', 'Confirmed'], deposit: ['red', 'Unpaid deposit'] };
const incoming = [
  { name: 'Mia Carter', what: 'Tattoo · Inner forearm · Alex Morgan', status: 'pending', day: 28, when: 'requested' },
  { name: 'Jamie Wilson', what: 'Tattoo · Calf · Sam Taylor', status: 'confirm', day: 29, when: '2:00 pm' },
  { name: 'Casey Lane', what: 'Flash · Hand · Riley Chen', status: 'pending', day: 28, when: 'requested' },
  { name: 'Noah Park', what: 'Tattoo · Back · Alex Morgan', status: 'deposit', day: 2, when: '11:00 am', month: 'DEC' },
  { name: 'Ruby Hart', what: 'Consultation · Riley Chen', status: 'confirm', day: 30, when: '10:30 am' },
];
const groups = [['pending', 'Pending requests', 'amber'], ['confirm', 'To confirm', 'blue'], ['deposit', 'Unpaid deposits', 'red']];

// Needs action (the sidebar groups) beside the Bookings list. A new booking arrives every few seconds;
// tapping one deals with it.
function NeedsAction() {
  const [view, seen, visible] = useView();
  const [rows, setRows] = useState([]);
  const next = useRef(0);
  const ids = useRef(0);
  const add = useCallback(() => {
    const booking = incoming[next.current % incoming.length];
    next.current += 1; ids.current += 1;
    setRows(list => [{ ...booking, id: ids.current }, ...list].slice(0, 4));
  }, []);
  const settle = id => setRows(list => list.map(row => (row.id === id ? { ...row, status: 'confirmed' } : row)));
  useEffect(() => {
    if (!seen) return undefined;
    if (calm()) { setRows(incoming.slice(0, 3).map((row, index) => ({ ...row, id: index + 1 }))); return undefined; }
    add();
    const later = [setTimeout(add, 600), setTimeout(add, 1200)];
    return () => later.forEach(clearTimeout);
  }, [seen, add]);
  useEffect(() => {
    if (!visible || calm()) return undefined;
    const timer = setInterval(add, 3200);
    return () => clearInterval(timer);
  }, [visible, add]);
  const open = rows.filter(row => row.status !== 'confirmed');
  return <Tile view={view} size="wide" title="Needs action" text="Requests, times to confirm and unpaid deposits wait in one list. Tap a booking to deal with it.">
    <div className={s.needs}>
      <div className={s.groups}>
        <p className={s.groupsHead}>Needs action <span key={open.length} className={s.redCount}>{open.length}</span></p>
        {groups.map(([key, title, tone]) => {
          const count = open.filter(row => row.status === key).length;
          return <p key={key} className={s.group} data-empty={!count || undefined}><i data-tone={tone}/>{title}<b key={count}>{count}</b></p>;
        })}
      </div>
      <ul className={s.bookings}>
        {rows.map(row => {
          const [tone, label] = statusChip[row.status];
          return <li key={row.id} data-tone={tone}>
            <button type="button" onClick={() => settle(row.id)} disabled={row.status === 'confirmed'} aria-label={`${row.name}: ${label}`}>
              <span className={s.date}><small>{row.month || 'NOV'}</small><b>{row.day}</b><small>{row.when}</small></span>
              <span className={s.who}><b>{row.name}</b><small>{row.what}</small><em>Studio</em></span>
              <Chip tone={tone}>{label}</Chip>
            </button>
          </li>;
        })}
      </ul>
    </div>
  </Tile>;
}

/* ---------------- Clients ---------------- */

const history = [
  { what: 'Tattoo · Alex Morgan', date: '19 Dec 2026', state: ['blue', 'Confirmed'] },
  { what: 'Tattoo · Riley Chen', date: '14 Nov 2026', state: ['green', 'Completed'] },
  { what: 'Tattoo · Alex Morgan', date: '30 Sep 2026', state: ['green', 'Completed'] },
  { what: 'Consultation · Alex Morgan', date: '2 Sep 2026', state: ['green', 'Completed'] },
];

// The client panel: stats, contact, a note being added, and every booking with every artist.
function ClientRecord() {
  const [view, seen] = useView();
  const [step, replay] = useScript(seen, [900, 2300, 2700]);
  return <Tile view={view} size="hero" title="One record per client" text="Every booking with every artist, contact details, consent and notes, together.">
    <div className={s.panel} data-seen={seen || undefined}>
      <div className={s.panelHead}>
        <Avatar name="Mia Carter" large/>
        <span className={s.panelName}><b>Mia Carter</b><Chip tone="green">Consented</Chip></span>
        <span className={s.stats}><span><b>4</b>Sessions</span><span><b>3</b>Completed</span><span><b>19 Dec</b>Next</span></span>
      </div>
      <div className={s.cards}>
        <section className={s.card}>
          <p className={s.cardTitle}>Contact</p>
          <p className={s.kv}><span>Email</span><b>mia@example.com</b></p>
          <p className={s.kv}><span>Phone</span><b className={s.blueText}>+61 412 345 678</b></p>
        </section>
        <section className={s.card}>
          <p className={s.cardTitle}>Notes</p>
          {step < 3 && <span className={s.noteBox}><Typed text="Prefers morning sessions" on={step >= 1} speed={40} placeholder="Add a note about this client…"/></span>}
          {step >= 3 && <p className={s.note}><b>Prefers morning sessions</b><small>Front desk · just now</small></p>}
          <button type="button" className={s.buttonGhost} data-press={(step === 2) || undefined} onClick={replay}>{step >= 3 ? 'Add another' : 'Add note'}</button>
        </section>
      </div>
      <section className={s.card}>
        <p className={s.cardTitle}>Booking history ({history.length})</p>
        <ul className={s.history}>{history.map((row, index) => <li key={row.date} style={{ '--i': index }}><span className={s.who}><b>{row.what}</b><small>{row.date}</small></span><Chip tone={row.state[0]}>{row.state[1]}</Chip></li>)}</ul>
      </section>
    </div>
  </Tile>;
}

// The consent form clients sign before the day (light form colours), and the chip it turns green.
function ConsentForm() {
  const [view, seen] = useView();
  const [step, replay] = useScript(seen, [500, 1000, 2300]);
  return <Tile view={view} size="compact" tone="form" title="Consent before the day" text="Clients sign your form from a link. Tap to sign again.">
    <button type="button" className={s.consent} onClick={replay} aria-label="Sign the consent form again">
      <small>{STUDIO}</small>
      <b>Consent form</b>
      <span className={s.agree} data-on={step >= 1 || undefined}><i>{step >= 1 && <Check/>}</i>I have read and agreed *</span>
      <span className={s.signLabel}>Signature *</span>
      <span className={s.sign}>
        {step < 2 && <em>Sign here</em>}
        <svg viewBox="0 0 120 34" aria-hidden="true"><path data-on={step >= 2 || undefined} pathLength="1" d="M4 24c8-18 16-20 14-4s10 10 16-5 10-12 10 2 8 10 14-2 8-14 12-4 4 16 12 9 10-12 16-10 8 7 18 0"/></svg>
      </span>
      <span className={s.consentState}>{step >= 3 ? <Chip tone="green">Consented</Chip> : <Chip tone="red">Not consented</Chip>}</span>
    </button>
  </Tile>;
}

// Photo ID on the consent form; a date of birth under 18 adds the guardian's consent.
function PhotoId() {
  const [view, seen] = useView();
  const [minor, setMinor] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  useEffect(() => {
    if (!seen) return undefined;
    if (calm()) { setUploaded(true); return undefined; }
    const timer = setTimeout(() => setUploaded(true), 1300);
    return () => clearTimeout(timer);
  }, [seen]);
  return <Tile view={view} size="compact" title="Photo ID and under 18s" text="Under 18? The form adds a guardian. Tap the year.">
    <div className={s.idForm}>
      <span className={s.signLabel}>Date of birth</span>
      <span className={s.dob}><span>12</span><span>Apr</span><button type="button" onClick={() => setMinor(value => !value)} data-on={minor || undefined} aria-label="Change the year of birth">{minor ? '2010' : '2001'}</button></span>
      <span className={s.upload} data-done={uploaded || undefined}><i>{uploaded ? <Check/> : null}</i>{uploaded ? 'Photo ID added' : 'Adding photo ID…'}</span>
      <span className={s.guardian} data-on={minor || undefined}><b>Guardian consent</b><small>Name, photo ID and signature</small></span>
    </div>
  </Tile>;
}

const columns = [['First Name', 'First name'], ['Mobile', 'Phone'], ['Email Address', 'Email']];

// Import data: Upload CSV, Match columns, Review & import.
function ImportClients() {
  const [view, seen] = useView();
  const [step, replay] = useScript(seen, [600, 1500, 2000, 2500, 3000, 3900, 5000]);
  const stage = step >= 6 ? 3 : step >= 2 ? 2 : 1;
  return <Tile view={view} size="wide" title="Bring your clients" text="Import from Acuity, Jotform, Square, Fresha or any CSV. Nothing is saved until you check it.">
    <div className={s.import}>
      <ol className={s.steps}>{['Upload CSV', 'Match columns', 'Review & import'].map((label, index) => <li key={label} data-on={stage >= index + 1 || undefined} data-done={stage > index + 1 || undefined}><i>{stage > index + 1 ? <Check/> : index + 1}</i><span>{label}</span></li>)}</ol>
      <div className={s.importBody} key={stage}>
        {stage === 1 && <div className={s.drop} data-on={step >= 1 || undefined}><span className={s.sources}>{['Acuity', 'Jotform', 'Square', 'Fresha', 'Other CSV'].map(name => <em key={name}>{name}</em>)}</span><b>{step >= 1 ? 'clients.csv' : 'Drop your CSV file here'}</b></div>}
        {stage === 2 && <ul className={s.match}>{columns.map(([from, to], index) => <li key={from} data-on={step >= index + 3 || undefined}><code>{from}</code><span>→</span><b>{to}</b>{step >= index + 3 && <Check/>}</li>)}</ul>}
        {stage === 3 && <div className={s.review}><p><b><Count value={312} format={value => Math.round(value)} ms={800}/></b> clients ready</p><Chip tone="amber">4 duplicates to review</Chip>
          <button type="button" className={s.buttonLight} data-done={step >= 7 || undefined} onClick={replay}>{step >= 7 ? <><Check/>Imported</> : 'Import'}</button></div>}
      </div>
    </div>
  </Tile>;
}

/* ---------------- Money ---------------- */

// Money received each period: deposits received and paid on the day, the two parts of each bar.
const periods = {
  '1w': { labels: ['22', '23', '24', '25', '26', '27', '28'], bars: [[0, 0], [100, 350], [200, 400], [0, 300], [100, 650], [200, 700], [0, 300]], sessions: 8, sales: 3300 },
  '4w': { labels: ['7 Nov', '14 Nov', '21 Nov', '28 Nov'], bars: [[500, 1900], [600, 2200], [700, 3200], [600, 2700]], sessions: 28, sales: 12400 },
  '12w': { labels: [], bars: [[400, 1700], [500, 2100], [600, 2300], [500, 1900], [700, 2400], [600, 2200], [700, 2800], [600, 2400], [500, 1900], [500, 2200], [700, 3200], [600, 2700]], sessions: 79, sales: 34800 },
};

// Financial: the period, Sales and Deposits received, and money received each week.
function Financial() {
  const [view, seen] = useView();
  const [period, setPeriod] = useState('4w');
  const [picked, setPicked] = useState(null);
  const data = periods[period];
  const deposits = data.bars.reduce((sum, [deposit]) => sum + deposit, 0);
  const top = Math.max(...data.bars.map(([a, b]) => a + b));
  return <Tile view={view} size="hero" title="Financial" text="Sales, deposits received and the money that came in, for any period.">
    <div className={s.financial}>
      <p className={s.tabs}><span data-on>Financial</span><span>Payouts <em>3</em></span><span>Performance</span></p>
      <div className={s.periods} role="group" aria-label="Period">{['1w', '4w', '12w'].map(name => <button key={name} type="button" aria-pressed={period === name} onClick={() => { setPeriod(name); setPicked(null); }}>{name}</button>)}<span>8w</span><span>24w</span><span>YTD</span></div>
      <div className={s.summary}>
        <p><span>Sales</span><b><Count value={data.sales} on={seen} format={value => dollars(value, true)}/></b><small>From {data.sessions} completed sessions</small></p>
        <p><span><i/>Deposits received</span><b><Count value={deposits} on={seen} format={value => dollars(value, true)}/></b><small>Mostly for sessions still to come</small></p>
      </div>
      <p className={s.chartTitle}>Money received each week</p>
      <div className={s.chart} data-seen={seen || undefined} key={period} style={{ '--n': data.bars.length }}>
        {data.bars.map(([deposit, day], index) => <button type="button" key={index} style={{ '--i': index }} data-on={picked === index || undefined} onClick={() => setPicked(picked === index ? null : index)} aria-label={`${data.labels[index] || `Week ${index + 1}`}: ${dollars(deposit)} deposits, ${dollars(day)} on the day`}>
          <span className={s.stack} style={{ '--h': (deposit + day) / top }}><i style={{ flexGrow: day }}/><i style={{ flexGrow: deposit }}/></span>
          {picked === index && <b>{dollars(deposit + day)}</b>}
          <small>{data.labels[index] || ''}</small>
        </button>)}
      </div>
      <p className={s.legend}><span><i data-tone="blue"/>Deposits received</span><span><i data-tone="green"/>Paid on the day</span></p>
    </div>
  </Tile>;
}

// The Payment card from a booking: the quote, and the deposit paid by card when they booked.
function DepositPaid() {
  const [view, seen] = useView();
  const [step, replay] = useScript(seen, [300, 1000, 1900]);
  return <Tile view={view} size="compact" title="Card deposits" text="Paid when they book. Tap to take another.">
    <button type="button" className={s.payment} data-step={step} onClick={replay} aria-label="Take another deposit">
      <span className={s.bankCard}><i/><b>•••• 4242</b></span>
      <span className={s.paymentRows}>
        <span className={s.kv}><span>Quoted price</span><b>$250</b></span>
        <span className={s.kv}><span>Deposit</span>{step >= 3 ? <Chip tone="green">Paid $100</Chip> : <Chip tone="amber">{step >= 2 ? 'Paying…' : 'Awaiting'}</Chip>}</span>
      </span>
    </button>
  </Tile>;
}

const artistSales = [
  { name: 'Alex Morgan', tattoos: 12, sales: 5200 },
  { name: 'Sam Taylor', tattoos: 9, sales: 4000 },
  { name: 'Riley Chen', tattoos: 11, sales: 2800 },
];

// Performance: sales by artist. Tap a column to sort by it.
function Performance() {
  const [view, seen] = useView();
  const [sort, setSort] = useState('sales');
  const order = [...artistSales].sort((a, b) => b[sort] - a[sort]);
  return <Tile view={view} size="compact" title="Sales by artist" text="Tattoos and sales for each artist. Tap a column to sort.">
    <div className={s.perf}>
      <p className={s.perfHead}><span>Artist</span>{[['tattoos', 'Tattoos'], ['sales', 'Sales']].map(([key, label]) => <button key={key} type="button" aria-pressed={sort === key} onClick={() => setSort(key)}>{label}{sort === key ? ' ↓' : ''}</button>)}</p>
      <ul>
        {artistSales.map(artist => <li key={artist.name} style={{ transform: `translateY(${order.indexOf(artist) * 100}%)` }}>
          <span>{artist.name.split(' ')[0]}</span><b data-on={sort === 'tattoos' || undefined}><Count value={artist.tattoos} on={seen} format={value => Math.round(value)}/></b><b data-on={sort === 'sales' || undefined}><Count value={artist.sales} on={seen}/></b>
        </li>)}
      </ul>
    </div>
  </Tile>;
}

const owed = [['Alex Morgan', 1200], ['Sam Taylor', 900], ['Riley Chen', 600]];

// Payouts: artists to pay. Pay out records it and the artist is owed nothing.
function Payouts() {
  const [view, seen] = useView();
  const [paid, setPaid] = useState([]);
  useEffect(() => {
    if (!seen) return undefined;
    if (calm()) { setPaid([0]); return undefined; }
    const timer = setTimeout(() => setPaid(list => (list.includes(0) ? list : [...list, 0])), 1600);
    return () => clearTimeout(timer);
  }, [seen]);
  const total = owed.reduce((sum, [, amount], index) => sum + (paid.includes(index) ? 0 : amount), 0);
  const left = owed.length - paid.length;
  return <Tile view={view} size="wide" title="Artist payouts" text="What each artist is owed from their sessions. Record a payout and it comes off the list.">
    <div className={s.payouts}>
      <p className={s.payHead}><b>Artists to pay</b><span><strong><Count value={total} on={seen} format={value => dollars(value, true)}/></strong> owed to {left} {left === 1 ? 'artist' : 'artists'}</span>
        {left === 0 && <button type="button" className={s.buttonGhost} onClick={() => setPaid([])}>Start again</button>}</p>
      <div className={s.table}>
        <p className={s.tableHead}><span>Artist</span><span>Last payout</span><span>Owed</span><span/></p>
        {owed.map(([name, amount], index) => {
          const done = paid.includes(index);
          return <p key={name} className={s.tableRow} data-done={done || undefined}>
            <span>{name}</span><span>{done ? 'Today' : '—'}</span><b><Count value={done ? 0 : amount} on={seen} format={value => dollars(value, true)}/></b>
            <button type="button" className={s.buttonGhost} disabled={done} onClick={() => setPaid(list => [...list, index])}>{done ? <><Check/>Paid</> : 'Pay out'}</button>
          </p>;
        })}
      </div>
    </div>
  </Tile>;
}

/* ---------------- Team ---------------- */

// Invite artists: the studio code, an artist entering it in the Vanta app, and My Artists.
function StudioCode() {
  const [view, seen] = useView();
  const code = 'K7PM3Q';
  const [step, replay] = useScript(seen, [600, 850, 1100, 1350, 1600, 1850, 2400, 2900, 3400]);
  const [copied, setCopied] = useNote(1600);
  return <Tile view={view} size="hero" title="Invite artists" text="Artists who join with your studio code are connected straight away. No approval needed.">
    <div className={s.invite}>
      <div className={s.dialog}>
        <p className={s.label}>Studio code</p>
        <p className={s.hint}>Artists enter it in the Vanta app: Edit profile, then Join with a studio code.</p>
        <div className={s.codeBox}><b>{code}</b><button type="button" className={s.buttonLight} data-done={copied || undefined} onClick={() => setCopied(true)}>{copied ? <><Check/>Copied</> : 'Copy code'}</button></div>
      </div>
      <div className={s.inviteRow}>
        <button type="button" className={s.app} onClick={replay} aria-label="Play joining again">
          <small>Vanta · Edit profile</small><b>Join with a studio code</b>
          <span className={s.boxes}>{code.split('').map((char, index) => <i key={index} data-on={step > index || undefined}>{step > index ? char : ''}</i>)}</span>
          <span className={s.join} data-state={step >= 8 ? 'done' : step >= 7 ? 'press' : undefined}>{step >= 8 ? <><Check/>Joined {STUDIO}</> : 'Join'}</span>
        </button>
        <ul className={s.roster}>
          <li className={s.rosterHead}><b>My Artists</b><small>Approved artists at your studio</small></li>
          {step >= 9 && <li data-new><Avatar name="Jordan Lee"/><span className={s.who}><b>Jordan Lee</b><small>jordan@example.com</small></span><Chevron/></li>}
          {['Alex Morgan', 'Sam Taylor', 'Riley Chen'].map(name => <li key={name}><Avatar name={name}/><span className={s.who}><b>{name}</b><small>{name.split(' ')[0].toLowerCase()}@example.com</small></span><Chevron/></li>)}
        </ul>
      </div>
    </div>
  </Tile>;
}

const seats = ['Alex Morgan', 'Sam Taylor', 'Riley Chen'];

// Stations: accepting a booking puts the artist in a free station.
function Stations() {
  const [view, seen] = useView();
  const [seated, setSeated] = useState(0);
  useEffect(() => {
    if (!seen) return undefined;
    if (calm()) { setSeated(2); return undefined; }
    const one = setTimeout(() => setSeated(1), 700);
    const two = setTimeout(() => setSeated(2), 1600);
    return () => { clearTimeout(one); clearTimeout(two); };
  }, [seen]);
  const full = seated >= 3;
  return <Tile view={view} size="compact" title="Stations" text="Accept a booking and the artist gets a free station.">
    <div className={s.stations}>
      <p className={s.label}>Sat 10:00 am</p>
      {[1, 2, 3].map(n => <p key={n} className={s.station} data-on={seated >= n || undefined}><span>Station {n}</span>{seated >= n ? <b key={n}><Avatar name={seats[n - 1]}/>{seats[n - 1].split(' ')[0]}</b> : <small>Free</small>}</p>)}
      <button type="button" className={s.buttonLight} onClick={() => setSeated(full ? 0 : seated + 1)}>{full ? 'Clear the day' : 'Accept a booking'}</button>
    </div>
  </Tile>;
}

const timetable = [['Mon', '10am – 6pm'], ['Tue', '10am – 6pm'], ['Wed', '10am – 6pm'], ['Thu', '12pm – 8pm'], ['Fri', '10am – 6pm'], ['Sat', 'Off'], ['Sun', 'Off']];

// The artist page: accepting bookings, and the work timetable behind their availability.
function ArtistSettings() {
  const [view] = useView();
  const [accepting, setAccepting] = useState(true);
  return <Tile view={view} size="compact" title="Each artist’s hours" text="Their work timetable, and whether clients can book them.">
    <div className={s.artistSet}>
      <button type="button" className={s.toggleRow} role="switch" aria-checked={accepting} onClick={() => setAccepting(value => !value)}>
        <span><b>Accepting bookings</b><small>{accepting ? 'Clients can book' : 'Not taking bookings'}</small></span><i data-on={accepting || undefined}/>
      </button>
      <ul className={s.timetable} data-off={!accepting || undefined}>{timetable.map(([day, hours]) => <li key={day}><b>{day}</b><span data-off={hours === 'Off' || undefined}>{hours}</span></li>)}</ul>
    </div>
  </Tile>;
}

const types = [
  { name: 'Consultation', length: '30 min', colour: '#8b7cf6', rates: [0, 0, 0] },
  { name: 'Small tattoo', length: '2 h', colour: '#5b9cf0', rates: [250, 220, 280] },
  { name: 'Flash', length: '1 h', colour: '#4cc38a', rates: [120, 110, 150] },
  { name: 'Full day', length: '6 h', colour: '#e5a54b', rates: [1100, 950, 1200] },
];
const rateArtists = ['Alex Morgan', 'Sam Taylor', 'Riley Chen'];

// Appointment types, priced from the assigned artist's rate.
function AppointmentTypes() {
  const [view, seen, visible] = useView();
  const [who, setWho] = useState(0);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!visible || touched || calm()) return undefined;
    const timer = setInterval(() => setWho(index => (index + 1) % rateArtists.length), 2800);
    return () => clearInterval(timer);
  }, [visible, touched]);
  return <Tile view={view} size="wide" title="Appointment types" text="Presets with length, colour, price and deposit, priced from each artist’s rate.">
    <div className={s.types}>
      <div className={s.artistPick}><span>Priced for</span>{rateArtists.map((name, index) => <button key={name} type="button" aria-pressed={who === index} onClick={() => { setWho(index); setTouched(true); }}>{name}</button>)}</div>
      <ul>
        {types.map(type => <li key={type.name} style={{ '--c': type.colour }}>
          <i/><span className={s.who}><b>{type.name}</b><small>{type.length} · {type.rates[who] ? <Count value={type.rates[who]} on={seen} ms={500}/> : '$0'}</small></span><span className={s.edit}>Edit</span>
        </li>)}
      </ul>
    </div>
  </Tile>;
}

/* ---------------- Sections ---------------- */

export const bentoTiles = {
  bookings: <><BookingForm/><BookingLink/><InstantBooking/><NeedsAction/></>,
  clients: <><ClientRecord/><ConsentForm/><PhotoId/><ImportClients/></>,
  money: <><Financial/><DepositPaid/><Performance/><Payouts/></>,
  team: <><StudioCode/><Stations/><ArtistSettings/><AppointmentTypes/></>,
};
