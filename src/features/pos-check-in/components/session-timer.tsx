'use client';

import { useSessionTimer } from '../hooks/useSessionTimer';

interface SessionTimerProps {
  startedAt?: string;
  className?: string;
}

export function SessionTimer({ startedAt, className }: SessionTimerProps) {
  const elapsed = useSessionTimer(startedAt);
  if (!startedAt) return null;
  return <span className={className}>{elapsed}</span>;
}
