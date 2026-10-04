'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { STAFF_CAFE_QUERY_KEYS } from '@/features/staff-cafe/services/staff-cafe.service';
import { ProfileService } from '../services/profile.service';
import type { PlayerLocation, UpdatePlayerLocationRequest } from '../types/profile.interface';
import { MY_LOCATION_QUERY_KEY } from './useMyLocation';

function getLocationErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();
  if (message.includes('400') || message.includes('invalid') || message.includes('tọa độ')) {
    return 'Tọa độ không hợp lệ.';
  }
  if (message.includes('403')) {
    return 'Tài khoản bị chặn hoặc vô hiệu hóa.';
  }
  if (message.includes('404')) {
    return 'Không tìm thấy tài khoản người dùng.';
  }
  return error.message || 'Cập nhật vị trí thất bại.';
}

export function readBrowserGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ GPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Bạn đã từ chối quyền truy cập vị trí.'));
          return;
        }
        reject(new Error('Không lấy được vị trí GPS. Thử lại.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 60_000,
      },
    );
  });
}

function invalidateLocationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: MY_LOCATION_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: [STAFF_CAFE_QUERY_KEYS.nearbyCafes] });
}

export function useUpdateMyLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePlayerLocationRequest) =>
      ProfileService.updateMyLocation(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(MY_LOCATION_QUERY_KEY, data);
      invalidateLocationQueries(queryClient);
      toast.success('Đã cập nhật vị trí hiện tại.');
    },
    onError: (error: Error) => {
      toast.error(getLocationErrorMessage(error));
    },
  });
}

/** Đọc GPS trình duyệt rồi PUT location với source=Gps */
export function useSyncGpsLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<PlayerLocation> => {
      const position = await readBrowserGeolocation();
      return ProfileService.updateMyLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        source: 'Gps',
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(MY_LOCATION_QUERY_KEY, data);
      invalidateLocationQueries(queryClient);
      toast.success('Đã cập nhật vị trí GPS.');
    },
    onError: (error: Error) => {
      toast.error(getLocationErrorMessage(error));
    },
  });
}

/**
 * Resolve lat/lng → displayName thông qua BE (dùng endpoint
 * PUT /api/UserProfile/me/location vốn đã có sẵn khả năng reverse-geocode).
 *
 * Dùng cho form đăng ký đối tác — sau khi lấy GPS thành công, gọi hook này
 * để BE trả về tên địa điểm đã phân giải (ví dụ "Dĩ An, Thành phố Hồ Chí
 * Minh, Việt Nam") mà không cần submit form đăng ký.
 *
 * Lưu ý: hook này CẬP NHẬT location của user hiện tại trên server — chỉ
 * dùng khi form đăng ký đối tác được mở với mục đích lấy tên địa điểm
 * của quán (vốn trùng vị trí của user tại thời điểm đăng ký).
 */
export function useResolveCafeDisplayName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { latitude: number; longitude: number }): Promise<string | null> => {
      const result = await ProfileService.updateMyLocation({
        latitude: input.latitude,
        longitude: input.longitude,
        source: 'Gps',
      });
      return result.displayName ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_LOCATION_QUERY_KEY });
    },
  });
}

export function useClearMyLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ProfileService.clearMyLocation(),
    onSuccess: () => {
      queryClient.setQueryData(MY_LOCATION_QUERY_KEY, {
        latitude: null,
        longitude: null,
        updatedAt: null,
        source: null,
        hasLocation: false,
        district: null,
        city: null,
        country: null,
        displayName: null,
        hasResolvedName: false,
      });
      invalidateLocationQueries(queryClient);
      toast.success('Đã xóa vị trí đã lưu.');
    },
    onError: (error: Error) => {
      toast.error(getLocationErrorMessage(error));
    },
  });
}
