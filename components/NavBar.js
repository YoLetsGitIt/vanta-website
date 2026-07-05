'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/artists', label: 'For artists' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Link href="/" className="brand">VANTA</Link>
      <nav>
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
