'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './NavBar.module.css';

const links = [
  { href: '/artists', label: 'For artists' },
  { href: '/studio', label: 'For studios' },
  { href: '/signup', label: 'Sign in' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Link href="/" className={styles.wordmark} aria-label="Vanta home">vanta<span>.</span></Link>
      <nav style={{ gap: 'clamp(12px, 3vw, 32px)' }}>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link${pathname === href ? ' nav-active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
