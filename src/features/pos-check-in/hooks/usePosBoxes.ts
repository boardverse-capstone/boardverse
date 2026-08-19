'use client';

import { useQuery } from '@tanstack/react-query';
import { POS_QUERY_KEYS, PosCheckInService } from '../services/pos-check-in.service';

export function usePosBoxes(cafeId?: string, gameTemplateId?: string) {
  return useQuery({
    queryKey: [POS_QUERY_KEYS.boxes, cafeId, gameTemplateId ?? 'all'],
    queryFn: () =>
      PosCheckInService.getPosBoxes({
        cafeId: cafeId!,
        gameTemplateId: gameTemplateId || undefined,
      }),
    enabled: Boolean(cafeId),
    staleTime: 10_000,
  });
}

export function usePosBoxByBarcode(cafeId?: string, barcode?: string, enabled = false) {
  return useQuery({
    queryKey: [POS_QUERY_KEYS.boxes, 'by-barcode', cafeId, barcode],
    queryFn: () => PosCheckInService.getPosBoxByBarcode(cafeId!, barcode!),
    enabled: enabled && Boolean(cafeId) && Boolean(barcode?.trim()),
    staleTime: 5_000,
    retry: 0,
  });
}
