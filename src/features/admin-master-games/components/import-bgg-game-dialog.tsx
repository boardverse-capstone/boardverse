'use client';

import { useState } from 'react';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { BggSearchHit } from '../types/master-game.interface';
import {
  useBggPreview,
  useBggSearch,
  useImportBggGame,
} from '../hooks/useImportBggGame';

interface ImportBggGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (gameTemplateId: string, name: string) => void;
}

export function ImportBggGameDialog({
  open,
  onOpenChange,
  onImported,
}: ImportBggGameDialogProps) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selected, setSelected] = useState<BggSearchHit | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  const search = useBggSearch(submittedQuery, open);
  const preview = useBggPreview(selected?.bggId ?? null, false);
  const importMutation = useImportBggGame();

  const showingSearchResults = submittedQuery.length >= 2;
  const pickList = showingSearchResults ? (search.data ?? []) : [];

  const handleSearchMore = () => {
    const next = query.trim();
    if (next.length < 2) return;
    setSelected(null);
    setSubmittedQuery(next);
  };

  const reset = () => {
    setQuery('');
    setSubmittedQuery('');
    setSelected(null);
    setOverwriteExisting(false);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleImport = () => {
    if (!selected) return;
    importMutation.mutate(
      {
        bggId: selected.bggId,
        overwriteExisting,
        curatedComponentsOnly: false,
      },
      {
        onSuccess: (result) => {
          if (result.gameTemplateId) {
            onImported?.(result.gameTemplateId, result.name || selected.name);
          }
          handleClose(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Thêm board game vào hệ thống</DialogTitle>
          <DialogDescription>
            Tìm game trên BoardGameGeek, bấm một tựa để import vào catalog.
          </DialogDescription>
        </DialogHeader>

        {selected ? (
          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Về danh sách
            </Button>
            <div className="rounded-lg border bg-neutral-50 p-3 text-sm">
              {preview.isFetching ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lấy thông tin game...
                </p>
              ) : preview.isError ? (
                <p className="text-rose-600">
                  {preview.error instanceof Error
                    ? preview.error.message
                    : 'Không lấy được thông tin game này.'}
                </p>
              ) : preview.data ? (
                <div className="space-y-1">
                  <p className="text-base font-semibold">{preview.data.name}</p>
                  <p className="text-muted-foreground">
                    {preview.data.minPlayers && preview.data.maxPlayers
                      ? `${preview.data.minPlayers}–${preview.data.maxPlayers} người chơi`
                      : 'Chưa rõ số người'}
                    {preview.data.playTimeMinutes
                      ? ` · khoảng ${preview.data.playTimeMinutes} phút`
                      : ''}
                    {preview.data.yearPublished
                      ? ` · năm ${preview.data.yearPublished}`
                      : ''}
                  </p>
                  <p className="text-muted-foreground">
                    Sẽ kèm {preview.data.componentCount} linh kiện mẫu vào catalog.
                  </p>
                </div>
              ) : (
                <p className="font-semibold">{selected.name}</p>
              )}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={overwriteExisting}
                onChange={(event) => setOverwriteExisting(event.target.checked)}
              />
              <span>
                Cập nhật lại nếu game đã có (ghi đè metadata và linh kiện từ
                BGG). Bỏ trống nếu chỉ thêm tựa mới — game trùng sẽ báo đã có,
                không bị ghi đè.
              </span>
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="bgg-search">Tìm game trên BGG</Label>
                <Input
                  id="bgg-search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    if (submittedQuery) setSubmittedQuery('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSearchMore();
                    }
                  }}
                  placeholder="Nhập tên game, tối thiểu 2 ký tự"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={handleSearchMore}
                disabled={query.trim().length < 2 || search.isFetching}
              >
                {search.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Tìm
              </Button>
            </div>

            <p className="text-sm font-medium">
              {showingSearchResults
                ? `Kết quả từ BGG cho “${submittedQuery}” — bấm một tựa để thêm:`
                : 'Nhập tên rồi bấm Tìm. Kết quả lấy từ máy chủ BGG.'}
            </p>

            {search.isError && showingSearchResults ? (
              <p className="text-sm text-rose-600">
                {search.error instanceof Error
                  ? search.error.message
                  : 'Không tìm được game trên BGG.'}
              </p>
            ) : null}

            <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {search.isFetching && showingSearchResults ? (
                <p className="col-span-full flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tìm trên BGG...
                </p>
              ) : !showingSearchResults ? (
                <p className="col-span-full rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  Chưa tìm. Nhập tên game (từ 2 ký tự) rồi bấm Tìm.
                </p>
              ) : pickList.length === 0 ? (
                <p className="col-span-full rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  BGG không trả tựa khớp.
                </p>
              ) : (
                pickList.map((hit) => (
                  <button
                    key={hit.bggId}
                    type="button"
                    onClick={() => setSelected(hit)}
                    className={cn(
                      'rounded-xl border border-neutral-200 bg-white px-3 py-3 text-left hover:border-neutral-900 hover:bg-neutral-50',
                    )}
                  >
                    <span className="block font-semibold">{hit.name}</span>
                    {hit.yearPublished ? (
                      <span className="text-xs text-muted-foreground">
                        Năm {hit.yearPublished}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Đóng
          </Button>
          {selected ? (
            <Button
              type="button"
              disabled={importMutation.isPending || preview.isFetching}
              onClick={handleImport}
            >
              {importMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Thêm game này
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
