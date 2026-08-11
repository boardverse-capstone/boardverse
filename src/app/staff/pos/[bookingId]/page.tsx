'use client';

import { use } from 'react';
import { PosCheckInPanel } from '@/features/pos-check-in/components/pos-check-in-panel';

interface StaffPosCheckInPageProps {
  params: Promise<{ bookingId: string }>;
}

export default function StaffPosCheckInPage({ params }: StaffPosCheckInPageProps) {
  const { bookingId } = use(params);
  return <PosCheckInPanel bookingId={bookingId} />;
}
