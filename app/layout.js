import './globals.css';
import './typewriter.css';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['500', '700'],
});
const spaceGroteskBody = Space_Grotesk({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600'] });

export const metadata = {
  title: 'Inkspire | Find Your Next Tattoo',
  description:
    'Inkspire helps people discover tattoo inspiration, connect with artists, and preview ideas before they commit.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${spaceGroteskBody.variable}`}>{children}</body>
    </html>
  );
}
