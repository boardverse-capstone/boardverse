"use client";

import { useState } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useOperationalProfile } from "@/features/partner/hooks/useOperationalProfile";
import { CafeStatusHeader } from "./cafe-status-header";
import { CafeSummary } from "./cafe-summary";
import PartnerOperationalProfileForm from "@/features/partner/components/partner-operational-profile-form";
import { SetupChecklistSection } from "./sections/setup-checklist-section";
import { PricingConfigSection } from "./sections/pricing-config-section";
import { SePayConfigSection } from "./sections/sepay-config-section";
import {
  DepositRefundPolicySection,
} from "./sections/deposit-refund-policy-section";
import { StaffSection } from "./sections/staff-section";
import { TablesSection } from "./sections/tables-section";
import { TablesManageDialog } from "./sections/tables-manage-dialog";
import {
  InventoryGamesSection,
} from "./sections/inventory-games-section";
import {
  useSePayConfig,
  useDepositRefundPolicy,
} from "../hooks/useCafeMe";

/**
 * OperationalProfileShell — orchestrator cho
 * /manager/operational-profile. Layout 2-cột trên `lg+`:
 *
 *   ┌────────────────────────────────────────────┐
 *   │          CafeStatusHeader (full-width)      │
 *   ├──────────────────────────┬─────────────────┤
 *   │                          │                 │
 *   │   CafeSummary (8/12)     │  Form (4/12)    │
 *   │   ─ read-only cards      │  ─ editable     │
 *   │                          │                 │
 *   └──────────────────────────┴─────────────────┘
 *
 * Trên `md` collapse xuống 1 cột: Summary trên, Form dưới.
 * Trên mobile (`<md`): Summary full-width + Sticky "Chỉnh sửa" button
 * mở Sheet chứa Form (Sheet header fixed, body scroll).
 */
export function OperationalProfileShell() {
  const { cafe, operationalStatus: status, hydrated, hydrating, hydratedError, refetch } =
    useOperationalProfile();
  const sepayQuery = useSePayConfig(cafe?.id);
  const depositQuery = useDepositRefundPolicy(cafe?.id);

  const [formSheetOpen, setFormSheetOpen] = useState(false);
  // Mặc định collapse: manager sau khi submit thường chỉ scan, hiếm khi
  // edit. Click "Chỉnh sửa" → expand inline form để vào lại flow edit.
  const [formExpanded, setFormExpanded] = useState(false);
  // Dialogs cho tables / games — Phase 3.
  const [tablesManageOpen, setTablesManageOpen] = useState(false);

  if (!hydrated && (hydrating || !cafe)) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-2 text-helper px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 max-w-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Đang tải hồ sơ cơ sở…
        </div>
      </div>
    );
  }

  // cafe luôn tồn tại khi hydrated=true
  const c = cafe!;
  const op = c.operationalProfile;
  const summary = (
    <CafeSummary
      cafeName={c.cafeName}
      address={c.address ?? ""}
      phoneNumber={c.phoneNumber ?? ""}
      workingHours={c.workingHours}
      numberOfTables={c.numberOfTables ?? 0}
      numberOfPrivateRooms={op.numberOfPrivateRooms ?? 0}
      spaceImageUrls={op.spaceImageUrls ?? []}
      hasGameMaster={op.hasGameMaster}
      billingModel={op.billingModel}
      basePrice={op.basePrice}
      tieredBlockRate={op.tieredBlockRate}
      tieredBlockMinutes={op.tieredBlockMinutes}
      depositPercentage={op.depositPercentage}
      operationalStatus={status}
    />
  );

  const inlineFormPanel = (
    <PartnerOperationalProfileForm
      expanded={formExpanded}
      onExpandedChange={setFormExpanded}
    />
  );

  // Trong Sheet mobile, form luôn expanded vì chính Sheet là affordance
  // mở/đóng. Sau khi Sheet đóng, reset formExpanded về false cho lần
  // mở tiếp theo (khi user quay lại desktop).
  // `key` ép React mount lại form khi cafe id thay đổi, đảm bảo form
  // Sheet luôn hydrate từ data mới nhất (tránh race khi mở Sheet trước
  // khi React Query cache sẵn sàng).
  const sheetFormPanel = (
    <PartnerOperationalProfileForm
      key={`sheet-form-${cafe?.id ?? "loading"}-${c.operationalProfileUpdatedAt ?? "init"}`}
      expanded
      onExpandedChange={() => {
        /* Sheet không dùng collapse; close button ở SheetHeader. */
      }}
    />
  );

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl space-y-4">
      {/* Top: hydration error retry inline (errors that affect aggregate only). */}
      {hydratedError && (
        <div
          role="alert"
          className="flex flex-wrap items-start gap-3 text-xs text-destructive px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/5"
        >
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Loader2
              className="h-3.5 w-3.5 mt-0.5 shrink-0 hidden"
              aria-hidden
            />
            <span className="leading-snug">{hydratedError}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
            }}
            className="h-7 text-xs"
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* ─── Top row: H1 "Cơ sở của bạn" + form panel (same div, side-by-side) ───
       *  Manager scan nhanh: thấy tên quán + form chỉnh ngay tầng nhìn đầu.
       *  Trên mobile (<md) form panel ẩn — mở qua sticky "Chỉnh sửa" Sheet.
       */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight text-neutral-900">
            {c.cafeName || "Cơ sở của bạn"}
          </h1>
          <p className="text-helper">
            Theo dõi trạng thái, giờ mở cửa, thanh toán và thông tin cơ sở.
            Cập nhật số phòng riêng và cấu hình thanh toán tại đây.
          </p>
        </div>
        {/* Form panel ngay cùng hàng với H1, ở góc phải. Trên desktop dùng
         *  width tối đa ~420px; mobile ẩn đi, mở qua Sheet. */}
        <div className="hidden md:block w-full md:w-[420px] md:shrink-0">
          {inlineFormPanel}
        </div>
      </div>

      {/* ─── Status header (full width) ─── */}
      <CafeStatusHeader
        cafeName={c.cafeName}
        operationalStatus={status}
        canActivate={!!c.canActivate}
        activationBlockers={c.activationBlockers ?? []}
        canReopen={!!c.canReopen}
      />

      {/* ─── Summary cards (I/II/III) — full width, stacked. ─── */}
      <div className="md:hidden space-y-4 pb-20">{summary}</div>
      <div className="hidden md:block">{summary}</div>

      {/* ─── Phase 2 sections: Setup Hub management cards ─── */}
      <SetupChecklistSection
        cafe={c}
        sepayConfig={sepayQuery.data ?? null}
        sepayLoading={sepayQuery.isLoading}
        depositPolicy={depositQuery.data ?? null}
        depositPolicyLoading={depositQuery.isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PricingConfigSection
          cafeId={c.id}
          fallbackPrivateRooms={op.numberOfPrivateRooms ?? 0}
        />
        <SePayConfigSection cafeId={c.id} />
      </div>

      <DepositRefundPolicySection cafeId={c.id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TablesSection
          total={c.numberOfTables ?? 0}
          available={0}
          onAddClick={() => setTablesManageOpen(true)}
          onManageClick={() => setTablesManageOpen(true)}
        />
        <InventoryGamesSection cafeId={c.id} />
      </div>

      <StaffSection cafeId={c.id} />

      <TablesManageDialog
        open={tablesManageOpen}
        onOpenChange={setTablesManageOpen}
        cafeId={c.id}
      />

      {/* Sticky mobile edit button + Sheet content. */}
      <div className="md:hidden fixed bottom-4 inset-x-0 z-30 px-4 pointer-events-none">
        <Sheet open={formSheetOpen} onOpenChange={setFormSheetOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              className="h-12 w-full rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] pointer-events-auto text-sm font-semibold"
            >
              <Pencil className="h-4 w-4 mr-2" aria-hidden />
              Chỉnh sửa hồ sơ vận hành
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className={cn(
              "bg-white text-neutral-900 p-0 gap-0 rounded-t-2xl max-h-[92vh] overflow-y-auto",
              "border-t border-neutral-200",
            )}
          >
            <SheetHeader className="px-5 pt-5 pb-3 border-b border-neutral-100 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <SheetTitle className="text-base font-bold tracking-tight">
                    Chỉnh sửa hồ sơ vận hành
                  </SheetTitle>
                  <SheetDescription className="text-helper">
                    Số phòng riêng và cấu hình thanh toán.
                  </SheetDescription>
                </div>
                <SheetClose
                  className="rounded-md p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" aria-hidden />
                </SheetClose>
              </div>
            </SheetHeader>
            <div className="px-5 py-4">{sheetFormPanel}</div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default OperationalProfileShell;