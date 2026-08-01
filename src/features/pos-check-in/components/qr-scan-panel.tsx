'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { QrCode, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { QR_BOOKING_PREFIX } from '@/core/constants/pos-check-in';
import { useResolveBookingQr } from '../hooks/usePosMutations';
import type { QrResolveResult } from '../types/pos-check-in.interface';

interface QrScanPanelProps {
  onResolved: (result: QrResolveResult) => void;
  presetCode?: string;
  presetLabel?: string;
  sampleCodes?: Array<{ bookingId: string; qrCode: string; tableLabel: string }>;
}

function normalizeQrValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(QR_BOOKING_PREFIX)) return trimmed;
  if (trimmed.startsWith('booking-')) return `${QR_BOOKING_PREFIX}${trimmed}`;
  return trimmed;
}

export function QrScanPanel({
  onResolved,
  presetCode,
  presetLabel,
  sampleCodes = [],
}: QrScanPanelProps) {
  const [manualCode, setManualCode] = useState('');
  const resolveQr = useResolveBookingQr();

  useEffect(() => {
    if (presetCode) {
      setManualCode(presetCode);
    }
  }, [presetCode]);

  const qrValue = useMemo(() => normalizeQrValue(manualCode), [manualCode]);

  const submitManual = () => {
    if (!qrValue) return;
    resolveQr.mutate(qrValue, { onSuccess: onResolved });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <QrCode className="h-5 w-5 shrink-0" />
          Mã QR check-in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:gap-3">
          <Input
            placeholder={`VD: ${QR_BOOKING_PREFIX}booking-001`}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            disabled={resolveQr.isPending}
            className="min-h-12 min-w-0 flex-1 text-base md:min-h-14"
          />
          <Button
            type="button"
            className="h-12 shrink-0 text-base md:h-14 md:min-w-[140px]"
            onClick={submitManual}
            disabled={resolveQr.isPending || !qrValue}
          >
            {resolveQr.isPending ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Xác nhận
              </>
            )}
          </Button>
        </div>

        {qrValue ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-white p-4 md:p-6">
            <p className="text-center text-sm text-muted-foreground md:text-base">
              {presetLabel
                ? `Khách quét mã QR tại ${presetLabel} để check-in`
                : 'Khách quét mã QR bên dưới để check-in'}
            </p>
            <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-border md:p-4">
              <QRCode value={qrValue} size={180} className="h-auto max-w-full md:hidden" />
              <QRCode value={qrValue} size={220} className="hidden h-auto max-w-full md:block" />
            </div>
            <p className="max-w-full break-all text-center font-mono text-xs text-muted-foreground md:text-sm">
              {qrValue}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground md:py-12 md:text-base">
            Nhập mã đặt chỗ hoặc chọn bàn đã đặt trên sơ đồ để tạo QR cho khách.
          </div>
        )}

        {resolveQr.isError && (
          <p className="text-xs text-rose-600">
            {(resolveQr.error as Error)?.message ?? 'Không thể xác thực mã.'}
          </p>
        )}

        {sampleCodes.length > 0 && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Mã demo (bấm để tạo QR):</p>
            <div className="flex flex-wrap gap-2">
              {sampleCodes.map((item) => (
                <button
                  key={item.bookingId}
                  type="button"
                  className="touch-manipulation rounded-md active:scale-[0.98]"
                  onClick={() => setManualCode(item.qrCode)}
                >
                  <Badge variant="outline" className="min-h-10 cursor-pointer px-3 py-2 text-sm hover:bg-background md:min-h-11">
                    {item.tableLabel}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
