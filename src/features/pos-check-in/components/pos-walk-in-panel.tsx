'use client';

import { useMemo, useState } from 'react';
import { DoorOpen, ScanBarcode } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useCreatePosSession } from '../hooks/usePosMutations';
import type { ActivatedSession, CafeTable } from '../types/pos-check-in.interface';

interface PosWalkInPanelProps {
  cafeId?: string;
  tables: CafeTable[];
  selectedTableId?: string;
  onStarted?: (session: ActivatedSession) => void;
}

export function PosWalkInPanel({
  cafeId,
  tables,
  selectedTableId,
  onStarted,
}: PosWalkInPanelProps) {
  const createSession = useCreatePosSession(cafeId);
  const [tableId, setTableId] = useState(selectedTableId ?? '');
  const [barcode, setBarcode] = useState('');

  const availableTables = useMemo(
    () => tables.filter((t) => t.status === 'Available'),
    [tables],
  );

  const effectiveTableId = tableId || selectedTableId || '';

  const handleStart = async () => {
    if (!effectiveTableId) {
      toast.error('Chọn bàn trống để nhận khách walk-in.');
      return;
    }
    if (!barcode.trim()) {
      toast.error('Quét barcode hộp game.');
      return;
    }

    try {
      const session = await createSession.mutateAsync({
        cafeTableId: effectiveTableId,
        barcode: barcode.trim(),
      });
      setBarcode('');
      onStarted?.(session);
      toast.success(
        `Walk-in OK · ${session.tableLabel} · ${session.game.name} đã bắt đầu.`,
      );
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể tạo phiên walk-in.');
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-3 md:p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <DoorOpen className="h-4 w-4" />
        Khách vãng lai
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="walkin-table">Bàn trống</Label>
        <select
          id="walkin-table"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={effectiveTableId}
          onChange={(e) => setTableId(e.target.value)}
        >
          <option value="">Chọn bàn</option>
          {availableTables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.label}
              {table.zone ? ` · ${table.zone}` : ''}
            </option>
          ))}
        </select>
        {availableTables.length === 0 ? (
          <p className="text-xs text-muted-foreground">Không còn bàn trống.</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="walkin-barcode" className="flex items-center gap-1.5">
          <ScanBarcode className="h-3.5 w-3.5" />
          Barcode hộp *
        </Label>
        <Input
          id="walkin-barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="VD: BV-CATAN-001"
          className="font-mono"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleStart();
          }}
        />
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={createSession.isPending || !effectiveTableId || !barcode.trim()}
        onClick={() => void handleStart()}
      >
        {createSession.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
        Bắt đầu phiên walk-in
      </Button>
    </div>
  );
}
