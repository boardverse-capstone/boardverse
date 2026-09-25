'use client';

import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { IconCommand } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  isCloudinaryUploadConfigured,
  uploadImageToCloudinary,
} from '@/lib/cloudinary-upload';
import { useMasterGameCatalog } from '../hooks/useMasterGameCatalog';
import { useMasterGameComponents } from '../hooks/useMasterGameComponents';
import { useCreateMasterGameComponent } from '../hooks/useCreateMasterGameComponent';
import { useUpdateMasterGameComponent } from '../hooks/useUpdateMasterGameComponent';
import { useDeleteMasterGameComponent } from '../hooks/useDeleteMasterGameComponent';
import { useUpdateMasterGameThumbnail } from '../hooks/useUpdateMasterGameMeta';
import type { MasterGameComponent } from '../types/master-game.interface';
import {
  MasterGameComponentFormDialog,
  type MasterGameComponentFormValues,
} from './master-game-component-form-dialog';
import { MasterGameMetaPanel } from './master-game-meta-panel';
import { ImportBggGameDialog } from './import-bgg-game-dialog';
import { useBggComponentCatalog } from '../hooks/useImportBggGame';

export function MasterGameComponentsPanel() {
  const [search, setSearch] = useState('');
  const [activeGameTemplateId, setActiveGameTemplateId] = useState<string | null>(null);
  const [activeGameName, setActiveGameName] = useState('');

  const { data: catalog = [], isLoading: catalogLoading, isError: catalogError, refetch: refetchCatalog } =
    useMasterGameCatalog();
  const { data = [], isLoading, isError, refetch } = useMasterGameComponents(activeGameTemplateId);
  const { data: kindCatalog = [] } = useBggComponentCatalog();
  const createMutation = useCreateMasterGameComponent(activeGameTemplateId ?? '');
  const updateMutation = useUpdateMasterGameComponent(activeGameTemplateId ?? '');
  const deleteMutation = useDeleteMasterGameComponent(activeGameTemplateId ?? '');
  const thumbnailMutation = useUpdateMasterGameThumbnail(activeGameTemplateId ?? '');

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<MasterGameComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterGameComponent | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const openGameDetail = (game: { id: string; name: string; thumbnailUrl: string | null }) => {
    setActiveGameTemplateId(game.id);
    setActiveGameName(game.name);
    setThumbnailUrl(game.thumbnailUrl ?? '');
    setShowUrlInput(false);
    setDetailOpen(true);
  };

  const selectedGame = catalog.find((game) => game.id === activeGameTemplateId) ?? null;

  useEffect(() => {
    if (!detailOpen) return;
    setThumbnailUrl(selectedGame?.thumbnailUrl ?? '');
  }, [detailOpen, selectedGame?.thumbnailUrl]);

  const openAddComponent = () => {
    if (!activeGameTemplateId) return;
    setEditingComponent(null);
    setFormOpen(true);
  };

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
        cell: ({ row }) => {
          const match = kindCatalog.find(
            (item) => String(item.kind) === String(row.original.type),
          );
          return (
            <span className="text-sm">
              {match ? match.nameVi || match.nameEn : row.original.type}
            </span>
          );
        },
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
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Xóa
            </Button>
          </div>
        ),
      },
    ],
    [deleteMutation, kindCatalog],
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
        description="Bấm một tựa game để mở popup chi tiết. Thêm tựa mới bằng nút Thêm board game."
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Chọn tựa game gốc</CardTitle>
              <CardDescription>
                Danh sách game đã có. Bấm một tựa để mở popup ảnh, linh kiện và metadata.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setImportOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm board game
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="master-game-search">Tìm theo tên</Label>
            <Input
              id="master-game-search"
              value={search ?? ''}
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
                    onClick={() => openGameDetail(game)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-neutral-50',
                      selected && 'bg-neutral-100 font-semibold',
                    )}
                  >
                    {game.thumbnailUrl ? (
                      <img
                        src={game.thumbnailUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <span className="bg-neutral-100 text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded text-[10px]">
                        Ảnh
                      </span>
                    )}
                    <span className="min-w-0 flex-1">{game.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={detailOpen && Boolean(activeGameTemplateId)}
        onOpenChange={setDetailOpen}
      >
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{activeGameName || 'Chi tiết game'}</DialogTitle>
            
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="mg-thumb-file">Ảnh thumbnail</Label>
              <div className="relative flex min-h-24 flex-col gap-3 sm:flex-row sm:items-start">
                {isUploadingImage || thumbnailMutation.isPending ? (
                  <div
                    className="bg-background/80 absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <div className="relative flex size-16 items-center justify-center">
                      <span className="border-rose-200 border-t-rose-500 absolute inset-0 animate-spin rounded-full border-2" />
                      <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 shadow-md">
                        <IconCommand className="size-5 text-white" stroke={1.75} />
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">Đang tải ảnh lên...</p>
                  </div>
                ) : null}
                {thumbnailUrl.trim() ? (
                  <img
                    src={thumbnailUrl.trim()}
                    alt={activeGameName || 'Thumbnail'}
                    className="h-24 w-24 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground flex h-24 w-24 shrink-0 items-center justify-center rounded-md border border-dashed text-xs">
                    Chưa có ảnh
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                  <input
                    id="mg-thumb-file"
                    key={fileInputKey}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={
                      isUploadingImage ||
                      thumbnailMutation.isPending ||
                      !isCloudinaryUploadConfigured()
                    }
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file || !activeGameTemplateId) return;
                      setFileInputKey((key) => key + 1);
                      setIsUploadingImage(true);
                      void uploadImageToCloudinary(file)
                        .then((url) => {
                          setThumbnailUrl(url);
                          thumbnailMutation.mutate({ thumbnailUrl: url });
                        })
                        .catch((error: unknown) => {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : 'Upload ảnh thất bại.',
                          );
                        })
                        .finally(() => setIsUploadingImage(false));
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      isUploadingImage ||
                      thumbnailMutation.isPending ||
                      !isCloudinaryUploadConfigured()
                    }
                    onClick={() => document.getElementById('mg-thumb-file')?.click()}
                  >
                    Chọn ảnh
                  </Button>
                  {showUrlInput ? (
                    <div className="flex w-full flex-wrap gap-2">
                      <Input
                        id="mg-thumb-url"
                        value={thumbnailUrl ?? ''}
                        onChange={(event) => setThumbnailUrl(event.target.value)}
                        placeholder="Dán URL ảnh (https://...)"
                        className="min-w-40 flex-1"
                        disabled={isUploadingImage || thumbnailMutation.isPending}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          thumbnailMutation.isPending ||
                          isUploadingImage ||
                          !/^https?:\/\//i.test(thumbnailUrl.trim())
                        }
                        onClick={() =>
                          thumbnailMutation.mutate({ thumbnailUrl: thumbnailUrl.trim() })
                        }
                      >
                        Lưu URL
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowUrlInput(false)}
                      >
                        Ẩn
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                      onClick={() => setShowUrlInput(true)}
                    >
                      Dùng URL
                    </button>
                  )}
                </div>
              </div>
            </div>

            {activeGameTemplateId ? (
              <Tabs defaultValue="components">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <TabsList>
                    <TabsTrigger value="components">Linh kiện</TabsTrigger>
                    <TabsTrigger value="meta">Thể loại / Metadata</TabsTrigger>
                  </TabsList>
                  <Button type="button" size="sm" onClick={openAddComponent}>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm linh kiện
                  </Button>
                </div>

                <TabsContent value="components" className="space-y-4">
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
                    <PartnerDataTable
                      columns={columns}
                      data={data}
                      emptyMessage="Chưa có linh kiện nào."
                    />
                  )}
                </TabsContent>

                <TabsContent value="meta">
                  <MasterGameMetaPanel gameTemplateId={activeGameTemplateId} />
                </TabsContent>
              </Tabs>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

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

      <ImportBggGameDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(gameTemplateId, name) => {
          openGameDetail({ id: gameTemplateId, name, thumbnailUrl: null });
          void refetchCatalog();
        }}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa linh kiện?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa linh kiện{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              . Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.componentId, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
