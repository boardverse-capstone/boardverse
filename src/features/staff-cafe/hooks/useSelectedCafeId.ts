'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'staff-selected-cafe-id';

export function useSelectedCafeId(defaultCafeId?: string) {
  const [cafeId, setCafeIdState] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return defaultCafeId;
    return localStorage.getItem(STORAGE_KEY) ?? defaultCafeId;
  });

  useEffect(() => {
    if (defaultCafeId && !cafeId) {
      setCafeIdState(defaultCafeId);
    }
  }, [defaultCafeId, cafeId]);

  const setCafeId = useCallback((id: string) => {
    setCafeIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  return { cafeId, setCafeId };
}
