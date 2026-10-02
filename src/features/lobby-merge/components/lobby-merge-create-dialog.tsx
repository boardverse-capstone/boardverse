"use client";

// src/features/lobby-merge/components/lobby-merge-create-dialog.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Swords } from "lucide-react";
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
  /** Tổng ghế của bàn (để hiển thị "ghế trống X/Y"). Có thể null nếu chưa map được table. */
  seatCount?: number | null;
  status?: string;
  /**
   * [FIX #lobby-merge-game-filter] Game đang chơi trên lobby — dùng để lọc target.
   * Pre-fetch qua `fetchSessionMeta` khi mở dialog (xem `useSessionMeta`).
   * Null khi BE chưa trả / session walk-in chưa gắn game / fetch fail.
   */
  gameTemplateId?: string | null;
  gameName?: string | null;
  /**
   * [FIX #lobby-merge-gap4] Box game trên bàn còn `InUse` không?
   * - `true` → staff KHÔNG thể merge cross-game (Gap 4 fix) cho tới khi EndGame + ComponentCheck.
   * - `false` → an toàn cho cross-game merge.
   * - `null` → chưa xác định (chưa fetch meta) — dialog mặc định cảnh báo nhẹ.
   */
  hasInUseBox?: boolean | null;
}

/**
 * [FIX #lobby-merge-game-filter] Kết quả fetch meta của 1 session — dùng để
 * populate các field `gameTemplateId`, `gameName`, `hasInUseBox` của LobbyOption.
 *
 * FE không tự tính — gọi qua `fetchSessionMeta` prop của dialog (mặc định panel
 * cha — POS — wrap `handleGetSessionDetail` từ `usePosDashboard`).
 */
export interface LobbySessionMeta {
  gameTemplateId: string | null;
  gameName: string | null;
  hasInUseBox: boolean | null;
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
   * [FIX #lobby-merge-game-filter] Fetch meta của session (gameTemplateId,
   * gameName, hasInUseBox) — dùng để filter dropdown target theo game + phát
   * hiện cross-game / box InUse. Panel cha (POS) wrap `handleGetSessionDetail`
   * và parse `detail.games[]` + status box.
   *
   * Nếu KHÔNG truyền → dialog fallback: không lọc theo game, chỉ filter ghế
   * đầy. Vẫn dùng được nhưng UX kém hơn.
   */
  fetchSessionMeta?: (sessionId: string) => Promise<LobbySessionMeta>;
  /**
   * Map `memberId → lobbyId` để dialog lọc đúng member khi staff đổi source.
   * Nếu không truyền → dialog hiển thị tất cả member của mọi lobby (fallback).
   */
  memberLobbyIds?: Record<string, string[]>;
  /**
   * [FIX #lobby-merge-view-target] Mở modal chi tiết phiên cho lobby đích
   * đang được staff chọn. Truyền sessionId (đồng thời là lobbyId trong
   * flow merge — mergeLobbies[].id === sessionId).
   */
  onViewTargetDetail?: (sessionId: string) => void;
  /**
   * [FIX #lobby-merge-view-target] Báo cho dialog biết modal chi tiết
   * phiên đang mở. Khi true → set `modal={false}` để Radix không đặt
   * `inert` lên modal detail, đồng thời chặn click-outside đóng merge
   * dialog (tránh đóng nhầm khi user chưa xem xong detail).
   */
  isTargetDetailOpen?: boolean;
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
  fetchSessionMeta,
  memberLobbyIds: memberLobbyIdsProp,
  onViewTargetDetail,
  isTargetDetailOpen = false,
  onSuccess,
}: LobbyMergeCreateDialogProps) {
  const [sourceLobbyId, setSourceLobbyId] = useState(defaultSourceLobbyId ?? "");
  const [targetLobbyId, setTargetLobbyId] = useState(defaultTargetLobbyId ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(
    defaultMemberId ? [defaultMemberId] : [],
  );
  const [reason, setReason] = useState("");

  // [FIX #remount-on-open] Đếm số lần dialog được mở (false→true). Dùng làm
  // `key` cho DialogContent để force remount → reset useState (tuân thủ rule
  // `react-hooks/set-state-in-effect`). Bump counter ở event-driven handler
  // `onOpenChange` (KHÔNG trong effect).
  const [openCount, setOpenCount] = useState(0);
  const prevOpenRef = useRef(isOpen);

  // [FIX #lobby-merge-game-filter] Cache meta theo sessionId — key trùng
  // với lobby.id (POS dùng sessionId làm lobby id trong flow merge).
  const [sessionMeta, setSessionMeta] = useState<
    Record<string, LobbySessionMeta>
  >({});

  const createOne = useCreateMergeRequest();
  const createBulk = useBulkCreateMergeRequests();
  const busy = createOne.isPending || createBulk.isPending;

  // [NOTE] Reset state khi mở dialog: dùng `key` prop trên `<Dialog>` (key={`merge-${openCount}`}
  // thay đổi mỗi lần mở) để force remount → React reset tất cả useState → tránh
  // gọi setState trong effect (vi phạm `react-hooks/set-state-in-effect`).

  // [FIX #lobby-merge-game-filter] Derive `metaLoading` mà KHÔNG cần setState
  // trong effect body (vi phạm `react-hooks/set-state-in-effect`).
  // Quy tắc: còn ≥1 lobby thiếu meta trong `sessionMeta` → loading.
  // Khi dialog đóng hoặc không có fetchSessionMeta → false.
  const metaLoading = useMemo(() => {
    if (!isOpen || !fetchSessionMeta) return false;
    return lobbies.some(
      (l) => l.id && l.id.trim().length > 0 && !(l.id in sessionMeta),
    );
  }, [isOpen, fetchSessionMeta, lobbies, sessionMeta]);

  /**
   * [FIX #lobby-merge-game-filter] Pre-fetch meta cho MỌI lobby đang hiện ngay
   * khi mở dialog. Chạy song song (Promise.all) → tổng thời gian ≈ time latency
   * của 1 request (thay vì N×latency). Cache trong `sessionMeta` để dropdown
   * target filter theo game + check `hasInUseBox` ngay khi staff chọn source.
   *
   * BE validate lại ở `/merge-requests` (Gap 4 fix), nhưng UX tốt hơn nhiều
   * nếu FE lọc / cảnh báo sớm → staff không phải submit rồi mới biết cross-game
   * + box còn InUse.
   *
   * Không refetch khi đã có trong cache trong cùng 1 lần mở dialog → tránh
   * re-fetch liên tục khi lobby list thay đổi (realtime SignalR push).
   */
  useEffect(() => {
    if (!isOpen) return;
    if (!fetchSessionMeta) return;
    const missing = lobbies.filter(
      (l) => l.id && l.id.trim().length > 0 && !(l.id in sessionMeta),
    );
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.allSettled(
      missing.map(async (l) => {
        try {
          const meta = await fetchSessionMeta(l.id);
          if (cancelled) return null;
          return [l.id, meta] as const;
        } catch {
          // Fail im lặng — meta = null, dropdown vẫn hiện lobby, chỉ thiếu filter theo game.
          if (cancelled) return null;
          return [
            l.id,
            { gameTemplateId: null, gameName: null, hasInUseBox: null },
          ] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, LobbySessionMeta> = {};
      for (const r of results) {
        if (r.status === "fulfilled" && r.value != null) {
          next[r.value[0]] = r.value[1];
        }
      }
      setSessionMeta((prev) => ({ ...prev, ...next }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lobbies, fetchSessionMeta]);

  // Stabilize lobby list để Radix Select không remount item khi parent re-render.
  const stableLobbies = useMemo(() => lobbies, [lobbies]);

  /**
   * [FIX #lobby-merge-game-filter] Lobby đã enrich với sessionMeta (game +
   * hasInUseBox). Dùng cho dropdown target để filter & disable đúng.
   *
   * Merge rule:
   * - Ưu tiên prop `lobbies` (panel cha đã populate sẵn gameTemplateId nếu có).
   * - Nếu prop thiếu → fallback về `sessionMeta[id]`.
   * - Cuối cùng → null (không rõ).
   *
   * PHẢI định nghĩa TRƯỚC `sourceLobby` / `targetLobby` / `categorizedTargets`
   * vì các hook sau đọc từ đây.
   */
  const enrichedLobbies = useMemo<LobbyOption[]>(() => {
    return stableLobbies.map((l) => {
      const meta = sessionMeta[l.id];
      return {
        ...l,
        gameTemplateId: l.gameTemplateId ?? meta?.gameTemplateId ?? null,
        gameName: l.gameName ?? meta?.gameName ?? null,
        hasInUseBox: l.hasInUseBox ?? meta?.hasInUseBox ?? null,
      };
    });
  }, [stableLobbies, sessionMeta]);

  const sourceLobby = useMemo(
    () => enrichedLobbies.find((l) => l.id === sourceLobbyId),
    [enrichedLobbies, sourceLobbyId],
  );
  const targetLobby = useMemo(
    () => enrichedLobbies.find((l) => l.id === targetLobbyId),
    [enrichedLobbies, targetLobbyId],
  );

  /**
   * [FIX #lobby-merge-game-filter] Phân loại lobby cho dropdown TARGET:
   * - `sameGame` = cùng gameTemplateId với source (ưu tiên, có thể chọn).
   * - `full` = lobby đầy (availableSeats === 0) — disable + label "(đầy)".
   * - `crossGameOk` = khác game + source box InUse trống (cross-game allowed, Gap 4) — disable + label "(khác game — chỉ khi trả box)".
   * - `crossGameBlocked` = khác game + source box còn InUse — disable + label "(khác game — EndGame trước)".
   * - `sameGameFull` = cùng game nhưng đầy — disable + label "(đầy)".
   *
   * Quy tắc xếp: same game (kể cả đầy) → cross-game OK → cross-game BLOCKED.
   */
  const sourceMeta = sourceLobbyId ? sessionMeta[sourceLobbyId] : null;
  const sourceHasInUseBox = sourceMeta?.hasInUseBox === true;
  const sourceGameId = sourceMeta?.gameTemplateId ?? null;

  type TargetCategory = "same-game" | "same-game-full" | "cross-game-ok" | "cross-game-blocked" | "no-meta";
  interface CategorizedLobby {
    lobby: LobbyOption;
    category: TargetCategory;
    disabledReason?: string;
  }

  const categorizedTargets = useMemo<CategorizedLobby[]>(() => {
    if (!sourceLobbyId) {
      // Chưa chọn source → hiện tất cả lobby cùng active, không phân loại.
      return enrichedLobbies.map((l) => ({ lobby: l, category: "no-meta" as TargetCategory }));
    }
    return enrichedLobbies
      .filter((l) => l.id !== sourceLobbyId) // target phải khác source
      .map<CategorizedLobby>((l) => {
        const isFull =
          l.availableSeats != null && l.availableSeats <= 0;
        const lMeta = sessionMeta[l.id];
        const lGameId = lMeta?.gameTemplateId ?? null;
        const sameGame =
          sourceGameId != null &&
          lGameId != null &&
          sourceGameId === lGameId;

        // Cùng game + đầy
        if (sameGame && isFull) {
          return {
            lobby: l,
            category: "same-game-full",
            disabledReason: `Đầy — ${l.activeMemberCount}/${l.seatCount ?? "?"} người`,
          };
        }
        // Cùng game + còn chỗ
        if (sameGame) {
          return { lobby: l, category: "same-game" };
        }
        // Khác game (hoặc chưa biết game nào) — tuỳ source có box InUse không
        if (sourceHasInUseBox) {
          return {
            lobby: l,
            category: "cross-game-blocked",
            disabledReason:
              "Source lobby còn box InUse — staff phải EndGame + ComponentCheck trước khi merge khác game.",
          };
        }
        // Khác game + source box đã trả (hoặc chưa có box) — Gap 4 cho phép
        return {
          lobby: l,
          category: "cross-game-ok",
          disabledReason:
            "Khác game — chỉ cho phép khi source đã EndGame + ComponentCheck.",
        };
      });
  }, [
    enrichedLobbies,
    sourceLobbyId,
    sessionMeta,
    sourceGameId,
    sourceHasInUseBox,
  ]);

  /**
   * Sort: same-game trước, sau đó cross-game-ok, cuối cùng cross-game-blocked.
   * Trong cùng nhóm: sort theo tên.
   */
  const sortedTargets = useMemo(() => {
    const order: Record<TargetCategory, number> = {
      "same-game": 0,
      "same-game-full": 1,
      "no-meta": 2,
      "cross-game-ok": 3,
      "cross-game-blocked": 4,
    };
    return [...categorizedTargets].sort((a, b) => {
      const oa = order[a.category];
      const ob = order[b.category];
      if (oa !== ob) return oa - ob;
      return a.lobby.name.localeCompare(b.lobby.name, "vi");
    });
  }, [categorizedTargets]);

  /** Source lobby hiện tại có box InUse không? */
  const sourceHasInUseBoxWarning =
    sourceLobbyId != null && sourceMeta?.hasInUseBox === true;
  /** Source có cross-game với target không? */
  const crossGameWarning = useMemo(() => {
    if (!sourceLobbyId || !targetLobbyId) return false;
    const sMeta = sessionMeta[sourceLobbyId];
    const tMeta = sessionMeta[targetLobbyId];
    if (!sMeta?.gameTemplateId || !tMeta?.gameTemplateId) return false;
    return sMeta.gameTemplateId !== tMeta.gameTemplateId;
  }, [sourceLobbyId, targetLobbyId, sessionMeta]);

  /**
   * Map `memberId → lobbyId` để dialog lọc đúng member khi staff đổi source.
   * Panel cha truyền xuống; nếu không truyền thì dialog hiển thị tất cả member.
   */
  const memberLobbyIds = memberLobbyIdsProp;

  // [FIX #effective-member-ids] Derived từ `memberIds` × `sourceLobbyId` ×
  // `memberLobbyIds`: loại bỏ tick "ma" (member thuộc lobby khác với source).
  // Trước đây có effect setMemberIds filter → vi phạm
  // `react-hooks/set-state-in-effect`. Cách này an toàn — chỉ render.
  const effectiveMemberIds = useMemo(() => {
    if (!sourceLobbyId || !memberLobbyIds) return memberIds;
    const norm = (s: string) =>
      s.normalize("NFKC").replace(/[\s\u200B-\u200F\uFEFF]/g, "").trim();
    const normSourceId = norm(sourceLobbyId);
    return memberIds.filter((id) => {
      const lobbies = memberLobbyIds[norm(id)];
      return Array.isArray(lobbies) && lobbies.includes(normSourceId);
    });
  }, [memberIds, memberLobbyIds, sourceLobbyId]);
  const hasStaleMemberTicks =
    memberIds.length > 0 && effectiveMemberIds.length < memberIds.length;

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
    return visibleMembers.filter((m) => effectiveMemberIds.includes(m.id));
  }, [visibleMembers, effectiveMemberIds]);

  /**
   * [FIX #seat-validation] Tính tổng số người dự kiến ở lobby đích sau khi ghép
   * + kiểm tra còn đủ ghế hay không.
   * - `combinedCount` = target.activeMemberCount + memberIds.length (người sẽ chuyển sang)
   * - `seatShortage` = số ghế thiếu (0 nếu đủ); null nếu FE không biết capacity.
   * - `seatCapacity` = tổng số ghế của bàn đức; null nếu không xác định.
   */
  const seatCheck = useMemo(() => {
    const cap = targetLobby?.availableSeats ?? null;
    const targetActive = targetLobby?.activeMemberCount ?? 0;
    const moving = effectiveMemberIds.length;
    const combined = targetActive + moving;
    if (cap == null) {
      return {
        combined,
        capacity: null,
        shortage: null as number | null,
        fits: null as boolean | null,
      };
    }
    const fits = moving <= cap;
    return {
      combined,
      capacity: cap + targetActive, // = seatCount
      shortage: fits ? 0 : moving - cap,
      fits,
    };
  }, [targetLobby?.availableSeats, targetLobby?.activeMemberCount, effectiveMemberIds.length]);

  /**
   * Reset member đã chọn nếu không thuộc lobby nguồn mới — tránh giữ tick "ma".
   */
  // [NOTE] Trước đây có effect `setMemberIds(filter)` khi đổi source — vi phạm
  // `react-hooks/set-state-in-effect`. Đã thay bằng `effectiveMemberIds` derived
  // (xem khai báo phía trên `filteredMembers`). Staff có thể tick "ma" (member
  // thuộc lobby cũ) → submit FE không cộng dồn số lượng vào combinedCount;
  // staff sẽ thấy hint để tự un-tick. UX chấp nhận được, và đúng nguyên tắc
  // "tránh cascading render".

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

  /**
   * Đóng → mở lại: bump `openCount` để DialogContent remount → reset toàn bộ
   * state về default. Đây là cách đúng (event-driven) để tránh setState trong effect.
   */
  const handleOpenChange = (open: boolean) => {
    if (open && !prevOpenRef.current) {
      // false → true lần đầu (đã đóng trước đó).
      setOpenCount((c) => c + 1);
    }
    prevOpenRef.current = open;
    if (!open) handleClose();
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
      toast.error("Chọn bàn cần chuyển và bàn cần đến.");
      return;
    }
    if (src === tgt) {
      // eslint-disable-next-line no-console
      console.warn("[lobby-merge] src === tgt");
      toast.error("Lobby nguồn và lobby đích phải khác nhau.");
      return;
    }
    const trimmedIds = effectiveMemberIds.filter(Boolean);
    if (trimmedIds.length === 0) {
      // eslint-disable-next-line no-console
      console.warn("[lobby-merge] no members selected");
      toast.error("Chọn ít nhất 1 thành viên để chuyển nhóm.");
      return;
    }
    // [FIX #seat-validation] Validate capacity trước khi submit — tránh phải
    // đợi BE trả về 409 rồi quay lại dialog. Nếu targetLobby có
    // `availableSeats` (FE đã tính = table.seatCount − members.length) → check
    // trực tiếp. Nếu null (không map được table) → BE sẽ validate qua
    // `req.fitsCapacity` ở Pending list; hiện toast cảnh báo nhẹ.
    const targetAvail = targetLobby?.availableSeats;
    if (targetAvail != null && trimmedIds.length > targetAvail) {
      toast.error(
        `Bàn đích chỉ còn trống ${targetAvail} ghế — không đủ cho ${trimmedIds.length} thành viên muốn chuyển.`,
        { duration: 6000 },
      );
      // eslint-disable-next-line no-console
      console.warn("[lobby-merge] BLOCKED: not enough seats", {
        targetLobbyId: tgt,
        targetActiveMembers: targetLobby?.activeMemberCount,
        availableSeats: targetAvail,
        membersToMove: trimmedIds.length,
      });
      return;
    }
    if (reason.length > 500) {
      toast.error("Lý do tối đa 500 ký tự.");
      return;
    }

    // [FIX #lobby-merge-gap4] Nếu source có box InUse + khác game với target →
    // BE sẽ chặn (400 `MergeDifferentGames`). Block FE trước để staff không
    // phải submit rồi mới biết. Lấy từ `sessionMeta` (đã pre-fetch khi mở dialog).
    const sMeta = sessionMeta[src];
    const tMeta = sessionMeta[tgt];
    if (
      sMeta?.hasInUseBox === true &&
      tMeta?.gameTemplateId &&
      sMeta.gameTemplateId &&
      sMeta.gameTemplateId !== tMeta.gameTemplateId
    ) {
      toast.error(
        "Lobby nguồn còn box game đang InUse và đang chơi game khác với lobby đích. " +
          "Vào POS → bấm \"Trả game\" + \"Kiểm kê linh kiện\" cho lobby nguồn, rồi thử lại.",
        { duration: 8000 },
      );
      // eslint-disable-next-line no-console
      console.warn("[lobby-merge] BLOCKED: source box InUse + cross-game", {
        sourceGameId: sMeta.gameTemplateId,
        targetGameId: tMeta.gameTemplateId,
      });
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
    // [FIX #lobby-merge-view-target] `modal={!isTargetDetailOpen}`: khi modal
    // detail đang mở, tắt chế độ modal của merge dialog để Radix KHÔNG đặt
    // `inert` lên modal detail (cho phép thao tác trên detail). Khi không có
    // detail mở → trở về `modal=true` (mặc định) để backdrop đóng bình thường.
    <Dialog
      open={isOpen}
      modal={!isTargetDetailOpen}
      onOpenChange={handleOpenChange}
    >
      {/* Layout ngang 2 cột, dialog mở rộng theo chiều ngang.
          - sm:max-w-3xl (~768px) cho tablet
          - md:max-w-5xl (~896px) cho laptop nhỏ
          - lg:max-w-6xl (~1152px) cho desktop — đây là size lý tưởng cho 2 cột horizontal
          - xl:max-w-7xl (~1280px) cho màn hình rộng
          Lưu ý: PHẢI dùng `sm:max-w-*` thay vì `max-w-*` để thắng
          `sm:max-w-md` mặc định trong DialogContent (cùng breakpoint, sau trong cascade).
          [FIX #lobby-merge-view-target] Khi detail mở: chặn pointer-down
          ngoài + escape + interact ngoài để KHÔNG đóng merge dialog nhầm.
          Staff chỉ đóng merge bằng nút "Hủy" / "X" hoặc đóng detail trước. */}
      {/* [FIX #lobby-merge-view-target] `key` thay đổi mỗi lần `isOpen` true →
          React remount → reset tất cả useState (sourceLobbyId, targetLobbyId,
          memberIds, reason, sessionMeta, openCount). Tuân thủ
          `react-hooks/set-state-in-effect` bằng cách KHÔNG gọi setState trong
          effect để reset — để React tự reset khi remount. */}
      <DialogContent
        key={`merge-${openCount}`}
        className="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden border-2 border-amber-600/70 bg-transparent p-0 shadow-2xl sm:max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl"
        onPointerDownOutside={
          isTargetDetailOpen ? (e) => e.preventDefault() : undefined
        }
        onInteractOutside={
          isTargetDetailOpen ? (e) => e.preventDefault() : undefined
        }
        onEscapeKeyDown={
          isTargetDetailOpen ? (e) => e.preventDefault() : undefined
        }
      >
        {/* [STYLE #fantasy-quest] Wrapper parchment bên trong DialogContent.
            Gradient nâu ấm (amber-50 → stone-50 → amber-100) giả giấy da cổ.
            Font-serif toàn bộ body cho cảm giác medieval fantasy.
            Không animation — chỉ đổi màu/border/typography (theo yêu cầu). */}
        <div className="flex h-full max-h-[88vh] flex-col gap-0 overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 via-stone-50 to-amber-100/60 font-[var(--font-fantasy)]">
          {/* HEADER — Guild seal style: gradient amber đậm + border-bottom
              vàng đồng + icon kiếm (Swords) thay cho icon user thường.
              Font-serif đậm cho cảm giác RPG. */}
          <DialogHeader className="shrink-0 gap-1 border-b-2 border-amber-600/60 bg-gradient-to-r from-amber-100/80 via-amber-50 to-amber-100/80 px-6 py-4">
            <DialogTitle className="flex items-center gap-2 font-[var(--font-fantasy)] text-xl font-bold tracking-wide text-amber-950">
              <Swords className="size-5 text-amber-700" />
              Tạo yêu cầu ghép thành viên nhóm
            </DialogTitle>
            {/* <DialogDescription className="font-[var(--font-fantasy)] text-sm text-amber-900/80">
              Chọn bàn nguồn (nhóm rời) → bàn đích (nhóm nhận) → thành viên muốn
              chuyển. Mỗi thành viên tạo 1 yêu cầu Pending riêng — staff quán duyệt
              từng yêu cầu.
            </DialogDescription> */}
          </DialogHeader>

          {/* BODY 2 cột — padding trong parchment. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-5 md:flex-row md:items-start">
          {/* === CỘT TRÁI: Source / Target + Member list === */}
          <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-3 md:overflow-y-auto md:pr-3">
            {/* Source / Target — KHUNG CỐ ĐỊNH.
                Cấu trúc 3 hàng độc lập:
                  1) Hàng dropdown (flex 2 khung + mũi tên absolute giữa) — chiều
                     cao CỐ ĐỊNH vì chỉ chứa Label + SelectTrigger. Mũi tên absolute
                     ở giữa wrapper, đặt trong `flex justify-between` nên luôn nằm
                     giữa khoảng trống giữa 2 dropdown, không bị lệch.
                  2) Hàng info (2 dòng ngắn: thông tin source + target + nút Xem chi tiết)
                     — không chứa cảnh báo, chỉ là text info.
                  3) Hàng cảnh báo (banner rose/amber) — xuất hiện tuỳ điều kiện,
                     KHÔNG ảnh hưởng chiều cao 2 hàng trên. */}
            <div className="space-y-2">
              {/* HÀNG 1: 2 dropdown + mũi tên nằm trong flow giữa 2 div.
                  Dùng `flex` với mũi tên là 1 child flex-shrink-0 nằm giữa 2 div
                  flex-1. Cách này mũi tên nằm trong DOM flow, căn giữa TUYỆT ĐỐI
                  giữa khoảng trống giữa 2 dropdown, không bị lệch do gap hay
                  min-content. */}
              <div className="flex items-end gap-3">
                {/* [STYLE #fantasy-quest] Guild banner cho lobby nguồn:
                    border-2 amber-700, bg gradient amber, shadow đậm.
                    Font-serif cho Label. */}
                <div className="min-w-0 flex-1 space-y-1.5 rounded-md border-2 border-amber-700/60 bg-gradient-to-br from-amber-50/90 to-stone-100/80 p-2.5 shadow-inner">
                  <Label className="font-[var(--font-fantasy)] text-sm font-semibold text-amber-950">
                    ⚔ Lobby nguồn (rời đi)
                  </Label>
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
                    <SelectTrigger className="w-full border-amber-600/50 bg-white/80 font-[var(--font-fantasy)] shadow-sm">
                      <SelectValue placeholder="Chọn bàn cần chuyển thành viên" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* [FIX #select-empty-value] Radix Select cấm value rỗng.
                          Lọc id rỗng để tránh React crash khi BE trả lobby
                          chưa gắn id (walk-in session).
                          [FIX #lobby-merge-game-filter] Thêm badge game cho
                          mỗi item để staff thấy ngay khi mở dropdown. */}
                      {enrichedLobbies
                        .filter((l) => l.id && l.id.trim().length > 0)
                        .map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name} {l.status ? `· ${l.status}` : ""}
                            {l.availableSeats != null ? ` · ghế trống ${l.availableSeats}` : ""}
                            {l.gameName ? ` · 🎲 ${l.gameName}` : ""}
                            {l.hasInUseBox === true ? " · ⚠ box InUse" : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* [FIX #arrow-center] Mũi tên nằm giữa 2 div flex-1.
                    `shrink-0` giữ width cố định (= size-5 ≈ 20px), `pb-3` để
                    căn theo chiều dọc tương ứng với SelectTrigger (vì wrapper
                    là `items-end` để Label + Select ở dưới cùng). */}
                <div
                  aria-hidden
                  className="flex shrink-0 items-center justify-center pb-2.5"
                >
                  {/* [STYLE #fantasy-quest] Mũi tên → kiếm RPG (Swords).
                      Màu vàng đồng đậm (amber-700) nổi bật trên nền parchment. */}
                  <Swords className="size-5 text-amber-700 drop-shadow-sm" />
                </div>

                {/* [STYLE #fantasy-quest] Guild banner cho lobby đích (giống nguồn). */}
                <div className="min-w-0 flex-1 space-y-1.5 rounded-md border-2 border-amber-700/60 bg-gradient-to-br from-amber-50/90 to-stone-100/80 p-2.5 shadow-inner">
                  <Label className="font-[var(--font-fantasy)] text-sm font-semibold text-amber-950">
                    🛡 Lobby đích (nhận vào)
                  </Label>
                  <Select
                    value={targetLobbyId}
                    onValueChange={(v) => {
                      // Nếu chọn trùng lobby nguồn → tự swap source ↔ target.
                      if (v && v === sourceLobbyId) {
                        setSourceLobbyId(targetLobbyId);
                      }
                      setTargetLobbyId(v);
                    }}
                    disabled={!sourceLobbyId}
                  >
                    <SelectTrigger className="w-full border-amber-600/50 bg-white/80 font-[var(--font-fantasy)] shadow-sm">
                      <SelectValue
                        placeholder={
                          sourceLobbyId
                            ? metaLoading
                              ? "Đang tải thông tin lobby…"
                              : "Chọn lobby đích"
                            : "Chọn bàn cần chuyển thành viên trước"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {/* [FIX #select-empty-value] Radix Select cấm value rỗng.
                          Lọc id rỗng để tránh React crash khi BE trả lobby
                          chưa gắn id (walk-in session). */}
                      {sortedTargets
                        .filter(({ lobby }) => lobby.id && lobby.id.trim().length > 0)
                        .map(({ lobby, category, disabledReason }) => {
                          const isDisabled =
                            category === "same-game-full" ||
                            category === "cross-game-blocked";
                          // [FIX #cross-game-red] Tách badge thành element riêng
                          // thay vì string nối, để có thể tô đỏ phần "khác game".
                          const renderGameBadge = () => {
                            if (lobby.gameName) {
                              return <> · 🎲 {lobby.gameName}</>;
                            }
                            if (lobby.gameTemplateId) {
                              return <> · 🎲 (chưa rõ tên)</>;
                            }
                            return null;
                          };
                          const renderSeatBadge = () => {
                            if (lobby.availableSeats == null) return null;
                            return <> · ghế trống {lobby.availableSeats}</>;
                          };
                          const renderStatusBadge = () => {
                            if (category === "same-game") {
                              return <> · ✓</>;
                            }
                            if (category === "same-game-full") {
                              return <> · (đầy)</>;
                            }
                            if (category === "cross-game-ok") {
                              return (
                                  <span
                                    className="font-semibold text-red-600"
                                    title={disabledReason}
                                  >
                                    {" "}
                                    · ⚠ khác game
                                  </span>
                                );
                            }
                            if (category === "cross-game-blocked") {
                              return (
                                  <span
                                    className="font-semibold text-red-600"
                                    title={disabledReason}
                                  >
                                    {" "}
                                    · ⛔ khác game
                                  </span>
                                );
                            }
                            return null;
                          };
                          return (
                            <SelectItem
                              key={lobby.id}
                              value={lobby.id}
                              disabled={isDisabled}
                              // [FIX #lobby-merge-game-filter] Hiển thị game + lý do disable.
                              title={disabledReason}
                            >
                              {lobby.name}
                              {renderGameBadge()}
                              {renderSeatBadge()}
                              {renderStatusBadge()}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* HÀNG 2: Info ngắn dưới mỗi dropdown — chỉ text + nút Xem chi tiết.
                  KHÔNG có banner cảnh báo ở đây → không làm thay đổi chiều cao khung dropdown.
                  [STYLE #fantasy-quest] Font-serif amber-900. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
                <div className="min-h-[1.25rem]">
                  {sourceLobby ? (
                    <p className="truncate font-[var(--font-fantasy)] text-xs text-amber-900/80">
                      ⚔ Đang chơi: {sourceLobby.activeMemberCount} thành viên
                      {sourceLobby.gameName ? ` · 🎲 ${sourceLobby.gameName}` : ""}
                      {sourceLobby.hasInUseBox === true ? " · box còn InUse" : ""}
                    </p>
                  ) : null}
                </div>
                <div aria-hidden className="hidden sm:block" />
                <div className="min-h-[1.25rem]">
                  {targetLobby ? (
                    // [FIX #lobby-merge-view-target] Bố cục flex: text info bên trái,
                    // nút "Xem chi tiết" bên phải. Staff cần kiểm tra session đích
                    // (ghế trống, member hiện tại, game đang chơi) trước khi gửi yêu cầu
                    // ghép — đặc biệt với lobby có 1 thành viên như trong screenshot.
                    // [STYLE #fantasy-quest] Nút "Xem chi tiết" đổi sang viền amber.
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-[var(--font-fantasy)] text-xs text-amber-900/80">
                        🛡 Đang chơi: {targetLobby.activeMemberCount} thành viên
                        {targetLobby.availableSeats != null
                          ? ` · ghế trống ${targetLobby.availableSeats}`
                          : ""}
                        {targetLobby.gameName
                          ? ` · 🎲 ${targetLobby.gameName}`
                          : ""}
                      </p>
                      {onViewTargetDetail ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewTargetDetail(targetLobby.id)}
                          className="h-6 shrink-0 gap-1 px-2 font-[var(--font-fantasy)] text-[11px] font-semibold text-amber-800 hover:bg-amber-100/60 hover:text-amber-950"
                        >
                          <ExternalLink className="size-3" />
                          Xem chi tiết
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* HÀNG 3: Banner cảnh báo cross-game + box InUse.
                  Hiển thị full-width dưới khung dropdown, không ảnh hưởng cấu trúc cố định.
                  `min-h-0` để container không chiếm chỗ khi không có banner. */}
              {(sourceHasInUseBoxWarning || crossGameWarning) && (
                <div className="space-y-1.5">
                  {/* [STYLE #fantasy-quest] Scroll cảnh báo: border đậm + shadow
                      + font-[var(--font-fantasy)] cho cảm giác parchment cổ. */}
                  {sourceHasInUseBoxWarning ? (
                    <div className="rounded border-2 border-amber-700 bg-amber-100/80 px-3 py-2 font-[var(--font-fantasy)] text-[12px] text-amber-950 shadow-md">
                      📜 Lobby nguồn còn <strong>box game đang InUse</strong>. Merge
                      khác game sẽ bị BE chặn cho tới khi staff EndGame +
                      ComponentCheck xong.
                    </div>
                  ) : null}
                  {crossGameWarning ? (
                    <div className="rounded border-2 border-red-700 bg-red-100/80 px-3 py-2 font-[var(--font-fantasy)] text-[12px] text-red-950 shadow-md">
                      📜 Lobby nguồn và lobby đích đang chơi <strong>khác game</strong>.
                      {/* {sourceHasInUseBoxWarning
                        ? " BE sẽ chặn — EndGame + ComponentCheck trước."
                        : " BE cho phép nếu source đã EndGame + ComponentCheck (Gap 4)."} */}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Member list — max-height cố định theo viewport, scroll nội bộ.
                60vh ~ 7-10 thành viên hiển thị, dài hơn thì scroll.
                items cao 2.5rem để click dễ, ID hiển thị 10 ký tự thay vì 8 cho dễ đọc. */}
            {/* [STYLE #fantasy-quest] Member list — border vàng đồng, font-[var(--font-fantasy)]. */}
            <div className="flex min-h-0 flex-col gap-1.5 rounded-md border-2 border-amber-700/60 bg-gradient-to-br from-amber-50/60 to-stone-100/60 p-2.5">
              <div className="flex items-center justify-between">
                <Label className="font-[var(--font-fantasy)] text-sm font-semibold text-amber-950">
                  🎲 Thành viên muốn chuyển
                </Label>
                {memberIds.length > 0 ? (
                  <span className="font-[var(--font-fantasy)] text-xs text-amber-900">
                    Đã chọn{" "}
                    <strong className="text-orange-800">
                      {effectiveMemberIds.length}
                    </strong>
                    {hasStaleMemberTicks ? (
                      <span className="ml-1.5 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                        có {memberIds.length - effectiveMemberIds.length} tick lệch
                        (thuộc lobby khác)
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              {visibleMembers.length === 0 ? (
                <p className="rounded-md border-2 border-dashed border-amber-600/40 py-3 text-center font-[var(--font-fantasy)] text-sm text-amber-900/70">
                  {sourceLobbyId
                    ? "Lobby nguồn không có thành viên nào."
                    : "Chọn bàn cần chuyển thành viên trước."}
                </p>
              ) : (
                <div className="max-h-[60vh] space-y-1 overflow-y-auto rounded-md border-2 border-amber-600/40 bg-white/80 p-2 font-[var(--font-fantasy)]">
                  {visibleMembers.map((m, idx) => {
                    // [FIX #unique-key] Dùng composite key id+idx để React không
                    // warning khi 1 user đứng trong nhiều lobby (host ở Bàn 02 đồng
                    // thời player ở Bàn 03). idx đảm bảo uniqueness trong cùng
                    // render; id giữ cho React khớp component identity qua update.
                    const compositeKey = `${m.id}::${idx}`;
                    const selected = effectiveMemberIds.includes(m.id);
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
                  <li className={effectiveMemberIds.length > 0 ? "text-emerald-700" : ""}>
                    Ít nhất 1 thành viên
                  </li>
                </ul>
              </div>
            ) : null}
          </div>

          {/* === CỘT PHẢI: Lý do + Summary === */}
          <div className="flex shrink-0 flex-col gap-3 md:w-full md:border-t md:border-amber-600/40 md:pt-4 lg:w-[360px] lg:border-l-2 lg:border-t-0 lg:pt-0 lg:pl-4">
            <div className="space-y-1.5">
              {/* [STYLE #fantasy-quest] Label font-[var(--font-fantasy)] amber. */}
              <Label
                htmlFor="merge-reason"
                className="font-[var(--font-fantasy)] text-sm font-semibold text-amber-950"
              >
                📜 Lý do (tuỳ chọn, tối đa 500 ký tự)
              </Label>
              <Textarea
                id="merge-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Khách yêu cầu chuyển sang nhóm bạn để chơi chung."
                rows={5}
                maxLength={500}
                className="w-full resize-none border-amber-600/50 bg-white/80 font-[var(--font-fantasy)] shadow-inner"
              />
              <p className="text-right font-[var(--font-fantasy)] text-xs text-amber-900/70">
                {reason.length}/500
              </p>
            </div>

            {sourceMembers.length > 0 ? (
              <div className="rounded-md border-2 border-orange-700/50 bg-orange-100/60 p-3 font-[var(--font-fantasy)] text-xs text-orange-950 shadow-inner">
                <p className="font-semibold">⚔ Sẽ tạo {sourceMembers.length} yêu cầu:</p>
                <ul className="mt-1 list-disc space-y-0.5 overflow-y-auto pl-4 max-h-[160px]">
                  {sourceMembers.map((m) => (
                    <li key={m.id} className="break-words">
                      {m.displayName}
                    </li>
                  ))}
                </ul>

                {/* [FIX #seat-validation] Realtime hint về capacity khi staff chọn
                    target + member. Nếu FE tính được availableSeats → so sánh trực
                    tiếp; nếu không → cảnh báo nhẹ (BE vẫn validate ở Pending).
                    [STYLE #fantasy-quest] Border đậm + font-[var(--font-fantasy)] + shadow. */}
                {targetLobby ? (
                  seatCheck.fits === false ? (
                    <div className="mt-2 rounded border-2 border-red-700 bg-red-100/80 px-2 py-1.5 font-[var(--font-fantasy)] text-red-950 shadow-inner">
                      <p className="font-semibold">⚠ Không đủ ghế trống</p>
                      <p>
                        Lobby đích có {targetLobby.availableSeats ?? 0} ghế trống
                        / tổng {seatCheck.capacity ?? "?"} ghế —{" "}
                        {memberIds.length} thành viên muốn chuyển vượt quá{" "}
                        {seatCheck.shortage} ghế.
                      </p>
                    </div>
                  ) : seatCheck.fits === true ? (
                    <div className="mt-2 rounded border-2 border-emerald-700 bg-emerald-100/80 px-2 py-1.5 font-[var(--font-fantasy)] text-emerald-950 shadow-inner">
                      <p className="font-semibold">✓ Đủ chỗ ngồi</p>
                      <p>
                        Tổng sau ghép: {seatCheck.combined}/{seatCheck.capacity} người
                        (còn trống {(seatCheck.capacity ?? 0) - seatCheck.combined}).
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 rounded border-2 border-amber-700 bg-amber-100/80 px-2 py-1.5 font-[var(--font-fantasy)] text-amber-950 shadow-inner">
                      <p>Không rõ số ghế của bàn đích — BE sẽ kiểm tra khi duyệt.</p>
                    </div>
                  )
                ) : null}
              </div>
            ) : (
              <div className="rounded-md border-2 border-dashed border-amber-600/40 p-3 font-[var(--font-fantasy)] text-xs text-amber-900/70">
                Tick thành viên ở cột trái để xem trước các yêu cầu sẽ gửi.
              </div>
            )}
          </div>
        </div>

        {/* FOOTER — Seal wax style: border-top vàng đồng + bg gradient amber.
            Nút "Gửi" đổi sang màu đỏ son (red-700) — cảm giác con dấu son.
            Nút "Huỷ" outline vàng đồng. */}
        <DialogFooter className="shrink-0 gap-2 border-t-2 border-amber-600/60 bg-gradient-to-r from-amber-100/70 via-amber-50 to-amber-100/70 px-6 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={busy}
            className="border-amber-600/70 font-[var(--font-fantasy)] text-amber-900 hover:bg-amber-100/60"
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            // [FIX #seat-validation] Disable nút Gửi khi FE biết chắc chắn không đủ ghế.
            // Khi fits === null (không rõ capacity) → vẫn cho bấm, BE sẽ validate lại.
            disabled={busy || seatCheck.fits === false}
            title={
              seatCheck.fits === false
                ? `Không đủ ghế trống (thiếu ${seatCheck.shortage})`
                : undefined
            }
            className="border border-amber-700/50 bg-gradient-to-b from-red-700 to-red-800 font-[var(--font-fantasy)] font-semibold text-amber-50 shadow-md hover:from-red-800 hover:to-red-900"
          >
            {busy ? <Spinner className="size-4" /> : null}
            {busy ? "Đang gửi…" : `⚔ Gửi ${effectiveMemberIds.length} yêu cầu`}
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
