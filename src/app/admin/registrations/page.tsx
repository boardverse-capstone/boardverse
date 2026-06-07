'use client';

import { PendingRegistrationsTable } from '@/features/partner/components/pending-registrations-table';

export default function PendingRegistrationsPage() {
  return (
    <div>
      <p className="text-muted-foreground mb-4">
        Danh sách đơn đăng ký đối tác cần xử lý: Chờ duyệt, Cần Ops xác minh, Chờ đàm phán
        và Trống dữ liệu. Chỉ quán ở trạng thái <strong>Đang hoạt động (ACTIVE)</strong> mới
        hiển thị trên ứng dụng Mobile.
      </p>
      <PendingRegistrationsTable />
    </div>
  );
}
