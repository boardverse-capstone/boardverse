import { MasterSettingsPortal } from '@/features/master-settings/components/master-settings-portal';
import { PageHeader } from '@/components/common/page-header';
import { SystemConfigLookupPanel } from '@/features/admin-config/components/system-config-lookup-panel';
import { BypassTimeWindowPanel } from '@/features/admin-config/components/bypass-time-window-panel';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt hệ thống"
        description="Cấu hình tham số Elo, Karma, matchmaking và biểu phí."
      />
      <BypassTimeWindowPanel />
      <SystemConfigLookupPanel />
      <MasterSettingsPortal />
    </div>
  );
}
