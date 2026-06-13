'use client';

import { useCallback, useState } from 'react';
import { Camera, QrCode, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { QR_BOOKING_PREFIX } from '@/core/constants/pos-check-in';
import { useQrScanner } from '../hooks/useQrScanner';
import { useResolveBookingQr } from '../hooks/usePosMutations';
import type { QrResolveResult } from '../types/pos-check-in.interface';

interface QrScanPanelProps {
  onResolved: (result: QrResolveResult) => void;
  sampleCodes?: Array<{ bookingId: string; qrCode: string; tableLabel: string }>;
}

export function QrScanPanel({ onResolved, sampleCodes = [] }: QrScanPanelProps) {
  const [manualCode, setManualCode] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const resolveQr = useResolveBookingQr();

  const handleScan = useCallback(
    (value: string) => {
      setCameraOn(false);
      resolveQr.mutate(value, {
        onSuccess: onResolved,
      });
    },
    [onResolved, resolveQr],
  );

  const { videoRef, error: cameraError } = useQrScanner({
    enabled: cameraOn,
    onScan: handleScan,
  });

  const submitManual = () => {
    if (!manualCode.trim()) return;
    resolveQr.mutate(manualCode.trim(), { onSuccess: onResolved });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-5 w-5" />
          Quét mã / Nhập ID phòng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={`VD: ${QR_BOOKING_PREFIX}booking-001 hoặc booking-002`}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            disabled={resolveQr.isPending}
          />
          <Button
            type="button"
            onClick={submitManual}
            disabled={resolveQr.isPending || !manualCode.trim()}
          >
            {resolveQr.isPending ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <Button
          type="button"
          variant={cameraOn ? 'destructive' : 'outline'}
          className="w-full"
          onClick={() => setCameraOn((v) => !v)}
          disabled={resolveQr.isPending}
        >
          <Camera className="mr-2 h-4 w-4" />
          {cameraOn ? 'Tắt camera quét QR' : 'Bật camera quét QR'}
        </Button>

        {cameraOn && (
          <div className="overflow-hidden rounded-lg border bg-black">
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          </div>
        )}

        {cameraError && <p className="text-xs text-amber-700">{cameraError}</p>}
        {resolveQr.isError && (
          <p className="text-xs text-rose-600">
            {(resolveQr.error as Error)?.message ?? 'Không thể xác thực mã.'}
          </p>
        )}

        {sampleCodes.length > 0 && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Mã demo (bấm để điền):</p>
            <div className="flex flex-wrap gap-2">
              {sampleCodes.map((item) => (
                <button
                  key={item.bookingId}
                  type="button"
                  className="text-left"
                  onClick={() => setManualCode(item.qrCode)}
                >
                  <Badge variant="outline" className="cursor-pointer hover:bg-background">
                    {item.tableLabel}: {item.qrCode}
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
