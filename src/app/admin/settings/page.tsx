import { MasterSettingsPortal } from '@/features/master-settings/components/master-settings-portal';
import { PageHeader } from '@/components/common/page-header';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt hệ thống"
        description="Cấu hình tham số Elo, Karma, matchmaking và biểu phí nền tảng."
      />
      <MasterSettingsPortal />
    </div>
  );
}
