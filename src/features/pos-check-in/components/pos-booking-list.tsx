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
  if (!iso) return '—';
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
  if (!statusText) return 'Chờ check-in';
  if (statusText === 'PendingDeposit') return 'Chờ đặt cọc';
  return statusText;
}

interface PosBookingListProps {
  /** Ẩn tiêu đề trang (khi nhúng trong Web POS) */
  embedded?: boolean;
  /** Chọn booking tại chỗ thay vì điều hướng */
  onSelectBooking?: (booking: TableBooking) => void;
}

export function PosBookingList({ embedded = false, onSelectBooking }: PosBookingListProps) {
  const { data: cafe, isLoading: cafeLoading } = useStaffCafe();
  const { data: bookings = [], isLoading: bookingsLoading, isError, refetch } = usePendingBookings(
    cafe?.id,
  );

  if (cafeLoading || bookingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-rose-600">
        Không thể tải danh sách booking.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Đặt chỗ quán</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cafe?.name ?? 'Quán'} · Danh sách booking từ API quán
          </p>
        </div>
      )}

      {bookings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground md:py-12">
            Không có booking nào đang chờ check-in.
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
                    {booking.scheduledEndAt ? ` – ${formatTime(booking.scheduledEndAt)}` : ''}
                  </p>
                </div>
                <Badge variant="secondary">{statusBadgeLabel(booking.statusText)}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{booking.bookedGame.name}</span>
                  <span className="text-muted-foreground">
                    ({booking.playerQuantity ?? booking.participants.length} người)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {booking.participants.length} thành viên / slot
                  {typeof booking.depositAmount === 'number' ? (
                    <span className="ml-auto text-foreground">
                      Cọc {formatCurrency(booking.depositAmount)}
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
                    Chọn
                  </Button>
                ) : (
                  <Button asChild className="w-full">
                    <Link href={ROUTES.STAFF.POS_CHECK_IN(booking.id)}>Mở check-in</Link>
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
