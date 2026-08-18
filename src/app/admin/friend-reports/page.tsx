import { PageHeader } from '@/components/common/page-header';
import { AdminFriendReportsPanel } from '@/features/admin-friend-reports/components/admin-friend-reports-panel';

export default function AdminFriendReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo bạn bè"
        description="Xem xét các báo cáo vi phạm do người chơi gửi và lưu lại kết quả xử lý."
      />
      <AdminFriendReportsPanel />
    </div>
  );
}
