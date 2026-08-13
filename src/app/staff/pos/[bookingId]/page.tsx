'use client';

import { use } from 'react';
import { PosFeatureContainer } from '@/features/cafe-pos/components/pos-feature-container';

interface StaffPosCheckInPageProps {
  params: Promise<{ bookingId: string }>;
}

/** Deep-link booking → cùng UI cafe-pos, prefill mã check-in. */
export default function StaffPosCheckInPage({ params }: StaffPosCheckInPageProps) {
  const { bookingId } = use(params);
  return (
    <main className="min-h-screen bg-[#F6F6F7] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <PosFeatureContainer initialBookingCode={bookingId} />
      </div>
    </main>
  );
}
