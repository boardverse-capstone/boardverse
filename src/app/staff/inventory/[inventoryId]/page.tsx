'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { InventoryDetailView } from '@/features/staff-cafe/components/inventory-detail-view';
import { useSelectedCafeId } from '@/features/staff-cafe/hooks/useSelectedCafeId';
import { useStaffWorkingCafe } from '@/features/staff-cafe/hooks/useStaffCafe';

function InventoryDetailContent() {
  const params = useParams<{ inventoryId: string }>();
  const searchParams = useSearchParams();
  const queryCafeId = searchParams.get('cafeId') ?? undefined;
  const { data: workingCafe } = useStaffWorkingCafe();
  const { cafeId } = useSelectedCafeId(queryCafeId ?? workingCafe?.id);
  const inventoryId = params.inventoryId;

  if (!cafeId) {
    return (
      <div className="text-sm text-muted-foreground">
        Chưa chọn quán. Vui lòng quay lại trang Kho game.
      </div>
    );
  }

  return <InventoryDetailView cafeId={cafeId} inventoryId={inventoryId} />;
}

export default function StaffInventoryDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Chi tiết kho game" description="Thông tin hộp game, linh kiện và mức phạt." />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Đang tải...</div>}>
        <InventoryDetailContent />
      </Suspense>
    </div>
  );
}
