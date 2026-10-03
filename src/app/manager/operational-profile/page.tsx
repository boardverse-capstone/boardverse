import { OperationalProfileShell } from "@/features/manager-cafe/components/operational-profile-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hồ sơ vận hành - Boardverse Manager",
  description:
    "Theo dõi trạng thái, giờ mở cửa, thanh toán và thông tin cơ sở. Cập nhật số phòng riêng và cấu hình thanh toán tại đây.",
};

export default function ManagerOperationalProfilePage() {
  return <OperationalProfileShell />;
}