import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const ALLOWED_FOLDERS = new Set([
  "boardverse/partner-applications",
  "boardverse/tournament-covers",
]);
const DEFAULT_FOLDER = "boardverse/partner-applications";

function fail(message: string, status: number) {
  return NextResponse.json({ statusCode: status, message }, { status });
}

/**
 * POST /api/upload/cloudinary
 * multipart/form-data với field "file"
 * → { secure_url, public_id, width?, height?, format, bytes }
 */
export async function POST(request: Request) {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (!cloudinaryUrl) {
    return fail("Thiếu cấu hình CLOUDINARY_URL trên máy chủ.", 500);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail("Không đọc được payload multipart.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Thiếu file đính kèm (field 'file').", 400);
  }

  // Caller chỉ định folder (mặc định = partner-applications). Whitelist để
  // tránh ghi lung tung vào Cloudinary.
  const requestedFolder = String(formData.get("folder") ?? "").trim();
  const folder = requestedFolder && ALLOWED_FOLDERS.has(requestedFolder)
    ? requestedFolder
    : DEFAULT_FOLDER;

  if (file.size === 0) {
    return fail("File rỗng, vui lòng chọn lại ảnh giấy phép.", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return fail("File vượt quá 5MB, vui lòng chọn file nhỏ hơn.", 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return fail(
      "Định dạng file không hợp lệ. Chỉ chấp nhận JPEG, PNG, WEBP hoặc PDF.",
      400,
    );
  }

  try {
    cloudinary.config({ cloudinaryUrl });

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: "auto",
      overwrite: false,
      invalidate: true,
    });

    return NextResponse.json({
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể upload ảnh lên Cloudinary.";
    return fail(message, 500);
  }
}