'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, DoorOpen, Package, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useAlternativeGames } from '../hooks/usePosCheckIn';
import { usePosBoxes } from '../hooks/usePosBoxes';
import { useCreatePosSession } from '../hooks/usePosMutations';
import { useGameCoverLookup } from '../hooks/useGameCoverLookup';
import { PosCheckInService } from '../services/pos-check-in.service';
import type { ActivatedSession, CafeTable, PosGameBox } from '../types/pos-check-in.interface';
import { NumberStepper } from '@/features/cafe-pos/components/number-stepper';

interface PosWalkInPanelProps {
  cafeId?: string;
  tables: CafeTable[];
  selectedTableId?: string;
  onStarted?: (session: ActivatedSession) => void;
}

function BoxThumb({ src, alt }: { src?: string | null; alt: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="h-11 w-11 shrink-0 rounded-md border object-cover bg-muted"
      />
    );
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
      <Package className="h-5 w-5" />
    </div>
  );
}

export function PosWalkInPanel({
  cafeId,
  selectedTableId,
  onStarted,
}: PosWalkInPanelProps) {
  const createSession = useCreatePosSession(cafeId);
  const { data: boxes = [], isLoading: boxesLoading, isError: boxesError } = usePosBoxes(cafeId);
  const { data: inventoryGames = [] } = useAlternativeGames(cafeId, 4, Boolean(cafeId));
  const [barcode, setBarcode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [boxListOpen, setBoxListOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['Chá»§ bÃ n', 'KhÃ¡ch 2']);

  const imageByTemplate = useMemo(() => {
    const map = new Map<string, string>();
    inventoryGames.forEach((g) => {
      if (g.gameTemplateId && g.imageUrl) map.set(g.gameTemplateId, g.imageUrl);
      if (g.name && g.imageUrl) map.set(g.name.trim().toLowerCase(), g.imageUrl);
    });
    return map;
  }, [inventoryGames]);

  const availableBoxes = useMemo(() => {
    return boxes
      .filter((b) => {
        const status = String(b.status || '').toLowerCase();
        return status === 'available' || status === '0';
      })
      .map((b): PosGameBox => {
        if (b.imageUrl) return b;
        const fromTemplate =
          (b.gameTemplateId && imageByTemplate.get(b.gameTemplateId)) ||
          (b.gameName && imageByTemplate.get(b.gameName.trim().toLowerCase())) ||
          null;
        return fromTemplate ? { ...b, imageUrl: fromTemplate } : b;
      });
  }, [boxes, imageByTemplate]);

  const filteredBoxes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableBoxes;
    return availableBoxes.filter((b) => {
      const name = (b.gameName || '').toLowerCase();
      const code = (b.barcode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [availableBoxes, searchQuery]);

  const selectedBox = useMemo(
    () => availableBoxes.find((b) => b.barcode === barcode) || null,
    [availableBoxes, barcode],
  );

  const coverLookup = useGameCoverLookup(cafeId, availableBoxes);

  const gameLimits = useMemo(() => {
    if (!selectedBox) return { minPlayers: 1, maxPlayers: 8 };
    const match =
      inventoryGames.find(
        (g) =>
          (selectedBox.gameTemplateId && g.gameTemplateId === selectedBox.gameTemplateId) ||
          (selectedBox.gameName &&
            g.name.trim().toLowerCase() === selectedBox.gameName.trim().toLowerCase()),
      ) || null;
    const minPlayers = Math.max(1, Number(match?.minPlayers) || 1);
    const maxPlayers = Math.max(minPlayers, Number(match?.maxPlayers) || 8);
    return { minPlayers, maxPlayers };
  }, [selectedBox, inventoryGames]);

  useEffect(() => {
    if (!selectedBox) return;
    const next = gameLimits.minPlayers;
    setPlayerCount(next);
    setPlayerNames((prev) => {
      const names = Array.from({ length: next }, (_, i) => {
        if (prev[i]?.trim()) return prev[i];
        return i === 0 ? 'Chá»§ bÃ n' : `KhÃ¡ch ${i + 1}`;
      });
      return names;
    });
  }, [selectedBox?.barcode, gameLimits.minPlayers, gameLimits.maxPlayers]);

  const syncPlayerNames = (count: number) => {
    setPlayerNames((prev) =>
      Array.from({ length: count }, (_, i) => {
        if (prev[i]?.trim()) return prev[i];
        return i === 0 ? 'Chá»§ bÃ n' : `KhÃ¡ch ${i + 1}`;
      }),
    );
  };

  const handlePlayerCountChange = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(
      gameLimits.maxPlayers,
      Math.max(gameLimits.minPlayers, Math.round(n)),
    );
    setPlayerCount(clamped);
    syncPlayerNames(clamped);
  };

  const handleStart = async () => {
    if (!selectedTableId) {
      toast.error('ChÆ°a chá»n bÃ n trÃªn sÆ¡ Ä‘á»“.');
      return;
    }
    if (!barcode.trim()) {
      toast.error('Chá»n há»™p game tá»« danh sÃ¡ch.');
      return;
    }
    if (!cafeId) {
      toast.error('Thiáº¿u mÃ£ quÃ¡n.');
      return;
    }
    if (playerCount < gameLimits.minPlayers) {
      toast.error(
        `Game nÃ y cáº§n tá»‘i thiá»ƒu ${gameLimits.minPlayers} ngÆ°á»i â€” hÃ£y nháº­p Ä‘á»§ ngÆ°á»i chÆ¡i.`,
      );
      return;
    }
    if (playerCount > gameLimits.maxPlayers) {
      toast.error(`Game nÃ y tá»‘i Ä‘a ${gameLimits.maxPlayers} ngÆ°á»i.`);
      return;
    }

    try {
      const session = await createSession.mutateAsync({
        cafeTableId: selectedTableId,
        barcode: barcode.trim(),
      });

      // GET tháº­t sau create â€” BE thÆ°á»ng Ä‘Ã£ cÃ³ host (vÃ  Ä‘Ã´i khi Ä‘á»§ minPlayers)
      let fresh = await PosCheckInService.getSession(cafeId, session.sessionId).catch(() => null);
      const countOf = (s: {
        presentCount?: number;
        members?: { id?: string }[];
      } | null | undefined) => {
        // Bá» slot pad FE (guest-slot-*) â€” chá»‰ Ä‘áº¿m member API tháº­t
        const real = (s?.members || []).filter(
          (m) =>
            m?.id &&
            !String(m.id).startsWith('guest-slot-') &&
            !String(m.id).startsWith('guest-auto-'),
        ).length;
        return Math.max(1, real, s?.presentCount || 0);
      };

      let already = countOf(fresh ?? session);
      let lastSession = fresh ?? session;

      // Chá»‰ thÃªm guest khi cÃ²n thiáº¿u so vá»›i sá»‘ user nháº­p (khÃ´ng tin presentCount trong create body)
      while (already < playerCount) {
        const displayName = playerNames[already]?.trim() || `KhÃ¡ch ${already + 1}`;
        try {
          lastSession = await PosCheckInService.addGuestSlots(cafeId, session.sessionId, {
            displayName,
          });
          fresh = await PosCheckInService.getSession(cafeId, session.sessionId).catch(() => null);
          const next = countOf(fresh ?? lastSession);
          // TrÃ¡nh vÃ²ng láº·p náº¿u API khÃ´ng tÄƒng count
          if (next <= already) {
            already += 1;
          } else {
            already = next;
          }
          if (fresh) lastSession = fresh;
        } catch (guestErr) {
          toast.error(
            (guestErr as Error)?.message ||
              `PhiÃªn Ä‘Ã£ má»Ÿ nhÆ°ng chÆ°a thÃªm Ä‘á»§ khÃ¡ch (${already}/${playerCount}).`,
          );
          onStarted?.(session);
          return;
        }
      }

      // XÃ³a LS cá»™ng ngÆ°á»i â€” tÃªn láº¥y tá»« server members; trÃ¡nh header 1+LS = 3
      if (typeof window !== 'undefined' && session.sessionId) {
        try {
          localStorage.removeItem(`pos_added_members_${session.sessionId}`);
          window.dispatchEvent(new Event('pos_session_members_updated'));
        } catch {
          // ignore
        }
      }

      setBarcode('');
      setSearchQuery('');
      setBoxListOpen(false);
      const started = fresh ?? lastSession;
      onStarted?.({
        ...started,
        presentCount: playerCount,
        members: (started as { members?: unknown[] }).members,
      } as ActivatedSession);
      toast.success(
        `Walk-in OK Â· ${session.tableLabel} Â· ${session.game.name} Â· ${playerCount} ngÆ°á»i.`,
      );
    } catch (err) {
      toast.error((err as Error)?.message || 'KhÃ´ng thá»ƒ táº¡o phiÃªn walk-in.');
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-3 md:p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <DoorOpen className="h-4 w-4" />
        KhÃ¡ch vÃ£ng lai
      </p>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          Há»™p game *
        </Label>

        {selectedBox ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
            <BoxThumb src={coverLookup.lookup(selectedBox)} alt={selectedBox.gameName || selectedBox.barcode} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{selectedBox.gameName || 'Há»™p game'}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {selectedBox.barcode}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 text-xs"
              onClick={() => {
                setBarcode('');
                setSearchQuery('');
                setBoxListOpen(true);
              }}
            >
              Äá»•i
            </Button>
          </div>
        ) : !boxListOpen && !boxesLoading ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-start gap-2 text-sm font-normal text-muted-foreground"
            onClick={() => setBoxListOpen(true)}
          >
            <Package className="h-3.5 w-3.5" />
            Chá»n há»™p gameâ€¦
          </Button>
        ) : null}

        {boxListOpen && !boxesLoading ? (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="walkin-box-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="TÃ¬m theo tÃªn gameâ€¦"
                className="h-9 pl-8 text-sm"
                autoComplete="off"
                autoFocus
              />
            </div>
            <div
              role="listbox"
              aria-label="Danh sÃ¡ch há»™p cÃ³ sáºµn"
              className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1"
            >
              {filteredBoxes.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  {searchQuery.trim()
                    ? `KhÃ´ng tháº¥y há»™p khá»›p â€œ${searchQuery.trim()}â€.`
                    : 'KhÃ´ng cÃ²n há»™p Available.'}
                </p>
              ) : (
                filteredBoxes.map((box) => {
                  const selected = barcode === box.barcode;
                  return (
                    <button
                      key={box.id || box.barcode}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setBarcode(box.barcode);
                        setSearchQuery('');
                        setBoxListOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                        selected ? 'bg-orange-50 ring-1 ring-orange-300' : 'hover:bg-muted/60',
                      )}
                    >
                      <BoxThumb src={coverLookup.lookup(box)} alt={box.gameName || box.barcode} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {box.gameName || 'Há»™p game'}
                        </span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">
                          {box.barcode}
                        </span>
                      </span>
                      {selected ? <Check className="h-4 w-4 shrink-0 text-orange-600" /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : null}

        {boxesLoading ? (
          <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
            <Spinner className="h-3.5 w-3.5" />
            Äang táº£i danh sÃ¡ch há»™pâ€¦
          </div>
        ) : null}
        {boxesError ? (
          <p className="text-xs text-orange-600">KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch há»™p. Thá»­ F5.</p>
        ) : null}
      </div>

      {selectedBox ? (
        <div className="space-y-2 rounded-md border bg-muted/20 p-2.5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="walkin-player-count" className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Sá»‘ ngÆ°á»i chÆ¡i *
              </Label>
              <NumberStepper
                value={playerCount}
                onChange={(next) => handlePlayerCountChange(String(next))}
                min={gameLimits.minPlayers}
                max={gameLimits.maxPlayers}
                size="md"
                ariaLabelDec="Giáº£m sá»‘ ngÆ°á»i chÆ¡i"
                ariaLabelInc="TÄƒng sá»‘ ngÆ°á»i chÆ¡i"
              />
            </div>
            <p className="pb-1 text-xs text-muted-foreground">
              Game yÃªu cáº§u {gameLimits.minPlayers}â€“{gameLimits.maxPlayers} ngÆ°á»i
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">TÃªn ngÆ°á»i chÆ¡i</Label>
            <div className="max-h-36 space-y-1.5 overflow-y-auto">
              {playerNames.map((name, index) => (
                <Input
                  key={`walkin-player-${index}`}
                  value={name}
                  onChange={(e) => {
                    const next = [...playerNames];
                    next[index] = e.target.value;
                    setPlayerNames(next);
                  }}
                  placeholder={index === 0 ? 'Chá»§ bÃ n' : `KhÃ¡ch ${index + 1}`}
                  className="h-8 text-sm"
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        className="w-full"
        disabled={
          createSession.isPending ||
          boxesLoading ||
          !selectedTableId ||
          !barcode.trim() ||
          playerCount < gameLimits.minPlayers
        }
        onClick={() => void handleStart()}
      >
        {createSession.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
        Báº¯t Ä‘áº§u phiÃªn walk-in
      </Button>
    </div>
  );
}
