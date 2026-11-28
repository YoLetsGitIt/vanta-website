'use client';

import { useEffect, useRef } from 'react';
import styles from './studio.module.css';
import bento from './bento.module.css';
import { bentoTiles } from './StudioBento';
import StudioHero from './StudioHero';

const studioApp = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.vanta.tattoo').replace(/\/$/, '');
const links = { signup: `${studioApp}/signup/`, signin: `${studioApp}/signin/`, pricing: '/pricing' };

const roles = [
  { who: 'For the owner', title: 'See the whole week', text: 'Sales, deposits and payouts, every artist at once.' },
  { who: 'For the front desk', title: 'Answer, book, check in', text: 'Requests, times and consent in one list.' },
  { who: 'For your artists', title: 'Their own app', text: 'Each artist runs their bookings in Vanta Artist.' },
];

// Each feature is a bento of four working tiles (StudioBento.js); the big tile alternates sides on desktop.
const features = [
  { id: 'bookings', kicker: 'Bookings', title: <>Every booking, <em>one inbox.</em></>, text: 'Clients book from your link or the form on your own website. Requests, times to confirm and unpaid deposits wait in Needs action.' },
  { id: 'clients', kicker: 'Clients and consent', title: <>One record <em>per client.</em></>, text: 'Every client has one record across all your artists: their bookings, contact details, signed consent forms and notes.' },
  { id: 'money', kicker: 'The money', title: <>Deposits in. <em>Artists paid.</em></>, text: 'Deposits are paid by card when clients book. See sales and the money that came in, and pay each artist what they’re owed.' },
  { id: 'team', kicker: 'Your team', title: <>Bring your artists <em>in a minute.</em></>, text: 'Artists join with your studio code. Set appointment types, each artist’s hours and your stations once.' },
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

    <StudioHero links={links}/>

    <ul className={styles.roles} aria-label="Who Vanta Studio is for">
      {roles.map(role => <li key={role.who}><p className={styles.kicker}>{role.who}</p><b>{role.title}</b><span>{role.text}</span></li>)}
    </ul>

    <div id="features">
    {features.map((feature, index) => <section key={feature.id} id={feature.id} className={bento.section} data-flip={index % 2 === 1 || undefined} aria-labelledby={`${feature.id}-heading`}>
      <div className={bento.head}>
        <div className={styles.featureCopy}>
          <p className={styles.kicker}>{feature.kicker}</p>
          <h2 id={`${feature.id}-heading`}>{feature.title}</h2>
        </div>
        <p className={bento.lead}>{feature.text}</p>
      </div>
      <div className={bento.bento}>{bentoTiles[feature.id]}</div>
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
