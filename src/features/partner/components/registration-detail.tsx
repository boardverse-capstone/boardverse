/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APPLICATION_STATUS_LABELS,
  OPERATIONAL_STATUS_LABELS,
} from "@/core/constants/partner-registration";
import { RegistrationImageGallery } from "./registration-image-gallery";
import { PartnerStatusBadges } from "./partner-status-badges";
import { ApplicationActionsPanel } from "./application-actions-panel";
import type { PartnerApplication } from "../types/partner.interface";
import { formatApiDate, formatWorkingHours } from "../utils/partner.mapper";

interface RegistrationDetailProps {
  application?: PartnerApplication;
  isLoading?: boolean;
  isError?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onActivate?: () => void;
  isActionPending?: boolean;
}

const SECTION_STYLES = {
  basic: "border-l-4 border-l-amber-400 bg-amber-50/40",
  infra: "border-l-4 border-l-sky-400 bg-sky-50/40",
  catalog: "border-l-4 border-l-violet-400 bg-violet-50/40",
  services: "border-l-4 border-l-emerald-400 bg-emerald-50/40",
  audit: "border-l-4 border-l-indigo-400 bg-indigo-50/40",
  rejected: "border-l-4 border-l-rose-400 bg-rose-50/40",
} as const;

function DetailSkeleton() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3, 4].map((item) => (
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
    <div className="grid gap-1 sm:grid-cols-[200px_1fr]">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-all">{value}</span>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "warning" | "muted";
}) {
  const toneClass = {
    default: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-orange-200 bg-orange-50 text-orange-900",
    muted: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function RegistrationDetail({
  application,
  isLoading,
  isError,
  onApprove,
  onReject,
  onActivate,
  isActionPending,
}: RegistrationDetailProps) {
  if (isLoading) return <DetailSkeleton />;

  if (isError || !application) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Không thể tải chi tiết đơn đăng ký.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      {application.requiresCsSupport && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4 text-sm text-orange-800">
            Đơn này cần hỗ trợ CS — vui lòng kiểm tra và xử lý.
          </CardContent>
        </Card>
      )}

      {application.activationBlockers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-medium text-amber-900">
              Chưa thể kích hoạt quán
            </p>
            <ul className="list-disc space-y-1 ps-5 text-sm text-amber-800">
              {application.activationBlockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-0 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-background shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <CardTitle className="text-2xl">{application.cafeName}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-md bg-background/80 px-2 py-0.5 font-mono text-xs">
                {application.id}
              </span>
              <PartnerStatusBadges
                applicationStatus={application.applicationStatus}
                operationalStatus={application.operationalStatus}
              />
              <span>Nộp: {formatApiDate(application.submittedAt)}</span>
            </div>
          </div>

          <ApplicationActionsPanel
            application={application}
            onApprove={onApprove}
            onReject={onReject}
            onActivate={onActivate}
            isPending={isActionPending}
          />
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryChip label="Số bàn" value={application.numberOfTables} />
        <SummaryChip label="Số game" value={application.numberOfGamesOwned} />
        <SummaryChip
          label="Sơ đồ bàn"
          value={
            application.isTableLayoutConfigured
              ? "Đã cấu hình"
              : "Chưa cấu hình"
          }
          tone={application.isTableLayoutConfigured ? "success" : "warning"}
        />
        <SummaryChip
          label="Kích hoạt"
          value={application.canActivate ? "Sẵn sàng" : "Chưa sẵn sàng"}
          tone={application.canActivate ? "success" : "muted"}
        />
      </div>

      <Card className={SECTION_STYLES.basic}>
        <CardHeader>
          <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3">
            <InfoRow label="Tên quán" value={application.cafeName} />
            <InfoRow label="Địa chỉ" value={application.address} />
            <InfoRow label="Số điện thoại" value={application.hotline} />
            <InfoRow
              label="Email đại diện"
              value={application.representativeEmail}
            />
            <InfoRow
              label="Giấy phép KD"
              value={application.businessLicense || "—"}
            />
          </div>
          {application.businessLicenseImageUrl ? (
            <RegistrationImageGallery
              title="Giấy phép kinh doanh"
              images={[application.businessLicenseImageUrl]}
              seed={`${application.id}-license`}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có file giấy phép đính kèm.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className={SECTION_STYLES.infra}>
        <CardHeader>
          <CardTitle className="text-base">Năng lực hạ tầng</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow
              label="Số bàn công cộng"
              value={application.numberOfTables}
            />
            <InfoRow
              label="Phòng riêng"
              value={application.numberOfPrivateRooms}
            />
            <InfoRow
              label="Sơ đồ bàn"
              value={
                application.isTableLayoutConfigured
                  ? "Đã cấu hình"
                  : "Chưa cấu hình"
              }
            />
            <InfoRow label="Số tên bàn" value={application.tableNames.length} />
          </div>
          {application.tableNames.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Danh sách bàn</p>
              <div className="flex flex-wrap gap-2">
                {application.tableNames.map((name) => (
                  <Badge key={name} variant="outline">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {application.spaceImageUrls.length > 0 ? (
            <RegistrationImageGallery
              title="Ảnh không gian quán"
              images={application.spaceImageUrls}
              seed={`${application.id}-space`}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có ảnh không gian đính kèm.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className={SECTION_STYLES.catalog}>
        <CardHeader>
          <CardTitle className="text-base">Danh mục Board Game</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <InfoRow
            label="Tổng số game sở hữu"
            value={application.numberOfGamesOwned}
          />
          <InfoRow
            label="Game phổ biến"
            value={application.popularGamesList || "—"}
          />
        </CardContent>
      </Card>

      <Card className={SECTION_STYLES.services}>
        <CardHeader>
          <CardTitle className="text-base">
            Dịch vụ & Mô hình vận hành
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <InfoRow
            label="Có Game Master"
            value={application.hasGameMaster ? "Có" : "Không"}
          />
          <InfoRow
            label="Mô hình tính phí"
            value={
              application.billingModel === "BY_HOUR"
                ? "Theo giờ chơi (BY_HOUR)"
                : "Theo menu đồ uống (PER_DRINK)"
            }
          />
        </CardContent>
      </Card>

      <Card className={SECTION_STYLES.audit}>
        <CardHeader>
          <CardTitle className="text-base">Thông tin xử lý</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <InfoRow
            label="Trạng thái duyệt"
            value={APPLICATION_STATUS_LABELS[application.applicationStatus]}
          />
          <InfoRow
            label="Trạng thái vận hành"
            value={
              application.operationalStatus
                ? OPERATIONAL_STATUS_LABELS[application.operationalStatus]
                : "—"
            }
          />
          <InfoRow
            label="Người nộp đơn"
            value={application.submittedByUsername ?? "—"}
          />
          <InfoRow
            label="Admin duyệt"
            value={application.reviewedByAdminUsername ?? "—"}
          />
          <InfoRow
            label="Thời gian nộp"
            value={formatApiDate(application.submittedAt)}
          />
          <InfoRow
            label="Thời gian xem xét"
            value={formatApiDate(application.reviewedAt)}
          />
          <InfoRow
            label="Thời gian duyệt"
            value={formatApiDate(application.approvedAt)}
          />
          <InfoRow
            label="Cập nhật hồ sơ vận hành"
            value={formatApiDate(application.operationalProfileUpdatedAt)}
          />
          <InfoRow
            label="Cập nhật gần nhất"
            value={formatApiDate(application.updatedAt)}
          />
          <InfoRow
            label="Mã quán đã tạo"
            value={application.createdCafeId ?? "—"}
          />
          <InfoRow
            label="Mã manager đã tạo"
            value={application.createdManagerUserId ?? "—"}
          />
          {application.submittedByUserId && (
            <InfoRow
              label="Mã người nộp"
              value={application.submittedByUserId}
            />
          )}
          {application.reviewedByAdminId && (
            <InfoRow
              label="Mã admin duyệt"
              value={application.reviewedByAdminId}
            />
          )}
        </CardContent>
      </Card>

      {application.rejectionReason && (
        <Card className={SECTION_STYLES.rejected}>
          <CardHeader>
            <CardTitle className="text-base text-rose-700">
              Lý do từ chối
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{application.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      <Separator />
    </div>
  );
}
