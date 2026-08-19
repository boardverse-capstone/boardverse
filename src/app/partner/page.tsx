import { PartnerLanding } from "@/features/partner/components/partner-landing";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đối Tác Phát Triển Không Gian Cafe - Boardverse",
  description:
    "Biến quán cafe của bạn thành mô hình kinh doanh board game đột phá công nghệ, tăng trưởng doanh thu vượt bậc cùng Boardverse.",
};

export default function PartnerPage() {
  return <PartnerLanding />;
}
