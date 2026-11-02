'use client';

import styles from './app-preview.module.css';
import { useArtistTheme } from './ArtistAppearance';
import ThemeAccent from './ThemeAccent';

function Tattoo({ image, className = '' }) {
  return <img className={className} src={`/welcome/wall-${image}.webp`} alt="" width="720" height="1080" decoding="async" />;
}
function Icon({ name, size = 16 }) {
  const paths = { back: 'm15 5-7 7 7 7', more: 'M5 12h.01M12 12h.01M19 12h.01', plus: 'M12 5v14M5 12h14', heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z', bookmark: 'M6 3h12v18l-6-4-6 4z', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', home: 'm3 10 9-7 9 7v11h-6v-7H9v7H3z', calendar: 'M4 5h16v16H4zM8 2v6M16 2v6M4 10h16', chat: 'M4 3h16v14H9l-5 4z', person: 'M4 21v-2a8 8 0 0 1 16 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0', map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16' };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.more} /></svg>;
}
function Calendar() {
  return <>
    <div className={styles.appHeader}><span>Bookings</span><Icon name="plus" /></div>
    <div className={styles.summaryCard}><span>Booking requests</span><strong>2 new requests <span>↗</span></strong></div>
    <div className={styles.calendarTitle}><strong>12–18 Oct</strong><span>‹ &nbsp; ›</span></div>
    <div className={styles.week}>{['M','T','W','T','F','S','S'].map((day,i) => <div key={i} data-selected={i === 5}><span>{day}</span><b>{12+i}</b><i /></div>)}</div>
    <div className={styles.sectionLabel}>Saturday, 17 October</div>
    <div className={styles.calendarRows}>{['9 am','10 am','11 am','12 pm','1 pm','2 pm'].map((time,i) => <div key={time}><span>{time}</span>{i === 1 && <div className={styles.appointment}><strong>Tattoo appointment</strong><span>Sam · Botanical piece</span><small>10:00 am – 1:00 pm</small><b>Confirmed</b></div>}</div>)}</div>
  </>;
}
function Proposal() {
  return <>
    <div className={styles.appHeader}><Icon name="back" /><span>Booking details</span><Icon name="more" /></div>
    <div className={styles.client}><div className={styles.avatar}>v.</div><div><strong>Vanta Official</strong><span>Your artist</span></div></div>
    <div className={styles.infoBanner}>Your artist has proposed a time.<br />Choose a session that works for you.</div>
    <div className={styles.sectionLabel}>Your quote</div>
    <div className={styles.quote}>{[['Estimated price','$300'],['Duration','4 hours'],['Deposit','$50']].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className={styles.sectionLabel}>Proposed time</div>
    <div className={styles.summaryCard}><strong>Saturday, 17 October</strong><span>10:00 am – 2:00 pm</span><div className={styles.primaryAction}>Accept time</div></div>
    <div className={styles.secondaryAction}>Request another time</div>
    <div className={styles.sectionLabel}>Your design</div><div className={styles.designThumb}><Tattoo image={4} /><span>Botanical piece<br /><small>Inner forearm · Black & grey</small></span></div>
  </>;
}
function Request() {
  return <>
    <div className={styles.appHeader}><Icon name="back" /><span>Design details</span><Icon name="more" /></div>
    <div className={styles.formHeading}>Tell us about your design</div>
    <div className={styles.sectionLabel}>Reference photos</div>
    <div className={styles.referencePhotos}><Tattoo image={4} /><div><Icon name="plus" /><span>Add a reference</span></div></div>
    <div className={styles.sectionLabel}>Design description</div><div className={styles.formField}>A botanical piece with fine lines, inspired by these references.</div>
    <div className={styles.sectionLabel}>Body placement</div><div className={styles.formField}>Inner forearm <span>⌄</span></div>
    <div className={styles.sectionLabel}>Colour</div><div className={styles.colourChoices}><span>Black & grey</span><span>Colour</span></div>
    <div className={styles.sectionLabel}>Anything else?</div><div className={styles.formField}>A little space to make it yours.</div>
    <div className={styles.primaryAction}>Continue</div>
  </>;
}
const screens = { calendar: Calendar, proposal: Proposal, 'request-form': Request };

// Each appearance is rendered by the native app with the same local sample data.
// Switch captures with the page theme; never filter or recolour the artwork.
export function NativeArtistCapture({ screen, label, className = '' }) {
  const theme = useArtistTheme();
  return <div className={`${styles.nativeDevice} ${className}`} data-app-preview={screen} data-native-capture="" data-capture-theme={theme} role="img" aria-label={label}>
    <img src={`/studio/artist/${screen}-${theme}-780.webp`} srcSet={`/studio/artist/${screen}-${theme}-390.webp 390w, /studio/artist/${screen}-${theme}-780.webp 780w`} sizes="(max-width: 760px) 254px, 264px" width="780" height="1696" data-native-screenshot="" alt="" loading="eager" decoding="async" />
  </div>;
}

// These lightweight, presentational app previews use the native app's palette roles.
// Artwork is never filtered or recoloured when visitors change appearance.
export default function ArtistAppPreview({ screen, label, className = '' }) {
  if (screen === 'portfolio' || screen === 'discovery') return <NativeArtistCapture screen={screen} label={label} className={className} />;
  const Content = screens[screen] || Calendar;
  return <div className={`${styles.device} ${className}`} role="img" aria-label={label} data-app-preview={screen}>
    <div className={styles.screen}>
      <div className={styles.statusBar}><span>9:41</span><i /><span>▴ ▴ ▰</span></div>
      <div className={styles.content}><ThemeAccent className={styles.headerAccent} /><Content /></div>
      <div className={styles.appNav}><ThemeAccent className={styles.navAccent} flipped />{[['home','Home'],['map','Map'],['calendar','Bookings'],['chat','Messages'],['person','Profile']].map(([icon,text]) => <span key={icon} data-active={(screen === 'portfolio' && icon === 'person') || (screen === 'discovery' && icon === 'home') || (screen === 'calendar' && icon === 'calendar')}><Icon name={icon} /><small>{text}</small></span>)}</div>
      <div className={styles.homeIndicator} />
    </div>
  </div>;
}
