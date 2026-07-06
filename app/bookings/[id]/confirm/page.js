export function generateStaticParams() { return [{ id: '_' }]; }

import { Suspense } from 'react';
import ConfirmClient from './ConfirmClient';

export default function ConfirmBookingPage({ params }) {
  return (
    <Suspense fallback={null}>
      <ConfirmClient params={params} />
    </Suspense>
  );
}
