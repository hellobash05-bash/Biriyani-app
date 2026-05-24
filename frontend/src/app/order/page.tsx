import { Suspense } from 'react';
import OrderClient from './OrderClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading Tracker...</div>}>
      <OrderClient />
    </Suspense>
  );
}
