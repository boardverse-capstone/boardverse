'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { QR_BOOKING_PREFIX } from '@/core/constants/pos-check-in';
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
  const [selectedTableLabel, setSelectedTableLabel] = useState<string | undefined>();
  const [resolvedBooking, setResolvedBooking] = useState<QrResolveResult | null>(null);

  const sampleCodes = useMemo(() => PosCheckInMockService.getSampleQrCodes(), []);

  const presetQr = useMemo(() => {
    if (resolvedBooking?.booking.qrCode) return resolvedBooking.booking.qrCode;
    if (!selectedBookingId) return undefined;
    const sample = sampleCodes.find((item) => item.bookingId === selectedBookingId);
    return sample?.qrCode ?? `${QR_BOOKING_PREFIX}${selectedBookingId}`;
  }, [resolvedBooking, sampleCodes, selectedBookingId]);

  const handleQrResolved = useCallback((result: QrResolveResult) => {
    setResolvedBooking(result);
    setSelectedBookingId(result.booking.id);
    setSelectedTableId(result.table.id);
    setSelectedTableLabel(result.table.label);
  }, []);

  const handleTableSelect = useCallback(
    (table: CafeTable) => {
      setSelectedTableId(table.id);
      setSelectedTableLabel(table.label);

      if (table.status === 'Reserved' && table.bookingId) {
        setSelectedBookingId(table.bookingId);
        setResolvedBooking(null);
        return;
      }

      if (table.status === 'Occupied') {
        setSelectedBookingId(table.bookingId ?? null);
      }
    },
    [],
  );

  const handleSessionCompleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
    setSelectedBookingId(null);
    setResolvedBooking(null);
    setSelectedTableId(undefined);
    setSelectedTableLabel(undefined);
  }, [queryClient]);

  const handleSessionActivated = useCallback(
    (_session: ActivatedSession) => {
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.bookings] });
      // Giữ bàn đang chọn để staff tiếp tục vận hành phiên
    },
    [queryClient],
  );

  const handleCloseReception = () => {
    setSelectedBookingId(null);
    setResolvedBooking(null);
    setSelectedTableId(undefined);
    setSelectedTableLabel(undefined);
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
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Web POS"
        description={`${cafe?.name ?? 'Quán'} · Tạo mã QR cho khách quét, điểm danh và điều khiển sơ đồ bàn`}
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] md:items-start xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="min-h-[320px] md:min-h-[420px]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <LayoutGrid className="h-5 w-5 shrink-0" />
              Sơ đồ mặt bằng
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 md:pb-6">
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

        <div className="space-y-4 md:sticky md:top-4 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:overscroll-contain md:pr-1">
          <QrScanPanel
            onResolved={handleQrResolved}
            presetCode={presetQr}
            presetLabel={selectedTableLabel ?? resolvedBooking?.table.label}
            sampleCodes={sampleCodes}
          />

          {selectedBookingId ? (
            <PosCheckInReception
              bookingId={selectedBookingId}
              initialBooking={resolvedBooking?.booking}
              onClose={handleCloseReception}
              onSessionActivated={handleSessionActivated}
              onSessionCompleted={handleSessionCompleted}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground md:py-12 md:text-base">
                Tạo mã QR cho khách, chọn bàn vàng (Đã đặt) để check-in, hoặc bàn đỏ (Đang chơi) để vận hành phiên / thanh toán.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
