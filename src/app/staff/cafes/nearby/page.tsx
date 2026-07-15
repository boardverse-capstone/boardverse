import { PageHeader } from '@/components/common/page-header';
import { NearbyCafesPanel } from '@/features/staff-cafe/components/nearby-cafes-panel';

export default function StaffNearbyCafesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quán gần đây"
        description="Danh sách quán cafe gần vị trí trong hồ sơ của bạn (GET /api/cafes/nearby/me)."
      />
      <div className="max-w-2xl">
        <NearbyCafesPanel />
      </div>
    </div>
  );
}
