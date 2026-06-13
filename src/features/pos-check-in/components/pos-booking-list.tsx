'use client';

import Link from 'next/link';
import { Clock, Gamepad2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ROUTES } from '@/core/constants/routes';
import { usePendingBookings, useStaffCafe } from '@/features/pos-check-in/hooks/usePosCheckIn';

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(iso));
}

export function PosBookingList() {
  const { data: cafe, isLoading: cafeLoading } = useStaffCafe();
  const { data: bookings = [], isLoading: bookingsLoading, isError, refetch } = usePendingBookings(
    cafe?.id,
  );

  if (cafeLoading || bookingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-rose-600">
        Không thể tải danh sách bàn.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Web POS — Check-in bàn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cafe?.name ?? 'Quán'} · Điểm danh thành viên, xử lý vắng mặt và kích hoạt phiên chơi
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Không có bàn nào chờ check-in.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bookings.map((booking) => (
            <Card key={booking.id} className="shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">{booking.tableLabel}</CardTitle>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(booking.scheduledAt)}
                  </p>
                </div>
                <Badge variant="secondary">Chờ check-in</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{booking.bookedGame.name}</span>
                  <span className="text-muted-foreground">
                    ({booking.bookedGame.minPlayers}–{booking.bookedGame.maxPlayers} người)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {booking.participants.length} thành viên đăng ký
                </div>
                <Button asChild className="w-full">
                  <Link href={ROUTES.STAFF.POS_CHECK_IN(booking.id)}>Mở check-in</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
