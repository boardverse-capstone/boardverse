'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import apiClient from '@/core/api/client';
import { useAdminCafes } from '@/features/admin-cafe/hooks/useAdminCafes';
import type {
  AdminTournament,
  AdminTournamentDetail,
  CreateAdminTournamentRequest,
  UpdateAdminTournamentRequest,
} from '../types/tournament.interface';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../utils/tournament.mapper';

export type TournamentFormSubmitValues =
  | { mode: 'create'; payload: CreateAdminTournamentRequest }
  | { mode: 'edit'; payload: UpdateAdminTournamentRequest };

interface TournamentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: AdminTournament | AdminTournamentDetail | null;
  onSubmit: (values: TournamentFormSubmitValues) => void;
  isPending: boolean;
}

interface BoardGameOption {
  id: string;
  name: string;
}

function pickBoardGames(raw: unknown): BoardGameOption[] {
  const root = raw as Record<string, unknown> | unknown[] | null;
  const list = Array.isArray(root)
    ? root
    : Array.isArray((root as Record<string, unknown>)?.data)
      ? ((root as Record<string, unknown>).data as unknown[])
      : Array.isArray((root as Record<string, unknown>)?.items)
        ? ((root as Record<string, unknown>).items as unknown[])
        : [];

  return list
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? row.Id ?? row.gameTemplateId ?? row.GameTemplateId ?? '');
      const name = String(row.name ?? row.Name ?? row.title ?? row.Title ?? id);
      return id ? { id, name } : null;
    })
    .filter((item): item is BoardGameOption => Boolean(item));
}

export function TournamentFormDialog({
  open,
  onOpenChange,
  tournament,
  onSubmit,
  isPending,
}: TournamentFormDialogProps) {
  const isEdit = Boolean(tournament);

  const [cafeId, setCafeId] = useState('');
  const [gameTemplateId, setGameTemplateId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [startTime, setStartTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('32');
  const [entryFeeBvc, setEntryFeeBvc] = useState('0');
  const [prizePoolBvc, setPrizePoolBvc] = useState('0');
  const [minKarmaScore, setMinKarmaScore] = useState('0');
  const [minEloRequirement, setMinEloRequirement] = useState('0');
  const [maxEloRequirement, setMaxEloRequirement] = useState('9999');
  const [error, setError] = useState('');

  const { data: cafesData, isLoading: cafesLoading } = useAdminCafes({
    page: 1,
    limit: 100,
  });
  const cafes = useMemo(() => cafesData?.data ?? [], [cafesData]);

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['board-games-options', open],
    queryFn: async () => {
      try {
        const raw = await apiClient.get<never, unknown>('/api/v1/master-games', {
          params: { page: 1, pageSize: 50 },
        });
        const games = pickBoardGames(raw);
        if (games.length) return games;
      } catch {
        // fallback below
      }
      const raw = await apiClient.get<never, unknown>('/api/v1/board-games', {
        params: { pageNumber: 1, pageSize: 50 },
      });
      return pickBoardGames(raw);
    },
    enabled: open && !isEdit,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) return;
    setCafeId(tournament?.cafeId ?? '');
    setGameTemplateId(tournament?.gameTemplateId ?? '');
    setName(tournament?.name ?? '');
    setDescription(tournament?.description ?? '');
    setRegistrationDeadline(toDatetimeLocalValue(tournament?.registrationDeadline));
    setStartTime(toDatetimeLocalValue(tournament?.startTime));
    setMaxParticipants(tournament ? String(tournament.maxParticipants) : '32');
    setEntryFeeBvc(tournament ? String(tournament.entryFeeBvc) : '0');
    setPrizePoolBvc(tournament ? String(tournament.prizePoolBvc) : '0');
    setMinKarmaScore(tournament ? String(tournament.minKarmaScore) : '0');
    setMinEloRequirement(tournament ? String(tournament.minEloRequirement) : '0');
    setMaxEloRequirement(tournament ? String(tournament.maxEloRequirement) : '9999');
    setError('');
  }, [open, tournament]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const maxP = Number(maxParticipants);
    const entry = Number(entryFeeBvc);
    const prize = Number(prizePoolBvc);
    const karma = Number(minKarmaScore);
    const minElo = Number(minEloRequirement);
    const maxElo = Number(maxEloRequirement);

    if (!isEdit && !cafeId) {
      setError('Vui lòng chọn quán cafe.');
      return;
    }
    if (!isEdit && !gameTemplateId) {
      setError('Vui lòng chọn game template.');
      return;
    }
    if (trimmedName.length < 5 || trimmedName.length > 200) {
      setError('Tên giải phải từ 5–200 ký tự.');
      return;
    }
    if (!registrationDeadline || !startTime) {
      setError('Vui lòng nhập hạn đăng ký và thời gian bắt đầu.');
      return;
    }
    if (!Number.isInteger(maxP) || maxP < 4 || maxP > 32) {
      setError('Số người tối đa phải từ 4–32.');
      return;
    }
    if (!Number.isFinite(entry) || entry < 0) {
      setError('Phí tham gia không hợp lệ.');
      return;
    }
    if (!Number.isFinite(prize) || prize < 0) {
      setError('Giải thưởng không hợp lệ.');
      return;
    }
    if (!Number.isInteger(karma) || karma < 0 || karma > 100) {
      setError('Karma tối thiểu phải từ 0–100.');
      return;
    }
    if (!Number.isInteger(minElo) || minElo < 0) {
      setError('Elo tối thiểu không hợp lệ.');
      return;
    }
    if (!Number.isInteger(maxElo) || maxElo < minElo) {
      setError('Elo tối đa phải ≥ Elo tối thiểu.');
      return;
    }

    const registrationDeadlineIso = fromDatetimeLocalValue(registrationDeadline);
    const startTimeIso = fromDatetimeLocalValue(startTime);
    if (
      Number.isNaN(new Date(registrationDeadlineIso).getTime()) ||
      Number.isNaN(new Date(startTimeIso).getTime())
    ) {
      setError('Thời gian không hợp lệ.');
      return;
    }

    setError('');

    if (isEdit) {
      onSubmit({
        mode: 'edit',
        payload: {
          name: trimmedName,
          description: description.trim() || undefined,
          registrationDeadline: registrationDeadlineIso,
          startTime: startTimeIso,
          maxParticipants: maxP,
          entryFeeBvc: entry,
          prizePoolBvc: prize,
          minKarmaScore: karma,
          minEloRequirement: minElo,
          maxEloRequirement: maxElo,
        },
      });
      return;
    }

    onSubmit({
      mode: 'create',
      payload: {
        cafeId,
        gameTemplateId,
        name: trimmedName,
        description: description.trim() || undefined,
        registrationDeadline: registrationDeadlineIso,
        startTime: startTimeIso,
        maxParticipants: maxP,
        entryFeeBvc: entry,
        prizePoolBvc: prize,
        minKarmaScore: karma,
        minEloRequirement: minElo,
        maxEloRequirement: maxElo,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Cập nhật giải đấu' : 'Tạo giải đấu mới'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Chỉ chỉnh sửa khi giải ở trạng thái Nháp hoặc Đã hủy.'
              : 'Tạo giải mới ở trạng thái Nháp.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {!isEdit && (
            <>
              <div className="grid gap-2">
                <Label>Quán cafe</Label>
                <Select value={cafeId || undefined} onValueChange={setCafeId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={cafesLoading ? 'Đang tải quán...' : 'Chọn quán'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {cafes.map((cafe) => (
                      <SelectItem key={cafe.id} value={cafe.id}>
                        {cafe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Game template</Label>
                <Select
                  value={gameTemplateId || undefined}
                  onValueChange={setGameTemplateId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={gamesLoading ? 'Đang tải game...' : 'Chọn game'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game.id} value={game.id}>
                        {game.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {games.length === 0 && !gamesLoading && (
                  <div className="grid gap-2">
                    <Label htmlFor="tournament-game-id">Hoặc nhập gameTemplateId</Label>
                    <Input
                      id="tournament-game-id"
                      value={gameTemplateId}
                      onChange={(e) => setGameTemplateId(e.target.value)}
                      placeholder="guid"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="tournament-name">Tên giải</Label>
            <Input
              id="tournament-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Summer Catan Championship 2026"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tournament-description">Mô tả (tuỳ chọn)</Label>
            <Textarea
              id="tournament-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tournament-deadline">Hạn đăng ký</Label>
              <Input
                id="tournament-deadline"
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tournament-start">Thời gian bắt đầu</Label>
              <Input
                id="tournament-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="tournament-max">Số người tối đa</Label>
              <Input
                id="tournament-max"
                type="number"
                min={4}
                max={256}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tournament-fee">Phí (BVC)</Label>
              <Input
                id="tournament-fee"
                type="number"
                min={0}
                value={entryFeeBvc}
                onChange={(e) => setEntryFeeBvc(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tournament-prize">Giải thưởng (BVC)</Label>
              <Input
                id="tournament-prize"
                type="number"
                min={0}
                value={prizePoolBvc}
                onChange={(e) => setPrizePoolBvc(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="tournament-karma">Karma tối thiểu</Label>
              <Input
                id="tournament-karma"
                type="number"
                min={0}
                max={100}
                value={minKarmaScore}
                onChange={(e) => setMinKarmaScore(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tournament-min-elo">Elo tối thiểu</Label>
              <Input
                id="tournament-min-elo"
                type="number"
                min={0}
                value={minEloRequirement}
                onChange={(e) => setMinEloRequirement(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tournament-max-elo">Elo tối đa</Label>
              <Input
                id="tournament-max-elo"
                type="number"
                min={0}
                value={maxEloRequirement}
                onChange={(e) => setMaxEloRequirement(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-2" />
                Đang lưu...
              </>
            ) : isEdit ? (
              'Cập nhật'
            ) : (
              'Tạo giải'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
