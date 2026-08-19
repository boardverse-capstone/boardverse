'use client';

import { useSessionTimer } from '../hooks/useSessionTimer';

interface SessionTimerProps {
  startedAt?: string;
  /** Có giá trị → dừng đếm tại thời điểm này (sau chốt hóa đơn) */
  endedAt?: string;
  className?: string;
}

export function SessionTimer({ startedAt, endedAt, className }: SessionTimerProps) {
  const elapsed = useSessionTimer(startedAt, endedAt);
  if (!startedAt) return null;
  return <span className={className}>{elapsed}</span>;
}
