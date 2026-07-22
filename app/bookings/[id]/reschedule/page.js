export function generateStaticParams() { return [{ id: '_' }]; }

import { Suspense } from 'react';
import RescheduleClient from './RescheduleClient';

export default function ReschedulePage({ params }) {
  return (
    <Suspense fallback={null}>
      <RescheduleClient params={params} />
    </Suspense>
  );
}
