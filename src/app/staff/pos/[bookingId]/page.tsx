import { PosFeatureContainer } from '@/features/cafe-pos/components/pos-feature-container';

interface StaffPosCheckInPageProps {
  params: Promise<{ bookingId: string }>;
}

/** Deep-link booking → cùng UI cafe-pos, prefill mã check-in. */
export default async function StaffPosCheckInPage({
  params,
}: StaffPosCheckInPageProps) {
  const { bookingId } = await params;
  return (
    <section className="mx-auto w-full max-w-[1600px]" aria-label="Web POS check-in">
      <PosFeatureContainer initialBookingCode={bookingId} />
    </section>
  );
}
