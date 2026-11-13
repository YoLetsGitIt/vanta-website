'use client';

// Shown after a booking: browse tattoos and book in the Vanta app. iPhone (and desktop)
// visitors get the App Store; Android visitors get the Android beta.
import { useEffect, useState } from 'react';

export const APP_STORE_URL = 'https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738';
export const ANDROID_BETA_URL = 'https://play.google.com/apps/testing/vanta.tattoo';

export default function AppPromo() {
  // Decided after load, so the static page and the first render match.
  const [android, setAndroid] = useState(false);
  useEffect(() => { setAndroid(/android/i.test(navigator.userAgent || '')); }, []);
  return (
    <div style={p.card}>
      <div style={p.head}>
        <img src="/vanta-app-icon.png" alt="" width={44} height={44} style={p.icon} />
        <div>
          <div style={p.title}>Browse tattoos and book seamlessly on the Vanta app</div>
          <div style={p.sub}>Find artists and designs you love, book in a few taps, and keep every booking in one place.</div>
        </div>
      </div>
      <a href={android ? ANDROID_BETA_URL : APP_STORE_URL} target="_blank" rel="noopener noreferrer" style={p.button}>
        {android ? 'Join the Android beta' : 'Download on the App Store'}
      </a>
    </div>
  );
}

const p = {
  card: { marginTop: 24, padding: 18, borderRadius: 16, border: '1px solid rgba(var(--ink-rgb), 0.1)', background: 'rgba(var(--ink-rgb), 0.04)' },
  head: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  icon: { borderRadius: 11, flexShrink: 0 },
  title: { fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 },
  sub: { marginTop: 6, fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, color: 'rgba(var(--ink-rgb), 0.55)' },
  button: { display: 'block', marginTop: 16, padding: '14px 18px', borderRadius: 999, background: 'var(--ink)', color: 'var(--on-ink)', textAlign: 'center', textDecoration: 'none', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15 },
};
