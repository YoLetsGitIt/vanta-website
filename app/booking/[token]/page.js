export function generateStaticParams() { return [{ token: '_' }]; }

import { Suspense } from 'react';
import BookingSelectionClient from './BookingSelectionClient';

export default function BookingSelectionPage({ params }) {
  return (
    <Suspense fallback={null}>
      <BookingSelectionClient params={params} />
    </Suspense>
  );
}
