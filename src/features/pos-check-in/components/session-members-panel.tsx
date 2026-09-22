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

  // Tráº¡ng thÃ¡i tÃ¬m kiáº¿m khÃ¡ch hÃ ng (SÄT / Email / TÃªn)
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

    // 1. Member tháº­t tá»« API â€” bá» slot pad giáº£
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
        displayName: 'Chá»§ bÃ n (Host)',
      });
    }

    // 2. KhÃ¡ch thÃªm local â€” chá»‰ append náº¿u chÆ°a cÃ³ (khÃ´ng pad theo presentCount/max)
    addedMembers.forEach((m) => {
      if (
        list.some(
          (existing) =>
            existing.id === m.id ||
            existing.displayName === m.displayName ||
            (m.displayName.startsWith('KhÃ¡ch:') &&
              existing.displayName === m.displayName.replace(/^KhÃ¡ch:\s*/, '')),
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
      `${session.game?.name || 'Game'} chá»‰ tá»‘i Ä‘a ${maxPlayers} ngÆ°á»i chÆ¡i (hiá»‡n ${currentPlayerCount}/${maxPlayers}).`,
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
      toast.error('Nháº­p tÃªn khÃ¡ch vÃ´ danh.');
      return;
    }
    if (!assertCanAddPlayer()) return;
    try {
      await addGuests.mutateAsync({ displayName });
      setGuestName('');
      const nextMembers = [
        ...addedMembers,
        { id: `guest-${Date.now()}`, displayName: `KhÃ¡ch: ${displayName}` },
      ];
      updateAddedMembers(nextMembers);
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSession] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSessions] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
      setGuestFormOpen(false);
      toast.success(`ÄÃ£ thÃªm khÃ¡ch "${displayName}".`);
    } catch (err) {
      toast.error((err as Error)?.message || 'KhÃ´ng thá»ƒ thÃªm khÃ¡ch vÃ´ danh.');
    }
  };

  const handleAddMembers = async () => {
    const targetId = selectedUser?.id || memberUserIds.trim() || customerSearchQuery.trim();
    if (!targetId) {
      toast.error('Nháº­p SÄT, Email hoáº·c TÃªn Ä‘á»ƒ tÃ¬m kiáº¿m khÃ¡ch hÃ ng.');
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
      toast.success(`ÄÃ£ thÃªm thÃ nh viÃªn "${addedUser.fullName || addedUser.username}" vÃ o phiÃªn.`);
    } catch {
      toast.error('KhÃ´ng thá»ƒ thÃªm thÃ nh viÃªn.');
    }
  };

  const handleMerge = async () => {
    if (!targetSessionId) {
      toast.error('Chá»n bÃ n muá»‘n gá»™p sang Ä‘á»ƒ gá»™p.');
      return;
    }
    if (!mergeMemberId) {
      toast.error('Chá»n 1 thÃ nh viÃªn Ä‘á»ƒ chuyá»ƒn.');
      return;
    }
    try {
      await mergeSessions.mutateAsync({
        targetSessionId,
        memberUserId: mergeMemberId,
      });
      setMergeMemberId('');
      toast.success('ÄÃ£ chuyá»ƒn thÃ nh viÃªn sang phiÃªn khÃ¡c.');
    } catch (err) {
      toast.error((err as Error)?.message || 'KhÃ´ng thá»ƒ gá»™p phiÃªn.');
    }
  };

  const handlePartialCheckout = async () => {
    if (partialMemberIds.size === 0) {
      toast.error('Chá»n thÃ nh viÃªn vá» trÆ°á»›c.');
      return;
    }
    try {
      // Tá»± Ä‘á»™ng Ä‘áº£m báº£o phiÃªn á»Ÿ tráº¡ng thÃ¡i Checking trÆ°á»›c khi thanh toÃ¡n má»™t pháº§n
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
        `ÄÃ£ thanh toÃ¡n má»™t pháº§n Â· ${formatCurrency(bill.totalDue)} cho ${partialMemberIds.size} ngÆ°á»i.`,
      );
    } catch (err) {
      toast.error((err as Error)?.message || 'KhÃ´ng thá»ƒ thanh toÃ¡n má»™t pháº§n.');
    }
  };

  const busy =
    addGuests.isPending ||
    addMembers.isPending ||
    mergeSessions.isPending ||
    partialCheckout.isPending;

  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start">
      {/* Cá»™t trÃ¡i: ThÃªm ngÆ°á»i */}
      <div className="space-y-4">
        <section className="overflow-hidden rounded-lg border bg-background">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 p-3.5 text-left md:p-4"
            onClick={() => setGuestFormOpen((open) => !open)}
            aria-expanded={guestFormOpen}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 shrink-0 text-orange-600" />
              ThÃªm khÃ¡ch vÃ´ danh
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
                ðŸ’¡ DÃ nh cho khÃ¡ch vÃ£ng lai Ä‘i cÃ¹ng nhÃ³m chÆ°a/khÃ´ng Ä‘Äƒng kÃ½ tÃ i khoáº£n App.
                {maxPlayers > 0
                  ? ` Â· Giá»›i háº¡n game: ${session.game?.minPlayers ?? 1}â€“${maxPlayers} ngÆ°á»i (hiá»‡n ${currentPlayerCount}).`
                  : ''}
              </p>
              {atPlayerCap ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                  ÄÃ£ Ä‘á»§ {maxPlayers} ngÆ°á»i â€” khÃ´ng thá»ƒ thÃªm ná»¯a.
                </p>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="guest-name">TÃªn hiá»ƒn thá»‹ (VÃ­ dá»¥: HoÃ ng)</Label>
                    <Input
                      id="guest-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="VD: HoÃ ng"
                    />
                  </div>
                  <Button type="button" disabled={busy} onClick={() => void handleAddGuests()}>
                    {addGuests.isPending ? <Spinner className="h-4 w-4" /> : 'ThÃªm'}
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
              <UserPlus className="h-4 w-4 shrink-0 text-orange-600" />
              ThÃªm thÃ nh viÃªn Ä‘áº¿n muá»™n
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${lateMemberFormOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {lateMemberFormOpen ? (
            <div className="space-y-3 border-t px-3.5 pb-3.5 md:px-4 md:pb-4">
              {atPlayerCap ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                  ÄÃ£ Ä‘á»§ {maxPlayers} ngÆ°á»i â€” khÃ´ng thá»ƒ thÃªm ná»¯a.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customer-search">TÃ¬m kiáº¿m khÃ¡ch hÃ ng (SÄT / Email / TÃªn)</Label>
                    <div className="relative">
                      <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="customer-search"
                        placeholder="Nháº­p SÄT (VD: 0987...), Email hoáº·c TÃªn..."
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
                        <p className="px-2 py-1 text-[10px] font-bold tracking-wider text-orange-800 uppercase">
                          Káº¿t quáº£ tÃ¬m tháº¥y ({searchResults.length})
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
                            className="flex w-full cursor-pointer items-center justify-between rounded-md border-b p-2 text-left transition-colors last:border-0 hover:bg-orange-50"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">
                                {user.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground">
                                  {user.fullName || user.username}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {user.phone ? `SÄT: ${user.phone}` : ''}{' '}
                                  {user.email ? `Â· ${user.email}` : ''}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-orange-300 bg-orange-50 text-[10px] text-orange-700"
                            >
                              Chá»n
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedUser && (
                      <div className="flex items-center justify-between rounded-lg border border-orange-300 bg-orange-50/70 p-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-orange-950">
                              {selectedUser.fullName || selectedUser.username}
                            </p>
                            <p className="text-[11px] text-orange-800">
                              {selectedUser.phone ? `SÄT: ${selectedUser.phone}` : ''}{' '}
                              {selectedUser.email ? `Â· ${selectedUser.email}` : ''}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                          onClick={() => {
                            setSelectedUser(null);
                            setCustomerSearchQuery('');
                          }}
                        >
                          Bá» chá»n
                        </Button>
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      ðŸ’¡ Nháº­p SÄT, Email hoáº·c TÃªn âž” Chá»n tÃ i khoáº£n âž” Báº¥m &quot;ThÃªm thÃ nh viÃªn vÃ o phiÃªn&quot;.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-orange-600 text-white hover:bg-orange-700"
                    disabled={busy || (!selectedUser && !customerSearchQuery.trim())}
                    onClick={() => void handleAddMembers()}
                  >
                    {addMembers.isPending ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    ThÃªm thÃ nh viÃªn vÃ o phiÃªn
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </section>
      </div>

      {/* Cá»™t pháº£i: Thanh toÃ¡n má»™t pháº§n & Gá»™p bÃ n */}
      <div className="space-y-4">
        <section className="space-y-3 rounded-lg border bg-background p-3.5 md:p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="h-4 w-4 text-orange-600" />
            Thanh toÃ¡n má»™t pháº§n (vá» trÆ°á»›c)
          </p>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">TÃ­ch chá»n thÃ nh viÃªn thanh toÃ¡n & vá» sá»›m:</Label>
            {membersList.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded-md border bg-muted/20 p-2 text-sm cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
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
            Thanh toÃ¡n má»™t pháº§n
          </Button>
        </section>

        <section className="space-y-3 rounded-lg border bg-background p-3.5 md:p-4">
          <p className="text-sm font-medium">Gá»™p / chuyá»ƒn thÃ nh viÃªn sang bÃ n khÃ¡c</p>
          {otherSessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">KhÃ´ng cÃ³ bÃ n Ä‘ang chÆ¡i khÃ¡c Ä‘á»ƒ gá»™p.</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="target-session">PhiÃªn Ä‘Ã­ch</Label>
                <select
                  id="target-session"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={targetSessionId}
                  onChange={(e) => setTargetSessionId(e.target.value)}
                >
                  <option value="">Chá»n bÃ n/phiÃªn</option>
                  {otherSessions.map((table) => (
                    <option key={table.sessionId} value={table.sessionId}>
                      {table.label}
                      {table.gameName ? ` Â· ${table.gameName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>ThÃ nh viÃªn chuyá»ƒn Ä‘i (1 ngÆ°á»i)</Label>
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
                Chuyá»ƒn sang phiÃªn Ä‘Ã­ch
              </Button>
            </>
          )}
        </section>

        <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          Káº¿t thÃºc phiÃªn: tab <span className="font-medium text-foreground">Game</span> â†’ Nháº­n láº¡i
          game â†’ kiá»ƒm kÃª â†’ tab <span className="font-medium text-foreground">Thanh toÃ¡n</span>.
        </p>
      </div>
    </div>
  );
}
