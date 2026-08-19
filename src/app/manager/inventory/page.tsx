import { InventoryFeatureContainer } from "@/features/cafe-inventory/components/inventory-feature-container";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản Lý Kho Board Game - Boardverse Manager",
  description:
    "Quản lý danh mục trò chơi hoạt động tại quán, cấu hình số lượng và biểu phí phạt linh kiện hao mòn.",
};

export default function ManagerInventoryPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <InventoryFeatureContainer />
    </div>
  );
}
