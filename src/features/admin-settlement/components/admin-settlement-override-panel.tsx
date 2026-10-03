'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useOverrideSettlement } from '../hooks/useOverrideSettlement';
import type { OverrideSettlementResult } from '../types/admin-settlement.interface';

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface AdminSettlementOverridePanelProps {
  settlementId?: string;
  onSettlementIdChange?: (settlementId: string) => void;
}

export function AdminSettlementOverridePanel({
  settlementId: controlledSettlementId,
  onSettlementIdChange,
}: AdminSettlementOverridePanelProps) {
  const [internalSettlementId, setInternalSettlementId] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<OverrideSettlementResult | null>(null);
  const mutation = useOverrideSettlement();
  const settlementId = controlledSettlementId ?? internalSettlementId;

  const setSettlementId = (value: string) => {
    if (controlledSettlementId === undefined) {
      setInternalSettlementId(value);
    }
    onSettlementIdChange?.(value);
  };

  const handleSubmit = () => {
    const id = settlementId.trim();
    const trimmedReason = reason.trim();

    if (!id) {
      setFormError('Vui lòng nhập settlementId.');
      return;
    }
    if (!GUID_RE.test(id)) {
      setFormError('settlementId phải là UUID hợp lệ.');
      return;
    }
    if (trimmedReason.length < 5) {
      setFormError('Lý do override phải có tối thiểu 5 ký tự.');
      return;
    }

    setFormError(null);
    mutation.mutate(
      { settlementId: id, payload: { reason: trimmedReason } },
      {
        onSuccess: (data) => setResult(data),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ghi đè giải ngân thất bại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="settlement-id">Mã giải ngân</Label>
            <Input
              id="settlement-id"
              value={settlementId}
              onChange={(e) => setSettlementId(e.target.value)}
              placeholder="UUID giải ngân"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="override-reason">Lý do ghi đè</Label>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ lý do ghi đè (tối thiểu 5 ký tự)..."
              rows={4}
            />
          </div>

          {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Spinner className="mr-2" />
                Đang ghi đè...
              </>
            ) : (
              'Ghi đè'
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Kết quả</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Mã:</span>{' '}
              <span className="font-mono text-xs">{result.id}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Trạng thái:</span> {result.status}
            </p>
            <p>
              <span className="text-muted-foreground">Trạng thái trước:</span>{' '}
              {result.previousStatus}
            </p>
            <p>
              <span className="text-muted-foreground">Số tiền:</span>{' '}
              {result.settlementAmount.toLocaleString('vi-VN')}
            </p>
            <p>
              <span className="text-muted-foreground">Quán:</span> {result.cafeName || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Đặt chỗ:</span>{' '}
              <span className="font-mono text-xs">{result.bookingId}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Người ghi đè:</span>{' '}
              <span className="font-mono text-xs">{result.overrideBy}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Thời điểm ghi đè:</span>{' '}
              {new Date(result.overrideAt).toLocaleString('vi-VN')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
