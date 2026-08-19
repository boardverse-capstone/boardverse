"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function PartnerLanding() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Timeline xuất hiện ban đầu sắc nét
      const tl = gsap.timeline();
      tl.from("nav", { y: -20, opacity: 0, duration: 0.4, ease: "power1.out" })
        .from(
          ".hero-text-animate > *",
          {
            y: 20,
            opacity: 0,
            duration: 0.4,
            stagger: 0.1,
            ease: "power2.out",
          },
          "-=0.2",
        )
        .from(
          ".hero-box-animate",
          { scale: 0.95, opacity: 0, duration: 0.5, ease: "power2.out" },
          "-=0.3",
        );

      // Hiệu ứng cuộn cho các thẻ tính năng
      gsap.from(".feature-card-animate", {
        scrollTrigger: {
          trigger: "#features",
          start: "top 80%",
        },
        y: 30,
        opacity: 0,
        duration: 0.5,
        stagger: 0.15,
        ease: "power2.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-white text-black min-h-screen selection:bg-black selection:text-white antialiased"
    >
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-black px-6 py-4 flex justify-between items-center">
        <div className="text-xl font-black tracking-tighter uppercase flex items-center gap-2">
          🎲 Boardverse{" "}
          <span className="text-[10px] font-bold border border-black px-2 py-0.5 bg-black text-white">
            PARTNER
          </span>
        </div>
        <button
          onClick={() => router.push("/partner/register")}
          className="bg-black text-white text-xs font-bold uppercase tracking-widest px-4 py-2 border border-black hover:bg-white hover:text-black transition-colors duration-200"
        >
          Đăng Ký Ngay
        </button>
      </nav>

      {/* HERO SECTION */}
      <header className="pt-32 pb-16 px-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center min-h-[85vh]">
        <div className="hero-text-animate space-y-6">
          <span className="inline-block border border-black text-black px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-gray-50">
            GIẢI PHÁP ĐỘT PHÁ DOANH THU CAFE
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
            Biến Không Gian Cafe Của Bạn Thành{" "}
            <span className="underline decoration-4 bg-gray-100 px-1">
              Vũ Trụ Board Game
            </span>
          </h1>
          <p className="text-gray-700 text-sm leading-relaxed max-w-lg">
            Tích hợp nền tảng quản lý thông minh chuẩn Next.js, hệ thống AI trợ
            lý tự động hướng dẫn luật chơi qua QR Code kết hợp cùng công nghệ
            hình ảnh tiên tiến để tối ưu hóa công suất vận hành cơ sở kinh
            doanh.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => router.push("/partner/register")}
              className="bg-black text-white text-xs font-bold uppercase tracking-widest px-6 py-3 border border-black hover:bg-white hover:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all duration-200"
            >
              Trở Thành Đối Tác
            </button>
            <a
              href="#features"
              className="border border-black bg-white text-black text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-gray-50 flex items-center transition-colors"
            >
              Tìm hiểu thêm
            </a>
          </div>
        </div>

        {/* HERO VISUAL (MINIMALIST DASHBOARD SIMULATION) */}
        <div className="hero-box-animate flex justify-center md:justify-end">
          <div className="bg-white border-2 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-3">
              <span className="font-black text-xs uppercase tracking-wider">
                📊 TĂNG TRƯỞNG DOANH SỐ
              </span>
              <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5">
                +45%
              </span>
            </div>

            <div className="p-3 bg-gray-50 border border-black space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Trạng thái hệ thống:</span>
                <span className="uppercase">ACTIVE</span>
              </div>
              <div className="w-full bg-gray-200 h-3 border border-black overflow-hidden">
                <div className="bg-black h-full w-4/5"></div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border border-black">
              <div className="text-2xl">🎲</div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">
                  Kho dữ liệu tích hợp
                </p>
                <p className="text-xs font-black uppercase">
                  50+ TỰA GAME ĐỘC QUYỀN
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES SECTION */}
      <section
        id="features"
        className="py-20 bg-gray-50 border-t-2 border-b-2 border-black px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-black tracking-tighter uppercase">
              Tại sao nên chọn Boardverse?
            </h2>
            <p className="text-gray-600 text-xs font-medium">
              Hệ sinh thái hạ tầng công nghệ giúp tối giản hóa quy trình vận
              hành mô hình dịch vụ giải trí.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card-animate bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="text-2xl font-black">🤖</div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                AI Trợ Lý Thông Minh
              </h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Tự động hóa khâu tư vấn và hướng dẫn luật chơi chi tiết cho từng
                nhóm khách hàng bằng AI Agent thông qua quét mã QR Code tại bàn.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="feature-card-animate bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="text-2xl font-black">🎬</div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Media Automation
              </h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Ứng dụng xử lý Cloudinary và Remotion tích hợp sẵn tự động khởi
                tạo các gói hình ảnh, video highlight truyền thông quảng bá cho
                quán.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="feature-card-animate bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="text-2xl font-black">📈</div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Quản Lý Tối Ưu Lịch Trình
              </h3>
              <p className="text-gray-600 text-xs leading-relaxed">
                Hệ thống dữ liệu phân tích chuẩn Next.js quản lý lượng thẻ thành
                viên hội viên, thời gian chơi thực tế và phân bổ dòng tiền hiệu
                quả.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white text-gray-500 py-8 text-center text-[10px] uppercase tracking-widest font-bold">
        <p>&copy; 2026 Boardverse Platform. Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  );
}
