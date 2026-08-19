'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_MASTER_SETTINGS } from '../constants/default-settings';
import { useMasterSettings } from '../hooks/useMasterSettings';
import { useUpdateMasterSettings } from '../hooks/useUpdateMasterSettings';
import {
  MasterSettingsSchema,
  zodResolverCompat,
  type MasterSettingsFormValues,
} from '@/shared/validators/behavior-monitoring.validator';

function NumberField({
  label,
  description,
  error,
  ...inputProps
}: {
  label: string;
  description?: string;
  error?: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={inputProps.id}>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <Input type="number" {...inputProps} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function MasterSettingsPortal() {
  const { data, isLoading, isError, error, refetch } = useMasterSettings();
  const updateMutation = useUpdateMasterSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MasterSettingsFormValues>({
    resolver: zodResolverCompat(MasterSettingsSchema),
    defaultValues: DEFAULT_MASTER_SETTINGS,
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const onSubmit = (values: MasterSettingsFormValues) => {
    updateMutation.mutate({ ...values });
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải cấu hình hệ thống...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-rose-600">
        {(error as Error)?.message || 'Không thể tải cấu hình hệ thống.'}{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-6 pb-20">
      <Tabs defaultValue="elo" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-4">
          <TabsTrigger value="elo">Elo</TabsTrigger>
          <TabsTrigger value="karma">Karma</TabsTrigger>
          <TabsTrigger value="matchmaking">Matchmaking</TabsTrigger>
          <TabsTrigger value="fee">Biểu phí</TabsTrigger>
        </TabsList>

        <TabsContent value="elo">
          <Card>
            <CardHeader>
              <CardTitle>Hệ số Elo K</CardTitle>
              <CardDescription>
                Key API: <span className="font-mono">elo_k_factor</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-sm">
              <NumberField
                id="kFactor"
                label="Elo K Factor"
                description="Độ nhạy Elo khi cập nhật điểm."
                error={errors.elo?.kFactor?.message}
                disabled={updateMutation.isPending}
                {...register('elo.kFactor', { valueAsNumber: true })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="karma">
          <Card>
            <CardHeader>
              <CardTitle>Phạt Karma</CardTitle>
              <CardDescription>
                Key API: <span className="font-mono">karma_penalty_cancel</span>,{' '}
                <span className="font-mono">karma_penalty_noshow</span>. Giá trị thường là số âm.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="cancelPenalty"
                label="Phạt hủy (cancel)"
                error={errors.karma?.cancelPenalty?.message}
                disabled={updateMutation.isPending}
                {...register('karma.cancelPenalty', { valueAsNumber: true })}
              />
              <NumberField
                id="noShowPenalty"
                label="Phạt no-show"
                error={errors.karma?.noShowPenalty?.message}
                disabled={updateMutation.isPending}
                {...register('karma.noShowPenalty', { valueAsNumber: true })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matchmaking">
          <Card>
            <CardHeader>
              <CardTitle>Matchmaking</CardTitle>
              <CardDescription>
                Key API: <span className="font-mono">matchmaking_radius_km</span>,{' '}
                <span className="font-mono">matchmaking_elo_diff</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="radiusKm"
                label="Bán kính tìm (km)"
                error={errors.matchmaking?.radiusKm?.message}
                disabled={updateMutation.isPending}
                {...register('matchmaking.radiusKm', { valueAsNumber: true })}
              />
              <NumberField
                id="eloDiff"
                label="Chênh lệch Elo tối đa"
                error={errors.matchmaking?.eloDiff?.message}
                disabled={updateMutation.isPending}
                {...register('matchmaking.eloDiff', { valueAsNumber: true })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fee">
          <Card>
            <CardHeader>
              <CardTitle>Biểu phí nền tảng</CardTitle>
              <CardDescription>
                Nhập % trên UI; khi lưu sẽ gửi{' '}
                <span className="font-mono">platform_commission_rate</span> dạng tỉ lệ (vd. 15% →
                0.15).
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-sm">
              <NumberField
                id="commissionPercent"
                label="Chiết khấu (%)"
                error={errors.platformFee?.commissionPercent?.message}
                disabled={updateMutation.isPending}
                min={0}
                max={100}
                step={0.1}
                {...register('platformFee.commissionPercent', { valueAsNumber: true })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-6 right-6 z-10">
        <Button type="submit" size="lg" className="shadow-lg" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Lưu cấu hình hệ thống
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
