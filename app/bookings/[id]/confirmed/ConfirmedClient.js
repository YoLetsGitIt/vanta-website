'use client';

import { use } from 'react';

export default function BookingConfirmedPage({ params }) {
  const { id } = use(params);
  void id;

  return (
    <main style={{ minHeight: '100vh', background: '#11151b', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 24 }}>✓</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Booking confirmed</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 12 }}>
          Your deposit has been received. You'll get a confirmation email shortly with all the details.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 40 }}>
          Download the Vanta app to chat with your artist and track your booking.
        </p>
        <a
          href="https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738"
          style={{
            display: 'inline-block', background: '#fff', color: '#11151b',
            fontWeight: 600, fontSize: 15, padding: '14px 32px',
            borderRadius: 50, textDecoration: 'none', marginBottom: 24,
          }}
        >
          Download Vanta
        </a>
        <div>
          <a href="https://www.vanta.tattoo" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textDecoration: 'none' }}>
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
