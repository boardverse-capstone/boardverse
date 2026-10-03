'use client';

import { useState } from 'react';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

export interface UploadCloudinaryError extends Error {
  status?: number;
}

interface UploadCloudinaryArgs {
  file: File;
  endpoint?: string;
  /** Cloudinary folder hợp lệ — phải nằm trong whitelist của server route. */
  folder?: string;
}

/**
 * Upload 1 file qua local API route /api/upload/cloudinary.
 * Route handler sẽ dùng CLOUDINARY_URL ở phía server để upload an toàn.
 */
export async function uploadToCloudinary({
  file,
  endpoint = '/api/upload/cloudinary',
  folder,
}: UploadCloudinaryArgs): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (folder) formData.append('folder', folder);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    public_id?: string;
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
    statusCode?: number;
    message?: string;
  };

  if (!response.ok || !payload.secure_url) {
    const error = new Error(
      payload.message || 'Upload ảnh lên Cloudinary thất bại.',
    ) as UploadCloudinaryError;
    error.status = response.status;
    throw error;
  }

  return {
    secure_url: payload.secure_url,
    public_id: payload.public_id ?? '',
    format: payload.format ?? '',
    bytes: payload.bytes ?? file.size,
    width: payload.width,
    height: payload.height,
  };
}

interface UseCloudinaryUploadArgs {
  folder?: string;
}

/**
 * Hook tiện ích: gom state upload (progress boolean + error + result).
 * Caller tự quyết định khi nào gọi mutate().
 */
export function useCloudinaryUpload(args: UseCloudinaryUploadArgs = {}) {
  const { folder } = args;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CloudinaryUploadResult | null>(null);

  const reset = async () => {
    setUploading(false);
    setError(null);
    setResult(null);
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadToCloudinary({ file, folder });
      setResult(uploaded);
      return uploaded;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Upload ảnh thất bại.';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, result, upload, reset };
}