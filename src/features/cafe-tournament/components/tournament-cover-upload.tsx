"use client";

import * as React from "react";
import { ImageIcon, Upload, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useCloudinaryUpload } from "@/features/partner/hooks/useCloudinaryUpload";
import { cn } from "@/lib/utils";

interface Props {
  /**
   * URL ảnh đã có (từ draft BE trả về). Nếu có, hiển thị preview
   * ngay khi mount — staff có thể giữ nguyên hoặc upload đè.
   */
  initialUrl?: string;
  /**
   * Gọi khi upload thành công → trả về secure_url.
   * Form cha dùng URL này để gửi xuống BE.
   */
  onUploaded: (url: string) => void;
  /**
   * Gọi khi staff bấm nút "Gỡ ảnh". Form cha nên set imageUrl="".
   */
  onCleared?: () => void;
  /** Disable toàn bộ — dùng khi form đang submit. */
  disabled?: boolean;
  /** Test id cho Playwright. */
  "data-testid"?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const FOLDER = "boardverse/tournament-covers";

/**
 * Upload ảnh bìa giải đấu lên Cloudinary thông qua server-side route
 * `/api/upload/cloudinary`. Staff chỉ việc chọn file từ máy — không cần
 * nhớ URL.
 *
 * - Nhỏ hơn 5 MB, JPEG/PNG/WEBP.
 * - Hiển thị preview ngay sau khi chọn file (object URL tạm) rồi thay
 *   bằng URL Cloudinary khi upload xong.
 * - Có thể gỡ ảnh (gọi onCleared) hoặc thay ảnh (chọn file khác).
 */
export function TournamentCoverUpload({
  initialUrl,
  onUploaded,
  onCleared,
  disabled,
  "data-testid": testId = "tournament-cover-upload",
}: Props) {
  const { uploading, error, upload } = useCloudinaryUpload({ folder: FOLDER });

  // null = chưa có ảnh (placeholder), string = URL đang hiển thị
  // initialUrl chỉ đọc lúc mount — sau đó form cha quản lý qua onUploaded
  // / onCleared, nên không cần effect đồng bộ.
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(
    initialUrl ?? null,
  );

  // Ref để rollback preview khi upload fail (tránh stale closure)
  const fallbackUrl = React.useRef<string | null>(initialUrl ?? null);

  // Object URL của file local (chỉ dùng khi đang upload preview, GC khi xong)
  const localObjectUrl = React.useRef<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // GC object URL khi unmount
  React.useEffect(() => {
    return () => {
      if (localObjectUrl.current) {
        URL.revokeObjectURL(localObjectUrl.current);
        localObjectUrl.current = null;
      }
    };
  }, []);

  const handleFile = React.useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        toast.error("File vượt quá 5MB, vui lòng chọn file nhỏ hơn.");
        return;
      }
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        toast.error("Định dạng không hợp lệ. Chỉ chấp nhận JPEG, PNG, WEBP.");
        return;
      }

      // Hiển thị preview local ngay lập tức
      if (localObjectUrl.current) URL.revokeObjectURL(localObjectUrl.current);
      const objUrl = URL.createObjectURL(file);
      localObjectUrl.current = objUrl;
      setPreviewUrl(objUrl);

      try {
        const result = await upload(file);
        setPreviewUrl(result.secure_url);
        onUploaded(result.secure_url);
        // GC object URL tạm — đã có URL thật
        if (localObjectUrl.current === objUrl) {
          URL.revokeObjectURL(objUrl);
          localObjectUrl.current = null;
        }
      } catch {
        // Rollback preview nếu upload fail
        if (localObjectUrl.current === objUrl) {
          URL.revokeObjectURL(objUrl);
          localObjectUrl.current = null;
        }
        setPreviewUrl(fallbackUrl.current);
        toast.error("Upload ảnh thất bại. Vui lòng thử lại.");
      }
    },
    [upload, onUploaded],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Cho phép chọn lại cùng 1 file (bằng cách reset value)
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const handleClear = () => {
    if (localObjectUrl.current) {
      URL.revokeObjectURL(localObjectUrl.current);
      localObjectUrl.current = null;
    }
    setPreviewUrl(null);
    onCleared?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      {previewUrl ? (
        // === Có ảnh: hiển thị preview + nút gỡ/thay ===
        <div className="relative group rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Ảnh bìa giải đấu"
            className={cn(
              "w-full h-32 sm:h-36 object-cover",
              uploading && "opacity-50",
            )}
          />

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/40 backdrop-blur-xs">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-lg">
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                <span className="text-xs font-bold text-neutral-800">
                  Đang upload...
                </span>
              </div>
            </div>
          )}

          {!disabled && !uploading && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-neutral-700 shadow-md transition-colors"
                title="Thay ảnh khác"
                aria-label="Thay ảnh bìa"
                data-testid="cover-replace"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-white/95 hover:bg-rose-50 text-rose-600 shadow-md transition-colors"
                title="Gỡ ảnh"
                aria-label="Gỡ ảnh bìa"
                data-testid="cover-clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        // === Chưa có ảnh: dropzone ===
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 h-32 sm:h-36",
            "rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/60",
            "cursor-pointer transition-colors hover:border-amber-400 hover:bg-amber-50/40",
            (disabled || uploading) && "opacity-60 cursor-not-allowed",
          )}
          data-testid="cover-dropzone"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
              <span className="text-[11px] font-bold text-neutral-700">
                Đang upload...
              </span>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-500">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-neutral-800">
                Tải ảnh bìa lên
              </span>
              <span className="text-[10px] text-neutral-500">
                Kéo thả hoặc bấm — JPEG/PNG/WEBP, tối đa 5 MB
              </span>
            </>
          )}
        </label>
      )}

      {/* Hidden input — ref chung cho cả dropzone + nút thay */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onInputChange}
        disabled={disabled || uploading}
        className="hidden"
        data-testid="cover-file-input"
      />

      {error && (
        <div
          className="flex items-start gap-1.5 text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-200 rounded-lg p-2"
          data-testid="cover-error"
          role="alert"
        >
          <AlertCircle className="w-3 h-3 mt-px shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
