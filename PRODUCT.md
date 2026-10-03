# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (radix-ui base) · TanStack Query/Table · Zustand · React Hook Form + Zod · SignalR (@microsoft/signalr) · Cloudinary · Recharts · date-fns · Sonner

## Users

**Primary:** Cafe staff (quản lý quầy, mở phiên chơi, thu tiền) và cafe owner (đăng ký đối tác, vận hành đa chi nhánh). Cùng làm việc trong một back-office khác biệt cho player.

**Secondary:** Player — đặt bàn, đăng ký giải đấu, theo dõi kết quả qua giao diện public của quán.

## Product Purpose

BoardVerse là nền tảng all-in-one cho quán board game: gộp POS (thuê bàn/đồ chơi, tính giờ, checkout), quản lý giải đấu (bracket, kết quả real-time), và onboarding đối tác (đăng ký mở quán mới) trên một SaaS duy nhất. Tồn tại để chủ quán board game không phải ghép 3–4 công cụ rời rạc (POS + tournament bracket + form đăng ký + CMS landing).

Success = một quán mới có thể onboard, mở ca, chạy giải cuối tuần, và đối soát doanh thu trong cùng một ngày mà không rời khỏi BoardVerse.

## Positioning

Một nền tảng duy nhất cho cả vận hành (POS + checkout) lẫn sự kiện (tournament) của board game cafe — thay vì ghép Square POS + Challonge + Google Forms. Real-time qua SignalR làm bracket và bảng phiên chơi cập nhật mà không cần reload. Khác biệt cốt lõi: hiểu domain board game (board/expansion rental, timer, player count, genre) chứ không phải POS tổng quát.

## Operating Context

- Quán board game Việt Nam — vận hành theo ca (thường 10:00–23:00), mỗi ca có thể mở 5–30 phiên chơi đồng thời.
- Môi trường sử dụng: màn hình POS tại quán (tablet/desktop), dashboard owner trên laptop, landing & đăng ký trên mobile.
- Nghiệp vụ: thuê bàn/board game theo giờ, tách/ghép phiên, thêm order (đồ uống/đồ ăn nhẹ), áp voucher, settle cuối ca, kết ca (end-of-day).
- Giải đấu: Swiss / single-elimination bracket, thường 8–32 người, có thể chạy real-time giữa nhiều bàn.
- Realtime updates là bắt buộc: nhân viên tại quán và ban tổ chức giải cần thấy thay đổi ngay trên các thiết bị khác nhau.

## Capabilities and Constraints

**Capabilities:**
- POS cafe: danh sách bàn/box, đặt trước, mở phiên, thêm order, checkout (tiền mặt, QR, ví), end-session, settlements cuối ca.
- Tournament: tạo giải, participants, bracket, nhập kết quả trận real-time, lịch sử.
- Partner onboarding: form đăng ký nhiều bước, upload giấy tờ (Cloudinary), trạng thái duyệt.
- Realtime hub: SignalR cho session table, tournament bracket, pending bookings.
- Data: TanStack Query cho server state, Zustand cho UI state; bảng dùng TanStack Table.

**Constraints:**
- Web responsive — không có iOS/Android native.
- Bắt buộc SignalR cho các view realtime; không polling.
- Cloudinary là nơi upload file đăng ký đối tác; không tự host file.
- Dùng shadcn/ui + Tailwind v4 — không đưa thêm component library khác.
- Accessibility: dùng radix-ui base (đã ARIA), form có validation qua Zod.

## Brand Commitments

- Tên dự án: **BoardVerse** — đã đăng ký domain, dùng xuyên suốt.
- Voice: tiếng Việt là ngôn ngữ chính của UI; tiếng Anh dùng cho thuật ngữ kỹ thuật (session, checkout, bracket, settle).
- Tone: vận hành rõ ràng, không marketing-speak cho back-office; landing thân thiện cho player.
- Logo, brand assets: chưa có guideline ràng buộc từ user — không tự ý chọn palette/font.

## Evidence on Hand

- `src/features/partner/` — partner onboarding + landing (đã có UI incumbent).
- `src/features/cafe-pos/` — POS tabs (tables, boxes, active sessions, settlements, pending bookings).
- `src/features/cafe-tournament/` — tournament participants + match result modal + POS container.
- `src/app/api/upload/cloudinary/route.ts` — upload endpoint đang chạy.
- 281 `.md` files trong project (gồm skills) — không có testimonial, case study, hay số liệu thực từ user. **Không được bịa metrics, khách hàng, hay báo chí.**

## Product Principles

1. **One workspace per role.** Staff thấy POS, owner thấy dashboard quản lý, player thấy booking + tournament — không trộn vai vào một màn hình.
2. **Real-time is default, not a feature.** Trạng thái phiên/bracket phải cập nhật qua SignalR; refresh là tín hiệu lỗi.
3. **Domain-aware UI.** Thuật ngữ board game (board, expansion, player count, timer) phải có mặt trong primitive — không bắt người dùng dịch qua "product" trừu tượng.
4. **Vietnamese-first copy.** Toàn bộ UI tiếng Việt, trừ thuật ngữ quốc tế.
5. **Onboarding trong một lượt.** Một quán mới từ đăng ký → mở phiên đầu tiên trong cùng một phiên làm việc.

## Accessibility & Inclusion

- Stack dùng radix-ui base đã có ARIA semantics — duy trì pattern này.
- Form có label rõ ràng, error message bằng tiếng Việt gần input.
- Realtime updates phải thông báo qua aria-live khi thay đổi trạng thái quan trọng.
- Yêu cầu cụ thể về WCAG level: chưa được xác nhận — ghi nhận là open.
