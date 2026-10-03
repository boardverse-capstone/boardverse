import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Geist, Geist_Mono, Noto_Serif } from 'next/font/google';
import './globals.css';
import { Providers } from '@/core/providers';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// [FIX #fantasy-font] Load Noto Serif với subset `vietnamese` để hỗ trợ
// đầy đủ các ký tự tiếng Việt có dấu (ă, ơ, ư, ạ, ầ, ể, ữ…). Tailwind
// utility `font-serif` mặc định dùng `ui-serif, Georgia, Times New Roman` —
// các font này trên Windows PowerShell/Chrome KHÔNG có glyph tiếng Việt
// tổ hợp → render thành ô vuông (tofu). Dùng Noto_Serif (Google Fonts)
// với subset `vietnamese` đảm bảo hiển thị đúng.
//
// [FIX #turbopack-single-entry] Next.js 16 + Turbopack yêu cầu
// `next/font/google` chỉ truyền 1 entry duy nhất — KHÔNG được truyền
// `weight` dạng mảng `['400', '500', '600', '700']` (sẽ throw
// "next/font/google queries have exactly one entry"). Noto_Serif là
// variable font trên Google Fonts → KHÔNG truyền `weight` để lấy toàn
// bộ trọng lượng (100-900) trong 1 file duy nhất.
const fantasySerif = Noto_Serif({
  subsets: ['vietnamese', 'latin'],
  variable: '--font-fantasy',
});

export const metadata: Metadata = {
  title: 'BoardVerse Portal',
  description: 'Hệ thống quản trị dành cho Admin, Manager và Staff của BoardVerse.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans',
        beVietnamPro.variable,
        fantasySerif.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
