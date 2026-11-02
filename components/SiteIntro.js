'use client';

import { useCallback, useEffect, useState } from 'react';
import TypewriterIntro from './TypewriterIntro';

const INTRO_SEEN_KEY = 'vanta-intro-seen';

export default function SiteIntro({ children }) {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // This is shared by every website route, but never by the Studio app.
    if (window.location.hostname.toLowerCase() === 'studio.vanta.tattoo') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    try {
      if (sessionStorage.getItem(INTRO_SEEN_KEY) === 'true') return;
    } catch {
      // The intro still works when browser storage is unavailable.
    }

    setShowIntro(true);
  }, []);

  const completeIntro = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {}
    setShowIntro(false);
  }, []);

  return (
    <>
      {showIntro && <TypewriterIntro onComplete={completeIntro} />}
      <div style={{ display: 'contents' }} inert={showIntro}>
        {children}
      </div>
    </>
  );
}
