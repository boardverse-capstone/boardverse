import { PageHeader } from '@/components/common/page-header';
import { AdminReservationOperationsPanel } from '@/features/admin-operations/components/admin-reservation-operations-panel';

export default function AdminOperationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vận hành Reservation"
        description="Chạy các tác vụ hệ thống và override hoàn BVC cho reservation."
      />
      <AdminReservationOperationsPanel />
    </div>
  );
}
