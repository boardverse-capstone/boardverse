import { PosFeatureContainer } from "@/features/cafe-pos/components/pos-feature-container";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web POS | Cafe Management System",
  description: "Sơ đồ bàn, quét barcode hộp game và quản lý phiên chơi POS",
};

export default function PosPage() {
  return (
    <main className="min-h-screen bg-[#F6F6F7] p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PosFeatureContainer />
      </div>
    </main>
  );
}
