'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { applyLinkTheme } from '../lib/link-theme.mjs';

// Keeps the light link theme right when moving between pages without a reload.
export default function LinkTheme() {
  const pathname = usePathname();
  useEffect(() => {
    applyLinkTheme(document.documentElement, window.location.hostname, window.location.pathname);
  }, [pathname]);
  return null;
}
