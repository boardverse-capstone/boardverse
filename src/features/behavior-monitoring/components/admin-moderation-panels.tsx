'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, History, Loader2, Search, Shield, Snowflake, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserManagementService } from '@/features/user-management/services/user-management.service';
import type { ManagedUser } from '@/features/user-management/types/user.interface';
import { AdminModerationService } from '../services/admin-moderation.service';
import type {
  AlertStatus,
  CoolingOffUser,
  ExtendCoolingOffRequest,
} from '../types/admin-moderation.interface';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function signalsText(signals: Record<string, number> | string | null | undefined) {
  if (!signals) return 'Không có';
  if (typeof signals === 'string') return signals;
  const entries = Object.entries(signals);
  return entries.length ? entries.map(([key, value]) => `${key}: ${value}`).join(', ') : 'Không có';
}

function EmptyState({ children }: { children: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function userDisplayName(user: ManagedUser) {
  return user.username;
}

function userSecondaryLine(user: ManagedUser) {
  return [user.phoneNumber, user.email, user.username]
    .filter((value) => Boolean(value?.trim()))
    .join(' · ');
}

/** Tra cứu người chơi theo tên / SĐT / email — chọn từ list, không nhập UUID. */
function UserSearchPicker({
  selected,
  onSelect,
  onClear,
  placeholder = 'Tìm theo tên, SĐT hoặc email...',
}: {
  selected: ManagedUser | null;
  onSelect: (user: ManagedUser) => void;
  onClear?: () => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const searchQuery = useQuery({
    queryKey: ['admin-moderation-user-search', submitted],
    enabled: submitted.length >= 2,
    queryFn: () =>
      UserManagementService.getUsers({
        page: 1,
        limit: 12,
        search: submitted,
      }),
  });

  const results = searchQuery.data?.data ?? [];

  return (
    <div className="space-y-2">
      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{userDisplayName(selected)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {userSecondaryLine(selected)}
            </p>
          </div>
          {onClear ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onClear();
                setQuery('');
                setSubmitted('');
              }}
            >
              <X className="size-4" />
              Bỏ chọn
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const next = query.trim();
              if (next.length < 2) {
                toast.error('Nhập ít nhất 2 ký tự để tìm người chơi.');
                return;
              }
              setSubmitted(next);
            }}
          >
            <Input
              aria-label="Tìm người chơi theo tên, SĐT hoặc email"
              placeholder={placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit" variant="outline" disabled={searchQuery.isFetching}>
              <Search className="size-4" />
              Tìm
            </Button>
          </form>

          {searchQuery.isFetching ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Đang tìm người chơi...
            </p>
          ) : null}

          {searchQuery.isError ? (
            <p className="text-sm text-destructive">
              {errorMessage(searchQuery.error, 'Không tìm được người chơi.')}
            </p>
          ) : null}

          {submitted && !searchQuery.isFetching && results.length === 0 ? (
            <EmptyState>Không có kết quả khớp “{submitted}”.</EmptyState>
          ) : null}

          {results.length > 0 ? (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-1">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-muted"
                  onClick={() => onSelect(user)}
                >
                  <span className="font-medium">{userDisplayName(user)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userSecondaryLine(user)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function AlertsPanel() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AlertStatus | ''>('Open');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const alertsQuery = useQuery({
    queryKey: ['admin-moderation-alerts', status],
    queryFn: () =>
      AdminModerationService.getAlerts({
        status: status || undefined,
        pageNumber: 1,
        pageSize: 20,
      }),
  });
  const metricsQuery = useQuery({
    queryKey: ['admin-moderation-alert-metrics'],
    queryFn: AdminModerationService.getAlertMetrics,
  });

  const actionMutation = useMutation({
    mutationFn: ({
      alertId,
      action,
      note,
    }: {
      alertId: string;
      action: 'acknowledge' | 'resolve' | 'dismiss';
      note?: string;
    }) => {
      if (action === 'acknowledge') {
        return AdminModerationService.acknowledgeAlert(alertId);
      }
      if (action === 'resolve') {
        return AdminModerationService.resolveAlert(alertId, note?.trim() ?? '');
      }
      return AdminModerationService.dismissAlert(alertId, note?.trim() ?? '');
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.action === 'acknowledge'
          ? 'Đã ghi nhận cảnh báo.'
          : variables.action === 'resolve'
            ? 'Đã xử lý cảnh báo.'
            : 'Đã loại cảnh báo sai.',
      );
      setNotes((current) => ({ ...current, [variables.alertId]: '' }));
      void queryClient.invalidateQueries({ queryKey: ['admin-moderation-alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-moderation-alert-metrics'] });
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể cập nhật cảnh báo.')),
  });

  const submitWithNote = (alertId: string, action: 'resolve' | 'dismiss') => {
    const note = notes[alertId]?.trim() ?? '';
    if (!note) {
      toast.error('Vui lòng nhập ghi chú xử lý.');
      return;
    }
    actionMutation.mutate({ alertId, action, note });
  };

  const metrics = metricsQuery.data;
  const alerts = alertsQuery.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600" />
          Cảnh báo rủi ro
        </CardTitle>
        <CardDescription>Theo dõi và xử lý cảnh báo tự động của người chơi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Nghiêm trọng đang mở', metrics?.openCritical],
            ['Cảnh báo đang mở', metrics?.openWarning],
            ['Thông tin đang mở', metrics?.openInfo],
            ['Đã xem, chờ xử lý', metrics?.acknowledgedAwaitingResolve],
            ['Đã xử lý 24 giờ', metrics?.resolvedLast24h],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value ?? '—'}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="alert-status">Trạng thái</Label>
          <select
            id="alert-status"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as AlertStatus | '')}
          >
            <option value="">Tất cả</option>
            <option value="Open">Đang mở</option>
            <option value="Acknowledged">Đã xem</option>
            <option value="Resolved">Đã xử lý</option>
            <option value="Dismissed">Đã loại</option>
          </select>
        </div>

        {alertsQuery.isLoading ? (
          <EmptyState>Đang tải cảnh báo...</EmptyState>
        ) : alertsQuery.isError ? (
          <EmptyState>Không thể tải danh sách cảnh báo.</EmptyState>
        ) : alerts.length === 0 ? (
          <EmptyState>Không có cảnh báo phù hợp.</EmptyState>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const canAct = alert.status === 'Open' || alert.status === 'Acknowledged';
              const isUpdating =
                actionMutation.isPending && actionMutation.variables?.alertId === alert.id;
              return (
                <div key={alert.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{alert.alertType}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(alert.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={alert.severity === 'Critical' ? 'destructive' : 'outline'}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="secondary">{alert.status}</Badge>
                    </div>
                  </div>
                  <p className="text-sm">
                    Risk: <strong>{alert.riskScoreSnapshot}</strong> · Signals:{' '}
                    {signalsText(alert.signals)}
                  </p>
                  {alert.resolutionNote && (
                    <p className="text-sm text-muted-foreground">
                      Ghi chú: {alert.resolutionNote}
                    </p>
                  )}
                  {canAct && (
                    <div className="space-y-2">
                      <Label htmlFor={`alert-note-${alert.id}`}>Ghi chú xử lý</Label>
                      <Input
                        id={`alert-note-${alert.id}`}
                        placeholder="Bắt buộc khi xử lý hoặc loại cảnh báo"
                        value={notes[alert.id] ?? ''}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [alert.id]: event.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        {alert.status === 'Open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isUpdating}
                            onClick={() =>
                              actionMutation.mutate({
                                alertId: alert.id,
                                action: 'acknowledge',
                              })
                            }
                          >
                            Đánh dấu đã xem
                          </Button>
                        )}
                        <Button
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => submitWithNote(alert.id, 'resolve')}
                        >
                          Xử lý
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isUpdating}
                          onClick={() => submitWithNote(alert.id, 'dismiss')}
                        >
                          Loại cảnh báo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CoolingOffRow({ user }: { user: CoolingOffUser }) {
  const queryClient = useQueryClient();
  const [additionalDays, setAdditionalDays] = useState('7');
  const [reason, setReason] = useState('');

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-moderation-cooling-off'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-moderation-action-history'] });
  };

  const releaseMutation = useMutation({
    mutationFn: () => AdminModerationService.releaseCoolingOff(user.userId),
    onSuccess: () => {
      toast.success(`Đã gỡ cooling-off cho ${user.username}.`);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể gỡ cooling-off.')),
  });

  const extendMutation = useMutation({
    mutationFn: (payload: ExtendCoolingOffRequest) =>
      AdminModerationService.extendCoolingOff(user.userId, payload),
    onSuccess: () => {
      toast.success(`Đã gia hạn cooling-off cho ${user.username}.`);
      setReason('');
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể gia hạn cooling-off.')),
  });

  const extend = () => {
    const days = Number(additionalDays);
    const trimmedReason = reason.trim();
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      toast.error('Số ngày gia hạn phải từ 1 đến 90.');
      return;
    }
    if (trimmedReason.length < 10) {
      toast.error('Lý do gia hạn phải có ít nhất 10 ký tự.');
      return;
    }
    extendMutation.mutate({ additionalDays: days, reason: trimmedReason });
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{user.username}</p>
        </div>
        <Badge variant="outline">Hết hạn: {formatDate(user.coolingOffExpiresAt)}</Badge>
      </div>
      <p className="text-sm">
        Karma {user.karmaPoints} · Risk multiplier {user.riskMultiplier} · Thất bại lobby{' '}
        {user.failedLobbyCount}
      </p>
      <p className="text-sm text-muted-foreground">{user.coolingOffTriggerReason}</p>
      <div className="grid gap-2 sm:grid-cols-[100px_1fr_auto]">
        <Input
          type="number"
          min={1}
          max={90}
          aria-label={`Số ngày gia hạn cho ${user.username}`}
          value={additionalDays}
          onChange={(event) => setAdditionalDays(event.target.value)}
        />
        <Input
          aria-label={`Lý do gia hạn cho ${user.username}`}
          placeholder="Lý do gia hạn (ít nhất 10 ký tự)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button size="sm" disabled={extendMutation.isPending} onClick={extend}>
          Gia hạn
        </Button>
      </div>
      <Button
        size="sm"
        variant="destructive"
        disabled={releaseMutation.isPending}
        onClick={() => {
          if (window.confirm(`Gỡ cooling-off cho ${user.username}?`)) {
            releaseMutation.mutate();
          }
        }}
      >
        Gỡ cooling-off
      </Button>
    </div>
  );
}

function CoolingOffPanel() {
  const query = useQuery({
    queryKey: ['admin-moderation-cooling-off'],
    queryFn: () => AdminModerationService.getCoolingOffUsers({ page: 1, pageSize: 20 }),
  });
  const users = query.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Snowflake className="size-5 text-sky-600" />
          Cooling-off
        </CardTitle>
        <CardDescription>Gỡ hoặc gia hạn thời gian hạn chế của người chơi.</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <EmptyState>Đang tải danh sách cooling-off...</EmptyState>
        ) : query.isError ? (
          <EmptyState>Không thể tải danh sách cooling-off.</EmptyState>
        ) : users.length === 0 ? (
          <EmptyState>Không có người chơi đang cooling-off.</EmptyState>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <CoolingOffRow key={user.userId} user={user} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionHistoryPanel() {
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const query = useQuery({
    queryKey: ['admin-moderation-action-history', selectedUser?.id ?? 'all'],
    queryFn: () =>
      AdminModerationService.getActionHistory({
        userId: selectedUser?.id,
        pageNumber: 1,
        pageSize: 20,
      }),
  });
  const items = query.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-5" />
          Lịch sử thao tác quản trị
        </CardTitle>
        <CardDescription>
          Xem audit log. Tìm theo tên / SĐT / email để lọc theo người chơi, hoặc để trống để xem tất cả.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UserSearchPicker
          selected={selectedUser}
          onSelect={setSelectedUser}
          onClear={() => setSelectedUser(null)}
          placeholder="Lọc theo tên, SĐT hoặc email..."
        />
        {query.isLoading ? (
          <EmptyState>Đang tải lịch sử...</EmptyState>
        ) : query.isError ? (
          <EmptyState>Không thể tải lịch sử thao tác.</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>Chưa có thao tác phù hợp.</EmptyState>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {item.actionType} · {item.username || 'Người chơi'}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm">{item.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bởi {item.actionByUsername || 'Admin'}
                  {item.expiresAt ? ` · Hết hạn ${formatDate(item.expiresAt)}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskLookupPanel() {
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const userId = selectedUser?.id ?? '';
  const query = useQuery({
    queryKey: ['admin-moderation-player-risk', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [risk, history] = await Promise.all([
        AdminModerationService.getPlayerRisk(userId),
        AdminModerationService.getPlayerRiskHistory(userId),
      ]);
      return { risk, history };
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5 text-violet-600" />
          Tra cứu rủi ro người chơi
        </CardTitle>
        <CardDescription>
          Tìm người chơi theo tên / SĐT / email, chọn từ danh sách rồi xem điểm rủi ro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UserSearchPicker
          selected={selectedUser}
          onSelect={setSelectedUser}
          onClear={() => setSelectedUser(null)}
        />

        {!selectedUser ? (
          <EmptyState>Chọn một người chơi từ kết quả tìm kiếm để xem rủi ro.</EmptyState>
        ) : null}

        {query.isFetching && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Đang tra cứu...
          </p>
        )}
        {query.isError && (
          <p className="text-sm text-destructive">
            {errorMessage(query.error, 'Không thể tải thông tin rủi ro.')}
          </p>
        )}
        {query.data && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Người chơi</p>
                <p className="font-semibold">{query.data.risk.username}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Risk score</p>
                <p className="font-semibold">
                  {query.data.risk.riskScore} ({query.data.risk.riskLevel})
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Trạng thái</p>
                <p className="font-semibold">{query.data.risk.accountStatus}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Risk multiplier</p>
                <p className="font-semibold">{query.data.risk.riskMultiplier}</p>
              </div>
            </div>
            <p className="text-sm">
              Signals: {signalsText(query.data.risk.signals)} · Audit:{' '}
              {query.data.risk.actionHistoryCount}
            </p>
            {query.data.risk.isCoolingOff && (
              <Badge variant="outline">
                Cooling-off đến {formatDate(query.data.risk.coolingOffExpiresAt)}
              </Badge>
            )}
            <div>
              <h3 className="mb-2 font-medium">Lịch sử risk score</h3>
              {query.data.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có snapshot rủi ro.</p>
              ) : (
                <div className="space-y-2">
                  {query.data.history.map((item, index) => (
                    <div
                      key={`${item.snapshotDate}-${index}`}
                      className="flex flex-wrap justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span>
                        {item.riskScore} ({item.riskLevel}) · {signalsText(item.signals)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(item.snapshotDate || item.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminModerationPanels() {
  return (
    <section className="space-y-6" aria-label="Công cụ kiểm duyệt nâng cao">
      <AlertsPanel />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <CoolingOffPanel />
        <ActionHistoryPanel />
      </div>
      <RiskLookupPanel />
    </section>
  );
}
