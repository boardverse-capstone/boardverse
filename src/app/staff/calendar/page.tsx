import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function StaffCalendarPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Lịch làm việc"
        description="Xem ca làm và lịch phân công tại quán."
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50">
            <CalendarDays className="size-6 text-neutral-700" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-neutral-950">Chưa có thông tin</p>
            <p className="max-w-md text-sm font-medium text-neutral-700">
              Lịch làm việc sẽ hiển thị tại đây khi quán phân công ca cho bạn.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
