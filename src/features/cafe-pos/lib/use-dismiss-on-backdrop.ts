"use client";

import { useEffect, useRef } from "react";

/**
 * Đóng modal khi click vào backdrop hoặc nhấn Escape.
 * - Bỏ qua click khi target là chính backdrop (tránh bubble từ panel bên trong).
 * - Bỏ qua khi modal đang loading / busy (để tránh mất state giữa chừng).
 */
export function useDismissOnBackdrop(
  isOpen: boolean,
  onClose: () => void,
  options: {
    /** Khi true thì không đóng backdrop (vd: đang submit / loading) */
    busy?: boolean;
    /** Có đóng bằng phím Escape không (mặc định true) */
    escape?: boolean;
  } = {},
) {
  const { busy = false, escape = true } = options;
  // Lưu lại onClose để tránh re-bind effect mỗi render
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    if (escape) {
      const handler = (event: KeyboardEvent) => {
        if (event.key === "Escape" && !busy) {
          onCloseRef.current();
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
    return undefined;
  }, [isOpen, escape, busy]);
}

/**
 * Handler gắn lên backdrop để click ra ngoài panel → đóng modal.
 * So sánh `event.target` với `event.currentTarget` để chỉ tính click đúng vào backdrop.
 */
export function backdropCloseHandler(
  onClose: () => void,
  busy = false,
) {
  return (event: React.MouseEvent<HTMLDivElement>) => {
    if (busy) return;
    if (event.target === event.currentTarget) {
      onClose();
    }
  };
}
