import { LifeBuoy } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function StaffHelpPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Hỗ trợ"
        description="Hướng dẫn thao tác và liên hệ hỗ trợ nội bộ."
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50">
            <LifeBuoy className="size-6 text-neutral-700" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-neutral-950">Chưa có thông tin</p>
            <p className="max-w-md text-sm font-medium text-neutral-700">
              Nội dung hỗ trợ sẽ được bổ sung sau. Nếu cần gấp, liên hệ quản lý quán.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
