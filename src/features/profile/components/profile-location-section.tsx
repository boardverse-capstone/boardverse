'use client';

import { useEffect, useState } from 'react';
import { MapPin, Navigation, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { useMyLocation } from '../hooks/useMyLocation';
import { useSyncGpsLocation, useUpdateMyLocation } from '../hooks/useUpdateMyLocation';
import { formatProfileDate } from '../utils/profile.mapper';

interface ProfileLocationSectionProps {
  /** Gọi sau khi lưu vị trí thành công (GPS hoặc thủ công) */
  onSaved?: () => void;
  className?: string;
}

function isValidLatitude(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function ProfileLocationSection({ onSaved, className }: ProfileLocationSectionProps) {
  const { data: location, isLoading, refetch } = useMyLocation();
  const syncGps = useSyncGpsLocation();
  const updateManual = useUpdateMyLocation();

  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  useEffect(() => {
    if (location?.hasLocation && location.latitude != null && location.longitude != null) {
      setLatitude(String(location.latitude));
      setLongitude(String(location.longitude));
    }
  }, [location?.hasLocation, location?.latitude, location?.longitude]);

  const busy = syncGps.isPending || updateManual.isPending;

  const handleGps = () => {
    syncGps.mutate(undefined, {
      onSuccess: async () => {
        await refetch();
        onSaved?.();
      },
    });
  };

  const handleManualSave = () => {
    const lat = Number(latitude.trim().replace(',', '.'));
    const lng = Number(longitude.trim().replace(',', '.'));

    if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
      toast.error('Tọa độ không hợp lệ. Latitude ∈ [-90, 90], longitude ∈ [-180, 180].');
      return;
    }

    updateManual.mutate(
      { latitude: lat, longitude: lng, source: 'Manual' },
      {
        onSuccess: async () => {
          await refetch();
          onSaved?.();
        },
      },
    );
  };

  const latNum = Number(latitude.trim().replace(',', '.'));
  const lngNum = Number(longitude.trim().replace(',', '.'));
  const canSaveManual =
    latitude.trim() !== '' &&
    longitude.trim() !== '' &&
    isValidLatitude(latNum) &&
    isValidLongitude(lngNum);

  return (
    <div className={className ?? 'space-y-3 rounded-lg border bg-muted/20 p-3'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Vị trí hiện tại
          </p>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Đang tải...</p>
          ) : location?.hasLocation && location.latitude != null && location.longitude != null ? (
            <p className="text-xs text-muted-foreground">
              {location.source ? `${location.source} · ` : ''}
              {formatProfileDate(location.updatedAt)}
            </p>
          ) : (
            <p className="text-xs text-amber-700">Chưa lưu vị trí. Dùng GPS hoặc nhập thủ công.</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={busy}
          onClick={handleGps}
        >
          {syncGps.isPending ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Navigation className="mr-2 h-4 w-4" />
          )}
          GPS
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="manual-lat" className="text-xs">
            Vĩ độ (latitude)
          </Label>
          <Input
            id="manual-lat"
            inputMode="decimal"
            placeholder="10.776889"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-lng" className="text-xs">
            Kinh độ (longitude)
          </Label>
          <Input
            id="manual-lng"
            inputMode="decimal"
            placeholder="106.700806"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      {(latitude.trim() !== '' || longitude.trim() !== '') && !canSaveManual ? (
        <p className="text-xs text-rose-600">
          Latitude ∈ [-90, 90], longitude ∈ [-180, 180].
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        className="w-full sm:w-auto"
        disabled={busy || !canSaveManual}
        onClick={handleManualSave}
      >
        {updateManual.isPending ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <PencilLine className="mr-2 h-4 w-4" />
        )}
        Lưu thủ công
      </Button>
    </div>
  );
}
