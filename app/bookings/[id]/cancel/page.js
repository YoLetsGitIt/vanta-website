export function generateStaticParams() { return [{ id: '_' }]; }

import { Suspense } from 'react';
import CancelClient from './CancelClient';

export default function CancelPage({ params }) {
  return (
    <Suspense fallback={null}>
      <CancelClient params={params} />
    </Suspense>
  );
}
