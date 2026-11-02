'use client';

import { usePathname } from 'next/navigation';
import styles from './NavBar.module.css';

const links = [
  { href: '/artists', label: 'For artists' },
  { href: '/studio', label: 'For studios' },
  { href: '/signup', label: 'Sign in' },
];

export default function NavBar() {
  const pathname = usePathname();
  // Load HTML directly on the static host; failed Next data fetches can open .txt.
  return (
    <header className="site-header">
      <a href="/" className={styles.wordmark} aria-label="Vanta home">vanta<span>.</span></a>
      <nav style={{ gap: 'clamp(12px, 3vw, 32px)' }}>
        {links.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className={`nav-link${pathname === href ? ' nav-active' : ''}`}
          >
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
