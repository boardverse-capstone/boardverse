'use client';

import { useCallback, useState } from 'react';

export interface CafeLocation {
  latitude: number;
  longitude: number;
}

export interface CafeLocationError extends Error {
  code?: number;
}

function buildGeolocationError(error: GeolocationPositionError): CafeLocationError {
  const wrapped = new Error(
    error.code === error.PERMISSION_DENIED
      ? 'Bạn đã từ chối quyền truy cập vị trí.'
      : 'Không lấy được vị trí GPS. Vui lòng thử lại.',
  ) as CafeLocationError;
  wrapped.code = error.code;
  return wrapped;
}

/**
 * Lấy kinh độ/vĩ độ trình duyệt — không persist lên server, chỉ dùng
 * để đính kèm vào payload đăng ký đối tác.
 */
export function readCurrentCafeLocation(): Promise<CafeLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ GPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => reject(buildGeolocationError(error)),
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 60_000,
      },
    );
  });
}

export function useCurrentLocation() {
  // Chỉ giữ loading + error. `location` thuộc về formData để tránh
  // duplicate state (single source of truth).
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await readCurrentCafeLocation();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không lấy được vị trí.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { loading, error, fetchLocation, reset };
}