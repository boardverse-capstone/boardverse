'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Search, UserPlus, Users, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { POS_QUERY_KEYS, PosCheckInService } from '../services/pos-check-in.service';
import {
  useAddGuestSlots,
  useAddSessionMembers,
  useMergeSessions,
  usePartialCheckout,
} from '../hooks/usePosMutations';
import type { ActiveSessionDetail, CafeTable, TableBooking } from '../types/pos-check-in.interface';

interface SessionMembersPanelProps {
  cafeId: string;
  session: ActiveSessionDetail;
  booking: TableBooking;
  occupiedTables: CafeTable[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function SessionMembersPanel({
  cafeId,
  session,
  booking,
  occupiedTables,
}: SessionMembersPanelProps) {
  const queryClient = useQueryClient();
  const addGuests = useAddGuestSlots(cafeId, session.sessionId);
  const addMembers = useAddSessionMembers(cafeId, session.sessionId);
  const mergeSessions = useMergeSessions(cafeId, session.sessionId);
  const partialCheckout = usePartialCheckout(cafeId, session.sessionId);

  const [guestName, setGuestName] = useState('');
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [lateMemberFormOpen, setLateMemberFormOpen] = useState(false);
  const [memberUserIds, setMemberUserIds] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('');
  const [mergeMemberId, setMergeMemberId] = useState('');
  const [partialMemberIds, setPartialMemberIds] = useState<Set<string>>(new Set());

  // Trạng thái tìm kiếm khách hàng (SĐT / Email / Tên)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; fullName?: string; email?: string; phone?: string; avatarUrl?: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string; fullName?: string; email?: string; phone?: string; avatarUrl?: string } | null>(null);

  const handleSearchCustomer = async (query: string) => {
    setCustomerSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await PosCheckInService.searchCustomerUsers(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

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

  const [addedMembers, setAddedMembers] = useState<{ id: string; displayName: string }[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`pos_added_members_${session.sessionId}`);
      return stored ? (JSON.parse(stored) as { id: string; displayName: string }[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const reload = () => {
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem(`pos_added_members_${session.sessionId}`);
        setAddedMembers(stored ? JSON.parse(stored) : []);
      } catch {
        // ignore
      }
    };
    reload();
    window.addEventListener('pos_session_members_updated', reload);
    return () => window.removeEventListener('pos_session_members_updated', reload);
  }, [session.sessionId]);

  const updateAddedMembers = (newMembers: { id: string; displayName: string }[]) => {
    setAddedMembers(newMembers);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`pos_added_members_${session.sessionId}`, JSON.stringify(newMembers));
      } catch {
        // ignore
      }
    }
  };

  const membersList = useMemo<{ id: string; displayName: string }[]>(() => {
    const list: { id: string; displayName: string }[] = [];

    // 1. Member thật từ API — bỏ slot pad giả
    if (session.members && session.members.length > 0) {
      session.members.forEach((m) => {
        if (
          String(m.id).startsWith('guest-slot-') ||
          String(m.id).startsWith('guest-auto-')
        ) {
          return;
        }
        list.push({ id: m.id, displayName: m.displayName });
      });
    } else if (booking?.participants && booking.participants.length > 0) {
      booking.participants.forEach((p) => {
        list.push({
          id: p.userId || p.id,
          displayName: p.displayName,
        });
      });
    } else {
      list.push({
        id: 'host-default',
        displayName: 'Chủ bàn (Host)',
      });
    }

    // 2. Khách thêm local — chỉ append nếu chưa có (không pad theo presentCount/max)
    addedMembers.forEach((m) => {
      if (
        list.some(
          (existing) =>
            existing.id === m.id ||
            existing.displayName === m.displayName ||
            (m.displayName.startsWith('Khách:') &&
              existing.displayName === m.displayName.replace(/^Khách:\s*/, '')),
        )
      ) {
        return;
      }
      list.push(m);
    });

    return list;
  }, [session.members, booking?.participants, addedMembers]);

  const maxPlayers = session.game?.maxPlayers || 0;
  const currentPlayerCount = membersList.length;
  const atPlayerCap = maxPlayers > 0 && currentPlayerCount >= maxPlayers;

  const assertCanAddPlayer = () => {
    if (!atPlayerCap) return true;
    toast.error(
      `${session.game?.name || 'Game'} chỉ tối đa ${maxPlayers} người chơi (hiện ${currentPlayerCount}/${maxPlayers}).`,
    );
    return false;
  };

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
    if (!assertCanAddPlayer()) return;
    try {
      await addGuests.mutateAsync({ displayName });
      setGuestName('');
      const nextMembers = [
        ...addedMembers,
        { id: `guest-${Date.now()}`, displayName: `Khách: ${displayName}` },
      ];
      updateAddedMembers(nextMembers);
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSession] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSessions] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
      setGuestFormOpen(false);
      toast.success(`Đã thêm khách "${displayName}".`);
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể thêm khách vô danh.');
    }
  };

  const handleAddMembers = async () => {
    const targetId = selectedUser?.id || memberUserIds.trim() || customerSearchQuery.trim();
    if (!targetId) {
      toast.error('Nhập SĐT, Email hoặc Tên để tìm kiếm khách hàng.');
      return;
    }
    if (!assertCanAddPlayer()) return;
    const userIds = [targetId];
    try {
      await addMembers.mutateAsync({ userIds });
      const addedUser = selectedUser || { id: targetId, username: targetId };
      const nextMembers = [
        ...addedMembers,
        { id: addedUser.id, displayName: addedUser.fullName || addedUser.username },
      ];
      updateAddedMembers(nextMembers);
      setMemberUserIds('');
      setCustomerSearchQuery('');
      setSelectedUser(null);
      setSearchResults([]);
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSession] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSessions] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
      setLateMemberFormOpen(false);
      toast.success(`Đã thêm thành viên "${addedUser.fullName || addedUser.username}" vào phiên.`);
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
      // Tự động đảm bảo phiên ở trạng thái Checking trước khi thanh toán một phần
      if ((session.status as string) !== 'Checking') {
        try {
          await PosCheckInService.endGame(cafeId, session.sessionId);
        } catch {
          // Ignore if already ended or checking
        }
      }

      const bill = await partialCheckout.mutateAsync({
        memberUserIds: Array.from(partialMemberIds),
        applyDeposit: true,
      });
      setPartialMemberIds(new Set());
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSession] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSessions] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
      toast.success(
        `Đã thanh toán một phần · ${formatCurrency(bill.totalDue)} cho ${partialMemberIds.size} người.`,
      );
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể thanh toán một phần.');
    }
  };

  const busy =
    addGuests.isPending ||
    addMembers.isPending ||
    mergeSessions.isPending ||
    partialCheckout.isPending;

  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start">
      {/* Cột trái: Thêm người */}
      <div className="space-y-4">
        <section className="overflow-hidden rounded-lg border bg-background">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 p-3.5 text-left md:p-4"
            onClick={() => setGuestFormOpen((open) => !open)}
            aria-expanded={guestFormOpen}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 shrink-0 text-emerald-600" />
              Thêm khách vô danh
              {maxPlayers > 0 ? (
                <Badge variant="secondary" className="font-normal text-[10px]">
                  {currentPlayerCount}/{maxPlayers}
                </Badge>
              ) : null}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${guestFormOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {guestFormOpen ? (
            <div className="space-y-3 border-t px-3.5 pb-3.5 md:px-4 md:pb-4">
              <p className="text-[11px] text-muted-foreground">
                💡 Dành cho khách vãng lai đi cùng nhóm chưa/không đăng ký tài khoản App.
                {maxPlayers > 0
                  ? ` · Giới hạn game: ${session.game?.minPlayers ?? 1}–${maxPlayers} người (hiện ${currentPlayerCount}).`
                  : ''}
              </p>
              {atPlayerCap ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                  Đã đủ {maxPlayers} người — không thể thêm nữa.
                </p>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="guest-name">Tên hiển thị (Ví dụ: Hoàng)</Label>
                    <Input
                      id="guest-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="VD: Hoàng"
                    />
                  </div>
                  <Button type="button" disabled={busy} onClick={() => void handleAddGuests()}>
                    {addGuests.isPending ? <Spinner className="h-4 w-4" /> : 'Thêm'}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-lg border bg-background">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 p-3.5 text-left md:p-4"
            onClick={() => setLateMemberFormOpen((open) => !open)}
            aria-expanded={lateMemberFormOpen}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <UserPlus className="h-4 w-4 shrink-0 text-emerald-600" />
              Thêm thành viên đến muộn
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${lateMemberFormOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {lateMemberFormOpen ? (
            <div className="space-y-3 border-t px-3.5 pb-3.5 md:px-4 md:pb-4">
              {atPlayerCap ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                  Đã đủ {maxPlayers} người — không thể thêm nữa.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customer-search">Tìm kiếm khách hàng (SĐT / Email / Tên)</Label>
                    <div className="relative">
                      <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="customer-search"
                        placeholder="Nhập SĐT (VD: 0987...), Email hoặc Tên..."
                        value={customerSearchQuery}
                        onChange={(e) => void handleSearchCustomer(e.target.value)}
                        className="pr-8 pl-9 font-normal"
                        autoComplete="off"
                      />
                      {isSearching ? (
                        <Spinner className="absolute top-2.5 right-3 h-4 w-4 text-muted-foreground" />
                      ) : customerSearchQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearchQuery('');
                            setSearchResults([]);
                            setSelectedUser(null);
                          }}
                          className="absolute top-2.5 right-3 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    {searchResults.length > 0 && !selectedUser && (
                      <div className="relative z-10 max-h-48 space-y-1 overflow-y-auto rounded-lg border bg-white p-1.5 shadow-lg">
                        <p className="px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                          Kết quả tìm thấy ({searchResults.length})
                        </p>
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setCustomerSearchQuery(user.fullName || user.username);
                              setSearchResults([]);
                            }}
                            className="flex w-full cursor-pointer items-center justify-between rounded-md border-b p-2 text-left transition-colors last:border-0 hover:bg-emerald-50"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                                {user.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground">
                                  {user.fullName || user.username}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {user.phone ? `SĐT: ${user.phone}` : ''}{' '}
                                  {user.email ? `· ${user.email}` : ''}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700"
                            >
                              Chọn
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedUser && (
                      <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50/70 p-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-950">
                              {selectedUser.fullName || selectedUser.username}
                            </p>
                            <p className="text-[11px] text-emerald-800">
                              {selectedUser.phone ? `SĐT: ${selectedUser.phone}` : ''}{' '}
                              {selectedUser.email ? `· ${selectedUser.email}` : ''}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => {
                            setSelectedUser(null);
                            setCustomerSearchQuery('');
                          }}
                        >
                          Bỏ chọn
                        </Button>
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      💡 Nhập SĐT, Email hoặc Tên ➔ Chọn tài khoản ➔ Bấm &quot;Thêm thành viên vào phiên&quot;.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={busy || (!selectedUser && !customerSearchQuery.trim())}
                    onClick={() => void handleAddMembers()}
                  >
                    {addMembers.isPending ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Thêm thành viên vào phiên
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </section>
      </div>

      {/* Cột phải: Thanh toán một phần & Gộp bàn */}
      <div className="space-y-4">
        <section className="space-y-3 rounded-lg border bg-background p-3.5 md:p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="h-4 w-4 text-emerald-600" />
            Thanh toán một phần (về trước)
          </p>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tích chọn thành viên thanh toán & về sớm:</Label>
            {membersList.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded-md border bg-muted/20 p-2 text-sm cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  checked={partialMemberIds.has(m.id)}
                  onChange={() => setPartialMemberIds((prev) => toggleId(prev, m.id))}
                />
                <span className="font-medium text-foreground">{m.displayName}</span>
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

        <section className="space-y-3 rounded-lg border bg-background p-3.5 md:p-4">
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
                {membersList.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="merge-member"
                      checked={mergeMemberId === m.id}
                      onChange={() => setMergeMemberId(m.id)}
                    />
                    {m.displayName}
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

        <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          Kết thúc phiên: tab <span className="font-medium text-foreground">Game</span> → Nhận lại
          game → kiểm kê → tab <span className="font-medium text-foreground">Thanh toán</span>.
        </p>
      </div>
    </div>
  );
}
