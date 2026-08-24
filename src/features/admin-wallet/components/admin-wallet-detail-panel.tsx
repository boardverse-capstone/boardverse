'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Scale, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  WALLET_ACCOUNT_STATUS_FILTERS,
  WALLET_ACCOUNT_STATUS_LABELS,
  WALLET_RISK_LEVEL_LABELS,
} from '@/core/constants/admin-wallet';
import { useAdminWalletAdjustBalance } from '../hooks/useAdminWalletAdjustBalance';
import { useAdminWalletReconcile } from '../hooks/useAdminWalletReconcile';
import { useAdminWalletSetStatus } from '../hooks/useAdminWalletSetStatus';
import type { AdminWalletDetail, WalletAccountStatus } from '../types/wallet.interface';
import { formatWalletBalance, formatWalletDate } from '../utils/wallet.mapper';

interface AdminWalletDetailPanelProps {
  wallet?: AdminWalletDetail;
  userId?: string;
  isLoading?: boolean;
  isError?: boolean;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-all">{value}</span>
    </div>
  );
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'Active':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'Warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'Restricted':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'Suspended':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'Banned':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

function riskBadgeClass(level: string) {
  switch (level) {
    case 'Low':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'Medium':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'High':
      return 'border-orange-200 bg-orange-50 text-orange-800';
    case 'Critical':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

export function AdminWalletDetailPanel({
  wallet,
  userId: userIdProp,
  isLoading,
  isError,
}: AdminWalletDetailPanelProps) {
  const adjustBalanceMutation = useAdminWalletAdjustBalance();
  const reconcileMutation = useAdminWalletReconcile();
  const setStatusMutation = useAdminWalletSetStatus();
  const targetUserId = wallet?.userId || userIdProp || '';
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [amountBvc, setAmountBvc] = useState('');
  const [isCredit, setIsCredit] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingNewStatus, setPendingNewStatus] = useState<WalletAccountStatus>('Active');
  const [reason, setReason] = useState('');
  const [expiresAtDraft, setExpiresAtDraft] = useState(''); // datetime-local string

  useEffect(() => {
    if (!adjustDialogOpen) return;
    setAmountBvc('');
    setIsCredit(true);
    setReason('');
  }, [adjustDialogOpen]);

  useEffect(() => {
    if (!statusDialogOpen || !wallet) return;
    setPendingNewStatus(wallet.accountStatus);
    setReason('');
    setExpiresAtDraft('');
  }, [statusDialogOpen, wallet]);

  useEffect(() => {
    if (pendingNewStatus === 'Banned') {
      setExpiresAtDraft('');
    }
  }, [pendingNewStatus]);

  const trimmedReason = reason.trim();
  const reasonError =
    trimmedReason.length === 0
      ? 'Lý do là bắt buộc (tối thiểu 5 ký tự).'
      : trimmedReason.length < 5
        ? 'Lý do phải có ít nhất 5 ký tự.'
        : trimmedReason.length > 512
          ? 'Lý do không được quá 512 ký tự.'
          : null;
  const parsedAmount = Number(amountBvc);
  const amountError =
    amountBvc.trim().length === 0
      ? 'Số BVC là bắt buộc.'
      : !Number.isInteger(parsedAmount)
        ? 'Số BVC phải là số nguyên.'
        : parsedAmount < 1
          ? 'Số BVC tối thiểu là 1.'
          : parsedAmount > 10000000
            ? 'Số BVC tối đa là 10,000,000.'
            : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !wallet) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-rose-600">
          Không thể tải chi tiết ví.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl">{wallet.userEmail || 'Chi tiết ví'}</CardTitle>
              <CardDescription className="font-mono text-xs">{wallet.userId}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap justify-end gap-2">
                <Badge variant="outline" className={statusBadgeClass(wallet.accountStatus)}>
                  {WALLET_ACCOUNT_STATUS_LABELS[wallet.accountStatus] || wallet.accountStatus}
                </Badge>
                <Badge variant="outline" className={riskBadgeClass(wallet.riskLevel)}>
                  {WALLET_RISK_LEVEL_LABELS[wallet.riskLevel] || wallet.riskLevel}
                </Badge>
                {wallet.isCoolingOff && <Badge variant="secondary">Đang tạm khóa</Badge>}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAdjustDialogOpen(true)}
                  disabled={adjustBalanceMutation.isPending}
                >
                  {adjustBalanceMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang điều chỉnh…
                    </>
                  ) : (
                    'Điều chỉnh số dư'
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setStatusDialogOpen(true)}
                  disabled={setStatusMutation.isPending}
                >
                  {setStatusMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang cập nhật…
                    </>
                  ) : (
                    'Đổi trạng thái'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow
            label="Số điện thoại"
            value={wallet.userPhoneNumber?.trim() || 'Chưa có'}
          />
          <InfoRow label="Số dư khả dụng" value={formatWalletBalance(wallet.availableBalance)} />
          <InfoRow label="Đang giữ" value={formatWalletBalance(wallet.heldBalance)} />
          <InfoRow
            label="Deposit active"
            value={formatWalletBalance(wallet.totalActiveDeposit)}
          />
          <InfoRow label="Risk score" value={wallet.riskScore.toLocaleString('vi-VN')} />
          <InfoRow label="Risk multiplier" value={`×${wallet.riskMultiplier}`} />
          <InfoRow
            label="Cooling off hết hạn"
            value={formatWalletDate(wallet.coolingOffExpiresAt)}
          />
          <InfoRow label="Tạo lúc" value={formatWalletDate(wallet.createdAt)} />
          <InfoRow label="Cập nhật" value={formatWalletDate(wallet.updatedAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-5 w-5" />
            Đối soát sổ cái
          </CardTitle>
          <CardDescription>
            So sánh số dư ví với tổng sổ cái giao dịch để phát hiện lệch số.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            onClick={() => {
              if (!targetUserId) return;
              reconcileMutation.mutate(targetUserId);
            }}
            disabled={!targetUserId || reconcileMutation.isPending}
          >
            {reconcileMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Scale className="mr-2 h-4 w-4" />
            )}
            Chạy đối soát sổ cái
          </Button>
          {reconcileMutation.data ? (
            <div
              className={`rounded-lg border p-4 ${
                reconcileMutation.data.isReconciled
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-rose-200 bg-rose-50'
              }`}
            >
              <div className="mb-3 flex items-center gap-2 font-medium">
                {reconcileMutation.data.isReconciled ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-700" />
                )}
                {reconcileMutation.data.isReconciled
                  ? 'Sổ cái đã cân bằng'
                  : 'Phát hiện chênh lệch sổ cái'}
              </div>
              <div className="space-y-2">
                <InfoRow
                  label="Số dư ví"
                  value={formatWalletBalance(reconcileMutation.data.walletBalance)}
                />
                <InfoRow
                  label="Tổng sổ cái"
                  value={formatWalletBalance(reconcileMutation.data.ledgerSum)}
                />
                <InfoRow
                  label="Chênh lệch"
                  value={formatWalletBalance(reconcileMutation.data.difference)}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa chạy đối soát. Bấm nút phía trên để kiểm tra.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Điều chỉnh số dư BVC</DialogTitle>
            <DialogDescription>
              Cộng hoặc trừ BVC thủ công cho ví người dùng.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Hành động</span>
              <Select
                value={isCredit ? 'credit' : 'debit'}
                onValueChange={(value) => setIsCredit(value === 'credit')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn hướng điều chỉnh..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Cộng BVC</SelectItem>
                  <SelectItem value="debit">Trừ BVC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="wallet-amount-bvc">
                Số BVC
              </label>
              <Input
                id="wallet-amount-bvc"
                type="number"
                min={1}
                max={10000000}
                step={1}
                value={amountBvc}
                onChange={(e) => setAmountBvc(e.target.value)}
                placeholder="1 - 10000000"
              />
              {amountError ? <p className="text-xs text-rose-600">{amountError}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="wallet-adjust-reason">
                Lý do
              </label>
              <Textarea
                id="wallet-adjust-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do (tối thiểu 5 ký tự)..."
                rows={4}
              />
              {reasonError ? <p className="text-xs text-rose-600">{reasonError}</p> : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!wallet || reasonError || amountError) return;

                const idempotencyKey =
                  typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : `bv-${Date.now()}-${Math.random().toString(16).slice(2)}`;

                adjustBalanceMutation.mutate(
                  {
                    targetUserId: wallet.userId,
                    amountBvc: parsedAmount,
                    isCredit,
                    reason: trimmedReason,
                    idempotencyKey,
                  },
                  {
                    onSuccess: () => setAdjustDialogOpen(false),
                  },
                );
              }}
              disabled={adjustBalanceMutation.isPending || Boolean(reasonError) || Boolean(amountError)}
            >
              {adjustBalanceMutation.isPending ? 'Đang xử lý...' : 'Xác nhận điều chỉnh'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi trạng thái tài khoản</DialogTitle>
            <DialogDescription>
              Đổi trạng thái tài khoản ví (ví dụ hạn chế, tạm khóa, cấm).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Trạng thái mới</span>
              <Select
                value={pendingNewStatus}
                onValueChange={(v) => setPendingNewStatus(v as WalletAccountStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái…" />
                </SelectTrigger>
                <SelectContent>
                  {WALLET_ACCOUNT_STATUS_FILTERS.map((item) =>
                    item.value === 'all' ? null : (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="wallet-reason">
                Lý do
              </label>
              <Textarea
                id="wallet-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do (min 5 ký tự)…"
                rows={4}
              />
              {reasonError ? <p className="text-xs text-rose-600">{reasonError}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="wallet-expiresAt">
                expiresAt (tuỳ chọn)
              </label>
              <Input
                id="wallet-expiresAt"
                type="datetime-local"
                value={expiresAtDraft}
                onChange={(e) => setExpiresAtDraft(e.target.value)}
                disabled={pendingNewStatus === 'Banned'}
              />
              {pendingNewStatus === 'Banned' ? (
                <p className="text-xs text-muted-foreground">Banned không cần expiresAt.</p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!wallet) return;
                const trimmedReason = reason.trim();
                if (reasonError) return;
                const expiresAt = expiresAtDraft ? new Date(expiresAtDraft).toISOString() : null;
                const idempotencyKey =
                  typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : `bv-${Date.now()}-${Math.random().toString(16).slice(2)}`;

                setStatusMutation.mutate(
                  {
                    targetUserId: wallet.userId,
                    newStatus: pendingNewStatus,
                    reason: trimmedReason,
                    expiresAt,
                    idempotencyKey,
                  },
                  {
                    onSuccess: () => setStatusDialogOpen(false),
                  },
                );
              }}
              disabled={setStatusMutation.isPending || Boolean(reasonError)}
            >
              {setStatusMutation.isPending ? 'Đang cập nhật…' : 'Cập nhật trạng thái'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
