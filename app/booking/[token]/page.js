export function generateStaticParams() { return [{ token: '_' }]; }

import { Suspense } from 'react';
import BookingSelectionClient from './BookingSelectionClient';

export default function BookingSelectionPage() {
  return (
    <Suspense fallback={null}>
      <BookingSelectionClient />
    </Suspense>
  );
}
