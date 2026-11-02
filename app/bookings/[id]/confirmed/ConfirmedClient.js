'use client';

import ConfirmClient from '../confirm/ConfirmClient';

export default function ConfirmedClient({ params }) {
  return <ConfirmClient params={params} receiptOnly />;
}
