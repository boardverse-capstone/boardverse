'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardCheck, PackageCheck, PackagePlus, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useStaffCafe } from '../hooks/usePosCheckIn';
import { usePosBoxes } from '../hooks/usePosBoxes';
import {
  useAssignSessionGames,
  useCheckSessionGames,
  useEndGame,
  useReportInventoryLoss,
} from '../hooks/usePosMutations';
import {
  POS_QUERY_KEYS,
  PosCheckInService,
  buildCheckoutComponentsFromChecklist,
  saveCheckoutComponentResults,
} from '../services/pos-check-in.service';
import type {
  ActiveSessionDetail,
  ComponentChecklist,
  ComponentChecklistItem,
} from '../types/pos-check-in.interface';
import { NumberStepper } from '@/features/cafe-pos/components/number-stepper';

interface SessionGamesPanelProps {
  cafeId: string;
  session: ActiveSessionDetail;
  presentCount?: number;
  onEnded?: () => void;
  /** Parent giá»¯ CHECKING khi Ä‘á»•i tab */
  phaseLocked?: boolean;
  componentsDone?: boolean;
  onPhaseLocked?: () => void;
  /** Server váº«n Active â€” bá» CHECKING giáº£ trÃªn UI */
  onPhaseReset?: () => void;
  onComponentsDone?: () => void;
  /** Sau End má»›i â€” xÃ³a tráº¡ng thÃ¡i "Ä‘Ã£ kiá»ƒm kÃª" cÅ© */
  onComponentsReset?: () => void;
  /** Sau kiá»ƒm kÃª xong â€” parent chuyá»ƒn tab Thanh toÃ¡n */
  onChecklistComplete?: () => void;
}

type AssignedBoxRow = { barcode: string; name: string };

function readStoredAssignedBoxes(sessionId: string): AssignedBoxRow[] {
  if (typeof window === 'undefined' || !sessionId) return [];
  try {
    const stored = localStorage.getItem(`pos_assigned_boxes_${sessionId}`);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as AssignedBoxRow[];
    return Array.isArray(parsed)
      ? parsed.filter((b) => b && typeof b.barcode === 'string' && b.barcode)
      : [];
  } catch {
    return [];
  }
}

function writeStoredAssignedBoxes(sessionId: string, boxes: AssignedBoxRow[]) {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    localStorage.setItem(`pos_assigned_boxes_${sessionId}`, JSON.stringify(boxes));
    window.dispatchEvent(new Event('pos_session_boxes_updated'));
  } catch {
    // ignore
  }
}

function mergeAssignedBoxes(
  session: ActiveSessionDetail & {
    assignedInventoryIds?: string[];
    sessionGames?: { sessionGameId: string; gameName?: string; barcode?: string }[];
  },
  extra: AssignedBoxRow[] = [],
): AssignedBoxRow[] {
  const byBarcode = new Map<string, AssignedBoxRow>();

  const push = (barcode: string, name?: string) => {
    const key = barcode.trim();
    if (!key) return;
    const lower = key.toLowerCase();
    const existing = byBarcode.get(lower);
    byBarcode.set(lower, {
      barcode: key,
      name: name || existing?.name || session.game.name || `Há»™p (${key})`,
    });
  };

  (session.assignedInventoryIds || []).forEach((bc: string) => push(bc, session.game.name));
  (session.sessionGames || []).forEach(
    (g: { sessionGameId: string; gameName?: string; barcode?: string }) => {
      if (g.barcode) push(g.barcode, g.gameName || session.game.name);
    },
  );
  extra.forEach((b) => push(b.barcode, b.name));

  return Array.from(byBarcode.values());
}

export function SessionGamesPanel({
  cafeId,
  session,
  onEnded,
  phaseLocked = false,
  componentsDone = false,
  onPhaseLocked,
  onPhaseReset,
  onComponentsDone,
  onComponentsReset,
  onChecklistComplete,
}: SessionGamesPanelProps) {
  const queryClient = useQueryClient();
  const { data: cafe } = useStaffCafe();
  const effectiveCafeId = cafeId || session.cafeId || cafe?.id || '';
  const { data: boxes = [], isLoading: boxesLoading } = usePosBoxes(effectiveCafeId);
  const assignGames = useAssignSessionGames(effectiveCafeId, session.sessionId);
  const checkGames = useCheckSessionGames(effectiveCafeId, session.sessionId);
  const reportLoss = useReportInventoryLoss(effectiveCafeId, session.sessionId);
  const endGame = useEndGame(effectiveCafeId, session.sessionId, session.bookingId);

  const markSessionPaying = () => {
    const next = { ...session, status: 'Paying' as const };
    queryClient.setQueryData(
      [POS_QUERY_KEYS.session, effectiveCafeId, session.sessionId],
      next,
    );
    if (session.bookingId) {
      queryClient.setQueryData([POS_QUERY_KEYS.activeSession, session.bookingId], next);
    }
  };

  const [assignBarcode, setAssignBarcode] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [lossQty, setLossQty] = useState(1);
  const [lossComponentId, setLossComponentId] = useState('');
  const [lossNote, setLossNote] = useState('');

  const sessionGameIdFromProps = useMemo(() => {
    const fromSession = (session as { sessionGames?: { sessionGameId: string }[] }).sessionGames?.[0]
      ?.sessionGameId;
    return fromSession || '';
  }, [session]);

  const [resolvedSessionGameId, setResolvedSessionGameId] = useState(sessionGameIdFromProps);
  const [checklist, setChecklist] = useState<ComponentChecklist | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [actualByComponent, setActualByComponent] = useState<Record<string, number>>({});
  /** Optimistic: sau End thÃ nh cÃ´ng, má»Ÿ kiá»ƒm kÃª ngay dÃ¹ query chÆ°a refetch */
  const [forceChecking, setForceChecking] = useState(() => {
    if (phaseLocked) return true;
    if (typeof window === 'undefined' || !session.sessionId) return false;
    try {
      return localStorage.getItem(`pos_checking_${session.sessionId}`) === 'true';
    } catch {
      return false;
    }
  });
  const [componentsVerified, setComponentsVerified] = useState(() => {
    if (componentsDone) return true;
    if (typeof window === 'undefined' || !session.sessionId) return false;
    try {
      return localStorage.getItem(`pos_components_checked_${session.sessionId}`) === 'true';
    } catch {
      return false;
    }
  });

  const sessionGameId = resolvedSessionGameId || sessionGameIdFromProps;

  const isAlreadyChecking =
    phaseLocked ||
    forceChecking ||
    session.status === 'Checking' ||
    session.status === 'Completed' ||
    session.status === 'Paying';

  const lockCheckingPhase = () => {
    setForceChecking(true);
    onPhaseLocked?.();
    if (session.sessionId && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`pos_checking_${session.sessionId}`, 'true');
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (phaseLocked) setForceChecking(true);
  }, [phaseLocked]);

  useEffect(() => {
    if (componentsDone) setComponentsVerified(true);
  }, [componentsDone]);

  useEffect(() => {
    if (sessionGameIdFromProps) setResolvedSessionGameId(sessionGameIdFromProps);
  }, [sessionGameIdFromProps]);

  /** KhÃ´i phá»¥c cá» CHECKING sau remount â€” khÃ´ng tá»± Ä‘Ã¡nh dáº¥u Ä‘Ã£ kiá»ƒm kÃª */
  useEffect(() => {
    if (!session.sessionId || typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(`pos_checking_${session.sessionId}`) === 'true') {
        setForceChecking(true);
        onPhaseLocked?.();
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId]);

  useEffect(() => {
    if (
      session.status === 'Checking' ||
      session.status === 'Completed' ||
      session.status === 'Paying'
    ) {
      lockCheckingPhase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.sessionId]);

  /** Äá»“ng bá»™ status tháº­t tá»« API â€” khÃ´ng giá»¯ CHECKING giáº£ khi server váº«n Active */
  useEffect(() => {
    if (!effectiveCafeId || !session.sessionId) return;

    let cancelled = false;
    void PosCheckInService.getSession(effectiveCafeId, session.sessionId)
      .then((s) => {
        if (cancelled) return;
        if (s.status === 'Checking' || s.status === 'Paying' || s.status === 'Completed') {
          queryClient.setQueryData(
            [POS_QUERY_KEYS.session, effectiveCafeId, session.sessionId],
            (old: ActiveSessionDetail | undefined) =>
              old ? { ...old, ...s, status: s.status } : s,
          );
          if (session.bookingId) {
            queryClient.setQueryData(
              [POS_QUERY_KEYS.activeSession, session.bookingId],
              (old: ActiveSessionDetail | undefined) =>
                old ? { ...old, ...s, status: s.status } : s,
            );
          }
          lockCheckingPhase();
          if (s.status === 'Paying' || s.status === 'Completed') {
            setComponentsVerified(true);
            onComponentsDone?.();
          }
        } else if (s.status === 'Active') {
          // GET thÆ°á»ng cÃ²n Active sau End â€” giá»¯ LS, khÃ´ng xÃ³a (reload má»›i máº¥t tráº¡ng thÃ¡i)
          try {
            if (localStorage.getItem(`pos_unpaid_${session.sessionId}`) === 'true') {
              markSessionPaying();
              lockCheckingPhase();
              setComponentsVerified(true);
              onComponentsDone?.();
              return;
            }
            if (localStorage.getItem(`pos_checking_${session.sessionId}`) === 'true') {
              lockCheckingPhase();
              if (localStorage.getItem(`pos_components_checked_${session.sessionId}`) === 'true') {
                setComponentsVerified(true);
                onComponentsDone?.();
              }
              return;
            }
          } catch {
            // ignore
          }
          setForceChecking(false);
          onPhaseReset?.();
        }
        const sgid = s.sessionGames?.[0]?.sessionGameId;
        if (sgid) setResolvedSessionGameId(sgid);
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCafeId, session.sessionId]);

  useEffect(() => {
    if (!effectiveCafeId || !sessionGameId || !isAlreadyChecking) return;

    let cancelled = false;
    setChecklistLoading(true);
    void PosCheckInService.getComponentChecklist(effectiveCafeId, sessionGameId)
      .then((data) => {
        if (cancelled) return;
        setChecklist(data);
        const next: Record<string, number> = {};
        data.components.forEach((c) => {
          next[c.componentId] = c.expectedQuantity;
        });
        setActualByComponent(next);
        if (data.components[0]) setLossComponentId(data.components[0].componentId);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          toast.error(err.message || 'KhÃ´ng táº£i Ä‘Æ°á»£c checklist linh kiá»‡n.');
        }
      })
      .finally(() => {
        if (!cancelled) setChecklistLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveCafeId, sessionGameId, isAlreadyChecking]);

  const [assignedBoxes, setAssignedBoxes] = useState<{ barcode: string; name: string }[]>(() =>
    mergeAssignedBoxes(session, []),
  );

  /** Hydrate tá»« API + localStorage â€” trÃ¡nh máº¥t há»™p khi F5 */
  useEffect(() => {
    if (!session.sessionId) return;
    const stored = readStoredAssignedBoxes(session.sessionId);
    setAssignedBoxes(mergeAssignedBoxes(session, stored));
  }, [
    session.sessionId,
    (session as { assignedInventoryIds?: string[] }).assignedInventoryIds,
    (session as { sessionGames?: unknown[] }).sessionGames,
  ]);

  const availableBoxes = useMemo(() => {
    const assigned = new Set(assignedBoxes.map((b) => b.barcode.toLowerCase()));
    const sessionGames =
      (session as { sessionGames?: { gameTemplateId?: string }[] }).sessionGames || [];
    const assignedTemplateIds = new Set(
      [
        session.game?.id,
        ...sessionGames.map((g) => g.gameTemplateId).filter(Boolean),
        ...assignedBoxes
          .map((b) => boxes.find((x) => x.barcode.toLowerCase() === b.barcode.toLowerCase())?.gameTemplateId)
          .filter(Boolean),
      ].filter(Boolean) as string[],
    );
    const assignedNames = new Set<string>();
    assignedBoxes.forEach((b) => {
      const n = (b.name || '').trim().toLowerCase();
      if (n) assignedNames.add(n);
    });
    const mainName = (session.game?.name || '').trim().toLowerCase();
    if (mainName) assignedNames.add(mainName);

    return boxes.filter((b) => {
      const status = String(b.status || '').toLowerCase();
      const isAvailable = status === 'available' || status === '0';
      if (!isAvailable || !b.barcode) return false;
      if (assigned.has(b.barcode.toLowerCase())) return false;
      if (b.gameTemplateId && assignedTemplateIds.has(b.gameTemplateId)) return false;
      if (b.gameName && assignedNames.has(b.gameName.trim().toLowerCase())) return false;
      return true;
    });
  }, [boxes, assignedBoxes, session]);

  /** Hiá»ƒn thá»‹: TÃªn há»™p Â· barcode */
  const displayAssignedBoxes = useMemo(() => {
    const byBarcode = new Map(
      boxes.map((b) => [b.barcode.toLowerCase(), b] as const),
    );
    if (assignedBoxes.length === 0) {
      return [
        {
          barcode: session.game.inventoryId || '',
          name: session.game.name || 'Há»™p gá»‘c',
        },
      ];
    }
    return assignedBoxes.map((box) => {
      const meta = byBarcode.get(box.barcode.toLowerCase());
      const rawName = meta?.gameName || box.name || session.game.name || 'Há»™p';
      const name =
        rawName.startsWith('Há»™p (') && rawName.endsWith(')')
          ? session.game.name || 'Há»™p'
          : rawName;
      return { barcode: box.barcode, name };
    });
  }, [assignedBoxes, boxes, session.game.inventoryId, session.game.name]);

  const handleAssign = async () => {
    const barcode = assignBarcode.trim();
    if (!barcode) {
      toast.error('Chá»n há»™p game tá»« danh sÃ¡ch.');
      return;
    }

    const boxMeta = boxes.find((b) => b.barcode === barcode);
    const assignedTemplateIds = new Set(
      [
        session.game?.id,
        ...((session as { sessionGames?: { gameTemplateId?: string }[] }).sessionGames || [])
          .map((g) => g.gameTemplateId)
          .filter(Boolean),
        ...assignedBoxes
          .map((b) => boxes.find((x) => x.barcode.toLowerCase() === b.barcode.toLowerCase())?.gameTemplateId)
          .filter(Boolean),
      ].filter(Boolean) as string[],
    );
    // Swagger 400: "Game Ä‘Ã£ Ä‘Æ°á»£c gÃ¡n" â€” trÃ¡nh gá»i API khi trÃ¹ng tá»±a (hay gÃ¢y 500 phÃ­a server)
    if (boxMeta?.gameTemplateId && assignedTemplateIds.has(boxMeta.gameTemplateId)) {
      toast.error('Tá»±a game nÃ y Ä‘Ã£ cÃ³ trÃªn phiÃªn. Chá»n há»™p tá»±a khÃ¡c (vd. Codenames).');
      return;
    }
    if (
      boxMeta?.gameName &&
      assignedBoxes.some(
        (b) => (b.name || '').trim().toLowerCase() === boxMeta.gameName!.trim().toLowerCase(),
      )
    ) {
      toast.error('Tá»±a game nÃ y Ä‘Ã£ cÃ³ trÃªn phiÃªn. Chá»n há»™p tá»±a khÃ¡c (vd. Codenames).');
      return;
    }

    try {
      const live = await PosCheckInService.getPosBoxByBarcode(effectiveCafeId, barcode);
      const liveStatus = String(live.status || '').toLowerCase();
      if (liveStatus && liveStatus !== 'available' && liveStatus !== '0') {
        toast.error(`Há»™p ${barcode} khÃ´ng Available (Ä‘ang ${live.status}).`);
        return;
      }

      const updated = await assignGames.mutateAsync({ barcode });
      setAssignBarcode('');
      const next = mergeAssignedBoxes(updated ?? session, [
        ...assignedBoxes,
        {
          barcode,
          name: boxMeta?.gameName || live.gameName || session.game.name || `Há»™p (${barcode})`,
        },
      ]);
      setAssignedBoxes(next);
      writeStoredAssignedBoxes(session.sessionId, next);
      toast.success(`ÄÃ£ gÃ¡n há»™p ${barcode} vÃ o phiÃªn.`);
    } catch (err) {
      const msg = (err as Error)?.message || 'KhÃ´ng thá»ƒ gÃ¡n game.';
      if (msg.includes('lá»—i mÃ¡y chá»§ khÃ´ng mong Ä‘á»£i') || /\/games['"]?\.?$/i.test(msg)) {
        toast.error(
          'KhÃ´ng gÃ¡n Ä‘Æ°á»£c há»™p game. Thá»­ há»™p khÃ¡c hoáº·c thá»­ láº¡i.',
        );
        return;
      }
      toast.error(msg);
    }
  };

  const persistCheckoutComponents = (markAllValid: boolean) => {
    if (!session.sessionId || !sessionGameId) return;
    const checkoutComponents = buildCheckoutComponentsFromChecklist(
      checklist?.components ?? [],
      actualByComponent,
      markAllValid,
    );
    saveCheckoutComponentResults(session.sessionId, sessionGameId, checkoutComponents);
  };

  const markComponentsVerified = () => {
    setComponentsVerified(true);
    onComponentsDone?.();
    if (session.sessionId && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`pos_components_checked_${session.sessionId}`, 'true');
      } catch {
        // ignore
      }
    }
    window.setTimeout(() => onChecklistComplete?.(), 600);
  };

  const submitCheck = async (markAllValid: boolean) => {
    if (!sessionGameId) {
      toast.error('Thiáº¿u thÃ´ng tin game phiÃªn â€” má»Ÿ láº¡i bÃ n tá»« sÆ¡ Ä‘á»“.');
      return;
    }
    if (!isAlreadyChecking) {
      toast.error('HÃ£y nháº­n láº¡i game trÆ°á»›c, rá»“i má»›i kiá»ƒm kÃª.');
      return;
    }

    try {
      const results = markAllValid
        ? []
        : (checklist?.components ?? []).map((c) => ({
            componentId: c.componentId,
            actualQuantity: actualByComponent[c.componentId] ?? c.expectedQuantity,
          }));

      if (!markAllValid && results.length === 0) {
        toast.error('Checklist trá»‘ng â€” báº¥m â€œÄá»§ háº¿tâ€ hoáº·c táº£i láº¡i checklist.');
        return;
      }

      await checkGames.mutateAsync({
        sessionGameId,
        markAllValid,
        results,
      });
      persistCheckoutComponents(markAllValid);
      toast.success(markAllValid ? 'ÄÃ£ xÃ¡c nháº­n Ä‘á»§ linh kiá»‡n.' : 'ÄÃ£ ghi nháº­n kiá»ƒm kÃª chi tiáº¿t.');
      markComponentsVerified();
    } catch (err) {
      const msg = (err as Error)?.message || '';
      // ÄÃ£ kiá»ƒm kÃª rá»“i (idempotent) â€” coi nhÆ° xong, sang Thanh toÃ¡n
      if (/Ä‘Ã£ Ä‘Æ°á»£c kiá»ƒm tra|already.*check|ComponentCheckAlreadyDone/i.test(msg)) {
        persistCheckoutComponents(true);
        toast.success('Linh kiá»‡n Ä‘Ã£ Ä‘Æ°á»£c kiá»ƒm kÃª â€” chuyá»ƒn tab Thanh toÃ¡n.');
        markComponentsVerified();
        return;
      }
      toast.error(msg || 'KhÃ´ng thá»ƒ kiá»ƒm kÃª.');
    }
  };

  const handleLoss = async () => {
    if (!sessionGameId) {
      toast.error('Thiáº¿u thÃ´ng tin game phiÃªn.');
      return;
    }
    if (!lossComponentId.trim()) {
      toast.error('Vui lÃ²ng chá»n linh kiá»‡n bá»‹ thiáº¿u.');
      return;
    }
    try {
      await reportLoss.mutateAsync({
        sessionGameId,
        missingComponents: [
          {
            componentTemplateId: lossComponentId.trim(),
            missingQuantity: lossQty,
          },
        ],
        notes: lossNote || undefined,
      });
      setLossNote('');
      toast.success('ÄÃ£ ghi nháº­n hao há»¥t linh kiá»‡n.');
    } catch (err) {
      toast.error((err as Error)?.message || 'KhÃ´ng thá»ƒ ghi nháº­n máº¥t mÃ¡t.');
    }
  };

  const handleEndGame = async () => {
    if (isAlreadyChecking) {
      toast.success('ÄÃ£ nháº­n láº¡i game â€” tiáº¿p tá»¥c kiá»ƒm kÃª linh kiá»‡n.');
      onEnded?.();
      return;
    }

    const openChecking = async (
      hint?: { sessionGames?: { sessionGameId: string }[] },
      opts?: { resetComponents?: boolean },
    ) => {
      lockCheckingPhase();
      // Chu ká»³ kiá»ƒm kÃª má»›i â€” khÃ´ng giá»¯ "Ä‘Ã£ kiá»ƒm kÃª" tá»« láº§n trÆ°á»›c
      if (opts?.resetComponents !== false) {
        setComponentsVerified(false);
        onComponentsReset?.();
        if (session.sessionId && typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`pos_components_checked_${session.sessionId}`);
          } catch {
            // ignore
          }
        }
      }
      let sgid = hint?.sessionGames?.[0]?.sessionGameId;
      if (!sgid && effectiveCafeId) {
        try {
          const fresh = await PosCheckInService.getSession(effectiveCafeId, session.sessionId);
          sgid = fresh.sessionGames?.[0]?.sessionGameId;
        } catch {
          // ignore
        }
      }
      if (sgid) setResolvedSessionGameId(sgid);
    };

    // UI stale Active trong khi server Ä‘Ã£ Checking/Unpaid â€” khÃ´ng gá»i End ná»¯a
    if (isAlreadyChecking) {
      toast.info('ÄÃ£ nháº­n láº¡i game rá»“i. Sang tab Thanh toÃ¡n náº¿u Ä‘Ã£ kiá»ƒm kÃª xong.');
      return;
    }

    try {
      const result = await endGame.mutateAsync();
      await openChecking(result, { resetComponents: true });
      toast.success('ÄÃ£ nháº­n láº¡i game.');
      onEnded?.();
    } catch (err) {
      const msg = (err as Error)?.message || '';
      // Server Ä‘Ã£ Checking rá»“i (End láº§n trÆ°á»›c thÃ nh cÃ´ng) â€” má»Ÿ kiá»ƒm kÃª, khÃ´ng bÃ¡o lá»—i
      if (/checking/i.test(msg)) {
        await openChecking(undefined, { resetComponents: false });
        toast.success('ÄÃ£ nháº­n láº¡i game â€” má»Ÿ kiá»ƒm kÃª linh kiá»‡n.');
        onEnded?.();
        return;
      }
      // Chá»‘t hÃ³a Ä‘Æ¡n Ä‘Ã£ cháº¡y â†’ UNPAID â€” Ä‘á»“ng bá»™ UI (GET cÃ³ thá»ƒ váº«n Active)
      if (/unpaid/i.test(msg)) {
        markSessionPaying();
        lockCheckingPhase();
        setComponentsVerified(true);
        onComponentsDone?.();
        try {
          localStorage.setItem(`pos_unpaid_${session.sessionId}`, 'true');
          localStorage.setItem(`pos_components_checked_${session.sessionId}`, 'true');
        } catch {
          // ignore
        }
        toast.success('ÄÃ£ chá»‘t hÃ³a Ä‘Æ¡n. Sang tab Thanh toÃ¡n Ä‘á»ƒ thu tiá»n.');
        onChecklistComplete?.();
        return;
      }
      toast.error(msg || 'KhÃ´ng thá»ƒ káº¿t thÃºc game.');
    }
  };

  const busy =
    assignGames.isPending ||
    checkGames.isPending ||
    reportLoss.isPending ||
    endGame.isPending ||
    checklistLoading;

  const components: ComponentChecklistItem[] = checklist?.components ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start">
      <div className="space-y-4">
        <section className="space-y-3 rounded-lg border bg-background p-3.5 md:p-4">
          {isAlreadyChecking ? (
            <>
              <p className="flex items-center gap-2 text-sm font-medium">
                <PackageCheck className="h-4 w-4 shrink-0 text-orange-600" />
                Há»™p Ä‘Ã£ gÃ¡n
                {displayAssignedBoxes.length > 0 ? (
                  <Badge variant="secondary" className="font-normal">
                    {displayAssignedBoxes.length} há»™p
                  </Badge>
                ) : null}
              </p>
              {displayAssignedBoxes.length > 0 ? (
                <div className="space-y-1.5 text-xs">
                  {displayAssignedBoxes.map((box) => (
                    <div
                      key={box.barcode || box.name}
                      className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 rounded-md border border-orange-200 bg-orange-50/60 p-2"
                    >
                      <span className="font-semibold text-orange-950">{box.name}</span>
                      {box.barcode ? (
                        <span className="font-mono text-[11px] text-muted-foreground">{box.barcode}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">KhÃ´ng cÃ³ há»™p trÃªn phiÃªn.</p>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                onClick={() => setAssignOpen((open) => !open)}
                aria-expanded={assignOpen}
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <PackagePlus className="h-4 w-4 shrink-0 text-orange-600" />
                  GÃ¡n thÃªm há»™p game
                  {displayAssignedBoxes.length > 0 ? (
                    <Badge variant="secondary" className="font-normal">
                      {displayAssignedBoxes.length} há»™p
                    </Badge>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="hidden max-w-[9rem] truncate sm:inline-flex">
                    {session.game.name}
                  </Badge>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${assignOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>

              {!assignOpen && displayAssignedBoxes.length > 0 ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {displayAssignedBoxes.map((box) => (
                    <div key={box.barcode || box.name} className="flex flex-wrap justify-between gap-x-2">
                      <span className="font-medium text-foreground">{box.name}</span>
                      {box.barcode ? <span className="font-mono">{box.barcode}</span> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {assignOpen ? (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="assign-box-select">Há»™p game *</Label>
                    {boxesLoading ? (
                      <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
                        <Spinner className="h-3.5 w-3.5" />
                        Äang táº£i danh sÃ¡ch há»™pâ€¦
                      </div>
                    ) : (
                      <select
                        id="assign-box-select"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        value={assignBarcode}
                        onChange={(e) => setAssignBarcode(e.target.value)}
                        disabled={busy || availableBoxes.length === 0}
                      >
                        <option value="">Chá»n há»™p cÃ³ sáºµn</option>
                        {availableBoxes.map((box) => (
                          <option key={box.id || box.barcode} value={box.barcode}>
                            {box.gameName ? `${box.gameName} Â· ` : ''}
                            {box.barcode}
                          </option>
                        ))}
                      </select>
                    )}
                    {!boxesLoading && availableBoxes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        KhÃ´ng cÃ²n há»™p Available thuá»™c tá»±a khÃ¡c Ä‘á»ƒ gÃ¡n.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Chá»‰ gÃ¡n thÃªm tá»±a game khÃ¡c (Exception 6) â€” khÃ´ng chá»n báº£n sao cÃ¹ng tá»±a Ä‘ang chÆ¡i.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-orange-600 text-white hover:bg-orange-700"
                    disabled={busy || boxesLoading || !assignBarcode.trim()}
                    onClick={() => void handleAssign()}
                  >
                    {assignGames.isPending ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : (
                      <PackagePlus className="mr-2 h-4 w-4" />
                    )}
                    GÃ¡n há»™p vÃ o phiÃªn
                  </Button>

                  <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/60 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-orange-900 uppercase">
                      <PackageCheck className="h-4 w-4 text-orange-600" />
                      Há»™p Ä‘Ã£ gÃ¡n
                    </p>
                    <div className="space-y-1.5 text-xs">
                      {displayAssignedBoxes.map((box) => (
                        <div
                          key={box.barcode || box.name}
                          className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 rounded-md border border-orange-200 bg-white p-2"
                        >
                          <span className="font-semibold text-orange-950">{box.name}</span>
                          {box.barcode ? (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {box.barcode}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}
        </section>

        <Button
          type="button"
          className={`h-12 w-full text-white font-medium ${
            isAlreadyChecking ? 'bg-orange-600 hover:bg-orange-700' : 'bg-amber-600 hover:bg-amber-700'
          }`}
          disabled={busy}
          onClick={() => void handleEndGame()}
        >
          {endGame.isPending ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : isAlreadyChecking ? (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          ) : (
            <Square className="mr-2 h-4 w-4" />
          )}
          {isAlreadyChecking ? 'âœ“ ÄÃ£ nháº­n láº¡i game' : 'Nháº­n láº¡i game'}
        </Button>
      </div>

      <div className="space-y-4">
        {isAlreadyChecking ? (
          <>
            <section className="space-y-3 rounded-lg border bg-background p-3.5 md:p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                {componentsVerified ? (
                  <PackageCheck className="h-4 w-4 text-orange-600" />
                ) : (
                  <ClipboardCheck className="h-4 w-4 text-orange-600" />
                )}
                Kiá»ƒm kÃª linh kiá»‡n
              </p>

              {componentsVerified ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-orange-600" />
                  <p className="text-sm font-semibold text-orange-900">ÄÃ£ kiá»ƒm tra Ä‘áº§y Ä‘á»§ linh kiá»‡n</p>
                  <p className="text-xs text-orange-800/80">Chuyá»ƒn sang tab Thanh toÃ¡n Ä‘á»ƒ tÃ­nh tiá»n cho khÃ¡ch</p>
                </div>
              ) : (
                <>
                  {checklistLoading ? (
                    <div className="flex justify-center py-6">
                      <Spinner className="h-5 w-5" />
                    </div>
                  ) : components.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Template khÃ´ng cÃ³ linh kiá»‡n â€” dÃ¹ng &quot;Äá»§ háº¿t&quot; Ä‘á»ƒ Ä‘Ã³ng kiá»ƒm kÃª.
                    </p>
                  ) : (
                    <div className="max-h-56 space-y-2 overflow-auto">
                      {components.map((c) => (
                        <div
                          key={c.componentId}
                          className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border p-2 text-xs"
                        >
                          <div>
                            <p className="font-medium">{c.componentName}</p>
                            <p className="text-muted-foreground">Ká»³ vá»ng: {c.expectedQuantity}</p>
                          </div>
                          <NumberStepper
                            value={actualByComponent[c.componentId] ?? c.expectedQuantity}
                            onChange={(next) =>
                              setActualByComponent((prev) => ({
                                ...prev,
                                [c.componentId]: Math.max(0, next),
                              }))
                            }
                            min={0}
                            max={Math.max(
                              c.expectedQuantity,
                              actualByComponent[c.componentId] ?? 0,
                            )}
                            size="sm"
                            ariaLabelDec={`Giáº£m ${c.componentName}`}
                            ariaLabelInc={`TÄƒng ${c.componentName}`}
                            className="w-fit"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      className="w-full bg-orange-600 text-white hover:bg-orange-700"
                      disabled={busy}
                      onClick={() => void submitCheck(true)}
                    >
                      {checkGames.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Äá»§ háº¿t
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={busy || components.length === 0}
                      onClick={() => void submitCheck(false)}
                    >
                      Gá»­i kiá»ƒm kÃª chi tiáº¿t
                    </Button>
                  </div>
                </>
              )}
            </section>

            {!componentsVerified ? (
              <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3.5 md:p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Hao há»¥t (inventory-loss)
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="loss-comp-select">Linh kiá»‡n</Label>
                  <select
                    id="loss-comp-select"
                    className="flex h-9 w-full rounded-md border border-amber-300 bg-white px-3 py-1 text-xs"
                    value={lossComponentId}
                    onChange={(e) => setLossComponentId(e.target.value)}
                  >
                    <option value="">-- Chá»n --</option>
                    {components.map((comp) => (
                      <option key={comp.componentId} value={comp.componentId}>
                        {comp.componentName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loss-qty">Sá»‘ lÆ°á»£ng thiáº¿u</Label>
                  <NumberStepper
                    id="loss-qty"
                    value={Math.max(1, Number(lossQty) || 1)}
                    onChange={(next) => setLossQty(Math.max(1, next))}
                    min={1}
                    max={999}
                    size="sm"
                    ariaLabelDec="Giáº£m sá»‘ lÆ°á»£ng thiáº¿u"
                    ariaLabelInc="TÄƒng sá»‘ lÆ°á»£ng thiáº¿u"
                    className="w-fit"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loss-note">Ghi chÃº</Label>
                  <Textarea
                    id="loss-note"
                    rows={2}
                    value={lossNote}
                    onChange={(e) => setLossNote(e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-amber-400 bg-white text-amber-900"
                  disabled={busy}
                  onClick={() => void handleLoss()}
                >
                  {reportLoss.isPending ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <AlertTriangle className="mr-2 h-4 w-4" />
                  )}
                  Ghi nháº­n máº¥t mÃ¡t
                </Button>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
