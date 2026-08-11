'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
}

interface UseQrScannerOptions {
  enabled: boolean;
  onScan: (value: string) => void;
}

export function useQrScanner({ enabled, onScan }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }

    let cancelled = false;

    const start = async () => {
      setError(null);

      const BarcodeDetectorCtor = (
        window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike }
      ).BarcodeDetector;

      if (!BarcodeDetectorCtor) {
        setIsSupported(false);
        setError('Trình duyệt không hỗ trợ quét QR bằng camera. Vui lòng nhập mã thủ công.');
        return;
      }

      setIsSupported(true);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();

        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });

        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              onScan(codes[0].rawValue);
              stop();
              return;
            }
          } catch {
            // skip frame
          }
          rafRef.current = requestAnimationFrame(scan);
        };

        rafRef.current = requestAnimationFrame(scan);
      } catch {
        setError('Không thể mở camera. Kiểm tra quyền truy cập hoặc dùng nhập mã thủ công.');
      }
    };

    void start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, onScan, stop]);

  return { videoRef, isSupported, error, stop };
}
