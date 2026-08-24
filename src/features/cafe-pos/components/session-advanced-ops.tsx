/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Barcode,
  Box,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Search,
  Split,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import type { ComponentChecklistItem } from "@/features/pos-check-in/types/pos-check-in.interface";
import type { PosBoxItem } from "./pos-boxes-tab";
import { isBoxStatusAvailable } from "./pos-boxes-tab";

type InventoryLossPayload = {
  sessionGameId: string;
  missingComponents: Array<{
    componentTemplateId: string;
    missingQuantity: number;
  }>;
  notes?: string;
};

type CustomerUser = {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  phone?: string;
};

interface GroupedGame {
  gameName: string;
  gameTemplateId: string;
  totalBoxes: number;
  availableBoxes: PosBoxItem[];
  allBoxes: PosBoxItem[];
}

function formatBoxStatus(status?: string) {
  const st = String(status ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
  if (st === "available") return "Sẵn sàng";
  if (st === "inuse" || st === "occupied") return "Đang dùng";
  if (st === "maintenance") return "Bảo trì";
  return status?.trim() || "Không rõ";
}

type SessionAdvancedOpsProps = {
  cafeId: string;
  sessionId: string;
  detail: any;
  boxes?: PosBoxItem[];
  otherSessions: Array<{
    id: string;
    tableName?: string;
    status?: string;
  }>;
  busy?: boolean;
  onAttachGame: (barcode: string) => Promise<boolean>;
  onAddMembers: (userIds: string[]) => Promise<boolean>;
  onReportInventoryLoss: (payload: InventoryLossPayload) => Promise<boolean>;
  onPartialCheckout: (
    memberUserIds: string[],
    applyDeposit?: boolean,
  ) => Promise<boolean>;
  onMergeMember: (
    memberUserId: string,
    targetSessionId: string,
  ) => Promise<boolean>;
  onRefreshDetail: () => Promise<void>;
};

function readMemberId(member: any) {
  return String(member?.userId ?? member?.UserId ?? member?.id ?? "");
}

function readMemberName(member: any) {
  return String(
    member?.userName ??
      member?.UserName ??
      member?.displayName ??
      member?.username ??
      readMemberId(member),
  );
}

function readGameId(game: any) {
  return String(game?.sessionGameId ?? game?.id ?? "");
}

function Section({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="h-fit rounded-xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-neutral-50"
        aria-expanded={open}
      >
        <h5 className="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-900">
          {icon}
          <span className="truncate">{title}</span>
        </h5>
        <ChevronDown
          className={`size-4 shrink-0 text-neutral-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? <div className="space-y-3 border-t border-neutral-100 p-3">{children}</div> : null}
    </section>
  );
}

export function SessionAdvancedOps({
  cafeId,
  detail,
  boxes = [],
  otherSessions,
  busy = false,
  onAttachGame,
  onAddMembers,
  onReportInventoryLoss,
  onPartialCheckout,
  onMergeMember,
  onRefreshDetail,
}: SessionAdvancedOpsProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerGame, setPickerGame] = useState<GroupedGame | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<CustomerUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [lossGameId, setLossGameId] = useState("");
  const [lossComponents, setLossComponents] = useState<ComponentChecklistItem[]>(
    [],
  );
  const [loadingLossComponents, setLoadingLossComponents] = useState(false);
  const [componentTemplateId, setComponentTemplateId] = useState("");
  const [missingQuantity, setMissingQuantity] = useState("1");
  const [lossNotes, setLossNotes] = useState("");
  const [partialMemberIds, setPartialMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [applyDeposit, setApplyDeposit] = useState(true);
  const [mergeMemberId, setMergeMemberId] = useState("");
  const [targetSessionId, setTargetSessionId] = useState("");
  const [opsOpen, setOpsOpen] = useState(false);

  const games = detail?.games ?? detail?.Games ?? [];
  const members = useMemo(
    () =>
      (detail?.members ?? detail?.Members ?? []).filter((member: any) => {
        const id = readMemberId(member);
        return id && !id.startsWith("guest-slot-") && !id.startsWith("guest-auto-");
      }),
    [detail],
  );

  const groupedGames = useMemo(() => {
    const map = new Map<string, GroupedGame>();
    boxes.forEach((box) => {
      const key = box.gameName || box.gameTemplateId || "Game";
      const existing = map.get(key) || {
        gameName: box.gameName || "Game",
        gameTemplateId: box.gameTemplateId,
        totalBoxes: 0,
        availableBoxes: [],
        allBoxes: [],
      };
      existing.totalBoxes += 1;
      existing.allBoxes.push(box);
      if (String(box.status).toLowerCase() === "available") {
        existing.availableBoxes.push(box);
      }
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.gameName.localeCompare(b.gameName, "vi"),
    );
  }, [boxes]);

  const filteredGames = useMemo(() => {
    const withStock = groupedGames.filter((g) => g.availableBoxes.length > 0);
    const term = pickerSearch.trim().toLowerCase();
    if (!term) return withStock;
    return withStock.filter((group) => {
      if (group.gameName.toLowerCase().includes(term)) return true;
      return group.availableBoxes.some((b) =>
        b.barcode.toLowerCase().includes(term),
      );
    });
  }, [groupedGames, pickerSearch]);

  const status = String(
    detail?.status ?? detail?.Status ?? detail?.sessionStatus ?? "",
  ).toLowerCase();
  const disabled =
    busy ||
    pendingAction !== null ||
    status === "paid" ||
    status === "completed";

  useEffect(() => {
    if (!cafeId || !lossGameId) {
      setLossComponents([]);
      return;
    }
    let cancelled = false;
    setLoadingLossComponents(true);
    void PosCheckInService.getComponentChecklist(cafeId, lossGameId)
      .then((checklist) => {
        if (cancelled) return;
        setLossComponents(checklist.components || []);
      })
      .catch(() => {
        if (!cancelled) setLossComponents([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLossComponents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cafeId, lossGameId]);

  const runAction = async (
    action: string,
    callback: () => Promise<boolean>,
    onSuccess?: () => void,
  ) => {
    setPendingAction(action);
    try {
      const ok = await callback();
      if (ok) {
        onSuccess?.();
        await onRefreshDetail();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Nhập tên, email hoặc số điện thoại để tìm.");
      return;
    }
    setSearching(true);
    try {
      setSearchResults(
        await PosCheckInService.searchCustomerUsers(searchQuery.trim()),
      );
    } catch {
      setSearchResults([]);
      toast.error("Không tìm được khách hàng.");
    } finally {
      setSearching(false);
    }
  };

  const togglePartialMember = (id: string) => {
    setPartialMemberIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3 lg:border-l lg:border-neutral-100 lg:pl-4">
      <button
        type="button"
        onClick={() => setOpsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-left hover:border-neutral-400 hover:bg-neutral-100/80"
        aria-expanded={opsOpen}
      >
        <div className="min-w-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            Thao tác bổ sung
          </h4>
          {(status === "paid" || status === "completed") && (
            <p className="mt-0.5 text-[11px] font-medium text-neutral-500">
              Phiên đã hoàn tất nên các thao tác đã bị khóa.
            </p>
          )}
          {!opsOpen ? (
            <p className="mt-0.5 text-[11px] text-neutral-500">
              Bấm để mở gán hộp, thêm member, hao hụt, thanh toán một phần…
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={`size-5 shrink-0 text-neutral-500 transition-transform ${
            opsOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {opsOpen ? (
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <Section
          icon={<Barcode className="size-4 text-neutral-600" />}
          title="Gán thêm hộp game"
        >
          <div className="flex gap-2">
            <Input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="Mã vạch hộp game"
              disabled={disabled}
              className="h-8 border-neutral-200 text-xs font-mono"
            />
            <Button
              type="button"
              size="sm"
              disabled={disabled || !barcode.trim()}
              className="h-8 shrink-0 bg-neutral-950 px-3 text-xs text-white"
              onClick={() => {
                if (!barcode.trim()) {
                  toast.error("Nhập hoặc chọn mã vạch hộp game.");
                  return;
                }
                const code = barcode.trim();
                const selectable = boxes.find(
                  (b) =>
                    b.barcode.toLowerCase() === code.toLowerCase() &&
                    isBoxStatusAvailable(b.status),
                );
                if (boxes.length > 0 && !selectable) {
                  toast.error(
                    "Hộp không sẵn sàng hoặc đang gắn phiên khác — chọn hộp trống từ kho.",
                  );
                  return;
                }
                void runAction(
                  "attach",
                  () => onAttachGame(code),
                  () => setBarcode(""),
                );
              }}
            >
              {pendingAction === "attach" ? "Đang gán..." : "Gán hộp"}
            </Button>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setPickerOpen(true);
              setPickerGame(null);
              setPickerSearch("");
            }}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2 text-left hover:border-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
              <Layers className="size-3.5 text-neutral-500" />
              Hoặc chọn từ kho (game → hộp)
            </span>
            <ChevronRight className="size-4 shrink-0 text-neutral-400" />
          </button>
        </Section>

        <Section
          icon={<UserPlus className="size-4 text-neutral-600" />}
          title="Thêm member đến muộn"
        >
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              placeholder="Tên, email hoặc SĐT"
              disabled={disabled}
              className="h-8 border-neutral-200 text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || searching}
              onClick={() => void handleSearch()}
              className="h-8 border-neutral-200 px-2.5"
              aria-label="Tìm khách hàng"
            >
              <Search className="size-3.5" />
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-1">
              {searchResults.map((user) => {
                const selected = selectedUsers.some((item) => item.id === user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    disabled={disabled || selected}
                    onClick={() =>
                      setSelectedUsers((current) => [...current, user])
                    }
                    className="w-full rounded-md px-2 py-1.5 text-left hover:bg-neutral-100 disabled:opacity-50"
                  >
                    <span className="block text-xs font-semibold text-neutral-900">
                      {user.fullName || user.username}
                    </span>
                    <span className="block truncate text-[10px] text-neutral-500">
                      {user.email || user.phone || user.username}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    setSelectedUsers((current) =>
                      current.filter((item) => item.id !== user.id),
                    )
                  }
                  className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-semibold text-neutral-700"
                  title="Bấm để bỏ chọn"
                >
                  {user.fullName || user.username} ×
                </button>
              ))}
            </div>
          )}

          <Button
            type="button"
            size="sm"
            disabled={disabled || selectedUsers.length === 0}
            onClick={() => {
              if (selectedUsers.length === 0) {
                toast.error("Chọn ít nhất một member.");
                return;
              }
              void runAction(
                "members",
                () => onAddMembers(selectedUsers.map((user) => user.id)),
                () => {
                  setSelectedUsers([]);
                  setSearchResults([]);
                  setSearchQuery("");
                },
              );
            }}
            className="h-8 w-full bg-neutral-950 text-xs text-white"
          >
            {pendingAction === "members"
              ? "Đang thêm..."
              : `Thêm ${selectedUsers.length || ""} member`}
          </Button>
        </Section>

        <Section
          icon={<Boxes className="size-4 text-neutral-600" />}
          title="Ghi nhận hao hụt"
        >
          <select
            value={lossGameId}
            onChange={(event) => {
              setLossGameId(event.target.value);
              setComponentTemplateId("");
            }}
            disabled={disabled}
            className="h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-900 disabled:opacity-50"
          >
            <option value="">Chọn hộp game trong phiên</option>
            {games.map((game: any) => {
              const id = readGameId(game);
              return (
                <option key={id} value={id}>
                  {game.gameName || game.name || game.boxBarcode || id}
                </option>
              );
            })}
          </select>
          {loadingLossComponents ? (
            <p className="text-[11px] text-neutral-500">Đang tải linh kiện...</p>
          ) : null}
          {lossComponents.length > 0 ? (
            <select
              value={componentTemplateId}
              onChange={(event) => setComponentTemplateId(event.target.value)}
              disabled={disabled}
              className="h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-900 disabled:opacity-50"
            >
              <option value="">Chọn linh kiện từ checklist</option>
              {lossComponents.map((item) => (
                <option key={item.componentId} value={item.componentId}>
                  {item.componentName} (kỳ vọng {item.expectedQuantity})
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={componentTemplateId}
              onChange={(event) => setComponentTemplateId(event.target.value)}
              placeholder="Component template ID (nếu không tải được checklist)"
              disabled={disabled}
              className="h-8 border-neutral-200 text-xs"
            />
          )}
          <Input
            type="number"
            min={1}
            value={missingQuantity}
            onChange={(event) => setMissingQuantity(event.target.value)}
            disabled={disabled}
            aria-label="Số lượng thiếu"
            className="h-8 border-neutral-200 text-xs"
          />
          <Textarea
            value={lossNotes}
            onChange={(event) => setLossNotes(event.target.value)}
            placeholder="Ghi chú hao hụt (không bắt buộc)"
            disabled={disabled}
            className="min-h-16 border-neutral-200 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              const quantity = Number(missingQuantity);
              if (!lossGameId || !componentTemplateId.trim() || quantity < 1) {
                toast.error("Chọn game, linh kiện và số lượng hợp lệ.");
                return;
              }
              void runAction(
                "loss",
                () =>
                  onReportInventoryLoss({
                    sessionGameId: lossGameId,
                    missingComponents: [
                      {
                        componentTemplateId: componentTemplateId.trim(),
                        missingQuantity: quantity,
                      },
                    ],
                    notes: lossNotes.trim() || undefined,
                  }),
                () => {
                  setComponentTemplateId("");
                  setMissingQuantity("1");
                  setLossNotes("");
                },
              );
            }}
            className="h-8 w-full border-amber-300 text-xs font-semibold text-amber-900"
          >
            {pendingAction === "loss" ? "Đang ghi nhận..." : "Ghi nhận hao hụt"}
          </Button>
        </Section>

        <Section
          icon={<Split className="size-4 text-neutral-600" />}
          title="Thanh toán một phần"
        >
          <div className="max-h-28 space-y-1.5 overflow-y-auto">
            {members.length === 0 ? (
              <p className="text-[11px] text-neutral-500">
                Phiên chưa có member tài khoản.
              </p>
            ) : (
              members.map((member: any) => {
                const id = readMemberId(member);
                return (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-100 px-2 py-1.5 text-xs font-medium text-neutral-800"
                  >
                    <Checkbox
                      checked={partialMemberIds.has(id)}
                      onCheckedChange={() => togglePartialMember(id)}
                      disabled={disabled}
                    />
                    <span className="truncate">{readMemberName(member)}</span>
                  </label>
                );
              })
            )}
          </div>
          <label className="flex items-center gap-2 text-[11px] font-medium text-neutral-700">
            <Checkbox
              checked={applyDeposit}
              onCheckedChange={(checked) => setApplyDeposit(checked === true)}
              disabled={disabled}
            />
            Áp dụng tiền cọc
          </label>
          <Button
            type="button"
            size="sm"
            disabled={disabled || partialMemberIds.size === 0}
            onClick={() => {
              if (partialMemberIds.size === 0) {
                toast.error("Chọn ít nhất một member để thanh toán.");
                return;
              }
              void runAction(
                "partial",
                () =>
                  onPartialCheckout(
                    Array.from(partialMemberIds),
                    applyDeposit,
                  ),
                () => setPartialMemberIds(new Set()),
              );
            }}
            className="h-8 w-full bg-neutral-950 text-xs text-white"
          >
            {pendingAction === "partial"
              ? "Đang xử lý..."
              : "Thanh toán member đã chọn"}
          </Button>
        </Section>

        <div className="md:col-span-2">
          <Section
            icon={<UsersRound className="size-4 text-neutral-600" />}
            title="Ghép sang phiên khác"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={mergeMemberId}
                onChange={(event) => setMergeMemberId(event.target.value)}
                disabled={disabled}
                className="h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-900 disabled:opacity-50"
              >
                <option value="">Chọn thành viên cần chuyển</option>
                {members.map((member: any) => {
                  const id = readMemberId(member);
                  return (
                    <option key={id} value={id}>
                      {readMemberName(member)}
                    </option>
                  );
                })}
              </select>
              <select
                value={targetSessionId}
                onChange={(event) => setTargetSessionId(event.target.value)}
                disabled={disabled}
                className="h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-900 disabled:opacity-50"
              >
                <option value="">Chọn bàn muốn gộp sang</option>
                {otherSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.tableName || `Phiên ${session.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || !mergeMemberId || !targetSessionId}
              onClick={() => {
                if (!mergeMemberId || !targetSessionId) {
                  toast.error("Chọn thành viên và bàn muốn gộp sang.");
                  return;
                }
                void runAction(
                  "merge",
                  () => onMergeMember(mergeMemberId, targetSessionId),
                  () => {
                    setMergeMemberId("");
                    setTargetSessionId("");
                  },
                );
              }}
              className="h-8 w-full border-neutral-300 text-xs font-semibold"
            >
              {pendingAction === "merge"
                ? "Đang chuyển..."
                : "Chuyển member sang phiên đích"}
            </Button>
          </Section>
        </div>
      </div>
      ) : null}

      {pickerOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                {pickerGame ? (
                  <button
                    type="button"
                    onClick={() => setPickerGame(null)}
                    className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
                    aria-label="Quay lại danh sách game"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                ) : (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-2">
                    <Layers className="size-4 text-neutral-800" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-neutral-950">
                    {pickerGame ? pickerGame.gameName : "Chọn game từ kho"}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {pickerGame
                      ? `${pickerGame.availableBoxes.length}/${pickerGame.totalBoxes} hộp sẵn sàng`
                      : `${groupedGames.length} tựa · ${boxes.length} hộp`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  setPickerGame(null);
                  setPickerSearch("");
                }}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950"
              >
                <X className="size-5" />
              </button>
            </div>

            {!pickerGame ? (
              <>
                <div className="border-b border-neutral-100 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                    <Input
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Tìm tên game hoặc mã vạch..."
                      className="h-9 border-neutral-200 bg-neutral-50/50 pl-9 text-xs"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {filteredGames.length === 0 ? (
                    <p className="py-10 text-center text-xs text-neutral-400">
                      Không có game/hộp phù hợp trong kho.
                    </p>
                  ) : (
                    filteredGames.map((group, groupIdx) => (
                      <button
                        key={`${group.gameTemplateId || "g"}-${group.gameName}-${groupIdx}`}
                        type="button"
                        onClick={() => setPickerGame(group)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-neutral-400"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-700">
                            <Box className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-neutral-950">
                              {group.gameName}
                            </p>
                            <p className="text-[11px] font-semibold text-emerald-700">
                              {group.availableBoxes.length}/{group.totalBoxes}{" "}
                              hộp sẵn sàng
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="size-5 shrink-0 text-neutral-400" />
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {pickerGame.availableBoxes.length === 0 ? (
                  <p className="py-10 text-center text-xs text-neutral-400">
                    Game này không còn hộp trống để gán.
                  </p>
                ) : (
                  pickerGame.availableBoxes.map((box, boxIdx) => (
                      <button
                        key={box.barcode || `${box.id}-${boxIdx}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setBarcode(box.barcode);
                          setPickerOpen(false);
                          setPickerGame(null);
                          setPickerSearch("");
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-emerald-400 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-neutral-950">
                            {box.barcode}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {formatBoxStatus(box.status)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Chọn
                        </span>
                      </button>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
