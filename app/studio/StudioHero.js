'use client';

// The studio page's first screen: "Run the whole studio from one desk, or from your phone." The last line
// swaps between the two, and the product swaps with it: Vanta Studio's week view (the desk) and its phone
// Schedule, both drawn in the page from the real screens. Bookings land on both at once, because it's one
// studio. Desk | Phone lets visitors switch; it switches by itself until they do, only while on screen.
import { useEffect, useRef, useState } from 'react';
import h from './hero.module.css';

const calm = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Appointment-type colours, as the schedule colours each booking.
const types = { consult: '#8b7cf6', small: '#5b9cf0', flash: '#4cc38a', day: '#e5a54b' };
// [day 0–6, hour from 9am, hours, client, artist, type, lane, lanes]
const week = [
  [0, 1, 2, 'Avery Brooks', 'Riley', 'small'], [0, 4, 1, 'Ruby Hart', 'Sam', 'consult'],
  [1, 0, 6, 'Noah Park', 'Alex', 'day', 0, 2], [1, 2, 2, 'Casey Lane', 'Riley', 'flash', 1, 2],
  [2, 1, 3, 'Finley James', 'Sam', 'small'], [3, 0, 1, 'Ivy Moss', 'Riley', 'consult'], [3, 3, 2, 'Jordan Ellis', 'Alex', 'small'],
  [4, 0, 2, 'Ada Fox', 'Alex', 'flash'], [4, 2, 4, 'Leo Grant', 'Sam', 'day'],
  [5, 1, 2, 'Mia Carter', 'Alex', 'small', 0, 2], [5, 2, 3, 'Jamie Wilson', 'Sam', 'small', 1, 2], [5, 4, 2, 'Taylor Quinn', 'Riley', 'flash', 0, 2],
];
// Saturday 28th, as the phone lists it: [from, to, client, station, artist, type]
const today = [
  ['10:00 am', '12:00 pm', 'Mia Carter', 'Station 1', 'Alex Morgan', 'small'],
  ['11:00 am', '2:00 pm', 'Jamie Wilson', 'Station 2', 'Sam Taylor', 'small'],
  ['1:00 pm', '3:00 pm', 'Taylor Quinn', 'Station 3', 'Riley Chen', 'flash'],
];
// New bookings for today, landing on both screens: the desk block, then the phone row.
const incoming = [
  { desk: [5, 6, 2, 'Kai Rivera', 'Alex', 'flash', 0, 2], row: ['3:00 pm', '5:00 pm', 'Kai Rivera', 'Station 1', 'Alex Morgan', 'flash'] },
  { desk: [5, 5, 1, 'Eli Stone', 'Sam', 'consult', 1, 2], row: ['2:00 pm', '3:00 pm', 'Eli Stone', 'Station 2', 'Sam Taylor', 'consult'] },
];
const order = time => { const [clock, part] = time.split(' '); const [hour, minute] = clock.split(':').map(Number); return (hour % 12 + (part === 'pm' ? 12 : 0)) * 60 + minute; };

// A screen drawn at a fixed size and scaled to fit the width it is given.
function Scaled({ width, height, className, children }) {
  const outer = useRef(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = outer.current;
    const measure = () => setScale(element.clientWidth / width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);
  return <div ref={outer} className={className} style={{ height: scale ? height * scale : undefined, aspectRatio: scale ? undefined : `${width} / ${height}` }}>
    <div className={h.scaled} style={{ width, height, transform: `scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}>{children}</div>
  </div>;
}

function Desk({ blocks, waiting }) {
  const days = [['Mon', 23], ['Tue', 24], ['Wed', 25], ['Thu', 26], ['Fri', 27], ['Sat', 28], ['Sun', 29]];
  const month = ['26', '27', '28', '29', '30', '31', ...Array.from({ length: 29 }, (_, i) => String(i + 1))];
  return <div className={h.desk}>
    <div className={h.winBar}><i/><i/><i/><span>studio.vanta.tattoo</span></div>
    <div className={h.deskBody}>
      <aside>
        <p className={h.logo}>vanta<span>studio</span></p>
        <div className={h.mini}><p>November 2026</p><div>{'MTWTFSS'.split('').map((d, i) => <i key={i}>{d}</i>)}{month.map((d, i) => <span key={i} data-dim={i < 6 || undefined} data-today={(i === 33) || undefined}>{d}</span>)}</div></div>
        <div className={h.needs}><p>Needs action <b key={waiting}>{waiting}</b></p><span><i data-tone="amber"/>Pending requests<em>{waiting - 1}</em></span><span><i data-tone="blue"/>To confirm<em>1</em></span></div>
        <nav>{['Schedule', 'Artists', 'Clients', 'Bookings', 'Financial'].map((item, i) => <span key={item} data-on={i === 0 || undefined}>{item}</span>)}</nav>
      </aside>
      <div className={h.week}>
        <div className={h.weekTop}><span className={h.tabs}><b>Week</b><span>Day</span></span><span className={h.pill}>All artists ▾</span><span className={h.pill}>Today</span><b>23–29 November 2026</b></div>
        <div className={h.days}><span/>{days.map(([day, date], i) => <span key={day} data-today={i === 5 || undefined}><small>{day}</small><b>{date}<i>Nov</i></b></span>)}</div>
        <div className={h.cal}>
          {['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'].map((hour, r) => <span key={hour} className={h.hour} style={{ gridRow: r + 1 }}>{hour}</span>)}
          {Array.from({ length: 63 }, (_, i) => <span key={i} className={h.cell} data-today={i % 7 === 5 || undefined} style={{ gridRow: Math.floor(i / 7) + 1, gridColumn: (i % 7) + 2 }}/>)}
          {blocks.map(([d, start, length, name, artist, type, lane = 0, lanes = 1], i) => <div key={name} className={h.block} style={{ '--c': types[type], '--lane': lane, '--lanes': lanes, '--i': i, gridColumn: d + 2, gridRow: `${start + 1} / span ${length}` }}><b>{name}</b><small>{artist}</small></div>)}
        </div>
      </div>
    </div>
  </div>;
}

function Icon({ d }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{d}</svg>; }

function Phone({ rows }) {
  return <div className={h.phone}>
    <div className={h.screen}>
      <span className={h.island}/>
      <p className={h.status}><span>9:41</span><span>●●●</span></p>
      <div className={h.scroller}>
      <div className={h.pHead}><p className={h.logo}>vanta<span>studio</span></p><span className={h.new}>+ New</span></div>
      <div className={h.pDate}><small>Today</small><b>28 November</b></div>
      <div className={h.strip}>{[['M', 23], ['T', 24], ['W', 25], ['T', 26], ['F', 27], ['S', 28], ['S', 29]].map(([d, n]) => <span key={n} data-today={n === 28 || undefined}><i>{d}</i><b>{n}</b></span>)}</div>
      <div className={h.chips}><span>All artists</span>{[['AM', 'Alex'], ['RC', 'Riley'], ['ST', 'Sam']].map(([ini, name]) => <span key={name}><i>{ini}</i>{name}</span>)}</div>
      <div className={h.pBar}><span>{rows.length} bookings</span><span className={h.seg}><span>List</span><span>Day</span><span>Week</span></span></div>
      <div className={h.list}>
        {rows.map(([from, to, name, station, artist, type]) => <div key={name} className={h.row} style={{ '--c': types[type] }}>
          <span className={h.time}><b>{from}</b><small>{to}</small></span><span className={h.bar}/>
          <span className={h.what}><b>{name}</b><small>Studio · {station}</small><small>{artist}</small></span><span className={h.chev}>›</span>
        </div>)}
      </div>
      </div>
      <div className={h.tabbar}>
        <span data-on><Icon d={<><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></>}/>Schedule</span>
        <span><Icon d={<><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/></>}/>Bookings</span>
        <span><Icon d={<><circle cx="12" cy="9" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></>}/>Clients</span>
        <span><Icon d={<><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></>}/>More</span>
      </div>
    </div>
  </div>;
}


/* ---------- Phones: the app itself is the first screen ---------- */

// Each day's bookings as Studio's phone Schedule lists them: [from, to, client, station, artist, type, deposit, consent]
const days = {
  23: [['10:00 am', '12:00 pm', 'Avery Brooks', 'Station 3', 'Riley Chen', 'small', 100, true], ['1:00 pm', '2:00 pm', 'Ruby Hart', 'Station 2', 'Sam Taylor', 'consult', 0, false]],
  24: [['9:00 am', '3:00 pm', 'Noah Park', 'Station 1', 'Alex Morgan', 'day', 300, true], ['11:00 am', '1:00 pm', 'Casey Lane', 'Station 3', 'Riley Chen', 'flash', 80, true]],
  25: [['10:00 am', '1:00 pm', 'Finley James', 'Station 2', 'Sam Taylor', 'small', 100, true]],
  26: [['9:00 am', '10:00 am', 'Ivy Moss', 'Station 3', 'Riley Chen', 'consult', 0, false], ['12:00 pm', '2:00 pm', 'Jordan Ellis', 'Station 1', 'Alex Morgan', 'small', 100, true]],
  27: [['9:00 am', '11:00 am', 'Ada Fox', 'Station 1', 'Alex Morgan', 'flash', 80, true], ['11:00 am', '3:00 pm', 'Leo Grant', 'Station 2', 'Sam Taylor', 'day', 300, false]],
  28: [['10:00 am', '12:00 pm', 'Mia Carter', 'Station 1', 'Alex Morgan', 'small', 100, true], ['11:00 am', '2:00 pm', 'Jamie Wilson', 'Station 2', 'Sam Taylor', 'small', 100, true], ['1:00 pm', '3:00 pm', 'Taylor Quinn', 'Station 3', 'Riley Chen', 'flash', 80, false]],
  29: [],
};
const walkIn = ['3:00 pm', '5:00 pm', 'Kai Rivera', 'Station 1', 'Alex Morgan', 'flash', 80, false];
const weekStrip = [['M', 23], ['T', 24], ['W', 25], ['T', 26], ['F', 27], ['S', 28], ['S', 29]];
const people = [['All artists'], ['Alex', 'AM'], ['Riley', 'RC'], ['Sam', 'ST']];
const weekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Studio's phone Schedule at full size, to use with a thumb: pick a day, filter by artist, open a booking,
// add one with + New. A booking also arrives by itself a moment after it comes into view.
function LiveSchedule({ active }) {
  const [day, setDay] = useState(28);
  const [who, setWho] = useState('All artists');
  const [open, setOpen] = useState(null);
  const [added, setAdded] = useState(false);
  const [note, setNote] = useState(null);
  const add = () => {
    setDay(28); setWho('All artists');
    if (!added) { setAdded(true); setNote('New booking · Kai Rivera'); } else setNote('Kai Rivera is already booked');
  };
  useEffect(() => {
    if (!active || added || calm()) return undefined;
    const timer = setTimeout(() => { setAdded(true); setNote('New booking · Kai Rivera'); }, 3200);
    return () => clearTimeout(timer);
  }, [active, added]);
  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(null), 2400);
    return () => clearTimeout(timer);
  }, [note]);
  const rows = [...days[day], ...(day === 28 && added ? [walkIn] : [])]
    .filter(row => who === 'All artists' || row[4].startsWith(who))
    .sort((a, b) => order(a[0]) - order(b[0]));
  const dateLabel = day === 28 ? 'Today' : weekday[day - 23];
  return <div className={h.app}>
    <div className={h.appBar}><p className={h.logo}>vanta<span>studio</span></p><button type="button" className={h.new} onClick={add}>+ New</button></div>
    <div className={h.pDate}><small>{dateLabel}</small><b>{day} November</b></div>
    <div className={h.strip} role="tablist" aria-label="Day">
      {weekStrip.map(([d, n]) => <button key={n} type="button" role="tab" aria-selected={day === n} data-today={n === 28 || undefined} onClick={() => { setDay(n); setOpen(null); }}><i>{d}</i><b>{n}</b>{days[n].length > 0 && <em aria-hidden="true"/>}</button>)}
    </div>
    <div className={h.chips} role="group" aria-label="Artist">
      {people.map(([name, ini]) => <button key={name} type="button" aria-pressed={who === name} onClick={() => { setWho(name); setOpen(null); }}>{ini && <i>{ini}</i>}{name}</button>)}
    </div>
    <p className={h.count}>{rows.length} {rows.length === 1 ? 'booking' : 'bookings'}</p>
    <div className={h.list} key={day + who}>
      {rows.length === 0 && <p className={h.empty}>No bookings</p>}
      {rows.map(([from, to, name, station, artist, type, deposit, consent], index) => <button key={name} type="button" className={h.row} style={{ '--c': types[type], '--i': index }} aria-expanded={open === name} onClick={() => setOpen(open === name ? null : name)}>
        <span className={h.time}><b>{from}</b><small>{to}</small></span><span className={h.bar}/>
        <span className={h.what}><b>{name}</b><small>Studio · {station}</small><small>{artist}</small></span><span className={h.chev}>›</span>
        <span className={h.more}>
          <span className={h.tag} data-tone={deposit ? 'green' : 'grey'}>{deposit ? 'Deposit $' + deposit + ' paid' : 'No deposit'}</span>
          <span className={h.tag} data-tone={consent ? 'green' : 'red'}>{consent ? 'Consent signed' : 'Consent not signed'}</span>
        </span>
      </button>)}
    </div>
    <p className={h.toast} data-on={note ? '' : undefined} aria-live="polite">{note}</p>
  </div>;
}

export default function StudioHero({ links }) {
  const root = useRef(null);
  const stage = useRef(null);
  const [mode, setMode] = useState('desk');
  const [touched, setTouched] = useState(false);
  const [visible, setVisible] = useState(false);
  const [landed, setLanded] = useState(0);
  const [note, setNote] = useState(null);

  useEffect(() => {
    const element = root.current;
    if (!element || !('IntersectionObserver' in window)) { setVisible(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Desk, phone, desk… every few seconds, until the visitor picks one.
  useEffect(() => {
    if (touched || !visible || calm()) return undefined;
    const timer = setInterval(() => setMode(current => (current === 'desk' ? 'phone' : 'desk')), 4200);
    return () => clearInterval(timer);
  }, [touched, visible]);
  // New bookings land on both screens.
  useEffect(() => {
    if (!visible || landed >= incoming.length || calm()) return undefined;
    const timer = setTimeout(() => { setNote(incoming[landed].row[2]); setLanded(count => count + 1); }, landed ? 4600 : 2600);
    return () => clearTimeout(timer);
  }, [visible, landed]);
  useEffect(() => {
    if (!note) return undefined;
    const timer = setTimeout(() => setNote(null), 2400);
    return () => clearTimeout(timer);
  }, [note]);

  const arrived = incoming.slice(0, landed);
  const blocks = [...week, ...arrived.map(item => item.desk)];
  const rows = [...today, ...arrived.map(item => item.row)].sort((a, b) => order(a[0]) - order(b[0]));
  const pick = value => { setMode(value); setTouched(true); };
  // A sideways swipe on the stage switches screens, like the paged panels on the artist page.
  const swipe = useRef(null);
  const onPointerDown = event => { if (event.pointerType !== 'mouse') swipe.current = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = event => {
    const start = swipe.current; swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x; const dy = event.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) pick(dx < 0 ? 'phone' : 'desk');
  };
  const index = mode === 'desk' ? 0 : 1;

  const swap = <span className={h.swap} data-mode={mode} aria-hidden="true"><em data-on={mode === 'desk' || undefined}>from one desk.</em><em data-on={mode === 'phone' || undefined}>from your phone.</em></span>;
  return <div ref={root} className={h.hero}>
    <section className={h.narrow} aria-labelledby="studio-heading-phone">
      <h1 id="studio-heading-phone" className={h.nTitle}><span className={h.lineOne}>Run the whole studio</span>{swap}<span className={h.hidden}> from one desk, or from your phone.</span></h1>
      <LiveSchedule active={visible}/>
      <div className={h.nDock}><a href={links.signup} className={h.nPrimary}>Start your 14-day trial</a></div>
    </section>
    <section className={h.wide} aria-labelledby="studio-heading">
    <div className={h.copy}>
      <p className={h.kicker}>Vanta Studio</p>
      <h1 id="studio-heading">
        <span className={h.lineOne}>Run the whole studio</span>
        <span className={h.swap} data-mode={mode} aria-hidden="true"><em data-on={mode === 'desk' || undefined}>from one desk.</em><em data-on={mode === 'phone' || undefined}>from your phone.</em></span>
        <span className={h.hidden}> from one desk, or from your phone.</span>
      </h1>
      <div className={h.side}>
        <p className={h.lead}>Bookings, clients, consent and payouts, at the front desk or in your pocket.</p>
        <div className={h.actions}><a href={links.signup} className={h.primary}>Start your 14-day trial</a><a href={links.pricing} className={h.secondary}>See pricing</a></div>
      </div>
    </div>
    <div ref={stage} className={h.stage} data-mode={mode} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null; }}>
      <div className={h.segmented} role="tablist" aria-label="Show Vanta Studio" style={{ '--index': index }}>
        <i className={h.thumb} aria-hidden="true"/>
        <button type="button" role="tab" aria-selected={mode === 'desk'} onClick={() => pick('desk')}>At the desk</button>
        <button type="button" role="tab" aria-selected={mode === 'phone'} onClick={() => pick('phone')}>On your phone</button>
      </div>
      <div className={h.devices}>
        <div className={h.deskSlot} role="img" aria-label="Vanta Studio’s week schedule on a computer, with Needs action in the sidebar" inert={mode === 'desk' ? undefined : ''}>
          <Scaled width={1120} height={660} className={h.deskFrame}><Desk blocks={blocks} waiting={2 + landed}/></Scaled>
        </div>
        <div className={h.phoneSlot} role="img" aria-label="Vanta Studio’s Schedule on a phone, listing today’s bookings" inert={mode === 'phone' ? undefined : ''}>
          <Scaled width={390} height={800} className={h.phoneFrame}><Phone rows={rows}/></Scaled>
        </div>
        <p className={h.note} data-on={note ? '' : undefined} aria-live="polite">{note && <><i>✓</i>{note} booked · on every screen</>}</p>
      </div>
    </div>
    </section>
  </div>;
}
