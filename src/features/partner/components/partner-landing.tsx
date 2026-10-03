"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Coffee,
  Sparkles,
  Gamepad2,
  BarChart3,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";

export function PartnerLanding() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = containerRef.current?.querySelectorAll<HTMLElement>(
      ".reveal",
    );
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
        .reveal {
          opacity: 0;
          transform: translateY(16px);
          transition:
            opacity 0.5s ease,
            transform 0.5s ease;
        }
        .reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>

      {/* ─── NAV ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#f6f5f1]/80 border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <span className="text-lg">BoardVerse</span>
            <span className="text-[10px] font-semibold border border-black/15 px-1.5 py-0.5 rounded-md text-neutral-500 uppercase tracking-wider">
              Partner
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#features"
              className="hidden sm:inline-flex text-sm text-neutral-600 hover:text-black px-3 py-1.5 rounded-full transition"
            >
              Tính năng
            </a>
            <a
              href="#how"
              className="hidden sm:inline-flex text-sm text-neutral-600 hover:text-black px-3 py-1.5 rounded-full transition"
            >
              Cách hoạt động
            </a>
            <button
              onClick={() => router.push("/partner/register")}
              className="text-sm font-semibold bg-black text-white pl-4 pr-3 py-1.5 rounded-full hover:bg-neutral-800 transition inline-flex items-center gap-1"
            >
              Đăng ký ngay
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO BENTO GRID ─────────────────────────────────── */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-12">
        <div className="grid grid-cols-12 grid-rows-[auto_auto_auto] gap-4">
          {/* Hero title — wide */}
          <div className="col-span-12 md:col-span-8 reveal">
            <div className="bg-white rounded-3xl p-8 md:p-10 border border-black/5 h-full flex flex-col justify-between min-h-[280px]">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider bg-[#fef3c7] text-[#92400e] px-2.5 py-1 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  Chương trình đối tác 2026
                </span>
                <h1 className="mt-5 text-4xl md:text-6xl font-bold tracking-tight leading-[1.02]">
                  Biến quán cafe của bạn thành{" "}
                  <span className="text-[#d97706]">vũ trụ</span>{" "}
                  <span className="italic font-serif">board game</span>.
                </h1>
              </div>
              <p className="mt-6 text-neutral-600 text-base max-w-2xl leading-relaxed">
                POS quản lý bàn, giải đấu trực tiếp, và tự động hoá media
                — trên một nền tảng tiếng Việt duy nhất.
              </p>
            </div>
          </div>

          {/* CTA — right top */}
          <div className="col-span-12 md:col-span-4 reveal">
            <button
              onClick={() => router.push("/partner/register")}
              className="w-full h-full min-h-[280px] bg-[#171717] text-white rounded-3xl p-8 flex flex-col items-start justify-between text-left hover:bg-[#262626] transition group"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 transition">
                <ArrowUpRight className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-semibold leading-tight">
                  Trở thành Đối tác Cafe
                </div>
                <div className="mt-2 text-sm text-white/60">
                  Gửi hồ sơ · Phê duyệt nhanh
                </div>
              </div>
            </button>
          </div>

          {/* Pillar 1 — green */}
          <div className="col-span-6 md:col-span-3 reveal">
            <div className="bg-[#d1f4d6] rounded-3xl p-6 h-full min-h-[180px] flex flex-col justify-between">
              <BarChart3 className="h-5 w-5 text-[#166534]" />
              <div>
                <div className="text-xl font-semibold tracking-tight">
                  Quản lý vận hành
                </div>
                <div className="text-sm text-neutral-700 mt-1">
                  Bàn, phiên chơi, đặt lịch, thanh toán
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 2 — pink */}
          <div className="col-span-6 md:col-span-3 reveal">
            <div className="bg-[#fbd1d1] rounded-3xl p-6 h-full min-h-[180px] flex flex-col justify-between">
              <Gamepad2 className="h-5 w-5 text-[#991b1b]" />
              <div>
                <div className="text-xl font-semibold tracking-tight">
                  Tổ chức giải đấu
                </div>
                <div className="text-sm text-neutral-700 mt-1">
                  Bracket và kết quả trực tiếp
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 3 — yellow */}
          <div className="col-span-6 md:col-span-3 reveal">
            <div className="bg-[#fef3c7] rounded-3xl p-6 h-full min-h-[180px] flex flex-col justify-between">
              <Clock className="h-5 w-5 text-[#92400e]" />
              <div>
                <div className="text-xl font-semibold tracking-tight">
                  Onboard cùng bạn
                </div>
                <div className="text-sm text-neutral-700 mt-1">
                  Cấu hình hệ thống khi bạn sẵn sàng
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 4 — orange */}
          <div className="col-span-6 md:col-span-3 reveal">
            <div className="bg-[#fed7aa] rounded-3xl p-6 h-full min-h-[180px] flex flex-col justify-between">
              <Users className="h-5 w-5 text-[#9a3412]" />
              <div>
                <div className="text-xl font-semibold tracking-tight">
                  Tiếng Việt, đầu tiên
                </div>
                <div className="text-sm text-neutral-700 mt-1">
                  Toàn bộ UI và hỗ trợ
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── FEATURES SECTION ────────────────────────────────── */}
      <section
        id="features"
        className="max-w-7xl mx-auto px-6 py-12"
      >
        <div className="mb-8 reveal">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Mọi thứ bạn cần để vận hành.
          </h2>
          <p className="mt-2 text-neutral-600 max-w-2xl">
            POS, giải đấu và tự động hoá media — gói gọn trong một nền tảng
            tiếng Việt cho quán cafe board game.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Feature 1 — wide: POS */}
          <div className="col-span-12 md:col-span-8 reveal">
            <div className="bg-white rounded-3xl p-8 border border-black/5 h-full min-h-[320px] flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    <Coffee className="h-3 w-3" />
                    POS & Quản lý bàn
                  </span>
                  <h3 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                    Hệ thống POS chuẩn cho cafe board game.
                  </h3>
                  <p className="mt-3 text-neutral-600 leading-relaxed">
                    Quản lý bàn, phiên chơi, đặt lịch và thanh toán trong một
                    giao diện duy nhất. Đồng bộ với kho board game và thẻ thành
                    viên.
                  </p>
                </div>
                <ul className="mt-6 space-y-2">
                  {[
                    "Bàn, box, phiên chơi theo thời gian thực",
                    "Đặt lịch và checkout trong cùng một giao diện",
                    "Đồng bộ kho board game và thẻ thành viên",
                  ].map((it) => (
                    <li
                      key={it}
                      className="flex items-center gap-2 text-sm text-neutral-700"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#16a34a]" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2 self-stretch">
                {[
                  { label: "Bàn trống", val: "8/12", color: "bg-[#d1f4d6]" },
                  { label: "Đang chơi", val: "3", color: "bg-[#fef3c7]" },
                  { label: "Đặt lịch", val: "5", color: "bg-[#fed7aa]" },
                  { label: "Doanh thu", val: "2.4tr", color: "bg-[#fbd1d1]" },
                ].map((c) => (
                  <div
                    key={c.label}
                    className={`${c.color} rounded-2xl p-4 flex flex-col justify-between min-h-[110px]`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-neutral-700 font-semibold">
                      {c.label}
                    </div>
                    <div className="text-2xl font-bold tracking-tight">
                      {c.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2 — narrow */}
          <div className="col-span-12 md:col-span-4 reveal">
            <div className="bg-[#171717] text-white rounded-3xl p-8 h-full min-h-[320px] flex flex-col justify-between">
              <ImageIcon className="h-5 w-5 text-white/60" />
              <div>
                <h3 className="text-2xl font-semibold tracking-tight leading-tight">
                  Media tự động.
                </h3>
                <p className="mt-3 text-white/60 text-sm leading-relaxed">
                  Cloudinary + Remotion tạo ảnh và video highlight cho quán —
                  tự tạo nội dung không cần thuê designer.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 — full-width: Dashboard */}
          <div className="col-span-12 reveal">
            <div className="bg-[#d1f4d6] rounded-3xl p-8 border border-black/5 flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex flex-col justify-between">
                <BarChart3 className="h-5 w-5 text-[#166534]" />
                <div>
                  <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                    Dashboard doanh thu theo giờ.
                  </h3>
                  <p className="mt-3 text-neutral-700 text-sm leading-relaxed max-w-md">
                    Theo dõi công suất bàn, doanh thu theo giờ và xu hướng khách
                    hàng trong một màn hình.
                  </p>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-2xl p-5 border border-black/5">
                <div
                  className="flex items-end justify-between gap-1 h-32"
                  aria-hidden="true"
                >
                  {[40, 65, 50, 80, 95, 70, 55, 75, 90, 60, 45, 70].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-[#166534] rounded-t"
                        style={{ height: `${h}%` }}
                      />
                    ),
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                  <span>10h</span>
                  <span>14h</span>
                  <span>18h</span>
                  <span>22h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8 reveal">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ba bước để bắt đầu.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              n: "01",
              t: "Gửi hồ sơ",
              d: "Điền form đăng ký trong 5 phút với thông tin quán và giấy tờ cơ bản.",
              bg: "bg-white",
            },
            {
              n: "02",
              t: "Phê duyệt & onboard",
              d: "Đội ngũ BoardVerse xét duyệt và hỗ trợ bạn cấu hình hệ thống.",
              bg: "bg-[#fef3c7]",
            },
            {
              n: "03",
              t: "Vận hành & tăng trưởng",
              d: "Mở cửa quán, tiếp khách và theo dõi dashboard tăng trưởng mỗi ngày.",
              bg: "bg-[#171717] text-white",
            },
          ].map((s) => (
            <div
              key={s.n}
              className={`reveal ${s.bg} rounded-3xl p-8 border border-black/5 min-h-[260px] flex flex-col justify-between`}
            >
              <div className="text-6xl font-bold tracking-tighter opacity-30">
                {s.n}
              </div>
              <div>
                <h3
                  className={`text-2xl font-semibold tracking-tight ${s.bg.includes("text-white") ? "text-white" : ""}`}
                >
                  {s.t}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed ${s.bg.includes("text-white") ? "text-white/60" : "text-neutral-600"}`}
                >
                  {s.d}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA + FOOTER BENTO ──────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-12 gap-4">
          {/* Big day number */}
          <div className="col-span-12 md:col-span-8 reveal">
            <div className="bg-white rounded-3xl p-8 md:p-10 border border-black/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 min-h-[260px]">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-md">
                  Sẵn sàng nâng cấp quán cafe của bạn?
                </h2>
                <p className="mt-3 text-neutral-600 max-w-md">
                  Gửi hồ sơ miễn phí — đội ngũ BoardVerse phản hồi sớm.
                </p>
              </div>
              <button
                onClick={() => router.push("/partner/register")}
                className="bg-[#171717] text-white rounded-full px-6 py-3.5 font-semibold text-sm inline-flex items-center gap-2 hover:bg-neutral-800 transition shrink-0"
              >
                Đăng ký đối tác
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Footer card */}
          <div className="col-span-12 md:col-span-4 reveal">
            <div className="bg-[#171717] text-white rounded-3xl p-8 h-full min-h-[260px] flex flex-col justify-between">
              <div className="text-7xl font-bold tracking-tighter">
                2026<span className="text-[#d97706]">.</span>
              </div>
              <div>
                <div className="text-sm text-white/60">BoardVerse Partner</div>
                <div className="text-sm font-semibold">
                  Nền tảng vận hành cafe board game
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 py-10 text-center text-xs text-neutral-500">
        © 2026 BoardVerse Platform. Tất cả quyền được bảo lưu.
      </footer>
    </div>
  );
}
