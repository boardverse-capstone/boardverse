'use client';

import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useAdminTournamentParticipants } from '../hooks/useAdminTournamentParticipants';
import {
  useCancelTournament,
  useCheckInTournamentParticipant,
  useCloseTournamentRegistration,
  useCompleteTournament,
  useDeleteAdminTournament,
  useOpenTournamentRegistration,
  useStartTournament,
  useUpdateAdminTournament,
} from '../hooks/useTournamentActions';
import type {
  AdminTournamentDetail,
  ParticipantStatus,
  TournamentParticipant,
} from '../types/tournament.interface';
import { PARTICIPANT_STATUSES } from '../types/tournament.interface';
import {
  formatTournamentDate,
  participantStatusLabel,
  tournamentStatusLabel,
} from '../utils/tournament.mapper';
import {
  TournamentFormDialog,
  type TournamentFormSubmitValues,
} from './tournament-form-dialog';

interface AdminTournamentDetailPanelProps {
  tournament?: AdminTournamentDetail;
  isLoading?: boolean;
  isError?: boolean;
  onDeleted?: () => void;
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
    case 'Draft':
      return 'border-border bg-muted text-foreground';
    case 'RegistrationOpen':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'RegistrationClosed':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'OnGoing':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'Completed':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'Cancelled':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

function participantBadgeClass(status: string) {
  switch (status) {
    case 'Registered':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'CheckedIn':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'Withdrawn':
      return 'border-border bg-muted text-foreground';
    case 'NoShow':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

export function AdminTournamentDetailPanel({
  tournament,
  isLoading,
  isError,
  onDeleted,
}: AdminTournamentDetailPanelProps) {
  const [participantStatus, setParticipantStatus] = useState<ParticipantStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const openReg = useOpenTournamentRegistration();
  const closeReg = useCloseTournamentRegistration();
  const startMutation = useStartTournament();
  const completeMutation = useCompleteTournament();
  const cancelMutation = useCancelTournament();
  const deleteMutation = useDeleteAdminTournament();
  const updateMutation = useUpdateAdminTournament();
  const checkInMutation = useCheckInTournamentParticipant();

  const { data: participantsData, isLoading: participantsLoading, isError: participantsError } =
    useAdminTournamentParticipants({
      tournamentId: tournament?.id ?? '',
      status: participantStatus,
    });

  useEffect(() => {
    if (!cancelOpen) setCancelReason('');
  }, [cancelOpen]);

  const lifecyclePending =
    openReg.isPending ||
    closeReg.isPending ||
    startMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending;

  const trimmedCancelReason = cancelReason.trim();
  const cancelReasonError =
    trimmedCancelReason.length === 0
      ? 'Lý do là bắt buộc (5–500 ký tự).'
      : trimmedCancelReason.length < 5
        ? 'Lý do phải có ít nhất 5 ký tự.'
        : trimmedCancelReason.length > 500
          ? 'Lý do không được quá 500 ký tự.'
          : null;

  const status = tournament?.status ?? '';
  const canEditOrDelete = status === 'Draft' || status === 'Cancelled';
  const canOpenReg = status === 'Draft';
  const canCloseReg = status === 'RegistrationOpen';
  const canStart = status === 'RegistrationClosed';
  const canComplete = status === 'OnGoing';
  const canCancel = status !== 'Completed' && status !== 'Cancelled' && Boolean(status);

  const participantColumns = useMemo<ColumnDef<TournamentParticipant>[]>(
    () => [
      {
        accessorKey: 'displayName',
        header: 'Người chơi',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.displayName || row.original.username || '—'}
            </div>
            <div className="text-xs text-muted-foreground">@{row.original.username}</div>
          </div>
        ),
      },
      {
        accessorKey: 'elo',
        header: 'Elo / Karma',
        cell: ({ row }) => (
          <div className="text-sm tabular-nums">
            <div>{row.original.elo}</div>
            <div className="text-xs text-muted-foreground">Karma {row.original.karmaScore}</div>
          </div>
        ),
      },
      {
        accessorKey: 'gamerTier',
        header: 'Tier',
        cell: ({ row }) => row.original.gamerTier || '—',
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Badge variant="outline" className={participantBadgeClass(row.original.status)}>
            {participantStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: 'registeredAt',
        header: 'Đăng ký',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatTournamentDate(row.original.registeredAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const canCheckIn = row.original.status === 'Registered' && Boolean(tournament);
          if (!canCheckIn) return null;
          const pending =
            checkInMutation.isPending && checkingInId === row.original.participantId;
          return (
            <Button
              size="sm"
              variant="outline"
              disabled={pending || lifecyclePending}
              onClick={() => {
                if (!tournament) return;
                setCheckingInId(row.original.participantId);
                checkInMutation.mutate(
                  {
                    tournamentId: tournament.id,
                    participantId: row.original.participantId,
                  },
                  { onSettled: () => setCheckingInId(null) },
                );
              }}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Đang check-in...
                </>
              ) : (
                'Check-in'
              )}
            </Button>
          );
        },
      },
    ],
    [tournament, checkInMutation, checkingInId, lifecyclePending],
  );

  const handleFormSubmit = (values: TournamentFormSubmitValues) => {
    if (!tournament || values.mode !== 'edit') return;
    updateMutation.mutate(
      { id: tournament.id, payload: values.payload },
      { onSuccess: () => setFormOpen(false) },
    );
  };

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

  if (isError || !tournament) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-rose-600">
          Không thể tải chi tiết giải đấu.
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
              <CardTitle className="text-xl">{tournament.name}</CardTitle>
              <CardDescription>
                {tournament.gameName} · {tournament.cafeName}
              </CardDescription>
              <p className="font-mono text-xs text-muted-foreground">{tournament.id}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className={statusBadgeClass(tournament.status)}>
                {tournamentStatusLabel(tournament.status)}
              </Badge>
              <div className="flex flex-wrap justify-end gap-2">
                {canEditOrDelete && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFormOpen(true)}
                      disabled={updateMutation.isPending}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Xóa
                    </Button>
                  </>
                )}
                {canOpenReg && (
                  <Button
                    size="sm"
                    onClick={() => openReg.mutate(tournament.id)}
                    disabled={lifecyclePending}
                  >
                    Mở đăng ký
                  </Button>
                )}
                {canCloseReg && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => closeReg.mutate(tournament.id)}
                    disabled={lifecyclePending}
                  >
                    Đóng đăng ký
                  </Button>
                )}
                {canStart && (
                  <Button
                    size="sm"
                    onClick={() => startMutation.mutate(tournament.id)}
                    disabled={lifecyclePending}
                  >
                    Bắt đầu giải
                  </Button>
                )}
                {canComplete && (
                  <Button
                    size="sm"
                    onClick={() => completeMutation.mutate(tournament.id)}
                    disabled={lifecyclePending}
                  >
                    Hoàn thành
                  </Button>
                )}
                {canCancel && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setCancelOpen(true)}
                    disabled={lifecyclePending}
                  >
                    Hủy giải
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Mô tả" value={tournament.description?.trim() || '—'} />
          <InfoRow
            label="Người chơi"
            value={`${tournament.currentParticipants}/${tournament.maxParticipants}`}
          />
          <InfoRow
            label="Hạn đăng ký"
            value={formatTournamentDate(tournament.registrationDeadline)}
          />
          <InfoRow label="Bắt đầu" value={formatTournamentDate(tournament.startTime)} />
          <InfoRow label="Phí tham gia" value={`${tournament.entryFeeBvc} BVC`} />
          <InfoRow label="Giải thưởng" value={`${tournament.prizePoolBvc} BVC`} />
          <InfoRow label="Karma tối thiểu" value={tournament.minKarmaScore} />
          <InfoRow
            label="Elo"
            value={`${tournament.minEloRequirement} – ${tournament.maxEloRequirement}`}
          />
          <InfoRow label="Tạo lúc" value={formatTournamentDate(tournament.createdAt)} />
          <InfoRow label="Cập nhật" value={formatTournamentDate(tournament.updatedAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-lg">Người tham gia</CardTitle>
            <CardDescription>
              {participantsData?.totalCount ?? 0} người
            </CardDescription>
          </div>
          <Select
            value={participantStatus}
            onValueChange={(value) =>
              setParticipantStatus(value as ParticipantStatus | 'all')
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {PARTICIPANT_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {participantStatusLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {participantsLoading ? (
            <div className="text-sm text-muted-foreground">Đang tải participants...</div>
          ) : participantsError ? (
            <div className="text-sm text-rose-600">Không thể tải danh sách participants.</div>
          ) : (
            <PartnerDataTable
              columns={participantColumns}
              data={participantsData?.items ?? []}
              emptyMessage="Chưa có người tham gia."
            />
          )}
        </CardContent>
      </Card>

      <TournamentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tournament={tournament}
        onSubmit={handleFormSubmit}
        isPending={updateMutation.isPending}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hủy giải đấu</DialogTitle>
            <DialogDescription>
              Entry fee sẽ được hoàn. Cần nhập lý do (5–500 ký tự).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="cancel-reason">
              Lý do hủy
            </label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              placeholder="Ví dụ: Sự cố không thể tổ chức..."
            />
            {cancelReasonError ? (
              <p className="text-xs text-rose-600">{cancelReasonError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelMutation.isPending || Boolean(cancelReasonError)}
              onClick={() => {
                if (cancelReasonError) return;
                cancelMutation.mutate(
                  { id: tournament.id, payload: { reason: trimmedCancelReason } },
                  { onSuccess: () => setCancelOpen(false) },
                );
              }}
            >
              {cancelMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa giải đấu?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa vĩnh viễn giải <span className="font-medium text-foreground">{tournament.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate(tournament.id, {
                  onSuccess: () => {
                    setDeleteOpen(false);
                    onDeleted?.();
                  },
                });
              }}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa giải'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
