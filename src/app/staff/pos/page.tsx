'use client';

import { PosFeatureContainer } from '@/features/cafe-pos/components/pos-feature-container';

export default function StaffPosPage() {
  return (
    <main className="min-h-screen bg-[#F6F6F7] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <PosFeatureContainer />
      </div>
    </main>
  );
}
