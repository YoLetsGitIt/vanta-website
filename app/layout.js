import './globals.css';
import './typewriter.css';
import { Space_Grotesk } from 'next/font/google';
import localFont from 'next/font/local';
import ContactEmailSignupGate from '../components/ContactEmailSignupGate';
import SiteIntro from '../components/SiteIntro';
import LinkTheme from '../components/LinkTheme';
import { LINK_THEME_SCRIPT } from '../lib/link-theme.mjs';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['500', '700'],
});
const spaceGroteskBody = Space_Grotesk({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600'] });
// The gallery system (see .gallery in globals.css): one face for display and text, a mono for wall placards.
// Self-hosted (latin subset, OFL): next/font/google can't parse the extensionless URLs Google now serves for these.
const interTight = localFont({ src: './fonts/InterTight-Variable-latin.woff2', variable: '--font-gallery', weight: '400 800', display: 'swap' });
const plexMono = localFont({
  src: [
    { path: './fonts/IBMPlexMono-400-latin.woff2', weight: '400' },
    { path: './fonts/IBMPlexMono-500-latin.woff2', weight: '500' },
  ],
  variable: '--font-placard',
  display: 'swap',
  preload: false,
});

export const metadata = {
  title: 'Vanta | Find Your Next Tattoo',
  description:
    'Discover tattoo inspiration, find your artist, and book your next tattoo. Download Vanta for iPhone or join the Android beta.',
  icons: {
    icon: '/vanta-app-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LINK_THEME_SCRIPT }} />
      </head>
      <body className={`${spaceGrotesk.variable} ${spaceGroteskBody.variable} ${interTight.variable} ${plexMono.variable}`}>
        <LinkTheme />
        <SiteIntro>{children}<ContactEmailSignupGate /></SiteIntro>
      </body>
    </html>
  );
}
