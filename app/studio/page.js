import ProductJourney from '@/components/ProductJourney';
export const metadata = {
  title: 'For Studios — Vanta',
  description: 'Bookings, client records, consent, artist scheduling and studio finances. Step inside Vanta Studio.',
  alternates: { canonical: 'https://vanta.tattoo/studio' },
};
export default function StudioPage() { return <ProductJourney audience="owner" />; }
