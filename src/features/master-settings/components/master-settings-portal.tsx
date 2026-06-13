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
  const { data, isLoading, isError } = useMasterSettings();
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
    updateMutation.mutate({ ...values, updatedAt: new Date().toISOString() });
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải cấu hình hệ thống...</div>;
  }

  if (isError) {
    return <div className="p-4 text-sm text-rose-600">Không thể tải cấu hình hệ thống.</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-6 pb-20">
      <div>
        <h2 className="text-xl font-semibold">Quản trị Tham số Toàn cục</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          GET/PUT <code className="text-xs">/api/MasterSettings</code> — mock khi backend chưa sẵn
          sàng.
        </p>
      </div>

      <Tabs defaultValue="elo" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-4">
          <TabsTrigger value="elo">Công thức Elo</TabsTrigger>
          <TabsTrigger value="karma">Trọng số Karma</TabsTrigger>
          <TabsTrigger value="matchmaking">Matchmaking</TabsTrigger>
          <TabsTrigger value="fee">Biểu phí nền tảng</TabsTrigger>
        </TabsList>

        <TabsContent value="elo">
          <Card>
            <CardHeader>
              <CardTitle>Hệ số K theo thể loại</CardTitle>
              <CardDescription>Điều chỉnh độ nhạy Elo cho từng nhóm game đối kháng.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="strategyK"
                label="Strategy K"
                error={errors.elo?.strategyK?.message}
                disabled={updateMutation.isPending}
                {...register('elo.strategyK', { valueAsNumber: true })}
              />
              <NumberField
                id="partyK"
                label="Party K"
                error={errors.elo?.partyK?.message}
                disabled={updateMutation.isPending}
                {...register('elo.partyK', { valueAsNumber: true })}
              />
              <NumberField
                id="competitiveK"
                label="Competitive K"
                error={errors.elo?.competitiveK?.message}
                disabled={updateMutation.isPending}
                {...register('elo.competitiveK', { valueAsNumber: true })}
              />
              <NumberField
                id="casualK"
                label="Casual K"
                error={errors.elo?.casualK?.message}
                disabled={updateMutation.isPending}
                {...register('elo.casualK', { valueAsNumber: true })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="karma">
          <Card>
            <CardHeader>
              <CardTitle>Trọng số trừ Karma tự động</CardTitle>
              <CardDescription>Số điểm uy tín bị trừ theo loại hành vi vi phạm.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <NumberField
                id="noShowPenalty"
                label="No-show"
                error={errors.karma?.noShowPenalty?.message}
                disabled={updateMutation.isPending}
                {...register('karma.noShowPenalty', { valueAsNumber: true })}
              />
              <NumberField
                id="lateCancelPenalty"
                label="Hủy cọc muộn"
                error={errors.karma?.lateCancelPenalty?.message}
                disabled={updateMutation.isPending}
                {...register('karma.lateCancelPenalty', { valueAsNumber: true })}
              />
              <NumberField
                id="kickedPenalty"
                label="Bị kích khỏi phòng"
                error={errors.karma?.kickedPenalty?.message}
                disabled={updateMutation.isPending}
                {...register('karma.kickedPenalty', { valueAsNumber: true })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matchmaking">
          <Card>
            <CardHeader>
              <CardTitle>Thuật toán Matchmaking</CardTitle>
              <CardDescription>Giới hạn bán kính và chênh lệch Elo khi ghép trận.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="searchRadiusKm"
                label="Bán kính tìm phòng (km)"
                error={errors.matchmaking?.searchRadiusKm?.message}
                disabled={updateMutation.isPending}
                {...register('matchmaking.searchRadiusKm', { valueAsNumber: true })}
              />
              <NumberField
                id="maxEloDifference"
                label="Chênh lệch Elo tối đa"
                error={errors.matchmaking?.maxEloDifference?.message}
                disabled={updateMutation.isPending}
                {...register('matchmaking.maxEloDifference', { valueAsNumber: true })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fee">
          <Card>
            <CardHeader>
              <CardTitle>Biểu phí nền tảng</CardTitle>
              <CardDescription>Tỷ lệ chiết khấu doanh thu đặt bàn thành công (0–100%).</CardDescription>
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
        <Button
          type="submit"
          size="lg"
          className="shadow-lg"
          disabled={updateMutation.isPending}
        >
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
