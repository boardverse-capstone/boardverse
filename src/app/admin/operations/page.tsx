import { PageHeader } from '@/components/common/page-header';
import { AdminOperationsHub } from '@/features/admin-operations/components/admin-operations-hub';

export default function AdminOperationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vận hành hệ thống"
        description="Chạy thủ công các background job phục vụ recovery, kiểm thử và xử lý scheduler bị trễ."
      />
      <AdminOperationsHub />
    </div>
  );
}
