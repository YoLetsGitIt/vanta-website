'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform, useMotionValue } from 'framer-motion';
import NavBar from '@/components/NavBar';

function Reveal({ children, className, delay = 0, style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.72, ease: [0.2, 0.65, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function PhoneMock({ label, icon, hero = false, tilt, className = '' }) {
  return (
    <div
      className={`phone-mock${hero ? ' phone-mock-hero' : ''} ${className}`}
      style={tilt ? { transform: tilt, willChange: 'transform' } : undefined}
    >
      <div className="phone-mock-island" aria-hidden="true" />
      <div className="phone-mock-screen">
        <div className="phone-mock-icon" aria-hidden="true">{icon}</div>
        <span className="phone-mock-label">{label}</span>
      </div>
    </div>
  );
}

const AppStoreBadge = () => (
  <a
    className="app-store-badge"
    href="https://apps.apple.com/au/app/vanta/id6760996738"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Download Vanta on the App Store"
  >
    <span className="app-store-icon" aria-hidden="true">
      <svg viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.3 143.1-317 284-317 74.9 0 137.2 48.3 184.4 48.3 44.9 0 117.1-51.5 200.3-51.5 32.3 0 117.1 2.6 178.1 97.3zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
      </svg>
    </span>
    <span className="app-store-copy">
      <span className="app-store-overline">Download on the</span>
      <span className="app-store-title">App Store</span>
    </span>
  </a>
);

// Icons
const GridIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const HeartIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const UploadIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ChartIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const ChatIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// Per-frame lerp toward source — same technique used by Lenis, Linear, Apple scroll scenes.
// Gives exponential deceleration: fast initial response, long natural tail, zero overshoot.
// factor: 0.05 = heavy inertia, 0.12 = light inertia. 0.07 is a good default.
function useLerp(source, factor = 0.07) {
  const lerped = useMotionValue(source.get());
  useEffect(() => {
    let frameId;
    const tick = () => {
      const curr = lerped.get();
      const target = source.get();
      const next = curr + (target - curr) * factor;
      lerped.set(Math.abs(target - next) < 0.00005 ? target : next);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [source, lerped, factor]);
  return lerped;
}

// Chips orbit around the phone center, driven by scroll progress.
// phase = starting angle in radians (0 = right, π/2 = down, π = left, 3π/2 = up)
// Smoothing is applied upstream in FeatureBlock — no spring needed here.
function OrbitChip({ children, scrollProgress, r, phase, totalSweep = Math.PI * 1.5, bobY = -7, bobDuration = 4.2, bobDelay = 0 }) {
  const angle = useTransform(scrollProgress, [0, 1], [phase, phase + totalSweep]);
  const x = useTransform(angle, (a) => r * Math.cos(a));
  const y = useTransform(angle, (a) => r * Math.sin(a));
  return (
    <motion.div className="phone-float" style={{ left: '50%', top: '50%', x, y }}>
      <div style={{ transform: 'translate(-50%, -50%)' }}>
        <motion.div
          animate={{ y: [0, bobY, 0] }}
          transition={{ duration: bobDuration, repeat: Infinity, ease: 'easeInOut', delay: bobDelay }}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}

const MobilePortfolioChips = ({ scrollProgress }) => {
  const op1 = useTransform(scrollProgress, [0.1, 0.28], [0, 1]);
  const y1 = useTransform(scrollProgress, [0.1, 0.28], [12, 0]);
  const op2 = useTransform(scrollProgress, [0.22, 0.4], [0, 1]);
  const y2 = useTransform(scrollProgress, [0.22, 0.4], [12, 0]);
  const op3 = useTransform(scrollProgress, [0.34, 0.52], [0, 1]);
  const y3 = useTransform(scrollProgress, [0.34, 0.52], [12, 0]);
  return (
    <div className="mobile-chips-layer">
      <motion.div className="phone-ig-chip mobile-chip" style={{ opacity: op1, y: y1, top: '20%', left: '0.5rem' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        Import from Instagram
      </motion.div>
      <motion.span className="phone-tag mobile-chip" style={{ opacity: op2, y: y2, top: '30%', right: '0.75rem' }}>Blackwork</motion.span>
      <motion.span className="phone-tag mobile-chip" style={{ opacity: op3, y: y3, top: '38%', left: '0.75rem' }}>Fine line</motion.span>
    </div>
  );
};

const MobileAnalyticsChips = ({ scrollProgress }) => {
  const op1 = useTransform(scrollProgress, [0.1, 0.28], [0, 1]);
  const y1 = useTransform(scrollProgress, [0.1, 0.28], [12, 0]);
  const op2 = useTransform(scrollProgress, [0.25, 0.43], [0, 1]);
  const y2 = useTransform(scrollProgress, [0.25, 0.43], [12, 0]);
  return (
    <div className="mobile-chips-layer">
      <motion.div className="phone-stat-card mobile-chip" style={{ opacity: op1, y: y1, top: '20%', left: '0.5rem' }}>
        <span className="phone-stat-num">+127</span>
        <span className="phone-stat-label">views this week</span>
      </motion.div>
      <motion.div className="phone-stat-card mobile-chip" style={{ opacity: op2, y: y2, top: '32%', right: '0.5rem' }}>
        <span className="phone-stat-num phone-stat-up">↑ 24%</span>
        <span className="phone-stat-label">profile clicks</span>
      </motion.div>
    </div>
  );
};

const MobileBookingChips = ({ scrollProgress }) => {
  const op1 = useTransform(scrollProgress, [0.1, 0.28], [0, 1]);
  const y1 = useTransform(scrollProgress, [0.1, 0.28], [12, 0]);
  const op2 = useTransform(scrollProgress, [0.28, 0.46], [0, 1]);
  const y2 = useTransform(scrollProgress, [0.28, 0.46], [12, 0]);
  return (
    <div className="mobile-chips-layer">
      <motion.div className="phone-booking-card mobile-chip" style={{ opacity: op1, y: y1, top: '14%', left: '0.5rem' }}>
        <span className="phone-booking-badge">New request</span>
        <span className="phone-booking-row">Full sleeve · Blackwork</span>
        <span className="phone-booking-row phone-booking-muted">Forearm · ~6 hrs</span>
        <span className="phone-booking-row phone-booking-deposit">Deposit $100 required</span>
      </motion.div>
      <motion.div className="phone-stat-card mobile-chip" style={{ opacity: op2, y: y2, top: '36%', right: '0.5rem' }}>
        <span className="phone-stat-num phone-stat-up">✓ Confirmed</span>
        <span className="phone-stat-label">Deposit paid · Tue 3pm</span>
      </motion.div>
    </div>
  );
};

const PortfolioFloats = ({ scrollProgress }) => (
  <>
    <OrbitChip scrollProgress={scrollProgress} r={195} phase={3.93} bobY={-8} bobDuration={4.2} bobDelay={0}>
      <div className="phone-ig-chip">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        Import from Instagram
      </div>
    </OrbitChip>
    <OrbitChip scrollProgress={scrollProgress} r={175} phase={5.50} bobY={-6} bobDuration={3.7} bobDelay={0.9}>
      <span className="phone-tag">Blackwork</span>
    </OrbitChip>
    <OrbitChip scrollProgress={scrollProgress} r={190} phase={0.52} bobY={-9} bobDuration={4.8} bobDelay={1.8}>
      <span className="phone-tag">Fine line</span>
    </OrbitChip>
    <OrbitChip scrollProgress={scrollProgress} r={180} phase={2.62} bobY={-7} bobDuration={3.5} bobDelay={0.5}>
      <span className="phone-tag">Neo-traditional</span>
    </OrbitChip>
  </>
);

const AnalyticsFloats = ({ scrollProgress }) => (
  <>
    <OrbitChip scrollProgress={scrollProgress} r={185} phase={4.71} bobY={-8} bobDuration={4.5} bobDelay={0}>
      <div className="phone-stat-card">
        <span className="phone-stat-num">+127</span>
        <span className="phone-stat-label">views this week</span>
      </div>
    </OrbitChip>
    <OrbitChip scrollProgress={scrollProgress} r={190} phase={1.57} bobY={-6} bobDuration={3.9} bobDelay={1.4}>
      <div className="phone-stat-card">
        <span className="phone-stat-num phone-stat-up">↑ 24%</span>
        <span className="phone-stat-label">profile clicks</span>
      </div>
    </OrbitChip>
  </>
);

const BookingFloats = ({ scrollProgress }) => (
  <>
    <OrbitChip scrollProgress={scrollProgress} r={200} phase={5.76} bobY={-7} bobDuration={4.3} bobDelay={0}>
      <div className="phone-booking-card">
        <span className="phone-booking-badge">New request</span>
        <span className="phone-booking-row">Full sleeve · Blackwork</span>
        <span className="phone-booking-row phone-booking-muted">Forearm · ~6 hrs</span>
        <span className="phone-booking-row phone-booking-muted">Available from March</span>
        <span className="phone-booking-row phone-booking-deposit">Deposit $100 required</span>
      </div>
    </OrbitChip>
    <OrbitChip scrollProgress={scrollProgress} r={185} phase={2.62} bobY={-9} bobDuration={4.0} bobDelay={1.1}>
      <div className="phone-stat-card">
        <span className="phone-stat-num phone-stat-up">✓ Confirmed</span>
        <span className="phone-stat-label">Deposit paid · Tue 3pm</span>
      </div>
    </OrbitChip>
  </>
);

const features = [
  {
    number: '01',
    title: 'Showcase your portfolio',
    desc: 'Already have a following on Instagram? Import your existing posts directly to kickstart your portfolio. AI auto-suggests the title, style, body part, and colour for each piece — so discovery happens without extra effort on your part.',
    mobileDesc: 'Import your Instagram portfolio in one tap. AI tags every piece for discovery — no extra effort needed.',
    bullets: [
      'Import your Instagram feed in one tap',
      'AI-assisted tagging on every upload',
      'Surfaces in the personalized discovery feed',
      'Appears in style and body-part search results',
      'Clients save your work and come back',
    ],
    screenshot: '/tattoo-details.png',
    screenshotSimulator: '/tattoo-details-simulator.png',
    mobileImgWidth: '100vw',
    phoneLabel: 'Portfolio upload',
    phoneIcon: <UploadIcon />,
    phoneMotionStyle: { transformPerspective: 1000, rotateY: -8, rotateX: 2 },
    MobileChips: MobilePortfolioChips,
    Floats: PortfolioFloats,
    reverse: false,
  },
  {
    number: '02',
    title: 'Know what works',
    desc: 'See exactly how your portfolio performs week over week. Track views, profile clicks, Instagram taps, and studio location visits — so you can make informed decisions about what to post and what to push.',
    mobileDesc: 'Track views, clicks, and engagement for every post. See exactly what resonates and post more of it.',
    bullets: [
      'Weekly view and engagement trends',
      'Per-post performance at a glance',
      'Profile click and Instagram tap tracking',
      'Studio map visit counts',
    ],
    screenshot: '/analytics.png',
    screenshotSimulator: '/analytics-simulator.png',
    mobileImgWidth: '100vw',
    phoneLabel: 'Analytics dashboard',
    phoneIcon: <ChartIcon />,
    phoneMotionStyle: { transformPerspective: 1000, rotateY: 9, rotateX: 2 },
    MobileChips: MobileAnalyticsChips,
    Floats: AnalyticsFloats,
    reverse: true,
    phoneTravel: '-14svh',
    bodyBottom: '12svh',
  },
  {
    number: '03',
    title: 'Bookings, handled.',
    desc: 'Clients submit a structured booking form — style, placement, size, reference images — so you get everything you need upfront. Review requests, collect deposits, confirm appointments, and track your schedule all in one place.',
    mobileDesc: 'Clients fill out style, placement, and references upfront. You review, collect a deposit, and confirm — all in one place.',
    bullets: [
      'Structured booking forms, not freeform DMs',
      'Reference photos and placement details included',
      'Collect deposits before confirming a booking',
      'Accept, decline, or reschedule from the app',
      'Your full booking history in one view',
    ],
    screenshot: '/bookings.png',
    screenshotSimulator: '/bookings-simulator.png',
    mobileImgWidth: '100vw',
    phoneLabel: 'Booking requests',
    phoneIcon: <CalendarIcon />,
    phoneMotionStyle: { transformPerspective: 1000, rotateY: -8, rotateX: 2 },
    MobileChips: MobileBookingChips,
    Floats: BookingFloats,
    reverse: false,
    phoneTravel: '-14svh',
    bodyBottom: '12svh',
  },
];

function MobileFeatureStickyCard({ f, containerRef }) {
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: containerRef,
    offset: ['start start', 'end end'],
  });

  const phoneY = useTransform(scrollYProgress, [0.05, 0.82], ['0svh', f.phoneTravel ?? '-26svh']);

  return (
    <div ref={sectionRef} className="mobile-feature-scroll-section">
      <div className="mobile-feature-sticky">
        <div className="mobile-feature-visual">
          <motion.img
            src={f.screenshot}
            alt=""
            className="mobile-feature-img"
            style={{ y: phoneY, ...(f.mobileImgWidth ? { width: f.mobileImgWidth, left: '0' } : {}) }}
          />
        </div>
        <f.MobileChips scrollProgress={scrollYProgress} />
        <div className="mobile-feature-body" style={f.bodyBottom ? { bottom: f.bodyBottom } : undefined}>
          <p className="mobile-feature-eyebrow">{f.number}</p>
          <h3 className="mobile-feature-title">{f.title}</h3>
          <p className="mobile-feature-desc">{f.mobileDesc}</p>
        </div>
      </div>
    </div>
  );
}

function MobileFeatureSection({ features, containerRef }) {
  return (
    <div className="mobile-features">
      {features.map((f) => (
        <MobileFeatureStickyCard key={f.number} f={f} containerRef={containerRef} />
      ))}
    </div>
  );
}

function FeatureBlock({ f, containerRef }) {
  const blockRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: blockRef,
    container: containerRef,
    offset: ['start end', 'end start'],
  });

  const chipProgress = useLerp(scrollYProgress, 0.07);

  const baseY = f.phoneMotionStyle.rotateY;
  const rotateY = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [baseY * 1.7, baseY, baseY, baseY * 0.25]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [5, 2, -2]);

  return (
    <div ref={blockRef} className="artists-feature-block">
      <div className="artists-feature-number" aria-hidden="true">{f.number}</div>
      <div className={`feature-row${f.reverse ? ' reverse' : ''}`}>
        <Reveal className="feature-content">
          <h3>{f.title}</h3>
          <p>{f.desc}</p>
          <ul className="feature-list">
            {f.bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="phone-scene">
            {f.screenshot ? (
              <motion.img
                src={f.screenshotSimulator ?? f.screenshot}
                alt=""
                className="phone-scene-img"
                style={{ transformPerspective: 1000, rotateY, rotateX }}
              />
            ) : (
              <PhoneMock label={f.phoneLabel} icon={f.phoneIcon} />
            )}
            <f.Floats scrollProgress={chipProgress} />
          </div>
        </Reveal>
      </div>
    </div>
  );
}

export default function ArtistsPage() {
  const pageRef = useRef(null);
  const heroRef = useRef(null);
  const [navHidden, setNavHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const lastScrollY = useRef(0);

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    container: pageRef,
    offset: ['start start', 'end end'],
  });
  const heroPhoneY = useTransform(heroScrollProgress, [0.05, 0.82], ['0svh', '-26svh']);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    setIsMobile(mq.matches);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      if (y < 16) setNavHidden(false);
      else if (y > lastScrollY.current + 4) setNavHidden(true);
      else if (y < lastScrollY.current - 4) setNavHidden(false);
      lastScrollY.current = y;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="artists-page" ref={pageRef}>
      <motion.div
        className="artists-page-nav"
        animate={{ y: navHidden ? '-100%' : '0%' }}
        transition={{ duration: navHidden ? 0.28 : 0.4, ease: navHidden ? [0.4, 0, 1, 1] : [0.0, 0.0, 0.2, 1] }}
      >
        <NavBar />
      </motion.div>

      {/* Hero */}
      <section className="artists-hero" ref={heroRef}>
        <div className="artists-hero-sticky">
          <Reveal className="artists-hero-content">
            <h1 className="artists-hero-headline">Your portfolio.<br />Your audience.</h1>
            <p className="artists-hero-desc">
              Vanta gives tattoo artists a focused platform to showcase their work, understand
              what resonates, and connect directly with clients who are actively looking.
            </p>
            <AppStoreBadge />
          </Reveal>

          <div className="artists-hero-visual">
            <div className="hero-phone-cluster">
              <div className="hero-phone-back">
                <img src={isMobile ? '/tattoo-details.png' : '/tattoo-details-simulator.png'} alt="" />
              </div>
              <motion.img
                src={isMobile ? '/artist-portfolio.png' : '/artist-portfolio-simulator.png'}
                className="hero-phone-main"
                style={isMobile ? { y: heroPhoneY } : { transformPerspective: 1200, rotateY: -8, rotateX: 2 }}
                alt="Vanta artist profile"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="artists-stats-strip">
        <Reveal delay={0} className="artists-stat">
          <span className="artists-stat-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </span>
          <span className="artists-stat-value">Free</span>
          <span className="artists-stat-label">to join &amp; use</span>
        </Reveal>
        <div className="artists-stat-divider" aria-hidden="true" />
        <Reveal delay={0.08} className="artists-stat">
          <span className="artists-stat-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              <path d="M20 3v4" /><path d="M22 5h-4" />
              <path d="M4 17v2" /><path d="M5 18H3" />
            </svg>
          </span>
          <span className="artists-stat-value">AI</span>
          <span className="artists-stat-label">auto-tags your uploads</span>
        </Reveal>
        <div className="artists-stat-divider" aria-hidden="true" />
        <Reveal delay={0.16} className="artists-stat">
          <span className="artists-stat-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <span className="artists-stat-value">Bookings</span>
          <span className="artists-stat-label">end-to-end management</span>
        </Reveal>
      </div>

      {/* Features — desktop */}
      <div className="artists-features-section">
        {features.map((f) => (
          <FeatureBlock key={f.number} f={f} containerRef={pageRef} />
        ))}
      </div>

      {/* Features — mobile (sticky scroll, phone translates up to reveal screen) */}
      <MobileFeatureSection features={features} containerRef={pageRef} />

      {/* Merged CTA + steps */}
      <Reveal className="artists-finale">
        <div className="artists-finale-header">
          <p className="artists-eyebrow">Ready to grow?</p>
          <h2 className="artists-finale-headline">Your next client<br />is already looking.</h2>
        </div>

        <div className="artists-finale-steps">
          {[
            {
              num: '01',
              title: 'Download & sign up',
              desc: 'Available free on the App Store.',
            },
            {
              num: '02',
              title: 'Switch to an Artist account',
              desc: 'Tap "Become an artist" in your profile to unlock portfolio tools, analytics, and booking management.',
            },
            {
              num: '03',
              title: 'Add your studio & booking details',
              desc: 'Set your address, availability, and deposit requirements so clients can book straight away.',
            },
            {
              num: '04',
              title: 'Build your portfolio',
              desc: 'Import from Instagram to get started instantly, or upload new work with AI tagging.',
            },
          ].map((step) => (
            <div key={step.num} className="artists-finale-step">
              <span className="artists-finale-step-num">{step.num}</span>
              <strong className="artists-finale-step-title">{step.title}</strong>
              <p className="artists-finale-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>

        <AppStoreBadge />
      </Reveal>
    </div>
  );
}
