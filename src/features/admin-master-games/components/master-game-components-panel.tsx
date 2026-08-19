'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/page-header';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { cn } from '@/lib/utils';
import { useMasterGameCatalog } from '../hooks/useMasterGameCatalog';
import { useMasterGameComponents } from '../hooks/useMasterGameComponents';
import { useCreateMasterGameComponent } from '../hooks/useCreateMasterGameComponent';
import { useUpdateMasterGameComponent } from '../hooks/useUpdateMasterGameComponent';
import { useDeleteMasterGameComponent } from '../hooks/useDeleteMasterGameComponent';
import type { MasterGameComponent } from '../types/master-game.interface';
import {
  MasterGameComponentFormDialog,
  type MasterGameComponentFormValues,
} from './master-game-component-form-dialog';
import { MasterGameMetaPanel } from './master-game-meta-panel';

export function MasterGameComponentsPanel() {
  const [search, setSearch] = useState('');
  const [activeGameTemplateId, setActiveGameTemplateId] = useState<string | null>(null);
  const [activeGameName, setActiveGameName] = useState('');

  const { data: catalog = [], isLoading: catalogLoading, isError: catalogError, refetch: refetchCatalog } =
    useMasterGameCatalog();
  const { data = [], isLoading, isError, refetch } = useMasterGameComponents(activeGameTemplateId);
  const createMutation = useCreateMasterGameComponent(activeGameTemplateId ?? '');
  const updateMutation = useUpdateMasterGameComponent(activeGameTemplateId ?? '');
  const deleteMutation = useDeleteMasterGameComponent(activeGameTemplateId ?? '');

  const [formOpen, setFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<MasterGameComponent | null>(null);

  const columns = useMemo<ColumnDef<MasterGameComponent>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tên linh kiện',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'type',
        header: 'Loại',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.type}</span>,
      },
      {
        accessorKey: 'defaultQuantity',
        header: 'SL mặc định',
        cell: ({ row }) => row.original.defaultQuantity,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingComponent(row.original);
                setFormOpen(true);
              }}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Sửa
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-200 text-rose-700"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Xóa linh kiện "${row.original.name}"? Thao tác này không thể hoàn tác.`,
                  )
                ) {
                  deleteMutation.mutate(row.original.componentId);
                }
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Xóa
            </Button>
          </div>
        ),
      },
    ],
    [deleteMutation],
  );

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((game) => game.name.toLowerCase().includes(q));
  }, [catalog, search]);

  const handleFormSubmit = (values: MasterGameComponentFormValues) => {
    if (!activeGameTemplateId) return;

    if (editingComponent) {
      updateMutation.mutate(
        { componentId: editingComponent.componentId, payload: values },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditingComponent(null);
          },
        },
      );
      return;
    }

    createMutation.mutate(values, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const isPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục game gốc"
        description="Linh kiện, thể loại, metadata và ảnh đại diện của game gốc."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chọn tựa game gốc</CardTitle>
          <CardDescription>
            Chọn game trong danh sách để quản lý linh kiện, thể loại và metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="master-game-search">Tìm theo tên</Label>
            <Input
              id="master-game-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ví dụ: Catan, Splendor..."
            />
          </div>
          {catalogLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải danh sách game...
            </div>
          ) : catalogError ? (
            <p className="text-sm text-rose-600">
              Không tải được catalog.{' '}
              <button type="button" className="underline" onClick={() => void refetchCatalog()}>
                Thử lại
              </button>
            </p>
          ) : filteredCatalog.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              Không có tựa game khớp.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              {filteredCatalog.map((game) => {
                const selected = activeGameTemplateId === game.id;
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      setActiveGameTemplateId(game.id);
                      setActiveGameName(game.name);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-neutral-50',
                      selected && 'bg-neutral-100 font-semibold',
                    )}
                  >
                    <span>{game.name}</span>
                    {selected ? (
                      <span className="text-[10px] font-bold uppercase text-neutral-500">Đang chọn</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
          {activeGameName ? (
            <p className="text-xs text-muted-foreground">
              Đang quản lý: <span className="font-semibold text-foreground">{activeGameName}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {activeGameTemplateId && (
        <Tabs defaultValue="components">
          <TabsList>
            <TabsTrigger value="components">Linh kiện</TabsTrigger>
            <TabsTrigger value="meta">Thể loại / Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="components" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditingComponent(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm linh kiện
              </Button>
            </div>

            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Đang tải linh kiện...</div>
            ) : isError ? (
              <div className="text-sm text-rose-600">
                Không thể tải linh kiện.{' '}
                <button type="button" className="underline" onClick={() => refetch()}>
                  Thử lại
                </button>
              </div>
            ) : (
              <PartnerDataTable columns={columns} data={data} emptyMessage="Chưa có linh kiện nào." />
            )}
          </TabsContent>

          <TabsContent value="meta">
            <MasterGameMetaPanel gameTemplateId={activeGameTemplateId} />
          </TabsContent>
        </Tabs>
      )}

      {activeGameTemplateId && (
        <MasterGameComponentFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingComponent(null);
          }}
          component={editingComponent}
          onSubmit={handleFormSubmit}
          isPending={isPending}
        />
      )}
    </div>
  );
}
