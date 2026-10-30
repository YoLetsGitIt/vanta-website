'use client';

import { useCallback, useEffect, useState } from 'react';
import TypewriterIntro from './TypewriterIntro';
import { INTRO_SEEN_KEY, introWillPlay } from '../lib/siteIntro';

export default function SiteIntro({ children }) {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // This is shared by every website route, but never by the Studio app.
    // It still plays when browser storage is unavailable.
    if (introWillPlay()) setShowIntro(true);
  }, []);

  const completeIntro = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {}
    document.documentElement.dataset.siteIntro = 'done';
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
