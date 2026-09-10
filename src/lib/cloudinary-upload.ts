const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

export function isCloudinaryUploadConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

/** Upload file lên Cloudinary, trả URL https để PATCH thumbnail cho BE. */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  if (!isCloudinaryUploadConfigured()) {
    throw new Error(
      'Chưa cấu hình NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME và NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.',
    );
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Chỉ chọn file ảnh.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ảnh tối đa 5MB.');
  }

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body },
  );
  const payload = (await response.json()) as { secure_url?: string; error?: { message?: string } };
  const url = payload.secure_url?.trim();
  if (!response.ok || !url) {
    throw new Error(payload.error?.message || 'Upload ảnh thất bại.');
  }
  return url;
}
