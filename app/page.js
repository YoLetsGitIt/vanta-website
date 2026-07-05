'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence, useScroll } from 'framer-motion';
import Link from 'next/link';
import TypewriterIntro from '@/components/TypewriterIntro';
import NavBar from '@/components/NavBar';

const welcomeCarouselImages = [
  '/welcome/SplashTattoo1.jpg',
  '/welcome/SplashTattoo2.jpg',
  '/welcome/SplashTattoo3.jpg',
  '/welcome/SplashTattoo4.jpg',
  '/welcome/SplashTattoo5.jpg',
];

const feedColumns = [
  [
    { image: welcomeCarouselImages[0], size: 'tall' },
    { image: welcomeCarouselImages[2], size: 'medium' },
    { image: welcomeCarouselImages[4], size: 'compact' },
    { image: welcomeCarouselImages[1], size: 'tall' },
  ],
  [
    { image: welcomeCarouselImages[3], size: 'medium' },
    { image: welcomeCarouselImages[1], size: 'tall' },
    { image: welcomeCarouselImages[0], size: 'compact' },
    { image: welcomeCarouselImages[4], size: 'medium' },
  ],
  [
    { image: welcomeCarouselImages[2], size: 'compact' },
    { image: welcomeCarouselImages[4], size: 'tall' },
    { image: welcomeCarouselImages[3], size: 'medium' },
    { image: welcomeCarouselImages[0], size: 'compact' },
  ],
];

const feedDurations = ['42s', '30s', '36s'];
const feedLayers = ['back', 'front', 'mid'];


const processSteps = [
  {
    num: '01',
    title: 'Find an artist',
    desc: 'Browse real portfolios filtered to your style. Every piece links back to the artist who made it.',
    screenshot: '/user-booking-01.png',
  },
  {
    num: '02',
    title: 'Send a booking request',
    desc: 'A structured form replaces the cold DM — style, placement, size, and references, all in one go.',
    screenshot: '/user-booking-02.png',
  },
  {
    num: '03',
    title: 'Confirm & deposit',
    desc: 'Review the details, pay a deposit in-app, and lock in your appointment. No chasing, no ghosting.',
    screenshot: '/user-booking-03.png',
  },
];

const discoveryScreens = [
  '/tattoo-details.png',
  '/artist-portfolio.png',
];

function MobileDiscoverySection({ containerRef }) {
  const sectionRef = useRef(null);
  const img0Ref = useRef(null);
  const img1Ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: containerRef,
    offset: ['start start', 'end end'],
  });

  useEffect(() => {
    if (img1Ref.current) img1Ref.current.style.opacity = '0';
    return scrollYProgress.on('change', (v) => {
      const op0 = v < 0.3 ? 1 : v > 0.7 ? 0 : 1 - (v - 0.3) / 0.4;
      const op1 = v < 0.3 ? 0 : v > 0.7 ? 1 : (v - 0.3) / 0.4;
      if (img0Ref.current) img0Ref.current.style.opacity = String(op0);
      if (img1Ref.current) img1Ref.current.style.opacity = String(op1);
    });
  }, [scrollYProgress]);

  return (
    <div ref={sectionRef} className="home-discovery-mobile">
      <div className="home-snap-step" aria-hidden="true" />
      <div className="home-snap-step" aria-hidden="true" />
      <div className="home-discovery-mobile-sticky">
        <div className="home-discovery-mobile-visual">
          <img ref={img0Ref} src={discoveryScreens[0]} alt="" className="home-discovery-mobile-img" />
          <img ref={img1Ref} src={discoveryScreens[1]} alt="" className="home-discovery-mobile-img" />
        </div>
        <div className="home-discovery-mobile-body">
          <span className="home-problem-label">01 — Discovery</span>
          <p className="home-discovery-mobile-platforms">Instagram, Pinterest, Reddit, TikTok</p>
          <h2 className="home-problem-headline">None of them were built for this.</h2>
          <p className="home-discovery-mobile-desc">
            Purpose-built for tattoo discovery. Filter by style and placement, save to collections, and find the artist behind any piece.
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileProcessSection({ containerRef }) {
  const sectionRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const activeStepRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: containerRef,
    offset: ['start start', 'end end'],
  });

  useEffect(() => {
    return scrollYProgress.on('change', (v) => {
      const idx = Math.min(Math.floor(v * processSteps.length), processSteps.length - 1);
      if (idx !== activeStepRef.current) {
        activeStepRef.current = idx;
        setActiveStep(idx);
      }
    });
  }, [scrollYProgress]);

  return (
    <div ref={sectionRef} className="home-process-mobile">
      <div className="home-snap-step" aria-hidden="true" />
      <div className="home-snap-step" aria-hidden="true" />
      <div className="home-snap-step" aria-hidden="true" />
      <div className="home-process-mobile-sticky">
        <div className="home-process-mobile-visual">
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={activeStep}
              src={processSteps[activeStep].screenshot}
              alt=""
              className="home-process-mobile-img"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            />
          </AnimatePresence>
        </div>
        <div className="home-process-mobile-body">
          <div className="home-process-mobile-label-row">
            <span className="home-problem-label">02 — Booking</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={activeStep}
                className="home-process-mobile-step-num"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                {processSteps[activeStep].num}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="home-process-mobile-text-stack">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeStep}
                className="home-process-mobile-text-item"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                <h3 className="home-process-mobile-title">{processSteps[activeStep].title}</h3>
                <p className="home-process-mobile-desc">{processSteps[activeStep].desc}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessSection() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef(null);
  const innerRef = useRef(null);
  const activeStepRef = useRef(0);
  const prevScrolledRef = useRef(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const container = el.closest('.home-page');
    if (!container) return;
    const finaleEl = el.previousElementSibling;

    const onScroll = () => {
      if (window.innerWidth <= 860) return;
      const scrolled = Math.max(0, container.scrollTop - el.offsetTop);
      const vh = window.innerHeight;
      const goingDown = scrolled > prevScrolledRef.current;
      prevScrolledRef.current = scrolled;
      // Step 0 gets 1.4 viewports; steps 1 and 2 get 0.6 viewports each.
      // Section is 360svh: sticky range = 260svh (step0 0–1.4vh, step1 1.4–2vh, step2 2–2.6vh, exit at 2.6vh).
      const step = scrolled < 1.4 * vh
        ? 0
        : Math.min(1 + Math.floor((scrolled - 1.4 * vh) / (vh * 0.6)), processSteps.length - 1);
      if (step !== activeStepRef.current) {
        activeStepRef.current = step;
        setActiveStep(step);
      }
      // Trigger CSS animations when the sticky phase ends; reverse when scrolling back up.
      // Reverse fires mid-exit-zone (stickyRange + 0.5vh) so it triggers before the user
      // scrolls all the way back into section 02.
      const stickyRange = el.offsetHeight - vh;
      const alreadyExiting = innerRef.current?.classList.contains('is-exiting');
      if (!alreadyExiting && scrolled >= stickyRange) {
        innerRef.current?.classList.add('is-exiting');
        finaleEl?.classList.add('is-visible');
      } else if (alreadyExiting && !goingDown && scrolled < stickyRange + vh * 0.5) {
        innerRef.current?.classList.remove('is-exiting');
        finaleEl?.classList.remove('is-visible');
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      container.removeEventListener('scroll', onScroll);
      innerRef.current?.classList.remove('is-exiting');
      finaleEl?.classList.remove('is-visible');
    };
  }, []);

  return (
    <section className="home-process" ref={sectionRef}>
      <div className="home-process-inner" ref={innerRef}>
        <div className="home-process-intro">
          <span className="home-problem-label">02 — Booking</span>
          <h2 className="home-problem-headline">Getting your first tattoo is weirdly hard. We fixed that.</h2>
          <p className="home-problem-body">
            Who do you even message? What do you say? Will they respond? What's a fair price?
            Most people spend weeks stuck on questions Vanta just answers.
          </p>
        </div>
        <div className="home-process-body">
          <div className="home-process-phone-wrap">
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={activeStep}
                src={processSteps[activeStep].screenshot}
                alt=""
                className="home-process-phone-img"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeInOut' }}
              />
            </AnimatePresence>
          </div>
          <div className="home-process-steps">
            {processSteps.map((step, i) => (
              <div
                key={step.num}
                className={`home-process-step${activeStep === i ? ' is-active' : ''}`}
                onClick={() => setActiveStep(i)}
              >
                <span className="home-process-step-num">{step.num}</span>
                <h3 className="home-process-step-title">{step.title}</h3>
                <p className="home-process-step-desc">{step.desc}</p>
              </div>
            ))}
            <div className="home-process-dots" aria-hidden="true">
              {processSteps.map((_, i) => (
                <div
                  key={i}
                  className={`home-process-dot${activeStep === i ? ' is-active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
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
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.3 143.1-317 284-317 74.9 0 137.2 48.3 184.4 48.3 44.9 0 117.1-51.5 200.3-51.5 32.3 0 117.1 2.6 178.1 97.3zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
      </svg>
    </span>
    <span className="app-store-copy">
      <span className="app-store-overline">Download on the</span>
      <span className="app-store-title">App Store</span>
    </span>
  </a>
);


function hasSeenIntro() {
  try { return sessionStorage.getItem('vanta-intro-seen') === 'true'; } catch { return false; }
}

export default function HomePage() {
  const [assetsReady, setAssetsReady] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [feedLoopReady, setFeedLoopReady] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);
  const [columnsSettled, setColumnsSettled] = useState(false);

  const homePageRef = useRef(null);
  const touchX = useMotionValue(0);
  const touchY = useMotionValue(0);
  const springTouchX = useSpring(touchX, { stiffness: 90, damping: 18, mass: 0.6 });
  const springTouchY = useSpring(touchY, { stiffness: 90, damping: 18, mass: 0.6 });

  const trackRefs = useRef([null, null, null]);
  const playbackRef = useRef(1);
  const decayFrameRef = useRef(null);
  const postCardsStartedRef = useRef(false);

  useEffect(() => {
    let loaded = 0;
    const total = welcomeCarouselImages.length;
    welcomeCarouselImages.forEach(src => {
      const img = new window.Image();
      img.onload = img.onerror = () => {
        if (++loaded >= total) {
          setAssetsReady(true);
          if (hasSeenIntro()) {
            setIntroComplete(true);
          } else {
            setShowIntro(true);
          }
        }
      };
      img.src = src;
    });
    // Preload discovery images in background so they're ready by scroll time
    discoveryScreens.forEach(src => { const img = new window.Image(); img.src = src; });
  }, []);

  const startPostCardsAnimations = () => {
    if (postCardsStartedRef.current) return;
    postCardsStartedRef.current = true;
    setFeedLoopReady(true);
    setContentReady(true);
  };

  useEffect(() => {
    if (!introComplete || !columnsSettled) return;
    startPostCardsAnimations();
  }, [introComplete, columnsSettled]);

  useEffect(() => () => {
    if (decayFrameRef.current) cancelAnimationFrame(decayFrameRef.current);
  }, []);

  useEffect(() => {
    const el = homePageRef.current;
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

  const handleWheel = () => {
    if (!feedLoopReady) return;
    playbackRef.current = 4;
    trackRefs.current.forEach(el => {
      if (!el) return;
      el.getAnimations().forEach(a => { a.playbackRate = 4; });
    });
    if (decayFrameRef.current) cancelAnimationFrame(decayFrameRef.current);
    const decay = () => {
      playbackRef.current += (1 - playbackRef.current) * 0.05;
      const rate = playbackRef.current;
      trackRefs.current.forEach(el => {
        if (!el) return;
        el.getAnimations().forEach(a => { a.playbackRate = rate; });
      });
      if (Math.abs(rate - 1) > 0.01) {
        decayFrameRef.current = requestAnimationFrame(decay);
      } else {
        playbackRef.current = 1;
        trackRefs.current.forEach(el => {
          if (!el) return;
          el.getAnimations().forEach(a => { a.playbackRate = 1; });
        });
      }
    };
    decayFrameRef.current = requestAnimationFrame(decay);
  };

  const handlePointerMove = (event) => {
    if (typeof window === 'undefined') return;
    const offsetX = (event.clientX / window.innerWidth - 0.5) * 18;
    const offsetY = (event.clientY / window.innerHeight - 0.5) * 18;
    touchX.set(offsetX);
    touchY.set(offsetY);
  };

  const resetPointerOffset = () => {
    touchX.set(0);
    touchY.set(0);
  };

  const handleCardEntranceComplete = (columnIndex) => {
    if (!introComplete) return;
    if (columnIndex !== feedColumns.length - 1) return;
    setColumnsSettled(true);
  };

  const leftContentVariants = {
    hidden: { opacity: 0, y: 34 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1.24,
        ease: [0.2, 0.8, 0.3, 1],
        delayChildren: 0,
        staggerChildren: 0.06,
      },
    },
  };

  const leftItemVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1.32, ease: [0.2, 0.65, 0.3, 1] },
    },
  };

  return (
    <>
      <AnimatePresence>
        {!assetsReady && (
          <motion.div
            key="loading"
            className="typewriter-overlay"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="loading-dots">
              <span /><span /><span />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showIntro && (
        <TypewriterIntro onComplete={() => {
          try { sessionStorage.setItem('vanta-intro-seen', 'true'); } catch {}
          setIntroComplete(true);
        }} />
      )}

      <div
        className="home-page"
        ref={homePageRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointerOffset}
        onPointerUp={resetPointerOffset}
        onWheel={handleWheel}
        style={{ '--touch-x': springTouchX, '--touch-y': springTouchY }}
      >
        {/* NavBar — fixed to viewport top, persists on scroll */}
        <motion.div
          className="home-nav-fixed"
          initial={{ opacity: 0 }}
          animate={{ opacity: introComplete ? 1 : 0, y: navHidden ? '-100%' : '0%' }}
          transition={{
            opacity: { duration: 0.5, ease: 'easeOut' },
            y: { duration: navHidden ? 0.28 : 0.4, ease: navHidden ? [0.4, 0, 1, 1] : [0.0, 0.0, 0.2, 1] },
          }}
        >
          <NavBar />
        </motion.div>

        {/* Tattoo wall — fixed in background, never scrolls */}
        <div className="home-feed-bg" aria-hidden="true">
          <div className="right-feed">
            {feedColumns.map((column, columnIndex) => (
              <motion.div
                className={`right-feed-column-shell right-feed-column-shell-${feedLayers[columnIndex]}`}
                initial={{ y: 380, opacity: 0 }}
                animate={{ y: introComplete ? 0 : 380, opacity: introComplete ? 1 : 0 }}
                transition={{
                  delay: columnIndex * 0.08,
                  y: { type: 'spring', stiffness: 220, damping: 32, mass: 0.9, bounce: 0, restSpeed: 8, restDelta: 3.6 },
                  opacity: { duration: 0.5, ease: 'easeOut' },
                }}
                onAnimationComplete={() => handleCardEntranceComplete(columnIndex)}
                key={`column-${columnIndex}`}
              >
                <div className={`right-feed-column right-feed-column-${feedLayers[columnIndex]}`}>
                  <div
                    className={`right-feed-track ${feedLoopReady ? 'is-looping' : ''}`}
                    style={{ '--feed-duration': feedDurations[columnIndex] }}
                    ref={(el) => { trackRefs.current[columnIndex] = el; }}
                  >
                    {[0, 1].map((copyIndex) => (
                      <div className="right-feed-stack" key={`stack-${columnIndex}-${copyIndex}`}>
                        {column.map((card, cardIndex) => (
                          <div
                            className={`right-feed-card-shell ${cardIndex % 2 === 0 ? 'drift-left' : 'drift-right'}`}
                            key={`card-${columnIndex}-${copyIndex}-${cardIndex}`}
                          >
                            <div className={`right-feed-card right-feed-card-${card.size}`}>
                              <div className="right-feed-card-inner">
                                <img src={card.image} alt="" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="right-feed-fade" />
          </div>
        </div>

        <motion.div
          className="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: introComplete ? 1 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ pointerEvents: introComplete ? 'auto' : 'none' }}
        >
          {/* Floating ambient orbs */}
          <div className="orb-field" aria-hidden="true">
            <motion.div
              className="orb orb-1"
              animate={{ x: [0, 60, -30, 0], y: [0, -40, 50, 0], scale: [1, 1.15, 0.9, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="orb orb-2"
              animate={{ x: [0, -50, 40, 0], y: [0, 60, -30, 0], scale: [1, 0.88, 1.18, 1] }}
              transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="orb orb-3"
              animate={{ x: [0, 40, -50, 0], y: [0, -50, 30, 0], scale: [1, 1.1, 0.92, 1] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <div className="splash-layout">
            <motion.div
              className="splash-content"
              variants={leftContentVariants}
              initial="hidden"
              animate={contentReady ? 'visible' : 'hidden'}
            >
              <motion.div className="foreground-accent" aria-hidden="true" variants={leftItemVariants}>
                <svg className="blackhole-accent-svg" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="bh-core-grad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="black" stopOpacity="0.96" />
                      <stop offset="58%" stopColor="black" stopOpacity="0.58" />
                      <stop offset="100%" stopColor="black" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <motion.g animate={{ rotate: [0, 360] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '110px 110px' }}>
                    <circle cx="110" cy="110" r="100" stroke="rgba(150,150,150,0.12)" strokeWidth="0.8" strokeDasharray="420 207" strokeLinecap="round" />
                  </motion.g>
                  <motion.g animate={{ rotate: [0, -360] }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '110px 110px' }}>
                    <circle cx="110" cy="110" r="86" stroke="rgba(215,215,215,0.56)" strokeWidth="2.4" strokeDasharray="152 388" strokeLinecap="round" />
                  </motion.g>
                  <motion.g animate={{ rotate: [55, 415] }} transition={{ duration: 16, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '110px 110px' }}>
                    <circle cx="110" cy="110" r="70" stroke="rgba(178,178,178,0.4)" strokeWidth="1.5" strokeDasharray="106 334" strokeLinecap="round" />
                  </motion.g>
                  <motion.g animate={{ rotate: [0, -360] }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '110px 110px' }}>
                    <circle cx="110" cy="110" r="55" stroke="rgba(195,195,195,0.36)" strokeWidth="1.7" strokeDasharray="74 272" strokeLinecap="round" />
                  </motion.g>
                  <motion.g animate={{ rotate: [90, 450] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '110px 110px' }}>
                    <circle cx="110" cy="110" r="40" stroke="rgba(222,222,222,0.46)" strokeWidth="2" strokeDasharray="86 165" strokeLinecap="round" />
                  </motion.g>
                  <circle cx="110" cy="110" r="70" fill="url(#bh-core-grad)" />
                </svg>
              </motion.div>

              <motion.div className="splash-brand" variants={leftItemVariants}>
                <h1 className="splash-headline">Vanta</h1>
                <p className="splash-sub">Find your next tattoo.</p>
                <p className="splash-desc">
                  Vanta is a tattoo discovery app that connects you with artists and their work.
                  Browse portfolios, save designs you love, and reach out to artists — all in one place.
                </p>
              </motion.div>

              <motion.div variants={leftItemVariants}>
                <AppStoreBadge />
              </motion.div>
            </motion.div>

          </div>

          {/* Animated scroll-down button */}
          <motion.div
            className="splash-scroll-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: contentReady ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <button
              className="splash-scroll-btn"
              onClick={() => homePageRef.current?.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
              aria-label="Scroll to next section"
            >
              <span className="splash-scroll-label">Get Inked</span>
              <div className="splash-scroll-pulse">
                <div className="splash-scroll-ring" />
                <div className="splash-scroll-ring splash-scroll-ring-2" />
                <div className="splash-scroll-center-dot" />
              </div>
            </button>
          </motion.div>

          {/* Bottom copyright */}
          <div className="splash-footer">
            <span>© 2026 Vanta Ink</span>
            <div className="splash-footer-links">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
            </div>
          </div>
        </motion.div>

        <div className="home-below-splash">

          {/* ── Discovery — desktop ── */}
          <section className="home-problem">
            <div className="home-problem-text">
              <span className="home-problem-label">01 — Discovery</span>
              <div className="home-platform-noise" aria-label="Platforms not built for tattoo discovery">
                <span className="home-platform-badge">Instagram</span>
                <span className="home-platform-badge">Pinterest</span>
                <span className="home-platform-badge">Reddit</span>
                <span className="home-platform-badge">TikTok</span>
              </div>
              <h2 className="home-problem-headline">None of them were built for this.</h2>
              <p className="home-problem-body">
                Instagram buries tattoo content under algorithm noise. Pinterest recycles the same dozen designs. Reddit requires knowing the right subreddit. TikTok is fine until it's not.
                They were all built for everything — which means none of them are built for tattoos.
              </p>
              <p className="home-problem-body">
                Vanta is purpose-built for tattoo discovery. Every piece is tagged by style, placement, and body part. Save to collections you can find later. Tap any tattoo to see the artist behind it.
              </p>
              <ul className="home-problem-bullets">
                <li>Filter by style — blackwork, fine line, neo-trad, Japanese, and more</li>
                <li>Filter by body part — exactly where you're planning to get it</li>
                <li>Save to collections and come back when you're ready</li>
              </ul>
            </div>
            <div className="home-problem-screens">
              <div className="home-screen-stack">
                {/* back screenshot: replace with a second discovery / style-filter screen */}
                <div className="home-screen home-screen--back">
                  <img src="/artist-portfolio.png" alt="" />
                </div>
                {/* front screenshot: main discovery / feed view */}
                <div className="home-screen home-screen--front">
                  <img src="/tattoo-details.png" alt="Vanta discovery feed" />
                </div>
              </div>
            </div>
          </section>

          {/* ── Discovery — mobile (sticky scroll card) ── */}
          <MobileDiscoverySection containerRef={homePageRef} />

          {/* ── Finale: sits first in DOM so it's the sticky background layer ── */}
          <section className="home-finale">
            <p className="home-finale-eyebrow">Free on the App Store</p>
            <h2 className="home-finale-headline">Your next tattoo is here.<br />Go find it.</h2>
            <AppStoreBadge />
          </section>

          {/* ── Pain point 2: Process (pulled back over the finale via margin-top) ── */}
          <ProcessSection />
          <MobileProcessSection containerRef={homePageRef} />
        </div>
      </div>
    </>
  );
}
