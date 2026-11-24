'use client';

import { useEffect, useRef } from 'react';
import styles from './studio.module.css';

const studioApp = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.vanta.tattoo').replace(/\/$/, '');
const links = { signup: `${studioApp}/signup/`, signin: `${studioApp}/signin/`, pricing: '/pricing' };

// A screen from Vanta Studio, shown in a browser window with a placard under it.
function Screen({ src, width, height, alt, title, note = 'Inside Vanta Studio', narrow = false }) {
  return <figure className={styles.screen} data-narrow={narrow}>
    <div className={styles.window}>
      <span className={styles.windowBar} aria-hidden="true"><i/><i/><i/></span>
      <img src={src} alt={alt} width={width} height={height} loading="lazy"/>
    </div>
    <figcaption className={styles.placard}><strong>{title}</strong><span>{note}</span></figcaption>
  </figure>;
}

const roles = [
  { who: 'For the owner', title: 'See the whole week', text: 'Sales, deposits and payouts, every artist at once.' },
  { who: 'For the front desk', title: 'Answer, book, check in', text: 'Requests, times and consent in one list.' },
  { who: 'For your artists', title: 'Their own app', text: 'Each artist runs their bookings in Vanta Artist.' },
];

const features = [
  {
    id: 'bookings', kicker: 'Bookings', title: <>Every booking, <em>one inbox.</em></>,
    text: 'Share one studio link, or put the booking form on your own website. Clients pick an artist and a time, send their idea and pay the deposit. Anything that needs a reply lands in one list.',
    points: ['Your studio link: vanta.tattoo/b/yourstudio', 'Booking form for your website', 'Instant booking into open times', 'Needs action: one list for the desk'],
    screen: { src: '/studio-page/booking-form.webp', width: 700, height: 1035, alt: 'The studio booking form where a client adds their details and tattoo idea', title: 'Your booking form', note: 'What clients see', narrow: true },
  },
  {
    id: 'clients', kicker: 'Clients and consent', title: <>One record <em>per client.</em></>,
    text: 'Every client has one record across all your artists: their sessions, contact details and signed consent forms. Consent is signed before the day, with photo ID and guardian consent for under 18s.',
    points: ['One client, every artist', 'Consent signed before the day', 'Photo ID and under 18s', 'Import your existing clients'],
    screen: { src: '/studio-page/client-consent.webp', width: 700, height: 1035, alt: 'A client record in Vanta Studio with sessions, contact details and a signed consent form', title: 'Client record', narrow: true },
  },
  {
    id: 'money', kicker: 'The money', title: <>Deposits in. <em>Artists paid.</em></>,
    text: 'Deposits are paid by card when clients book. At the end of the day you can see sales, deposits and what’s still owed, and pay each artist their share.',
    points: ['Card deposits when they book', 'Sales and remaining balances', 'Artist payouts', 'Analytics by artist and type'],
    screen: { src: '/studio-page/finances.webp', width: 1400, height: 1136, alt: 'The Vanta Studio financial page with gross sales, deposits, remaining balances and a weekly sales chart', title: 'Financial' },
  },
  {
    id: 'team', kicker: 'Your team', title: <>Bring your artists <em>in a minute.</em></>,
    text: 'Artists join with your studio code in the Vanta Artist app. Set their rates, schedules and stations, and add guest artists when they visit.',
    points: ['Join with a studio code', 'Rates and appointment types', 'Stations and schedules', 'Guest artists'],
    code: 'K7P-M3Q',
    screen: { src: '/studio-page/artists.webp', width: 1400, height: 1136, alt: 'The list of artists at a studio in Vanta Studio', title: 'My artists' },
  },
];

export default function StudioPage() {
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

  return <main ref={page} className={`gallery ${styles.page}`} aria-label="Vanta Studio">
    <header className={styles.navigation}>
      <a href="/" aria-label="Vanta home" className={styles.wordmark}>vanta</a>
      <nav aria-label="Vanta products"><a href="/">For clients</a><a href="/artists">For artists</a><a href={links.signin} className={styles.navSignin}>Sign in</a><a href={links.signup} className={styles.navCta}>Start free trial</a></nav>
    </header>

    <section className={styles.hero} aria-labelledby="studio-heading">
      <img className={styles.room} src="/studio-page/room.webp" alt="" width="1536" height="1024"/>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Vanta Studio · on the web</p>
          <h1 id="studio-heading"><span>Run the whole studio</span> <em>from one desk.</em></h1>
          <p className={styles.lead}>Every artist’s schedule, every booking, every client and every payout, in one place built for tattoo studios.</p>
          <div className={styles.actions}><a href={links.signup} className={styles.primary}>Start your 14-day trial</a><a href={links.pricing} className={styles.secondary}>See pricing</a></div>
        </div>
        <figure className={styles.print}>
          <img src="/studio-page/schedule.webp" alt="The Vanta Studio schedule for one day, split by station, with each client’s booking and artist" width="1600" height="1298"/>
          <figcaption className={styles.placard}><strong>Schedule by station</strong><span>Inside Vanta Studio</span></figcaption>
        </figure>
      </div>
    </section>

    <ul className={styles.roles} aria-label="Who Vanta Studio is for">
      {roles.map(role => <li key={role.who}><p className={styles.kicker}>{role.who}</p><b>{role.title}</b><span>{role.text}</span></li>)}
    </ul>

    <div id="features">
    {features.map((feature, index) => <section key={feature.id} id={feature.id} className={styles.feature} data-flip={index % 2 === 1} aria-labelledby={`${feature.id}-heading`} data-reveal>
      <div className={styles.featureInner}>
        <div className={styles.featureCopy}>
          <p className={styles.kicker}>{feature.kicker}</p>
          <h2 id={`${feature.id}-heading`}>{feature.title}</h2>
          <p className={styles.featureText}>{feature.text}</p>
          <ul className={styles.points}>{feature.points.map(point => <li key={point}>{point}</li>)}</ul>
          {feature.code && <p className={styles.code}><span>Your studio code</span><b>{feature.code}</b></p>}
        </div>
        <Screen {...feature.screen}/>
      </div>
    </section>)}
    </div>

    <section id="pricing" className={styles.price} aria-labelledby="price-heading" data-reveal>
      <div className={styles.priceInner}>
        <div className={styles.priceCopy}>
          <p className={styles.kicker}>Pricing</p>
          <h2 id="price-heading">One price for <em>the whole studio.</em></h2>
          <p className={styles.featureText}>Start with a 14-day trial. Reminders and SMS for every booking at your studio are included, so your artists don’t need Vanta Pro there.</p>
        </div>
        <div className={styles.priceCard}>
          <p className={styles.amount}><b>A$50</b><span>a month</span></p>
          <p className={styles.priceNote}>Up to 6 artists. A$8 a month for each extra artist.</p>
          <ul><li>Schedule, bookings and booking form</li><li>Clients and consent forms</li><li>Deposits and artist payouts</li><li>Reminders and SMS for your bookings</li><li>Analytics</li></ul>
          <a href={links.signup} className={styles.primary}>Start your 14-day trial</a>
          <a href={links.pricing} className={styles.textLink}>See full pricing →</a>
        </div>
      </div>
    </section>

    <section className={styles.cta} aria-labelledby="cta-heading" data-reveal>
      <div className={styles.ctaInner}>
        <div className={styles.ctaCopy}>
          <h2 id="cta-heading">Bring your studio <em>onto Vanta.</em></h2>
          <p>Set up your studio, invite your artists with your studio code and share your booking link.</p>
          <div className={styles.actions}><a href={links.signup} className={styles.primaryLight}>Start your 14-day trial</a><a href={links.signin} className={styles.secondaryDark}>Sign in</a></div>
        </div>
        <img className={styles.ctaRoom} src="/studio-page/room.webp" alt="" width="1536" height="1024" loading="lazy"/>
      </div>
    </section>

    <footer className={styles.footer}>
      <a href="/" aria-label="Vanta home" className={styles.footerMark}>vanta</a>
      <div className={styles.footerBottom}>
        <span>© {new Date().getFullYear()} Vanta Ink</span>
        <nav aria-label="Footer"><a href="/">Vanta for clients</a><a href="/artists">Vanta Artist</a><a href="/pricing">Pricing</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:support@vanta.tattoo">Contact</a></nav>
      </div>
    </footer>
  </main>;
}
