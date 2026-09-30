"use client";

// src/features/lobby-merge/components/lobby-merge-create-dialog.tsx

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { UsersRound, ArrowRight } from "lucide-react";
import { AxiosError } from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  LobbyMergeService,
} from "../services/lobby-merge.service";
import type { LobbyMergeRequestDto } from "../types/lobby-merge.interface";
import {
  useCreateMergeRequest,
  useBulkCreateMergeRequests,
  isMergeDifferentGamesError,
} from "../hooks/useMergeRequestMutations";

/**
 * Helper: detect lỗi `MergeDifferentGames` từ raw Error object (do service throw Error thuần).
 * Service throw Error có message chứa code BE → match theo string.
 */
function isDifferentGamesMessage(msg: string): boolean {
  // [FIX #vi-message] BE trả 2 dạng:
  //  - Cũ: "MergeDifferentGames" (mã lỗi tiếng Anh)
  //  - Mới (i18n): "Hai nhóm đang chơi game khác nhau" (Việt)
  // Bắt cả "khác game" lẫ "game khác" để dedup-toast luôn ưu tiên message VN.
  return (
    /MergeDifferentGames/i.test(msg) ||
    /khác\s*game|game\s*khác|chơi\s*game\s*khác/i.test(msg)
  );
}

export interface LobbyOption {
  id: string;
  name: string;
  /** Số member active hiện tại — dùng để validate ghế khả dụng. */
  activeMemberCount: number;
  /** AvailableSeats — số ghế còn trống (Optional — UI không mock, BE sẽ validate). */
  availableSeats?: number | null;
  status?: string;
}

export interface LobbyMergeMember {
  id: string;
  displayName: string;
  isHost?: boolean;
}

export interface LobbyMergeCreateDialogProps {
  cafeId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Tất cả lobby đang active tại quán — staff chọn source & target. */
  lobbies: LobbyOption[];
  /** Member thuộc lobby nguồn (FE chỉ hiển thị — BE validate lại). */
  members: LobbyMergeMember[];
  /** Lobby đang chọn sẵn khi mở dialog. */
  defaultSourceLobbyId?: string;
  /** Lobby đang chọn sẵn khi mở dialog. */
  defaultTargetLobbyId?: string;
  /** Member đang được chọn sẵn (khi click từ session detail). */
  defaultMemberId?: string;
  /**
   * Tra id UI (sessionId từ POS) → lobbyId BE thật.
   * Nếu không truyền → submit vẫn chạy nhưng BE có thể trả lỗi nếu cần lobbyId.
   */
  resolveLobbyId?: (uiId: string) => Promise<string | null>;
  /**
   * Map `memberId → lobbyId` để dialog lọc đúng member khi staff đổi source.
   * Nếu không truyền → dialog hiển thị tất cả member của mọi lobby (fallback).
   */
  memberLobbyIds?: Record<string, string[]>;
  onSuccess?: (created: LobbyMergeRequestDto | LobbyMergeRequestDto[]) => void;
}

export function LobbyMergeCreateDialog({
  cafeId,
  isOpen,
  onClose,
  lobbies,
  members,
  defaultSourceLobbyId,
  defaultTargetLobbyId,
  defaultMemberId,
  resolveLobbyId,
  memberLobbyIds: memberLobbyIdsProp,
  onSuccess,
}: LobbyMergeCreateDialogProps) {
  const [sourceLobbyId, setSourceLobbyId] = useState(defaultSourceLobbyId ?? "");
  const [targetLobbyId, setTargetLobbyId] = useState(defaultTargetLobbyId ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(
    defaultMemberId ? [defaultMemberId] : [],
  );
  const [reason, setReason] = useState("");

  const createOne = useCreateMergeRequest();
  const createBulk = useBulkCreateMergeRequests();
  const busy = createOne.isPending || createBulk.isPending;

  // Reset khi mở dialog
  useEffect(() => {
    if (isOpen) {
      setSourceLobbyId(defaultSourceLobbyId ?? "");
      setTargetLobbyId(defaultTargetLobbyId ?? "");
      setMemberIds(defaultMemberId ? [defaultMemberId] : []);
      setReason("");
    }
  }, [isOpen, defaultSourceLobbyId, defaultTargetLobbyId, defaultMemberId]);

  const sourceLobby = useMemo(
    () => lobbies.find((l) => l.id === sourceLobbyId),
    [lobbies, sourceLobbyId],
  );
  const targetLobby = useMemo(
    () => lobbies.find((l) => l.id === targetLobbyId),
    [lobbies, targetLobbyId],
  );

  // Stabilize lobby list để Radix Select không remount item khi parent re-render.
  const stableLobbies = useMemo(() => lobbies, [lobbies]);

  /**
   * Map `memberId → lobbyId` để dialog lọc đúng member khi staff đổi source.
   * Panel cha truyền xuống; nếu không truyền thì dialog hiển thị tất cả member.
   */
  const memberLobbyIds = memberLobbyIdsProp;

  /**
   * Member thuộc lobby nguồn hiện tại — dùng để hiển thị checkbox.
   *
   * Panel cha truyền `members` = tất cả member của mọi lobby gộp lại. Khi staff
   * đổi source lobby, ta lọc lại theo `sourceLobbyId` để chỉ hiển thị member
   * đúng lobby nguồn.
   */
  /**
   * [FIX #lobby-source-filter] Member list hiển thị phải khớp lobby nguồn đã chọn.
   *
   * - sourceLobbyId rỗng → trả [] để hiển thị placeholder "Chọn lobby nguồn trước".
   *   KHÔNG fallback về `members` (toàn bộ) vì staff sẽ thấy member của mọi
   *   lobby gộp lại → tick nhầm dẫn đến merge sai.
   * - sourceLobbyId có + memberLobbyIds có → filter đúng lobby.
   * - sourceLobbyId có + memberLobbyIds thiếu → fallback `members` (1 lobby duy nhất
   *   là hợp lý vì staff chỉ tick từ danh sách hiện). Log cảnh báo dev.
   */
  const filteredMembers = useMemo(() => {
    if (!sourceLobbyId) return [];
    if (!memberLobbyIds) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[lobby-merge] memberLobbyIds thiếu — hiển thị toàn bộ members; staff có thể tick nhầm member của lobby khác.",
        );
      }
      return members;
    }
    // [FIX #multi-lobby-member] 1 user có thể đứng trong nhiều lobby (host ở
    // Bàn 02 đồng thời player ở Bàn 03). Filter cho phép nếu `sourceLobbyId`
    // nằm trong danh sách lobby của user đó.
    const norm = (s: string) =>
      s.normalize("NFKC").replace(/[\s\u200B-\u200F\uFEFF]/g, "").trim();
    const normSourceId = norm(sourceLobbyId);
    const filtered = members.filter((m) => {
      const lobbies = memberLobbyIds[norm(m.id)];
      return Array.isArray(lobbies) && lobbies.includes(normSourceId);
    });
    if (process.env.NODE_ENV !== "production") {
      const sample = members.slice(0, 3).map((m) => ({
        memberId: m.id,
        mappedLobbies: memberLobbyIds[norm(m.id)],
        match: Array.isArray(memberLobbyIds[norm(m.id)]) &&
          memberLobbyIds[norm(m.id)].includes(normSourceId),
      }));
      console.info("[lobby-merge] filter", {
        sourceLobbyId,
        memberLobbyIdsKeysCount: Object.keys(memberLobbyIds).length,
        membersCount: members.length,
        filteredCount: filtered.length,
        sample,
      });
    }
    return filtered;
  }, [members, memberLobbyIds, sourceLobbyId]);

  // [FIX #ui-unique-key] Cuối cùng vẫn dedup theo id để React key warning không
  // xảy ra khi 2 session khác nhau nhưng BE trả cùng userId 2 lần cho cùng
  // sourceLobbyId (host đứng cả ở lobby A lẫ lobby B với role khác nhau).
  const visibleMembers = useMemo<LobbyMergeMember[]>(() => {
    const seen = new Set<string>();
    const out: LobbyMergeMember[] = [];
    for (const m of filteredMembers) {
      const id = String(m.id).trim();
      if (id.length === 0) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(m);
    }
    return out;
  }, [filteredMembers]);

  /**
   * Member thuộc lobby nguồn hiện tại đã tick chọn — dùng cho summary box.
   */
  const sourceMembers = useMemo(() => {
    return visibleMembers.filter((m) => memberIds.includes(m.id));
  }, [visibleMembers, memberIds]);

  /**
   * Reset member đã chọn nếu không thuộc lobby nguồn mới — tránh giữ tick "ma".
   */
  useEffect(() => {
    if (!sourceLobbyId || !memberLobbyIds) return;
    const norm = (s: string) =>
      s.normalize("NFKC").replace(/[\s\u200B-\u200F\uFEFF]/g, "").trim();
    const normSourceId = norm(sourceLobbyId);
    setMemberIds((current) =>
      current.filter((id) => {
        const lobbies = memberLobbyIds[norm(id)];
        return Array.isArray(lobbies) && lobbies.includes(normSourceId);
      }),
    );
  }, [sourceLobbyId, memberLobbyIds]);

  const toggleMember = (id: string) => {
    setMemberIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    );
  };

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handleSubmit = async () => {
    // eslint-disable-next-line no-console
    console.info("[lobby-merge] handleSubmit start", {
      hasResolveLobbyId: typeof resolveLobbyId === "function",
      sourceLobbyId: sourceLobbyId,
      targetLobbyId: targetLobbyId,
      memberCount: memberIds.length,
    });
    const src = sourceLobbyId.trim();
    const tgt = targetLobbyId.trim();
    if (!src || !tgt) {
      // eslint-disable-next-line no-console
      console.warn("[lobby-merge] missing src/tgt");
      toast.error("Chọn lobby nguồn và lobby đích.");
      return;
    }
    if (src === tgt) {
      // eslint-disable-next-line no-console
      console.warn("[lobby-merge] src === tgt");
      toast.error("Lobby nguồn và lobby đích phải khác nhau.");
      return;
    }
    const trimmedIds = memberIds.filter(Boolean);
    if (trimmedIds.length === 0) {
      // eslint-disable-next-line no-console
      console.warn("[lobby-merge] no members selected");
      toast.error("Chọn ít nhất 1 thành viên để chuyển nhóm.");
      return;
    }
    if (reason.length > 500) {
      toast.error("Lý do tối đa 500 ký tự.");
      return;
    }

    // Resolve UI id (sessionId từ POS) → lobbyId thật của BE.
    let resolvedSource = src;
    let resolvedTarget = tgt;
    if (resolveLobbyId) {
      // eslint-disable-next-line no-console
      console.info("[lobby-merge] resolving lobbyIds", { src, tgt });
      try {
        const [srcLobby, tgtLobby] = await Promise.all([
          resolveLobbyId(src),
          resolveLobbyId(tgt),
        ]);
        // eslint-disable-next-line no-console
        console.info("[lobby-merge] resolved lobbyIds", { srcLobby, tgtLobby });
        // Phải có lobbyId thật — nếu null thì không submit (BE sẽ 404).
        if (!srcLobby) {
          const msg = `Không tìm được lobbyId cho lobby nguồn (sessionId=${src.slice(0, 8)}). Có thể session chưa có lobbyId — thử reload POS hoặc chọn lobby khác.`;
          // eslint-disable-next-line no-console
          console.error("[lobby-merge] BLOCKED: missing source lobbyId", {
            sourceSessionId: src,
            sourceLobbyIdReturned: null,
            hint: "BE trả lobbyId=null cho session này — bug BE hoặc session walk-in không có lobby.",
          });
          toast.error(msg, { duration: 8000 });
          return;
        }
        if (!tgtLobby) {
          const msg = `Không tìm được lobbyId cho lobby đích (sessionId=${tgt.slice(0, 8)}). Có thể session chưa có lobbyId — thử reload POS hoặc chọn lobby khác.`;
          // eslint-disable-next-line no-console
          console.error("[lobby-merge] BLOCKED: missing target lobbyId", {
            targetSessionId: tgt,
            targetLobbyIdReturned: null,
          });
          toast.error(msg, { duration: 8000 });
          return;
        }
        resolvedSource = srcLobby;
        resolvedTarget = tgtLobby;
        if (resolvedSource === resolvedTarget) {
          toast.error("Không thể tra được lobby khác nhau — kiểm tra session detail.");
          return;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[lobby-merge] resolveLobbyId threw", err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Không tra được lobbyId từ session detail.",
        );
        return;
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        "[lobby-merge] NO resolveLobbyId prop — sẽ gửi sessionId thẳng lên BE.",
      );
    }

    // Log debug để staff/developer thấy chính xác gì được gửi lên BE.
    // eslint-disable-next-line no-console
    console.info("[lobby-merge] submit", {
      cafeId,
      sourceLobbyId: resolvedSource,
      targetLobbyId: resolvedTarget,
      memberCount: trimmedIds.length,
      reason: reason.trim() || undefined,
    });

    if (trimmedIds.length === 1) {
      // 1 member → dùng mutation đơn để có loading state & toast riêng.
      // Theo docs LobbyMergeController: body chỉ { sourceLobbyId, targetLobbyId, reason, idempotencyKey }.
      // Service sẽ tự loop 1 member / idempotencyKey — không cần memberUserId.
      createOne.mutate(
        {
          cafeId,
          sourceLobbyId: resolvedSource,
          targetLobbyId: resolvedTarget,
          reason: reason.trim() || undefined,
          idempotencyKey: `MERGE-${trimmedIds[0]}-${Date.now()}`,
        },
        {
          onSuccess: (data) => {
            onSuccess?.(data);
            onClose();
          },
        },
      );
      return;
    }

    // Nhiều member → dùng bulk helper trong service (Promise.allSettled)
    try {
      const results = await LobbyMergeService.createBulkMergeRequests(cafeId, {
        sourceLobbyId: resolvedSource,
        targetLobbyId: resolvedTarget,
        memberUserIds: trimmedIds,
        reason: reason.trim() || undefined,
      });
      const success = results.filter((r) => r.ok).map((r) =>
        r.ok ? r.request : null,
      );
      const fail = results.filter((r) => !r.ok);

      // Phát hiện lỗi MergeDifferentGames — staff cần EndGame + ComponentCheck trước.
      // Khi đó tất cả member đều fail cùng 1 lý do → ưu tiên toast riêng.
      const allFailsAreDifferentGames = fail.length > 0 && fail.every((f) => {
        if (!f || f.ok) return false;
        return isDifferentGamesMessage(f.error);
      });

      if (allFailsAreDifferentGames) {
        toast.error(
          "Lobby nguồn đang chơi game khác và chưa trả hộp về quán. " +
            "Vào POS → bấm \"Trả game\" + \"Kiểm kê linh kiện\" cho lobby nguồn, rồi thử lại.",
          { duration: 8000 },
        );
        return;
      }

      if (success.length === 0) {
        toast.error(`Không tạo được yêu cầu ghép: ${fail[0]?.error ?? "Lỗi"}`);
        return;
      }
      if (fail.length > 0) {
        toast.warning(
          `Đã gửi ${success.length}/${results.length} yêu cầu — ${fail.length} lỗi.`,
        );
      } else {
        toast.success(`Đã gửi ${success.length} yêu cầu ghép nhóm.`);
      }
      onSuccess?.(success.filter(Boolean) as LobbyMergeRequestDto[]);
      onClose();
    } catch (err) {
      // Catch-all cho lỗi không lường trước (vd: throw Error thuần không phải AxiosError).
      if (err instanceof AxiosError && isMergeDifferentGamesError(err)) {
        toast.error(
          "Lobby nguồn đang chơi game khác và chưa trả hộp về quán. " +
            "Vào POS → bấm \"Trả game\" + \"Kiểm kê linh kiện\" cho lobby nguồn, rồi thử lại.",
          { duration: 8000 },
        );
        return;
      }
      toast.error(err instanceof Error ? err.message : "Tạo yêu cầu thất bại.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
      {/* Layout ngang 2 cột, dialog mở rộng theo chiều ngang.
          - sm:max-w-3xl (~768px) cho tablet
          - md:max-w-5xl (~896px) cho laptop nhỏ
          - lg:max-w-6xl (~1152px) cho desktop — đây là size lý tưởng cho 2 cột horizontal
          - xl:max-w-7xl (~1280px) cho màn hình rộng
          Lưu ý: PHẢI dùng `sm:max-w-*` thay vì `max-w-*` để thắng
          `sm:max-w-md` mặc định trong DialogContent (cùng breakpoint, sau trong cascade). */}
      <DialogContent className="flex max-h-[88vh] w-full flex-col gap-4 overflow-hidden p-5 sm:max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl">
        <DialogHeader className="shrink-0 gap-1">
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="size-4" />
            Tạo yêu cầu ghép lobby
          </DialogTitle>
          <DialogDescription>
            Chọn lobby nguồn (nhóm rời) → lobby đích (nhóm nhận) → thành viên muốn chuyển.
            Mỗi thành viên tạo 1 yêu cầu Pending riêng — staff quán duyệt từng yêu cầu.
          </DialogDescription>
        </DialogHeader>

        {/* Body 2 cột trên md+, xếp dọc trên mobile.
            items-start: 2 cột không ép height bằng nhau.
            md:overflow-hidden: dialog không scroll toàn bộ — mỗi cột scroll nội bộ. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden md:flex-row md:items-start">
          {/* === CỘT TRÁI: Source / Target + Member list === */}
          <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-3 md:overflow-y-auto md:pr-3">
            {/* Source / Target — luôn 2 cột ngang từ sm+ (select ngắn không cần wrap). */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div className="min-w-0 space-y-1.5">
                <Label>Lobby nguồn (rời đi)</Label>
                <Select
                  value={sourceLobbyId}
                  onValueChange={(v) => {
                    // Nếu chọn trùng lobby đích → tự swap source ↔ target.
                    if (v && v === targetLobbyId) {
                      setTargetLobbyId(sourceLobbyId);
                    }
                    setSourceLobbyId(v);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn lobby nguồn" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* [FIX #select-empty-value] Radix Select cấm value rỗng.
                        Lọc id rỗng để tránh React crash khi BE trả lobby
                        chưa gắn id (walk-in session). */}
                    {stableLobbies
                      .filter((l) => l.id && l.id.trim().length > 0)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} {l.status ? `· ${l.status}` : ""}
                          {l.availableSeats != null ? ` · ghế trống ${l.availableSeats}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {sourceLobby ? (
                  <p className="truncate text-xs text-neutral-600">
                    Đang chơi: {sourceLobby.activeMemberCount} thành viên
                  </p>
                ) : null}
              </div>

              <div className="hidden items-center justify-center pb-1 sm:flex">
                <ArrowRight className="size-5 shrink-0 text-neutral-400" />
              </div>

              <div className="min-w-0 space-y-1.5">
                <Label>Lobby đích (nhận vào)</Label>
                <Select
                  value={targetLobbyId}
                  onValueChange={(v) => {
                    // Nếu chọn trùng lobby nguồn → tự swap source ↔ target.
                    if (v && v === sourceLobbyId) {
                      setSourceLobbyId(targetLobbyId);
                    }
                    setTargetLobbyId(v);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn lobby đích" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* [FIX #select-empty-value] Radix Select cấm value rỗng.
                        Lọc id rỗng để tránh React crash khi BE trả lobby
                        chưa gắn id (walk-in session). */}
                    {stableLobbies
                      .filter((l) => l.id && l.id.trim().length > 0)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} {l.status ? `· ${l.status}` : ""}
                          {l.availableSeats != null ? ` · ghế trống ${l.availableSeats}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {targetLobby ? (
                  <p className="truncate text-xs text-neutral-600">
                    Đang chơi: {targetLobby.activeMemberCount} thành viên
                    {targetLobby.availableSeats != null
                      ? ` · ghế trống ${targetLobby.availableSeats}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Member list — max-height cố định theo viewport, scroll nội bộ.
                60vh ~ 7-10 thành viên hiển thị, dài hơn thì scroll.
                items cao 2.5rem để click dễ, ID hiển thị 10 ký tự thay vì 8 cho dễ đọc. */}
            <div className="flex min-h-0 flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Thành viên muốn chuyển</Label>
                {memberIds.length > 0 ? (
                  <span className="text-xs text-neutral-700">
                    Đã chọn <strong className="text-orange-700">{memberIds.length}</strong>
                  </span>
                ) : null}
              </div>
              {visibleMembers.length === 0 ? (
                <p className="rounded-md border border-dashed py-3 text-center text-sm text-neutral-600">
                  {sourceLobbyId
                    ? "Lobby nguồn không có thành viên nào."
                    : "Chọn lobby nguồn trước."}
                </p>
              ) : (
                <div className="max-h-[60vh] space-y-1 overflow-y-auto rounded-md border bg-white p-2">
                  {visibleMembers.map((m, idx) => {
                    // [FIX #unique-key] Dùng composite key id+idx để React không
                    // warning khi 1 user đứng trong nhiều lobby (host ở Bàn 02 đồng
                    // thời player ở Bàn 03). idx đảm bảo uniqueness trong cùng
                    // render; id giữ cho React khớp component identity qua update.
                    const compositeKey = `${m.id}::${idx}`;
                    const selected = memberIds.includes(m.id);
                    return (
                      <button
                        key={compositeKey}
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className={`flex w-full min-w-0 items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-sm transition ${
                          selected
                            ? "bg-orange-50 ring-1 ring-orange-400"
                            : "hover:bg-neutral-50"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            aria-hidden
                            className={`inline-flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                              selected
                                ? "border-orange-500 bg-orange-500 text-white"
                                : "border-neutral-300"
                            }`}
                          >
                            {selected ? "✓" : ""}
                          </span>
                          <span className="truncate font-medium">{m.displayName}</span>
                          {m.isHost ? (
                            <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
                              Host
                            </Badge>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-neutral-500">
                          {m.id.slice(0, 10)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compact hint: hướng dẫn ngắn khi chưa chọn đủ */}
            {!sourceLobbyId || !targetLobbyId ? (
              <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900">
                <p className="font-semibold">Cần chọn đủ:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  <li className={sourceLobbyId ? "text-emerald-700" : ""}>
                    Lobby nguồn
                  </li>
                  <li className={targetLobbyId ? "text-emerald-700" : ""}>
                    Lobby đích
                  </li>
                  <li className={memberIds.length > 0 ? "text-emerald-700" : ""}>
                    Ít nhất 1 thành viên
                  </li>
                </ul>
              </div>
            ) : null}
          </div>

          {/* === CỘT PHẢI: Lý do + Summary ===
              - lg:w-[360px] đủ rộng cho textarea.
              - shrink-0: chiếm đúng width, không bị ép.
              - Cao theo nội dung (không stretch). */}
          <div className="flex shrink-0 flex-col gap-3 md:w-full md:border-t md:pt-4 lg:w-[360px] lg:border-l lg:border-t-0 lg:pt-0 lg:pl-4">
            <div className="space-y-1.5">
              <Label htmlFor="merge-reason">Lý do (tuỳ chọn, tối đa 500 ký tự)</Label>
              <Textarea
                id="merge-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Khách yêu cầu chuyển sang nhóm bạn để chơi chung."
                rows={5}
                maxLength={500}
                className="w-full resize-none"
              />
              <p className="text-right text-xs text-neutral-500">{reason.length}/500</p>
            </div>

            {sourceMembers.length > 0 ? (
              <div className="rounded-md border border-orange-200 bg-orange-50/50 p-3 text-xs text-orange-900">
                <p className="font-semibold">Sẽ tạo {sourceMembers.length} yêu cầu:</p>
                <ul className="mt-1 list-disc space-y-0.5 overflow-y-auto pl-4 max-h-[160px]">
                  {sourceMembers.map((m) => (
                    <li key={m.id} className="break-words">
                      {m.displayName}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-3 text-xs text-neutral-500">
                Tick thành viên ở cột trái để xem trước các yêu cầu sẽ gửi.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t pt-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
            Huỷ
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={busy}>
            {busy ? <Spinner className="size-4" /> : null}
            {busy ? "Đang gửi…" : `Gửi ${memberIds.length} yêu cầu`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
