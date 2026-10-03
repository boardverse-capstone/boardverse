"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
} from "lucide-react";

/**
 * Layout dùng cho trang /partner/register.
 * - Bento grid đồng bộ phong cách PartnerLanding
 * - 1 hero card + 1 side card, dưới là 3 stat tiles
 */
export function PartnerRegistrationLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = containerRef.current?.querySelectorAll<HTMLElement>(".reveal");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#f6f5f1] text-[#171717] antialiased"
    >
      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          .reveal {
            opacity: 0;
            transform: translateY(12px);
            transition:
              opacity 0.45s ease,
              transform 0.45s ease;
          }
          .reveal.is-visible {
            opacity: 1;
            transform: translateY(0);
          }
        }
        /* Khi user yêu cầu giảm motion, .reveal render như bình thường */
        @media (prefers-reduced-motion: reduce) {
          .reveal {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      {/* ─── NAV ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#f6f5f1]/80 border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/partner")}
            className="flex items-center gap-2 font-bold tracking-tight group"
          >
            <span className="text-lg">BoardVerse</span>
            <span className="text-[10px] font-semibold border border-black/15 px-1.5 py-0.5 rounded-md text-neutral-500 uppercase tracking-wider">
              Partner
            </span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/partner")}
            className="text-sm font-semibold text-neutral-600 hover:text-black px-3 py-1.5 rounded-full transition inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Về trang giới thiệu
          </button>
        </div>
      </nav>

      {children}

      {/* ─── FOOTER HINT ─────────────────────────────────────── */}
      <footer className="max-w-5xl mx-auto px-6 pb-12 pt-4">
        <div className="reveal rounded-2xl border border-black/5 bg-white p-5 flex items-start gap-3">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-[#fef3c7] grid place-items-center text-[#92400e]">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div className="text-xs text-neutral-600 leading-relaxed">
            <p className="font-semibold text-neutral-900 mb-0.5">
              Quy trình duyệt đơn
            </p>
            <p>
              Sau khi gửi, đội ngũ BoardVerse sẽ kiểm tra giấy tờ pháp lý và xác
              minh vị trí quán. Bạn sẽ nhận email thông báo khi đơn được duyệt
              hoặc cần bổ sung thông tin.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}