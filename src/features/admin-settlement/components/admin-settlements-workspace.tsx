'use client';

import { useState } from 'react';
import { AdminSettlementListPanel } from './admin-settlement-list-panel';
import { AdminSettlementOverridePanel } from './admin-settlement-override-panel';

export function AdminSettlementsWorkspace() {
  const [settlementId, setSettlementId] = useState('');

  return (
    <div className="space-y-6">
      <AdminSettlementListPanel onSelectSettlementId={setSettlementId} />
      <AdminSettlementOverridePanel
        settlementId={settlementId}
        onSettlementIdChange={setSettlementId}
      />
    </div>
  );
}
