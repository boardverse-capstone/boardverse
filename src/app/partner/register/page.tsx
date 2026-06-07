import type { Metadata } from 'next';
import { PartnerRegistrationForm } from '@/features/partner/components/partner-registration-form';

export const metadata: Metadata = {
  title: 'Đăng ký đối tác Cafe — BoardVerse',
  description:
    'Đăng ký quán cafe board game trở thành đối tác của nền tảng BoardVerse.',
};

export default function PartnerRegisterPage() {
  return (
    <div className="min-h-svh bg-muted">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold">Đăng ký đối tác Cafe</h1>
          <p className="text-muted-foreground">
            Hoàn thiện 4 khối thông tin bắt buộc để tham gia mạng lưới BoardVerse.
            Đơn đăng ký sẽ được gán trạng thái <strong>Chờ duyệt</strong> sau khi gửi.
          </p>
        </div>
        <PartnerRegistrationForm />
      </div>
    </div>
  );
}
