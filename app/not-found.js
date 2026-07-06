'use client';

import { useEffect } from 'react';

const BOOKING_CONFIRM_RE = /^\/bookings\/([^/]+)\/confirm$/;
const BOOKING_CONFIRMED_RE = /^\/bookings\/([^/]+)\/confirmed$/;

export default function NotFound() {
  useEffect(() => {
    const path = window.location.pathname;
    let m;
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
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading…</p>
      </div>
    </main>
  );
}
