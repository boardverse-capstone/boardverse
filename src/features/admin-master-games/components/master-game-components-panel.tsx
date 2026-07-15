'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/page-header';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useMasterGameComponents } from '../hooks/useMasterGameComponents';
import { useCreateMasterGameComponent } from '../hooks/useCreateMasterGameComponent';
import { useUpdateMasterGameComponent } from '../hooks/useUpdateMasterGameComponent';
import type { MasterGameComponent } from '../types/master-game.interface';
import {
  MasterGameComponentFormDialog,
  type MasterGameComponentFormValues,
} from './master-game-component-form-dialog';

export function MasterGameComponentsPanel() {
  const [gameTemplateId, setGameTemplateId] = useState('');
  const [activeGameTemplateId, setActiveGameTemplateId] = useState<string | null>(null);

  const { data = [], isLoading, isError, refetch } = useMasterGameComponents(activeGameTemplateId);
  const createMutation = useCreateMasterGameComponent(activeGameTemplateId ?? '');
  const updateMutation = useUpdateMasterGameComponent(activeGameTemplateId ?? '');

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
          <div className="flex justify-end">
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
          </div>
        ),
      },
    ],
    [],
  );

  const handleLoadComponents = () => {
    const trimmed = gameTemplateId.trim();
    if (!trimmed) return;
    setActiveGameTemplateId(trimmed);
  };

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

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Linh kiện game gốc"
        description="Quản lý linh kiện theo gameTemplateId (GET/POST/PUT /api/v1/admin/master-games/{gameTemplateId}/components)."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chọn tựa game gốc</CardTitle>
          <CardDescription>Nhập UUID gameTemplateId để tải danh sách linh kiện.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="game-template-id">Game Template ID</Label>
            <Input
              id="game-template-id"
              value={gameTemplateId}
              onChange={(event) => setGameTemplateId(event.target.value)}
              placeholder="UUID của tựa game gốc"
            />
          </div>
          <Button onClick={handleLoadComponents} disabled={!gameTemplateId.trim()}>
            <Search className="mr-2 h-4 w-4" />
            Tải linh kiện
          </Button>
        </CardContent>
      </Card>

      {activeGameTemplateId && (
        <>
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
        </>
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
