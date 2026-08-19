'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories } from '@/features/admin-categories/hooks/useCategories';
import {
  useMasterGameCategories,
  useSetMasterGameCategories,
} from '../hooks/useMasterGameCategories';
import {
  useUpdateMasterGameMetadata,
  useUpdateMasterGameThumbnail,
} from '../hooks/useUpdateMasterGameMeta';

interface MasterGameMetaPanelProps {
  gameTemplateId: string;
}

export function MasterGameMetaPanel({ gameTemplateId }: MasterGameMetaPanelProps) {
  const { data: allCategories = [] } = useCategories(false);
  const { data: linked = [], isLoading } = useMasterGameCategories(gameTemplateId);
  const setCategoriesMutation = useSetMasterGameCategories(gameTemplateId);
  const metadataMutation = useUpdateMasterGameMetadata(gameTemplateId);
  const thumbnailMutation = useUpdateMasterGameThumbnail(gameTemplateId);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minPlayers, setMinPlayers] = useState<number | ''>('');
  const [maxPlayers, setMaxPlayers] = useState<number | ''>('');
  const [playTimeMinutes, setPlayTimeMinutes] = useState<number | ''>('');
  const [designer, setDesigner] = useState('');
  const [yearPublished, setYearPublished] = useState<number | ''>('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  useEffect(() => {
    setSelectedIds(linked.map((item) => item.id));
  }, [linked]);

  const linkedLabel = useMemo(
    () => (linked.length ? linked.map((c) => c.name).join(', ') : 'Chưa gán thể loại'),
    [linked],
  );

  const toggleCategory = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id),
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thể loại của game</CardTitle>
          <CardDescription>
            Chọn thể loại gắn với game. Thay đổi sẽ thay thế toàn bộ danh sách hiện tại.
            {' '}
            Hiện tại: {isLoading ? '...' : linkedLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
            {allCategories.map((category) => {
              const checked = selectedIds.includes(category.id);
              return (
                <label key={category.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleCategory(category.id, value === true)}
                  />
                  <span>{category.name}</span>
                  <span className="text-xs text-muted-foreground">({category.slug})</span>
                </label>
              );
            })}
          </div>
          <Button
            disabled={setCategoriesMutation.isPending}
            onClick={() => setCategoriesMutation.mutate({ categoryIds: selectedIds })}
          >
            Lưu thể loại
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Metadata & Thumbnail</CardTitle>
          <CardDescription>
            PUT /master-games/{'{id}'} và PATCH .../thumbnail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="mg-name">Tên</Label>
            <Input id="mg-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mg-desc">Mô tả</Label>
            <Textarea
              id="mg-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="mg-min">Min players</Label>
              <Input
                id="mg-min"
                type="number"
                value={minPlayers}
                onChange={(e) =>
                  setMinPlayers(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mg-max">Max players</Label>
              <Input
                id="mg-max"
                type="number"
                value={maxPlayers}
                onChange={(e) =>
                  setMaxPlayers(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="mg-time">Play time (phút)</Label>
              <Input
                id="mg-time"
                type="number"
                value={playTimeMinutes}
                onChange={(e) =>
                  setPlayTimeMinutes(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mg-year">Năm xuất bản</Label>
              <Input
                id="mg-year"
                type="number"
                value={yearPublished}
                onChange={(e) =>
                  setYearPublished(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mg-designer">Designer</Label>
            <Input
              id="mg-designer"
              value={designer}
              onChange={(e) => setDesigner(e.target.value)}
            />
          </div>
          <Button
            disabled={metadataMutation.isPending}
            onClick={() =>
              metadataMutation.mutate({
                name: name.trim() || undefined,
                description: description.trim() || undefined,
                minPlayers: minPlayers === '' ? undefined : minPlayers,
                maxPlayers: maxPlayers === '' ? undefined : maxPlayers,
                playTimeMinutes: playTimeMinutes === '' ? undefined : playTimeMinutes,
                designer: designer.trim() || undefined,
                yearPublished: yearPublished === '' ? undefined : yearPublished,
              })
            }
          >
            Lưu metadata
          </Button>

          <div className="border-t pt-3">
            <div className="grid gap-2">
              <Label htmlFor="mg-thumb">Thumbnail URL</Label>
              <Input
                id="mg-thumb"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://cdn.example.com/games/catan.jpg"
              />
            </div>
            <Button
              className="mt-2"
              variant="outline"
              disabled={thumbnailMutation.isPending || !thumbnailUrl.trim()}
              onClick={() =>
                thumbnailMutation.mutate({ thumbnailUrl: thumbnailUrl.trim() })
              }
            >
              Cập nhật thumbnail
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
