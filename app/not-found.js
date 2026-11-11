'use client';

import { useEffect, useState } from 'react';
import { BACKEND_URL } from '../lib/website-auth';
import BrandLoader, { Wordmark } from '../components/BrandLoader';

const BOOKING_CONFIRM_RE = /^\/bookings\/([^/]+)\/confirm$/;
const BOOKING_CONFIRMED_RE = /^\/bookings\/([^/]+)\/confirmed$/;
// Studio short links: /b/<slug> opens the booking form, /c/<slug> the consent form,
// /w/<slug> the walk-in form.
const STUDIO_LINK_RE = /^\/(b|c|w)\/([a-z0-9-]{3,40})\/?$/i;
// Old studio invite links (/j/<code>). Artists now join with the studio code in
// the app, and the app opens these links itself once installed; without the app,
// phones go to the store and computers to the artists page.
const STUDIO_INVITE_RE = /^\/j\/[a-z0-9]{6,20}\/?$/i;
const APP_STORE_URL = 'https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738';
const PLAY_URL = 'https://play.google.com/store/apps/details?id=vanta.tattoo';

function storeFor(ua, touchPoints) {
  if (/android/i.test(ua)) return PLAY_URL;
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && touchPoints > 1)) return APP_STORE_URL;
  return '/artists';
}
const studioApp = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.vanta.tattoo').replace(/\/$/, '');

export default function NotFound() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const path = window.location.pathname;
    let m;
    if (STUDIO_INVITE_RE.test(path)) {
      window.location.replace(storeFor(navigator.userAgent || '', navigator.maxTouchPoints || 0));
      return;
    }
    if ((m = STUDIO_LINK_RE.exec(path))) {
      const page = { b: 'studio-booking', c: 'consent', w: 'walkin' }[m[1].toLowerCase()];
      fetch(`${BACKEND_URL}/booking-links/${encodeURIComponent(m[2].toLowerCase())}`)
        .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
        .then(({ studio_id }) => window.location.replace(`${studioApp}/${page}?s=${encodeURIComponent(studio_id)}`))
        .catch(status => setMessage(status === 404 ? 'This studio link doesn’t exist. Check the spelling, or ask the studio for a new link.' : 'Couldn’t open this link. Please refresh to try again.'));
      return;
    }
    if ((m = BOOKING_CONFIRM_RE.exec(path))) {
      window.location.replace(`/bookings/_/confirm?id=${encodeURIComponent(m[1])}`);
      return;
    }
    if ((m = BOOKING_CONFIRMED_RE.exec(path))) {
      window.location.replace(`/bookings/_/confirmed?id=${encodeURIComponent(m[1])}`);
      return;
    }
    setMessage('This page doesn’t exist.');
  }, []);

  if (!message) return <BrandLoader />;

  return (
    <main className="page-scroll page-scroll--center" style={{
      background: '#11151b', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <Wordmark size={28} />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, maxWidth: 320, lineHeight: 1.5 }}>{message}</p>
        <a href="/" style={{ color: '#c2b699', fontSize: 14, textDecoration: 'none' }}>Go to vanta.tattoo</a>
      </div>
    </main>
  );
}
