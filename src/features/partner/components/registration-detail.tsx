'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_VARIANT,
} from '@/core/constants/partner-registration';
import { RegistrationAlerts } from './registration-alerts';
import { RegistrationActionsPanel } from './registration-actions-panel';
import { RegistrationStatusTimeline } from './registration-status-timeline';
import type { Registration, RegistrationAction } from '../types/partner.interface';
import { getAvailableActions } from '../utils/registration-workflow';

interface RegistrationDetailProps {
  registration?: Registration;
  isLoading?: boolean;
  isError?: boolean;
  onAction?: (action: RegistrationAction) => void;
  isActionPending?: boolean;
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3].map((item) => (
        <Card key={item}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="grid gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export function RegistrationDetail({
  registration,
  isLoading,
  isError,
  onAction,
  isActionPending,
}: RegistrationDetailProps) {
  if (isLoading) return <DetailSkeleton />;

  if (isError || !registration) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Không thể tải chi tiết đơn đăng ký.
        </CardContent>
      </Card>
    );
  }

  const hasActions = onAction && getAvailableActions(registration.status).length > 0;

  return (
    <div className="grid gap-4">
      <RegistrationAlerts registration={registration} />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>{registration.basicInfo.cafeName}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>#{registration.id}</span>
              <Badge variant={REGISTRATION_STATUS_VARIANT[registration.status]}>
                {REGISTRATION_STATUS_LABELS[registration.status]}
              </Badge>
              <span>
                Nộp ngày {new Date(registration.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>

          {hasActions && (
            <RegistrationActionsPanel
              registration={registration}
              onAction={onAction}
              isPending={isActionPending}
            />
          )}
        </CardHeader>
      </Card>

      <RegistrationStatusTimeline registration={registration} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Khối 1 — Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <InfoRow label="Tên quán" value={registration.basicInfo.cafeName} />
          <InfoRow label="Địa chỉ" value={registration.basicInfo.address} />
          <InfoRow label="Hotline" value={registration.basicInfo.hotline} />
          <InfoRow label="Email đại diện" value={registration.basicInfo.representativeEmail} />
          <InfoRow label="Giấy phép KD" value={registration.basicInfo.businessLicense} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Khối 2 — Năng lực hạ tầng</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <InfoRow label="Số bàn công cộng" value={registration.infrastructure.numberOfTables} />
          <InfoRow label="Phòng riêng" value={registration.infrastructure.numberOfPrivateRooms} />
          <InfoRow
            label="Sức chứa tối đa"
            value={`${registration.infrastructure.maximumCapacity} khách`}
          />
          <InfoRow
            label="Ảnh không gian"
            value={`${registration.infrastructure.spaceImages.length} ảnh`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Khối 3 — Danh mục Board Game</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <InfoRow
            label="Tổng số game sở hữu"
            value={registration.boardGameCatalog.numberOfGamesOwned}
          />
          <InfoRow
            label="Game phổ biến"
            value={registration.boardGameCatalog.listOfPopularGames}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Khối 4 — Dịch vụ & Mô hình vận hành</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <InfoRow
            label="Có Game Master"
            value={registration.additionalServices.hasGameMaster ? 'Có' : 'Không'}
          />
          <InfoRow
            label="Mô hình tính phí"
            value={
              registration.additionalServices.billingModel === 'BY_HOUR'
                ? 'Theo giờ chơi (BY_HOUR)'
                : 'Theo menu đồ uống (PER_DRINK)'
            }
          />
          {registration.commissionRate !== undefined && (
            <InfoRow label="Tỷ lệ chiết khấu" value={`${registration.commissionRate}%`} />
          )}
        </CardContent>
      </Card>

      {registration.managerAccount && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Tài khoản CAFE_MANAGER</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Email đăng nhập" value={registration.managerAccount.email} />
            <InfoRow label="Username" value={registration.managerAccount.username} />
            {registration.managerAccount.temporaryPassword && (
              <InfoRow
                label="Mật khẩu tạm"
                value={registration.managerAccount.temporaryPassword}
              />
            )}
          </CardContent>
        </Card>
      )}

      {registration.rejectionReason && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Lý do từ chối</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{registration.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      {registration.cancelReason && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Lý do hủy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{registration.cancelReason}</p>
          </CardContent>
        </Card>
      )}

      <Separator />
    </div>
  );
}
