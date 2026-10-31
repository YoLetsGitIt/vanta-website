'use client';

import { useEffect, useState } from 'react';
import { BACKEND_URL } from '../lib/website-auth';

const BOOKING_CONFIRM_RE = /^\/bookings\/([^/]+)\/confirm$/;
const BOOKING_CONFIRMED_RE = /^\/bookings\/([^/]+)\/confirmed$/;
// Studio short links: /b/<slug> opens the booking form, /c/<slug> the consent form.
const STUDIO_LINK_RE = /^\/(b|c)\/([a-z0-9-]{3,40})\/?$/i;
const studioApp = (process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.vanta.tattoo').replace(/\/$/, '');

export default function NotFound() {
  const [message, setMessage] = useState('Loading…');
  useEffect(() => {
    const path = window.location.pathname;
    let m;
    if ((m = STUDIO_LINK_RE.exec(path))) {
      const page = m[1].toLowerCase() === 'b' ? 'studio-booking' : 'consent';
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
    }
  }, []);

  return (
    <main style={{
      minHeight: '100vh', background: '#11151b', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, maxWidth: 320, lineHeight: 1.5 }}>{message}</p>
      </div>
    </main>
  );
}
