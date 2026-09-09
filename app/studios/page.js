'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';

const features = [
  { eyebrow: '01 — Booking', title: 'A booking flow that makes sense for tattoos.', description: 'Ask for the details tattooing actually needs — placement, size, reference photos and artist preference — before a request ever reaches your team.', points: ['Custom tattoo-specific booking questions', 'Deposits collected before the session', 'Branded link or embedded booking form'], visual: 'booking' },
  { eyebrow: '02 — Studio control', title: 'No double-booked chairs. No payout maths after hours.', description: 'Vanta keeps artist schedules, stations, deposits and commission rules connected, so the day runs cleanly from check-in to payout.', points: ['Station collision management built in', 'Artist deposits and payouts handled', 'Flexible commission and forfeited-deposit rules'], visual: 'operations' },
  { eyebrow: '03 — Client care', title: 'Every important detail, right when you need it.', description: 'Client records, digital consent and booking history live together — so your team walks into every appointment prepared.', points: ['Searchable client history', 'Built-in digital consent', 'Allergies and notes in context'], visual: 'clients' },
];

const rise = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const dashboardTabs = [
  { label: 'Overview', title: 'Good morning', subtitle: 'Friday, 28 August', metric: '12', metricLabel: 'bookings this week', second: '4', secondLabel: 'new requests', rows: ['10:00 — Full sleeve consultation', '13:30 — Fine line session', '16:00 — New booking request'], pills: [{ title: 'New request', copy: 'Blackwork · 4 hrs', className: 'studios-float-card--request', style: { top: '15%', right: '-1.5rem' }, x: 0, y: 0 }, { title: 'Deposit paid', className: 'studios-float-card--paid', style: { bottom: '15%', left: '-1.25rem' }, x: 0, y: 0 }] },
  { label: 'Bookings', title: 'Bookings', subtitle: 'Your upcoming calendar', metric: '86%', metricLabel: 'of this week filled', second: '$1.2k', secondLabel: 'deposits collected', rows: ['Today, 10:00 — Consultation', 'Today, 13:30 — Fine line', 'Tomorrow, 11:00 — Flash session'], pills: [{ title: 'Calendar updated', copy: '3 bookings confirmed', className: 'studios-float-card--request', style: { top: '10%', right: '-1rem' }, x: -8, y: 8 }, { title: 'Deposit received', className: 'studios-float-card--paid', style: { bottom: '11%', left: '-1.7rem' }, x: 10, y: -7 }] },
  { label: 'Clients', title: 'Clients', subtitle: 'Everything in one place', metric: '248', metricLabel: 'active client records', second: '18', secondLabel: 'forms awaiting review', rows: ['Mia Carter — Consent complete', 'Zoe Taylor — New request', 'Ari Bell — Deposit received'], pills: [{ title: 'Client updated', copy: 'Consent form complete', className: 'studios-float-card--request', style: { top: '18%', right: '-1.8rem' }, x: 10, y: -5 }, { title: 'New client', className: 'studios-float-card--paid', style: { bottom: '19%', left: '-1.5rem' }, x: -9, y: 6 }] },
  { label: 'Analytics', title: 'Analytics', subtitle: 'A clearer picture of your studio', metric: '+24%', metricLabel: 'profile visits this month', second: '62', secondLabel: 'booking requests', rows: ['Most requested: Fine line', 'Best day: Saturday', 'Top artist: Alex Morgan'], pills: [{ title: 'Fine line leads', copy: '+18% this week', className: 'studios-float-card--request', style: { top: '12%', right: '-1.9rem' }, x: -11, y: 4 }, { title: 'Report ready', className: 'studios-float-card--paid', style: { bottom: '13%', left: '-1.55rem' }, x: 8, y: -8 }] },
];

function StudioDashboard() {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveTab(current => (current + 1) % dashboardTabs.length), 3300);
    return () => window.clearInterval(timer);
  }, []);

  const tab = dashboardTabs[activeTab];
  return (
    <motion.div
      className="studios-dashboard"
      initial={{ opacity: 0, scale: 0.96, y: 32 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.85, delay: 0.22, ease: [0.2, 0.65, 0.3, 1] }}
      aria-label="Vanta Studio dashboard preview"
    >
      <div className="studios-dashboard-sidebar">
        <span>vanta</span>
        {dashboardTabs.map((item, index) => (
          <button key={item.label} type="button" className={activeTab === index ? 'is-active' : ''} onClick={() => setActiveTab(index)} aria-label={item.label} />
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab.label} className="studios-dashboard-content" initial={{ opacity: 0, x: 14, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -12, filter: 'blur(3px)' }} transition={{ duration: 0.3, ease: 'easeOut' }}>
          <div className="studios-dashboard-top"><div><strong>{tab.title}</strong><span>{tab.subtitle}</span></div><em>MK</em></div>
          <div className="studios-dashboard-stats"><b>{tab.metric} <small>{tab.metricLabel}</small></b><b>{tab.second} <small>{tab.secondLabel}</small></b></div>
          <div className="studios-dashboard-chart"><span>{tab.label} activity</span><div><i /><i /><i /><i /><i /><i /><i /></div></div>
          <div className="studios-dashboard-list">{tab.rows.map((row, index) => <span key={row}><i className={`studios-status-dot studios-status-dot--${index}`} /> {row}</span>)}</div>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence mode="popLayout">
        {tab.pills.map((pill, index) => (
          <motion.span
            key={`${tab.label}-${pill.title}`}
            className={`studios-float-card ${pill.className}`}
            style={pill.style}
            initial={{ opacity: 0, scale: 0.82, x: pill.x + (index ? -20 : 20), y: pill.y + 16 }}
            animate={{ opacity: 1, scale: 1, x: pill.x, y: pill.y }}
            exit={{ opacity: 0, scale: 0.9, x: pill.x + (index ? 12 : -12), y: pill.y - 8 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            {index === 1 && <i />}
            <b>{pill.title}</b>
            {pill.copy && <small>{pill.copy}</small>}
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function FeatureVisual({ type }) {
  return (
    <motion.div className={`studios-feature-ui studios-feature-ui--${type}`} initial={{ opacity: 0, y: 28, rotate: type === 'clients' ? 2 : -2 }} whileInView={{ opacity: 1, y: 0, rotate: type === 'clients' ? 1 : -1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}>
      {type === 'booking' && <>
        <div className="feature-ui-title"><span>Booking form</span><b>Preview</b></div>
        <div className="feature-booking-tabs"><span className="is-active">Form fields</span><span>Availability</span><span>Deposits</span></div>
        <p>Client request details</p>
        {['Artist preference', 'Placement & size', 'Reference photos'].map((field, index) => <div className="feature-form-row" key={field}><span>{field}</span><em>{index === 2 ? 'Optional' : 'Required'}</em><i className="is-on">On</i></div>)}
        <div className="feature-booking-bottom"><div className="feature-deposit"><span>Deposit required</span><b>$100</b></div><div className="feature-station"><span>Station availability</span><b>Checked automatically</b></div></div>
      </>}
      {type === 'operations' && <>
        <div className="feature-ui-title"><span>Studio schedule</span><b>Today · 3 stations</b></div>
        <div className="feature-schedule-times"><span>10am</span><span>1pm</span><span>4pm</span></div>
        {[
          ['Alex Morgan', 'Station A', '10:00 — Full sleeve', 'is-long'],
          ['Mia Chen', 'Station B', '13:00 — Fine line', 'is-mid'],
          ['Sam Taylor', 'Station C', '16:00 — Flash session', 'is-short'],
        ].map(([artist, station, booking, size]) => <div className="feature-schedule-row" key={artist}><div><strong>{artist}</strong><small>{station}</small></div><span className={size}>{booking}</span></div>)}
        <div className="feature-payout-summary"><div><span>Deposits held</span><b>$420</b></div><div><span>Artist payouts</span><b>$1,280</b></div><em>✓ No station conflicts</em></div>
      </>}
      {type === 'clients' && <>
        <div className="feature-client-list"><p>Clients</p>{['Mia Carter', 'Alex Morgan', 'Sam Taylor'].map((name, index) => <div className={index === 1 ? 'is-selected' : ''} key={name}><i>{name[0]}</i><span>{name}<small>{index + 1} sessions</small></span></div>)}</div>
        <div className="feature-client-detail"><b>Alex Morgan</b><div className="feature-client-contact"><span>alex.morgan@email.com</span><span>+61 400 000 001</span></div><span>Consent form</span><strong>NOT CONSENTED</strong><span>Design preferences</span><div><i>Fine line</i><i>Blackwork</i><i>Japanese</i></div></div>
      </>}
    </motion.div>
  );
}

export default function StudiosPage() {
  return (
    <div className="studios-page">
      <div className="studios-page-nav"><NavBar /></div>
      <main className="studios-main">
        <section className="studios-hero">
          <div className="studios-hero-grid" aria-hidden="true" />
          <motion.div className="studios-hero-halo" aria-hidden="true" animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.9, 0.55] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div
            className="studios-hero-copy"
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.11, delayChildren: 0.08 }}
          >
            <motion.p variants={rise} transition={{ duration: 0.65 }} className="studios-eyebrow">Vanta Studio</motion.p>
            <motion.h1 variants={rise} transition={{ duration: 0.7, ease: [0.2, 0.65, 0.3, 1] }}>
              The studio side of tattooing, finally in one place.
            </motion.h1>
            <motion.p variants={rise} transition={{ duration: 0.7, ease: [0.2, 0.65, 0.3, 1] }} className="studios-hero-desc">
              Vanta Studio turns booking admin into a better client experience — from first enquiry through to a full, organised calendar.
            </motion.p>
            <motion.div variants={rise} transition={{ duration: 0.7, ease: [0.2, 0.65, 0.3, 1] }}>
              <a className="studios-hero-cta" href="https://studio.vanta.tattoo/?signup">
                Start your Studio <span aria-hidden="true">→</span>
              </a>
              <p className="studios-cta-note">Start with a 14-day free trial.</p>
            </motion.div>
          </motion.div>

          <StudioDashboard />
        </section>

        <section className="studios-features">
          <div className="studios-features-intro">
            <p className="studios-eyebrow">Built around the appointment</p>
            <h2>Everything works better when the studio has one source of truth.</h2>
          </div>
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              className={`studios-feature-story studios-feature-story--${feature.visual}`}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-70px' }}
              transition={{ duration: 0.65, delay: index * 0.09, ease: [0.2, 0.65, 0.3, 1] }}
            >
              <div className="studios-feature-copy">
                <span>{feature.eyebrow}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <ul>{feature.points.map(point => <li key={point}>{point}</li>)}</ul>
              </div>
              <div className="studios-feature-visual">
                <FeatureVisual type={feature.visual} />
                <motion.div className="studios-feature-chip" initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.56 }}>
                  {feature.visual === 'booking' ? 'Deposit paid' : feature.visual === 'clients' ? 'Consent complete' : 'Payout rules saved'}
                </motion.div>
              </div>
            </motion.article>
          ))}
        </section>

        <motion.section
          className="studios-finale"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.2, 0.65, 0.3, 1] }}
        >
          <p className="studios-eyebrow">Built for working studios</p>
          <h2>Less admin. More art on the calendar.</h2>
          <p>Set up a Studio workspace that keeps your team and clients moving.</p>
          <a className="studios-hero-cta" href="https://studio.vanta.tattoo/?signup">Set up your studio <span aria-hidden="true">→</span></a>
        </motion.section>
      </main>
    </div>
  );
}
