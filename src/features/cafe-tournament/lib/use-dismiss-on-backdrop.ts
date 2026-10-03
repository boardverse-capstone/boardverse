"use client";

import { useEffect, useRef } from "react";

/**
 * Đóng modal khi click vào backdrop hoặc nhấn Escape.
 *
 * Ref pattern: cập nhật `onCloseRef.current` trong effect (không trong render
 * — React 19 cấm ref mutation during render) để handler Escape luôn gọi
 * callback mới nhất mà không cần re-bind listener mỗi lần parent re-render.
 */
export function useDismissOnBackdrop(
  isOpen: boolean,
  onClose: () => void,
  options: {
    busy?: boolean;
    escape?: boolean;
  } = {},
) {
  const { busy = false, escape = true } = options;
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
