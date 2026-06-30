import PartnerOperationalProfileForm from "@/features/partner/components/partner-operational-profile-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cấu Hình Hồ Sơ Vận Hành - Boardverse Manager",
  description:
    "Hoàn thiện thông tin số bàn, số phòng và danh sách board game để kích hoạt không gian hoạt động của quán.",
};

export default function ManagerOperationalProfilePage() {
  return (
    <div className="container mx-auto py-6 px-4">
      {/* Gọi component form giai đoạn 2 đã xây dựng */}
      <PartnerOperationalProfileForm />
    </div>
  );
}
