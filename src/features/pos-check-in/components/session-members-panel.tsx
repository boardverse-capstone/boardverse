'use client';

import { useMemo, useState } from 'react';
import { LogOut, UserPlus, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  useAddGuestSlots,
  useAddSessionMembers,
  useCheckoutSession,
  useMergeSessions,
  usePartialCheckout,
} from '../hooks/usePosMutations';
import type { ActiveSessionDetail, CafeTable, TableBooking } from '../types/pos-check-in.interface';

interface SessionMembersPanelProps {
  cafeId: string;
  session: ActiveSessionDetail;
  booking: TableBooking;
  occupiedTables: CafeTable[];
  onCheckoutBooking?: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function SessionMembersPanel({
  cafeId,
  session,
  booking,
  occupiedTables,
  onCheckoutBooking,
}: SessionMembersPanelProps) {
  const addGuests = useAddGuestSlots(cafeId, session.sessionId);
  const addMembers = useAddSessionMembers(cafeId, session.sessionId);
  const mergeSessions = useMergeSessions(cafeId, session.sessionId);
  const partialCheckout = usePartialCheckout(cafeId, session.sessionId);
  const checkoutSession = useCheckoutSession(cafeId, session.sessionId);

  const [guestName, setGuestName] = useState('');
  const [memberUserIds, setMemberUserIds] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('');
  const [mergeMemberId, setMergeMemberId] = useState('');
  const [partialMemberIds, setPartialMemberIds] = useState<Set<string>>(new Set());

  const otherSessions = useMemo(
    () =>
      occupiedTables.filter(
        (table) =>
          Boolean(table.sessionId) &&
          table.sessionId !== session.sessionId &&
          table.status === 'Occupied',
      ),
    [occupiedTables, session.sessionId],
  );

  const toggleId = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const handleAddGuests = async () => {
    const displayName = guestName.trim();
    if (!displayName) {
      toast.error('Nhập tên khách vô danh.');
      return;
    }
    try {
      await addGuests.mutateAsync({ displayName });
      setGuestName('');
      toast.success(`Đã thêm khách "${displayName}".`);
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể thêm khách vô danh.');
    }
  };

  const handleAddMembers = async () => {
    const userIds = memberUserIds
      .split(/[\s,;]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (userIds.length === 0) {
      toast.error('Nhập ít nhất 1 userId thành viên.');
      return;
    }
    try {
      await addMembers.mutateAsync({ userIds });
      setMemberUserIds('');
      toast.success(`Đã thêm ${userIds.length} thành viên vào phiên.`);
    } catch {
      toast.error('Không thể thêm thành viên.');
    }
  };

  const handleMerge = async () => {
    if (!targetSessionId) {
      toast.error('Chọn phiên đích để gộp.');
      return;
    }
    if (!mergeMemberId) {
      toast.error('Chọn 1 thành viên để chuyển.');
      return;
    }
    try {
      await mergeSessions.mutateAsync({
        targetSessionId,
        memberUserId: mergeMemberId,
      });
      setMergeMemberId('');
      toast.success('Đã chuyển thành viên sang phiên khác.');
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể gộp phiên.');
    }
  };

  const handlePartialCheckout = async () => {
    if (partialMemberIds.size === 0) {
      toast.error('Chọn thành viên về trước.');
      return;
    }
    try {
      const bill = await partialCheckout.mutateAsync({
        memberUserIds: Array.from(partialMemberIds),
        applyDeposit: true,
      });
      setPartialMemberIds(new Set());
      toast.success(
        `Đã thanh toán một phần · ${formatCurrency(bill.totalDue)} cho ${partialMemberIds.size} người.`,
      );
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể thanh toán một phần.');
    }
  };

  const handleBookingCheckout = async () => {
    try {
      await checkoutSession.mutateAsync();
      toast.success('Đã hoàn tất thanh toán & check-out phiên chơi.');
      onCheckoutBooking?.();
    } catch {
      toast.error('Không thể check-out phiên chơi.');
    }
  };

  const busy =
    addGuests.isPending ||
    addMembers.isPending ||
    mergeSessions.isPending ||
    partialCheckout.isPending ||
    checkoutSession.isPending;

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-lg border bg-background p-3 md:p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4" />
          Thêm khách vô danh
        </p>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="guest-name">Tên hiển thị</Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Khách A"
            />
          </div>
          <Button type="button" disabled={busy} onClick={() => void handleAddGuests()}>
            {addGuests.isPending ? <Spinner className="h-4 w-4" /> : 'Thêm'}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-background p-3 md:p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <UserPlus className="h-4 w-4" />
          Thêm thành viên đến muộn
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="member-ids">User ID (cách nhau bởi dấu phẩy)</Label>
          <Input
            id="member-ids"
            placeholder="user-123, user-456"
            value={memberUserIds}
            onChange={(e) => setMemberUserIds(e.target.value)}
          />
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={busy}
          onClick={() => void handleAddMembers()}
        >
          {addMembers.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Thêm vào phiên
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border bg-background p-3 md:p-4">
        <p className="text-sm font-medium">Gộp / chuyển thành viên sang bàn khác</p>
        {otherSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Không có bàn đang chơi khác để gộp.</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="target-session">Phiên đích</Label>
              <select
                id="target-session"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={targetSessionId}
                onChange={(e) => setTargetSessionId(e.target.value)}
              >
                <option value="">Chọn bàn/phiên</option>
                {otherSessions.map((table) => (
                  <option key={table.sessionId} value={table.sessionId}>
                    {table.label}
                    {table.gameName ? ` · ${table.gameName}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Thành viên chuyển đi (1 người)</Label>
              {booking.participants.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="merge-member"
                    checked={mergeMemberId === (p.userId || p.id)}
                    onChange={() => setMergeMemberId(p.userId || p.id)}
                  />
                  {p.displayName}
                </label>
              ))}
            </div>
            <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={() => void handleMerge()}>
              {mergeSessions.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Chuyển sang phiên đích
            </Button>
          </>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-background p-3 md:p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Wallet className="h-4 w-4" />
          Thanh toán một phần (về trước)
        </p>
        <div className="space-y-2">
          {booking.participants.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={partialMemberIds.has(p.id)}
                onChange={() => setPartialMemberIds((prev) => toggleId(prev, p.id))}
              />
              {p.displayName}
            </label>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={busy}
          onClick={() => void handlePartialCheckout()}
        >
          {partialCheckout.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Thanh toán một phần
        </Button>
      </section>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full border-rose-200 text-rose-700"
        disabled={busy}
        onClick={() => void handleBookingCheckout()}
      >
        {checkoutSession.isPending ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <LogOut className="mr-2 h-4 w-4" />
        )}
        Check-out phiên chơi
      </Button>
    </div>
  );
}
