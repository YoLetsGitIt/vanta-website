import StudioPage from './StudioPage';

export const metadata = {
  title: 'Vanta Studio — Run the whole studio from one desk',
  description: 'Every artist’s schedule, every booking, every client and every payout, in one place built for tattoo studios. Bookings, consent, deposits and artist payouts on the web.',
  alternates: { canonical: 'https://vanta.tattoo/studio' },
};

// The studio page is the same light gallery as the home and artist pages.
export const viewport = {
  themeColor: '#f3f3f1',
  viewportFit: 'cover',
};

export default function Page() {
  return <StudioPage />;
}
