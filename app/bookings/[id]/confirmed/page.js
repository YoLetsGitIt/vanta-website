export function generateStaticParams() { return [{ id: '_' }]; }

import ConfirmedClient from './ConfirmedClient';
import { Suspense } from 'react';

export default function ConfirmedBookingPage({ params }) {
  return <Suspense fallback={null}><ConfirmedClient params={params} /></Suspense>;
}
