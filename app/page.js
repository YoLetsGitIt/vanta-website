'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import Link from 'next/link';
import TypewriterIntro from '@/components/TypewriterIntro';

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

export default function HomePage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [feedLoopReady, setFeedLoopReady] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [columnsSettled, setColumnsSettled] = useState(false);

  const touchX = useMotionValue(0);
  const touchY = useMotionValue(0);
  const springTouchX = useSpring(touchX, { stiffness: 90, damping: 18, mass: 0.6 });
  const springTouchY = useSpring(touchY, { stiffness: 90, damping: 18, mass: 0.6 });

  const trackRefs = useRef([null, null, null]);
  const playbackRef = useRef(1);
  const decayFrameRef = useRef(null);
  const postCardsStartedRef = useRef(false);

  useEffect(() => {
    if (!introComplete) {
      setFeedLoopReady(false);
      setContentReady(false);
      setColumnsSettled(false);
      playbackRef.current = 1;
      postCardsStartedRef.current = false;
      return;
    }
  }, [introComplete]);

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
    if (typeof window === 'undefined') {
      return;
    }

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
      <TypewriterIntro onComplete={() => setIntroComplete(true)} />

      <motion.div
        className="splash"
        initial={{ opacity: 0 }}
        animate={{ opacity: introComplete ? 1 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointerOffset}
        onPointerUp={resetPointerOffset}
        onWheel={handleWheel}
        style={{
          pointerEvents: introComplete ? 'auto' : 'none',
          touchAction: 'none',
          '--touch-x': springTouchX,
          '--touch-y': springTouchY,
        }}
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

                {/* Ring 1 — outermost slow */}
                <motion.g animate={{ rotate: [0, 360] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '110px 110px' }}>
                  <circle cx="110" cy="110" r="100" stroke="rgba(150,150,150,0.12)" strokeWidth="0.8" strokeDasharray="420 207" strokeLinecap="round" />
                </motion.g>

                {/* Ring 2 — main bright reverse sweep */}
                <motion.g animate={{ rotate: [0, -360] }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '110px 110px' }}>
                  <circle cx="110" cy="110" r="86" stroke="rgba(215,215,215,0.56)" strokeWidth="2.4" strokeDasharray="152 388" strokeLinecap="round" />
                </motion.g>

                {/* Ring 3 — mid forward arc */}
                <motion.g animate={{ rotate: [55, 415] }} transition={{ duration: 16, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '110px 110px' }}>
                  <circle cx="110" cy="110" r="70" stroke="rgba(178,178,178,0.4)" strokeWidth="1.5" strokeDasharray="106 334" strokeLinecap="round" />
                </motion.g>

                {/* Ring 4 — inner fast reverse */}
                <motion.g animate={{ rotate: [0, -360] }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '110px 110px' }}>
                  <circle cx="110" cy="110" r="55" stroke="rgba(195,195,195,0.36)" strokeWidth="1.7" strokeDasharray="74 272" strokeLinecap="round" />
                </motion.g>

                {/* Ring 5 — innermost fastest forward */}
                <motion.g animate={{ rotate: [90, 450] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: '110px 110px' }}>
                  <circle cx="110" cy="110" r="40" stroke="rgba(222,222,222,0.46)" strokeWidth="2" strokeDasharray="86 165" strokeLinecap="round" />
                </motion.g>

                {/* Dark vortex core overlay */}
                <circle cx="110" cy="110" r="70" fill="url(#bh-core-grad)" />
              </svg>
            </motion.div>

            <motion.div className="splash-brand" variants={leftItemVariants}>
              <h1 className="splash-headline">Vanta</h1>
              <p className="splash-sub">Find your next tattoo.</p>
            </motion.div>

            <motion.a
              className="app-store-badge"
              href="https://apps.apple.com/au/app/vanta/id6760996738"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download Vanta on the App Store"
              variants={leftItemVariants}
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
            </motion.a>
          </motion.div>

          <div className="right-feed" aria-hidden="true">
            {feedColumns.map((column, columnIndex) => (
              <motion.div
                className={`right-feed-column-shell right-feed-column-shell-${feedLayers[columnIndex]}`}
                initial={{ y: 380, opacity: 0 }}
                animate={{ y: introComplete ? 0 : 380, opacity: introComplete ? 1 : 0 }}
                transition={{
                  delay: columnIndex * 0.08,
                  y: {
                    type: 'spring',
                    stiffness: 220,
                    damping: 32,
                    mass: 0.9,
                    bounce: 0,
                    restSpeed: 8,
                    restDelta: 3.6,
                  },
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
            <div className="right-feed-fade"></div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="splash-footer">
          <span>© 2026 Vanta Ink</span>
          <div className="splash-footer-links">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}
