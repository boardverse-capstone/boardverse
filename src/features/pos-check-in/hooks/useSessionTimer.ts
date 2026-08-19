'use client';

import { useEffect, useState } from 'react';

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** endedAt có → đóng băng thời gian (sau chốt hóa đơn / End) */
export function useSessionTimer(startedAt?: string, endedAt?: string) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    if (!startedAt) {
      setElapsed('00:00');
      return;
    }

    const startMs = new Date(startedAt).getTime();
    if (Number.isNaN(startMs)) {
      setElapsed('00:00');
      return;
    }

    const endMsRaw = endedAt ? new Date(endedAt).getTime() : NaN;
    const frozenMs = Number.isFinite(endMsRaw) ? endMsRaw : null;

    const tick = () => {
      const nowMs = frozenMs ?? Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsed(formatElapsed(diffSec));
    };

    tick();
    if (frozenMs != null) return;

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt, endedAt]);

  return elapsed;
}
