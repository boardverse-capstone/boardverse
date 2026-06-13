'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutGrid } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { POS_QUERY_KEYS } from '../services/pos-check-in.service';
import { PosCheckInMockService } from '../services/pos-check-in.mock';
import { useFloorPlan, useStaffCafe } from '../hooks/usePosCheckIn';
import { CafeFloorPlan } from './cafe-floor-plan';
import { PosCheckInReception } from './pos-check-in-reception';
import { QrScanPanel } from './qr-scan-panel';
import type { ActivatedSession, CafeTable, QrResolveResult } from '../types/pos-check-in.interface';

export function PosWorkspace() {
  const queryClient = useQueryClient();
  const { data: cafe, isLoading: cafeLoading } = useStaffCafe();
  const { data: floorPlan, isLoading: floorLoading } = useFloorPlan(cafe?.id);

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>();
  const [resolvedBooking, setResolvedBooking] = useState<QrResolveResult | null>(null);

  const sampleCodes = useMemo(() => PosCheckInMockService.getSampleQrCodes(), []);

  const handleQrResolved = useCallback((result: QrResolveResult) => {
    setResolvedBooking(result);
    setSelectedBookingId(result.booking.id);
    setSelectedTableId(result.table.id);
  }, []);

  const handleTableSelect = useCallback((table: CafeTable) => {
    setSelectedTableId(table.id);

    if (table.status === 'Reserved' && table.bookingId) {
      setSelectedBookingId(table.bookingId);
      setResolvedBooking(null);
      return;
    }

    if (table.status === 'Occupied') {
      setSelectedBookingId(table.bookingId ?? null);
    }
  }, []);

  const handleSessionActivated = useCallback(
    (_session: ActivatedSession) => {
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
      setSelectedBookingId(null);
      setResolvedBooking(null);
    },
    [queryClient],
  );

  const handleCloseReception = () => {
    setSelectedBookingId(null);
    setResolvedBooking(null);
    setSelectedTableId(undefined);
  };

  if (cafeLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const tables = floorPlan?.tables ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Web POS — Quầy check-in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cafe?.name} · Quét QR xác thực lịch đặt, điểm danh và điều khiển sơ đồ bàn
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="min-h-[480px]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="h-5 w-5" />
              Sơ đồ mặt bằng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {floorLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="h-6 w-6" />
              </div>
            ) : (
              <CafeFloorPlan
                tables={tables}
                selectedTableId={selectedTableId}
                onSelectTable={handleTableSelect}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <QrScanPanel onResolved={handleQrResolved} sampleCodes={sampleCodes} />

          {selectedBookingId ? (
            <PosCheckInReception
              bookingId={selectedBookingId}
              initialBooking={resolvedBooking?.booking}
              onClose={handleCloseReception}
              onSessionActivated={handleSessionActivated}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Quét mã QR đặt chỗ hoặc chọn bàn vàng (Đã đặt) trên sơ đồ để bắt đầu check-in.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
