import Link from 'next/link';
import ArtistTour, { ArtistTourButton, ArtistTourProvider } from './ArtistTour';
import ArtistAppearance, { ArtistThemePicker } from './ArtistAppearance';
import ThemeAccent from './ThemeAccent';
import ArtistDayShowcase from './ArtistDayShowcase';
import ArtistBookingShowcase from './ArtistBookingShowcase';
import ArtistPortfolio from './ArtistPortfolio';
import { APP_STORE_URL } from '@/components/walkthrough/lib/artistFeatureCatalog';
import styles from './artists.module.css';

function Chapter({ number, children }) {
  return <p className={styles.eyebrow}><span className={styles.chapterNumber}>{number}</span>{children}</p>;
}

function Bookings() {
  return <section id="your-bookings" className={styles.bookingSection} aria-labelledby="your-bookings-heading">
    <header className={styles.bookingHeading} data-artist-reveal="rise"><Chapter number="02">YOUR BOOKINGS</Chapter><h2 id="your-bookings-heading">From the first idea<br />to <em>booked in.</em></h2><p>A clear next step. For you and your client.</p></header>
    <ArtistBookingShowcase />
  </section>;
}

function NotificationIcon({ sms = false }) {
  return <svg className={styles.notificationIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {sms ? <><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z" /><path d="M7 9h10M7 13h6" /></> : <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>}
  </svg>;
}

function ReminderMarker({ kind }) {
  return <span data-reminder-mark="" data-reminder-kind={kind} className={styles.timelineMark} aria-hidden="true">
    <i data-reminder-halo="" />
    <svg className={styles.markerOrbit} viewBox="0 0 88 88" fill="none"><circle data-reminder-effect="orbit" cx="44" cy="44" r="42" pathLength="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1" /></svg>
    <svg className={styles.markerGlyph} data-reminder-effect="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'confirmation' ? <><g data-reminder-effect="letter"><path d="M14 24V11h20v13M19 16h10M19 21h7" /></g><path d="M8 20h32v17a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3Zm0 0 16 12 16-12" /></> : kind === 'week' ? <><rect x="9" y="11" width="30" height="29" rx="4" /><path d="M16 7v8M32 7v8M9 20h30" /><g className={styles.calendarPage} data-reminder-effect="page"><path d="M17 26h3M27 26h3M17 33h3M27 33h3" /></g></> : <><circle cx="24" cy="24" r="16" /><path d="M24 8v3M40 24h-3M24 40v-3M8 24h3" /><path className={styles.clockHand} data-reminder-effect="minute" d="M24 24V13" /><path className={styles.clockHand} data-reminder-effect="hour" d="m24 24 8 3" /><circle cx="24" cy="24" r="1.5" fill="currentColor" stroke="none" /></>}
    </svg>
    <span className={styles.markerValue} data-reminder-effect="value">{kind === 'confirmation' ? <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path data-reminder-effect="check" pathLength="1" strokeDasharray="1" d="m12 24 8 8 16-18" /></svg> : <>{kind === 'week' ? '7' : '24'}<small>{kind === 'week' ? 'd' : 'h'}</small></>}</span>
  </span>;
}

function ClientReminders() {
  return <section id="your-reminders" className={styles.reminderSection} aria-labelledby="your-reminders-heading">
    <header className={styles.reminderHeading} data-artist-reveal="rise"><Chapter number="03">CLIENT REMINDERS</Chapter><h2 id="your-reminders-heading">Reminders,<br /> <em>handled.</em></h2><p>You focus on the tattoo.<br />Vanta takes care of the heads-up.</p></header>
    <dl className={styles.reminderTimeline} data-artist-reveal="notifications" aria-label="Client notification schedule">
      <div><dt><span className={styles.timelineRail} aria-hidden="true"><span data-reminder-line="" /></span><ReminderMarker kind="confirmation" /><span>When booked</span></dt><dd><NotificationIcon />Confirmation email</dd></div>
      <div><dt><span className={styles.timelineRail} aria-hidden="true"><span data-reminder-line="" /></span><ReminderMarker kind="week" /><span>7 days before</span></dt><dd><NotificationIcon />Email reminder</dd></div>
      <div><dt><ReminderMarker kind="day" /><span>24 hours before</span></dt><dd><span className={styles.notificationChannel}><NotificationIcon />Email</span><span>+</span><span className={styles.notificationChannel}><NotificationIcon sms />SMS reminders</span></dd></div>
    </dl>
    <div className={styles.senderSetup} data-artist-reveal="after-notifications">
      <svg className={styles.inboxArrow} data-inbox-arrow="" viewBox="0 0 20 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3v20m-5-5 5 5 5-5" /></svg>
      <div className={styles.senderCopy}><h3 data-inbox-part="">Sent from <em>your inbox.</em></h3><p data-inbox-part="">Connect your email once. Vanta sends those appointment emails from your own address.</p></div>
      <div className={styles.emailProviders} data-inbox-part="" aria-label="Supported email providers">
        <div className={styles.emailProvider}><svg viewBox="0 0 48 40" width="42" height="36" fill="none" aria-hidden="true"><path d="M6 34V10l18 13 18-13v24" stroke="#4285F4" strokeWidth="8" strokeLinejoin="round" /><path d="M6 34V10l18 13" stroke="#EA4335" strokeWidth="8" strokeLinejoin="round" /><path d="M6 34V15" stroke="#4285F4" strokeWidth="8" /><path d="m24 23 18-13v24" stroke="#34A853" strokeWidth="8" strokeLinejoin="round" /><path d="m35 15 7-5v10" stroke="#FBBC04" strokeWidth="8" strokeLinejoin="round" /><path d="M6 10 24 23 42 10" stroke="#EA4335" strokeWidth="6" strokeLinejoin="round" /></svg><span>Gmail</span></div>
        <div className={styles.emailProvider}><svg viewBox="0 0 48 40" width="42" height="36" fill="none" aria-hidden="true"><rect x="15" y="3" width="27" height="24" rx="2" fill="#0078D4" /><path d="M28 3h14v12H28z" fill="#28A8EA" /><path d="M15 15h13v12H15z" fill="#0364B8" /><path d="m14 15 18-5 15 10v17H14Z" fill="#0A8CDA" /><path d="m14 18 16 11 17-9v17H14Z" fill="#28A8EA" /><rect x="1" y="7" width="25" height="29" rx="2" fill="#0364B8" /><ellipse cx="13.5" cy="21.5" rx="6" ry="8" stroke="#fff" strokeWidth="3" /></svg><span>Outlook</span></div>
      </div>
    </div>
    <p className={styles.reminderNote}>Custom email and reminders require an artist subscription. Confirmation emails stay free. SMS requires client permission and availability.</p>
  </section>;
}

function YourDay() {
  return <section id="your-day" className={styles.daySection} aria-labelledby="your-day-heading">
    <header className={styles.dayHeading} data-artist-reveal="day-heading"><Chapter number="04">YOUR DAY</Chapter><h2 id="your-day-heading"><span data-day-line="">Your day-to-day.</span><em data-day-line="">All in one place.</em></h2></header>
    <figure className={styles.dayPoster}>
      <span className={styles.posterKicker} aria-hidden="true">YOUR EVERYDAY ESSENTIALS</span>
      <ArtistDayShowcase />
    </figure>
  </section>;
}

function DownloadInvitation() {
  return <section id="get-vanta" className={styles.invitation} aria-labelledby="start-heading">
    <p className={styles.eyebrow} data-artist-reveal="rise">YOUR NEXT CHAPTER</p>
    <h2 id="start-heading" data-artist-reveal="rise" data-reveal-delay="60">Make room for<br /><em>your best work.</em></h2>
    <p data-artist-reveal="rise" data-reveal-delay="100">Your portfolio, bookings and clients.<br />All in your pocket.</p>
    <div className={styles.invitationActions}>
      <a className={`${styles.invitationDownload} ${styles.invitationIos}`} data-artist-reveal="rise" href={APP_STORE_URL} aria-label="Download Vanta for iOS on the App Store">
        <svg className={styles.platformIcon} width="28" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.1 12.4c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 3-.7s1.9.7 3.1.7c1.3 0 2-1.1 2.7-2.2.9-1.3 1.2-2.6 1.2-2.7-.1 0-3-1.1-3-3.8ZM15 6.3c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3Z" /></svg>
        <span className={styles.platformLabel}><small>Download for</small><strong>iOS</strong></span>
        <svg className={styles.downloadArrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg>
      </a>
      <a className={`${styles.invitationDownload} ${styles.invitationAndroid}`} data-artist-reveal="rise" data-reveal-delay="100" href="https://play.google.com/apps/testing/vanta.tattoo" target="_blank" rel="noopener noreferrer" aria-label="Join the Vanta Android beta">
        <svg className={styles.platformIcon} width="26" height="28" viewBox="0 0 24 26" fill="currentColor" aria-hidden="true"><path d="M2 2.2v21.6L13 13 2 2.2Zm1.8-.7 12 6.8-2.2 2.8L3.8 1.5Zm0 23 9.8-9.6 2.2 2.8-12 6.8ZM15 13l2.7-3.3 4.4 2.5c.6.4.6 1.2 0 1.6l-4.4 2.5L15 13Z" /></svg>
        <span className={styles.platformLabel}><small>Join the beta</small><strong>Android</strong></span>
        <svg className={styles.downloadArrow} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg>
      </a>
    </div>
    <ArtistTourButton />
  </section>;
}

export default function ArtistsPage() {
  return <ArtistAppearance><ArtistTourProvider>
    <a className={styles.skipLink} href="#artist-main">Skip to content</a>
    <header className={styles.navigation} data-artist-header="">
      <Link href="/" className={styles.wordmark} aria-label="Vanta home">vanta<span>.</span></Link>
      <nav aria-label="Vanta products"><Link href="/artists" aria-current="page" aria-label="For artists"><span className={styles.navPrefix}>For </span>artists</Link><Link href="/studio" aria-label="For studios"><span className={styles.navPrefix}>For </span>studios</Link></nav>
      <ArtistThemePicker />
    </header>
    <main id="artist-main" tabIndex={-1} className={styles.main}>
      <section className={styles.hero} aria-labelledby="artist-heading">
        <div className={styles.heroScenery} aria-hidden="true"><ThemeAccent className={styles.sceneryLeft} /><ThemeAccent className={styles.sceneryRight} flipped /></div>
        <div className={styles.heroCopy}>
          <h1 id="artist-heading" data-artist-reveal="rise">Your art. <em>Less admin.</em></h1>
          <p className={styles.intro} data-artist-reveal="rise" data-reveal-delay="60">Your portfolio, bookings and clients. All in one app.</p>
          <div className={styles.heroActions} data-artist-reveal="rise" data-reveal-delay="120">
            <a className={`${styles.primaryLink} ${styles.downloadLink}`} href={APP_STORE_URL} aria-label="Get Vanta for iPhone">
              <svg width="19" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.1 12.4c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 3-.7s1.9.7 3.1.7c1.3 0 2-1.1 2.7-2.2.9-1.3 1.2-2.6 1.2-2.7-.1 0-3-1.1-3-3.8ZM15 6.3c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3Z" /></svg>
              <span className={styles.storeDesktop}>Get Vanta for iPhone</span><span className={styles.storeMobile} aria-hidden="true"><small>Get Vanta for</small><strong>iPhone</strong></span>
            </a>
            <a className={styles.androidLink} href="https://play.google.com/apps/testing/vanta.tattoo" target="_blank" rel="noopener noreferrer" aria-label="Join the Android beta">
              <svg width="18" height="20" viewBox="0 0 24 26" aria-hidden="true" fill="currentColor"><path d="M2 2.2v21.6L13 13 2 2.2Zm1.8-.7 12 6.8-2.2 2.8L3.8 1.5Zm0 23 9.8-9.6 2.2 2.8-12 6.8ZM15 13l2.7-3.3 4.4 2.5c.6.4.6 1.2 0 1.6l-4.4 2.5L15 13Z" /></svg>
              <span className={styles.storeDesktop}>Join the Android beta</span><span className={styles.storeMobile} aria-hidden="true"><small>Join the beta</small><strong>Android</strong></span>
            </a>
          </div>
        </div>
        <ArtistTour />
      </section>
      <div id="artist-features" className={styles.features}>
        <ArtistPortfolio /><Bookings /><ClientReminders /><YourDay />
      </div>
      <DownloadInvitation />
    </main>
    <footer className={styles.footer}><Link href="/studio">Run a studio? <span>Explore Vanta Studio ↗</span></Link><nav aria-label="Footer"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><a href="mailto:support@vanta.tattoo">Contact</a></nav></footer>
  </ArtistTourProvider></ArtistAppearance>;
}
