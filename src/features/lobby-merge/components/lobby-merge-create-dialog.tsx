"use client";

// src/features/lobby-merge/components/lobby-merge-create-dialog.tsx

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { UsersRound, ArrowRight } from "lucide-react";
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
import { useCreateMergeRequest, useBulkCreateMergeRequests } from "../hooks/useMergeRequestMutations";

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
  memberLobbyIds?: Record<string, string>;
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
  const filteredMembers = useMemo(() => {
    if (!sourceLobbyId || !memberLobbyIds) return members;
    return members.filter((m) => memberLobbyIds[m.id] === sourceLobbyId);
  }, [members, memberLobbyIds, sourceLobbyId]);

  /**
   * Member thuộc lobby nguồn hiện tại đã tick chọn — dùng cho summary box.
   */
  const sourceMembers = useMemo(() => {
    return filteredMembers.filter((m) => memberIds.includes(m.id));
  }, [filteredMembers, memberIds]);

  /**
   * Reset member đã chọn nếu không thuộc lobby nguồn mới — tránh giữ tick "ma".
   */
  useEffect(() => {
    if (!sourceLobbyId || !memberLobbyIds) return;
    setMemberIds((current) =>
      current.filter((id) => memberLobbyIds[id] === sourceLobbyId),
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
      toast.error(err instanceof Error ? err.message : "Tạo yêu cầu thất bại.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="size-4" />
            Tạo yêu cầu ghép lobby
          </DialogTitle>
          <DialogDescription>
            Chọn lobby nguồn (nhóm rời) → lobby đích (nhóm nhận) → thành viên muốn chuyển.
            Mỗi thành viên tạo 1 yêu cầu Pending riêng — staff quán duyệt từng yêu cầu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div className="space-y-1.5">
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
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lobby nguồn" />
                </SelectTrigger>
                <SelectContent>
                  {stableLobbies.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} {l.status ? `· ${l.status}` : ""}
                      {l.availableSeats != null ? ` · ghế trống ${l.availableSeats}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceLobby ? (
                <p className="text-xs text-neutral-600">
                  Đang chơi: {sourceLobby.activeMemberCount} thành viên
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-center pb-1">
              <ArrowRight className="size-5 text-neutral-400" />
            </div>

            <div className="space-y-1.5">
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
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lobby đích" />
                </SelectTrigger>
                <SelectContent>
                  {stableLobbies.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} {l.status ? `· ${l.status}` : ""}
                      {l.availableSeats != null ? ` · ghế trống ${l.availableSeats}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetLobby ? (
                <p className="text-xs text-neutral-600">
                  Đang chơi: {targetLobby.activeMemberCount} thành viên
                  {targetLobby.availableSeats != null
                    ? ` · ghế trống ${targetLobby.availableSeats}`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Thành viên muốn chuyển</Label>
            {filteredMembers.length === 0 ? (
              <p className="rounded-md border border-dashed py-3 text-center text-sm text-neutral-600">
                {sourceLobbyId
                  ? "Lobby nguồn không có thành viên nào."
                  : "Chọn lobby nguồn trước."}
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                {filteredMembers.map((m) => {
                  const selected = memberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
                        selected
                          ? "bg-orange-50 ring-1 ring-orange-400"
                          : "hover:bg-neutral-50"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
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
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            Host
                          </Badge>
                        ) : null}
                      </span>
                      <span className="font-mono text-xs text-neutral-500">
                        {m.id.slice(0, 8)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {memberIds.length > 0 ? (
              <p className="text-xs text-neutral-700">
                Đã chọn {memberIds.length} thành viên
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="merge-reason">Lý do (tuỳ chọn, tối đa 500 ký tự)</Label>
            <Textarea
              id="merge-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Khách yêu cầu chuyển sang nhóm bạn."
              rows={2}
              maxLength={500}
            />
            <p className="text-right text-xs text-neutral-500">{reason.length}/500</p>
          </div>

          {sourceMembers.length > 0 ? (
            <div className="rounded-md border border-orange-200 bg-orange-50/50 p-3 text-xs text-orange-900">
              <p className="font-semibold">Sẽ tạo {sourceMembers.length} yêu cầu:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {sourceMembers.map((m) => (
                  <li key={m.id}>{m.displayName}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter>
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
