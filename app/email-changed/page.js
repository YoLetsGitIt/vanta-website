'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

function EmailChangedContent() {
  const searchParams = useSearchParams();
  const [attempted, setAttempted] = useState(false);
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      window.location.href = `vanta://confirm-email?code=${encodeURIComponent(code)}`;
    }
    const timer = setTimeout(() => setAttempted(true), 1500);
    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div style={styles.card}>
      <Image src="/vanta-app-icon.png" alt="Vanta" width={64} height={64} style={styles.icon} />

      <div style={styles.iconCircle}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M4 11.5L8.5 16L18 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 style={styles.heading}>Email confirmed</h1>
      <p style={styles.body}>
        Your email address has been updated. Open the Vanta app to continue.
      </p>

      <a
        href={`vanta://confirm-email${code ? `?code=${encodeURIComponent(code)}` : ''}`}
        style={styles.button}
      >
        Open Vanta
      </a>

      {attempted && (
        <p style={styles.hint}>
          App not opening?{' '}
          <Link href="https://apps.apple.com/app/vanta/id6743543929" style={styles.link}>
            Download from the App Store
          </Link>
        </p>
      )}
    </div>
  );
}

export default function EmailChangedPage() {
  return (
    <div style={styles.page}>
      <Suspense fallback={<div style={styles.card} />}>
        <EmailChangedContent />
      </Suspense>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #000000 0%, #05070a 100%)',
    padding: '24px',
    fontFamily: 'var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '16px',
    maxWidth: '400px',
    width: '100%',
  },
  icon: {
    borderRadius: '16px',
    marginBottom: '4px',
  },
  iconCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0',
    fontFamily: 'var(--font-heading), sans-serif',
  },
  body: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.5)',
    margin: '0',
    lineHeight: '1.6',
  },
  button: {
    display: 'block',
    marginTop: '8px',
    padding: '14px 32px',
    background: '#ffffff',
    color: '#000000',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    textDecoration: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
    margin: '0',
  },
  link: {
    color: 'rgba(255,255,255,0.6)',
    textDecoration: 'underline',
  },
};
