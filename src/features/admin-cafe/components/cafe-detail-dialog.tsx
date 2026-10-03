'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OperationalStatusBadge } from '@/features/partner/components/partner-status-badges';
import type { OperationalStatus } from '@/features/partner/types/partner.interface';
import { useAdminCafeDetail } from '../hooks/useAdminCafeDetail';
import {
  formatCafeCoordinate,
  formatCafeDate,
  formatCafeMoney,
  formatCafePercent,
  formatCafeYesNo,
} from '../utils/admin-cafe.mapper';

interface CafeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cafeId: string | null;
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm leading-snug text-foreground break-words">
        {value ?? 'Chưa có thông tin'}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border/70 bg-muted/15 p-3 ${className ?? ''}`}>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-600">
        {title}
      </h4>
      {children}
    </section>
  );
}

export function CafeDetailDialog({ open, onOpenChange, cafeId }: CafeDetailDialogProps) {
  const { data, isLoading, isError } = useAdminCafeDetail(cafeId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader className="pb-1">
          <DialogTitle>Chi tiết quán</DialogTitle>
          <DialogDescription className="sr-only">
            Chi tiết quán admin cafes
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải chi tiết quán...</p>
        ) : isError || !data ? (
          <p className="text-sm text-destructive">Không thể tải chi tiết quán.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-12">
            {/* Cột trái */}
            <div className="space-y-3 lg:col-span-5">
              <Panel title="Thông tin cơ bản">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <Field
                    label="Tên quán"
                    value={<span className="font-semibold">{data.name || 'Chưa có thông tin'}</span>}
                    className="col-span-2"
                  />
                  <Field
                    label="Mã quán"
                    value={<span className="font-mono text-[11px]">{data.id}</span>}
                    className="col-span-2"
                  />
                  <Field label="Địa chỉ" value={data.address || 'Chưa có thông tin'} className="col-span-2" />
                  <Field label="SĐT" value={data.phoneNumber || 'Chưa có thông tin'} />
                  <Field
                    label="Tọa độ"
                    value={`${formatCafeCoordinate(data.latitude)}, ${formatCafeCoordinate(data.longitude)}`}
                  />
                  <Field label="Mô tả" value={data.description ?? 'Chưa có thông tin'} className="col-span-2" />
                  <Field
                    label="Đang hoạt động"
                    value={
                      <Badge variant={data.isActive ? 'default' : 'secondary'}>
                        {formatCafeYesNo(data.isActive)}
                      </Badge>
                    }
                  />
                  <Field
                    label="Trạng thái vận hành"
                    value={
                      <OperationalStatusBadge
                        status={data.operationalStatus as OperationalStatus}
                      />
                    }
                  />
                  <Field label="Lý do status" value={data.operationalStatusReason ?? 'Chưa có thông tin'} />
                  <Field
                    label="Đổi status lúc"
                    value={formatCafeDate(data.operationalStatusChangedAt)}
                  />
                </div>
              </Panel>

              <Panel title="Quản lý quán">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <Field label="Tên" value={data.managerName || 'Chưa có thông tin'} />
                  <Field label="Email" value={data.managerEmail ?? 'Chưa có thông tin'} />
                  <Field
                    label="Manager ID"
                    value={<span className="font-mono text-[11px]">{data.managerId || 'Chưa có thông tin'}</span>}
                    className="col-span-2"
                  />
                </div>
              </Panel>
            </div>

            {/* Cột phải */}
            <div className="space-y-3 lg:col-span-7">
              <div className="grid gap-3 sm:grid-cols-2">
                <Panel title="Quy mô quán">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <Field label="Số bàn" value={data.numberOfTables ?? 'Chưa có thông tin'} />
                    <Field label="Số game" value={data.numberOfGamesOwned ?? 'Chưa có thông tin'} />
                    <Field label="Tổng ghế" value={data.totalSeats ?? 'Chưa có thông tin'} />
                    <Field label="Số nhân viên" value={data.staffCount ?? 'Chưa có thông tin'} />
                  </div>
                </Panel>

                <Panel title="Giá & thanh toán">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <Field label="Mô hình tính phí" value={data.billingModel ?? 'Chưa có thông tin'} />
                    <Field label="Giá cơ bản" value={formatCafeMoney(data.basePrice)} />
                    <Field label="Giá block" value={formatCafeMoney(data.tieredBlockRate)} />
                    <Field label="Phút / block" value={data.tieredBlockMinutes ?? 'Chưa có thông tin'} />
                    <Field label="% cọc" value={formatCafePercent(data.depositPercentage)} />
                    <Field label="SePay" value={formatCafeYesNo(data.hasSePayConfigured)} />
                    <Field
                      label="Chính sách hoàn cọc"
                      value={data.depositRefundPolicy || 'Chưa có thông tin'}
                      className="col-span-2"
                    />
                  </div>
                </Panel>
              </div>

              <Panel title="Thời gian">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <Field label="Tạo lúc" value={formatCafeDate(data.createdAt)} />
                  <Field label="Cập nhật" value={formatCafeDate(data.updatedAt)} />
                </div>
              </Panel>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
