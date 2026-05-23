import { Suspense } from 'react';
import OrderClient from './OrderClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-950 flex items-center justify-center text-white">Loading Tracker...</div>}>
      <OrderClient />
    </Suspense>
  );
}
