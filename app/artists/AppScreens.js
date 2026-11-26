// Three screens of the Vanta artist app, drawn in HTML in the app's dark style, for "Every request arrives
// with everything you need": the Home tab's day view, the Bookings tab, and one booking's details with the
// client's reference photos. Layouts follow the iOS app (ArtistHomeView's DayCalendarGrid, the Bookings tab,
// BookingRequestDetailView). Every size is in em: the frame sets 1em = 1/32 of its width, so a screen scales
// to whatever width it is given.
import s from './appScreens.module.css';

function StatusBar() {
  return <div className={s.status} aria-hidden="true">
    <span>9:41</span><i className={s.island}/>
    <svg viewBox="0 0 34 12"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="1" width="3" height="11" rx="1"/><rect x="22" y="2" width="10" height="8" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.2"/><rect x="23.6" y="3.6" width="6.8" height="4.8" rx="1.4"/></svg>
  </div>;
}

const tabIcons = {
  Home: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z',
  Map: 'M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5ZM9 4v13.5M15 6.5V20',
  Bookings: 'M4 6h16v14H4zM4 10h16M8 3.5V7M16 3.5V7M8 14h2M12 14h2M16 14h0',
  Messages: 'M4 5h12v9H8l-4 3V5ZM9 17h7l4 3v-9h-2',
  Profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5',
};

function TabBar({ active }) {
  return <div className={s.tabBar} aria-hidden="true">
    <div className={s.tabs}>
      {Object.entries(tabIcons).map(([name, path]) => <span key={name} data-active={name === active || undefined}>
        <svg viewBox="0 0 24 24"><path d={path}/></svg>{name}
      </span>)}
    </div>
    <span className={s.search}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></span>
  </div>;
}

function Phone({ label, children }) {
  return <div className={s.frame} role="img" aria-label={label}>
    <div className={s.screen}>
      <StatusBar/>
      {children}
    </div>
  </div>;
}

/* ---------- 1. Home: today, hour by hour ---------- */

const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const today = [
  { start: 10, end: 13, name: 'Sam Taylor', detail: 'Fine line peony · inner forearm', state: 'Deposit paid', tone: 'violet' },
  { start: 14, end: 16, name: 'Alex Morgan', detail: 'Old school rose · hand', state: 'Consent signed', tone: 'blue' },
  { start: 16.5, end: 17.5, name: 'Jamie Lee', detail: 'Consult · blackwork back piece', state: 'Reminder sent', tone: 'green' },
];
const hourLabel = h => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
const timeLabel = t => { const h = Math.floor(t); const m = Math.round((t - h) * 60); return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')}`; };

export function HomeScreen() {
  const row = 4.8; // em per hour
  return <Phone label="The Vanta app's Home tab: today, Tuesday 17 October, laid out hour by hour with three sessions, and 2 requests that need a reply">
    <div className={s.homeHead}>
      <div className={s.dateNav}>
        <i className={s.chev}>‹</i>
        <span><b>Today</b><small>Tue 17 Oct</small></span>
        <i className={s.chev}>›</i>
      </div>
      <span className={s.attention}><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"/><path d="M8 4.5v4.2M8 11h0" stroke="#3a2a08" strokeWidth="1.8" strokeLinecap="round"/></svg>2</span>
      <span className={s.roundIcon}><svg viewBox="0 0 16 16"><rect x="2" y="2" width="5" height="5" rx="1.2"/><rect x="9" y="2" width="5" height="5" rx="1.2"/><rect x="2" y="9" width="5" height="5" rx="1.2"/><rect x="9" y="9" width="5" height="5" rx="1.2"/></svg></span>
    </div>
    <div className={s.dayGrid} style={{ height: `${hours.length * row}em` }}>
      {hours.map((h, i) => <div key={h} className={s.hour} style={{ top: `${i * row}em` }}><span>{hourLabel(h)}</span></div>)}
      {today.map(b => <div key={b.name} className={s.block} data-tone={b.tone} style={{ top: `${(b.start - hours[0]) * row + 0.15}em`, height: `${(b.end - b.start) * row - 0.3}em` }}>
        <b>{b.name}</b>
        <small>{timeLabel(b.start)} – {timeLabel(b.end)} · {b.detail}</small>
        {b.end - b.start >= 2 && <span className={s.blockState}>✓ {b.state}</span>}
      </div>)}
      <div className={s.now} style={{ top: `${(12.33 - hours[0]) * row}em` }}><i/></div>
    </div>
    <span className={s.fab}><svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg></span>
    <TabBar active="Home"/>
  </Phone>;
}

/* ---------- 2. Bookings: the month, and a busy day ---------- */

const busyDays = new Set([3, 5, 10, 12, 14, 17, 18, 19, 21, 24, 26, 28, 31]);
const saturday = [
  { name: 'Priya Shah', when: '21 Oct 10:00 am · App', state: 'confirmed' },
  { name: 'Ben Carter', when: '21 Oct 12:30 pm · Studio', state: 'confirmed' },
  { name: 'Lena Park', when: '21 Oct 3:00 pm · App', state: 'deposit' },
  { name: 'Chris Wong', when: '21 Oct 5:00 pm · App', state: 'confirmed' },
  { name: 'Maya Singh', when: '21 Oct 6:30 pm · App', state: 'deposit' },
];

export function BookingsScreen() {
  // October 2023 starts on a Sunday, so in a Monday-first grid the 1st is in the last column.
  const cells = [...Array(6).fill(null), ...Array.from({ length: 31 }, (_, i) => i + 1)];
  return <Phone label="The Vanta app's Bookings tab: October with the busy days marked, and Saturday 21 October's five bookings">
    <div className={s.barHead}><span className={s.plus}>+</span><b>Bookings</b><svg className={s.inbox} viewBox="0 0 24 24"><path d="M4 13v5h16v-5M4 13l2.5-7h11l2.5 7M4 13h4.5l1 2h5l1-2H20"/></svg></div>
    <div className={s.month}>
      <div className={s.monthHead}><b>October</b><span><i>‹</i><i>›</i></span></div>
      <div className={s.week}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}</div>
      <div className={s.days}>{cells.map((d, i) => <span key={i} data-busy={busyDays.has(d) || undefined} data-selected={d === 21 || undefined} data-today={d === 17 || undefined}>{d}</span>)}</div>
    </div>
    <p className={s.listDay}>Saturday, Oct 21</p>
    <div className={s.bookingList}>
      {saturday.map(b => <div key={b.name} className={s.bookingRow}>
        <span><b>{b.name}</b><small>{b.when}</small></span>
        <i className={s.stateIcon} data-state={b.state}>{b.state === 'confirmed'
          ? <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.6"/><path d="m5.6 8.2 1.7 1.6 3.2-3.4"/></svg>
          : <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.6"/><path d="M8 5v3.2l2 1.2"/></svg>}</i>
        <i className={s.rowChev}>›</i>
      </div>)}
    </div>
    <TabBar active="Bookings"/>
  </Phone>;
}

/* ---------- 3. Booking details: everything, with the reference photos ---------- */

const references = [
  { src: '/welcome/wall-1.webp', alt: 'A fine line peony on an inner forearm' },
  { src: '/home/detail-peony.webp', alt: 'A fine line peony, close up' },
  { src: '/welcome/wall-2.webp', alt: 'A fine line olive branch' },
];

export function BookingDetailScreen() {
  return <Phone label="The Vanta app's booking details for Sam Taylor: confirmed, Tuesday 17 October 10 am, deposit paid, with three reference photos and the design, placement, session length and colour">
    <div className={s.detailHead}><i className={s.back}>‹</i><b>BOOKING DETAILS</b></div>
    <div className={s.detailBody}>
      <div className={s.client}><span className={s.avatar}>ST</span><b>Sam Taylor</b><i className={s.rowChev}>›</i></div>
      <div className={s.infoCard}><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"/><path d="m5 8.2 2 1.9 4-4.3" stroke="#0d2a17" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg><span><b>Booking Confirmed</b><small>This session is locked in.</small></span></div>
      <div className={s.infoRows}>
        <div><span>Date</span><b>Tue 17 Oct</b></div>
        <div><span>Time</span><b>10:00 am – 1:00 pm</b></div>
        <div><span>Deposit</span><b>$50.00 <span className={s.paid}>Paid</span></b></div>
      </div>
      <p className={s.section}><svg viewBox="0 0 16 16"><rect x="2" y="3.5" width="10" height="9" rx="1.5"/><path d="M4.5 1.5H14v8.5"/></svg>REFERENCE PHOTOS <span>{references.length}</span></p>
      <div className={s.refs}>{references.map(r => <img key={r.src} src={r.src} alt="" width="240" height="240" loading="lazy"/>)}</div>
      <p className={s.section}><svg viewBox="0 0 16 16"><path d="M10.5 2.5l3 3-7 7H3.5v-3l7-7Z"/></svg>DESIGN</p>
      <div className={s.descCard}><small>Description</small><p>Fine line peony with a few leaves, wrapping the inner forearm.</p></div>
      <div className={s.infoRows}>
        <div><span>Placement</span><b>Inner forearm</b></div>
        <div><span>Session</span><b>3 hrs</b></div>
        <div><span>Colour</span><b>Black &amp; grey</b></div>
      </div>
    </div>
  </Phone>;
}

export const appScreens = [
  { key: 'home', title: 'Your day', note: 'Home, hour by hour', Screen: HomeScreen },
  { key: 'bookings', title: 'Bookings', note: 'Every booking, by date', Screen: BookingsScreen },
  { key: 'details', title: 'Booking details', note: 'The idea and their reference photos', Screen: BookingDetailScreen },
];
