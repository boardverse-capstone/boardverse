'use client';

import { Clock, Gamepad2, Play, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useActiveSessions } from '../hooks/usePosCheckIn';
import { SessionTimer } from './session-timer';
import type { CafeSessionDetail } from '../types/pos-check-in.interface';

interface PosActiveSessionsPanelProps {
  cafeId?: string;
  gameTemplateId?: string;
  onSelectSession?: (session: CafeSessionDetail) => void;
}

export function PosActiveSessionsPanel({
  cafeId,
  gameTemplateId,
  onSelectSession,
}: PosActiveSessionsPanelProps) {
  const { data: sessions = [], isLoading, isError, refetch } = useActiveSessions(
    cafeId,
    gameTemplateId,
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-rose-600">
        Không thể tải phiên đang chơi.{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Không có phiên chơi đang active.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sessions.map((session) => (
        <Card key={session.sessionId || session.bookingId} className="overflow-hidden">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{session.tableLabel || 'Bàn'}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                  <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
                  {session.game?.name || 'Game'}
                </p>
              </div>
              <Badge variant="secondary">{session.status || 'Active'}</Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {session.presentCount || session.guestCount || 0} người
              </span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Clock className="h-3.5 w-3.5" />
                <SessionTimer startedAt={session.startedAt} />
              </span>
            </div>

            {onSelectSession ? (
              <Button
                type="button"
                variant="outline"
                className="w-full font-medium border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                onClick={() => onSelectSession(session)}
              >
                <Play className="mr-2 h-4 w-4 text-emerald-600" />
                Quản lý phiên
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
