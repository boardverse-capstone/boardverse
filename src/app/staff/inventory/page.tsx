import { Suspense } from 'react';
import { InventoryWorkspace } from '@/features/staff-cafe/components/inventory-workspace';

function InventoryFallback() {
  return <div className="p-4 text-sm text-muted-foreground">Đang tải kho game...</div>;
}

export default function StaffInventoryPage() {
  return (
    <Suspense fallback={<InventoryFallback />}>
      <InventoryWorkspace />
    </Suspense>
  );
}
