export function generateStaticParams() { return [{ id: '_' }]; }

import ConfirmedClient from './ConfirmedClient';

export default function ConfirmedBookingPage({ params }) {
  return <ConfirmedClient params={params} />;
}
