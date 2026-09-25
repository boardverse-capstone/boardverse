'use client';

import Link from 'next/link';
import { Clock, Gamepad2, QrCode, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ROUTES } from '@/core/constants/routes';
import { usePendingBookings, useStaffCafe } from '@/features/pos-check-in/hooks/usePosCheckIn';
import type { TableBooking } from '../types/pos-check-in.interface';

function formatTime(iso: string) {
  if (!iso) return 'â€”';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(iso));
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function statusBadgeLabel(statusText?: string) {
  if (!statusText) return 'Chá» check-in';
  if (statusText === 'PendingDeposit') return 'Chá» Ä‘áº·t cá»c';
  return statusText;
}

interface PosBookingListProps {
  /** áº¨n tiÃªu Ä‘á» trang (khi nhÃºng trong Web POS) */
  embedded?: boolean;
  /** Chá»n booking táº¡i chá»— thay vÃ¬ Ä‘iá»u hÆ°á»›ng */
  onSelectBooking?: (booking: TableBooking) => void;
}

function queryErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function PosBookingList({ embedded = false, onSelectBooking }: PosBookingListProps) {
  const {
    data: cafe,
    isLoading: cafeLoading,
    isError: cafeError,
    error: cafeLoadError,
    refetch: refetchCafe,
  } = useStaffCafe();
  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    isError: bookingsError,
    error: bookingsLoadError,
    refetch: refetchBookings,
  } = usePendingBookings(cafe?.id);

  if (cafeLoading || bookingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (cafeError) {
    return (
      <div className="text-sm text-orange-600">
        {queryErrorMessage(cafeLoadError, 'KhÃ´ng thá»ƒ táº£i thÃ´ng tin quÃ¡n.')}{' '}
        <button type="button" className="underline" onClick={() => refetchCafe()}>
          Thá»­ láº¡i
        </button>
      </div>
    );
  }

  if (bookingsError) {
    return (
      <div className="text-sm text-orange-600">
        {queryErrorMessage(bookingsLoadError, 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch booking.')}{' '}
        <button type="button" className="underline" onClick={() => refetchBookings()}>
          Thá»­ láº¡i
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Äáº·t chá»— quÃ¡n</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cafe?.name ?? 'QuÃ¡n'} Â· Danh sÃ¡ch Ä‘áº·t chá»—
          </p>
        </div>
      )}

      {bookings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground md:py-12">
            KhÃ´ng cÃ³ booking nÃ o Ä‘ang chá» check-in.
          </CardContent>
        </Card>
      ) : (
        <div className={embedded ? 'grid gap-3' : 'grid gap-4 md:grid-cols-2'}>
          {bookings.map((booking) => (
            <Card key={booking.id} className="shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base md:text-lg">{booking.tableLabel}</CardTitle>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(booking.scheduledAt)}
                    {booking.scheduledEndAt ? ` â€“ ${formatTime(booking.scheduledEndAt)}` : ''}
                  </p>
                </div>
                <Badge variant="secondary">{statusBadgeLabel(booking.statusText)}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{booking.bookedGame.name}</span>
                  <span className="text-muted-foreground">
                    ({booking.playerQuantity ?? booking.participants.length} ngÆ°á»i)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {booking.participants.length} thÃ nh viÃªn / slot
                  {typeof booking.depositAmount === 'number' ? (
                    <span className="ml-auto text-foreground">
                      Cá»c {formatCurrency(booking.depositAmount)}
                    </span>
                  ) : null}
                </div>
                {booking.qrCode ? (
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-xs">
                    <QrCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {booking.qrCode}
                  </div>
                ) : null}
                {onSelectBooking ? (
                  <Button type="button" className="w-full" onClick={() => onSelectBooking(booking)}>
                    Chá»n
                  </Button>
                ) : (
                  <Button asChild className="w-full">
                    <Link href={ROUTES.STAFF.POS_CHECK_IN(booking.id)}>Má»Ÿ check-in</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
