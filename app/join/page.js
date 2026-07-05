'use client';

import { useEffect } from 'react';
import Image from 'next/image';

const APP_STORE_URL = 'https://apps.apple.com/au/app/vanta-find-your-next-tattoo/id6760996738';
const BACKEND_URL = 'https://inkspire-backend-xa2a.onrender.com';

export default function JoinPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('ref') || '';
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

    if (code) {
      // Browser makes this request directly → backend sees the real client IP for fingerprinting
      fetch(`${BACKEND_URL}/join?ref=${code}`, { mode: 'no-cors' }).catch(() => {});
      // If app is installed, this opens it immediately
      window.location.href = `vanta://refer?code=${code}`;
    }

    // Fall back to App Store (instant if no code, after 1.5s if we tried the app)
    setTimeout(() => {
      window.location.href = APP_STORE_URL;
    }, code ? 1500 : 0);
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <Image src="/vanta-app-icon.png" alt="Vanta" width={56} height={56} style={styles.icon} />
          <span style={styles.logoText}>VANTA</span>
        </div>

        <h1 style={styles.heading}>You've been invited</h1>
        <p style={styles.subtext}>
          Discover and book tattoo artists near you.
        </p>

        <a href={APP_STORE_URL} style={styles.button}>
          Download on the App Store
        </a>

        <p style={styles.hint}>
          If you already have Vanta, opening automatically…
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--background)',
    padding: '24px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '360px',
    width: '100%',
    gap: '0',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '40px',
  },
  icon: {
    borderRadius: '14px',
  },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '5px',
    color: 'var(--main)',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--main)',
    margin: '0 0 12px',
    lineHeight: '1.2',
  },
  subtext: {
    fontFamily: 'var(--font-body)',
    fontSize: '15px',
    color: 'var(--text-muted)',
    margin: '0 0 36px',
    lineHeight: '1.7',
  },
  button: {
    display: 'block',
    width: '100%',
    background: 'var(--main)',
    color: 'var(--background)',
    fontFamily: 'var(--font-body)',
    fontSize: '16px',
    fontWeight: '600',
    padding: '16px 32px',
    borderRadius: '50px',
    textDecoration: 'none',
    marginBottom: '20px',
  },
  hint: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: '0',
  },
};
