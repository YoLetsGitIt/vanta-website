import './globals.css';
import './typewriter.css';
import { Space_Grotesk } from 'next/font/google';
import SiteIntro from '../components/SiteIntro';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['500', '700'],
});
const spaceGroteskBody = Space_Grotesk({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600'] });

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
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${spaceGroteskBody.variable}`}>
        <SiteIntro>{children}</SiteIntro>
      </body>
    </html>
  );
}
