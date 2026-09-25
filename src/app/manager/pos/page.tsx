import { PosFeatureContainer } from "@/features/cafe-pos/components/pos-feature-container";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web POS | Hệ thống quản lý quán cafe",
  description: "Sơ đồ bàn, quét barcode hộp game và quản lý phiên chơi POS",
};

export default function PosPage() {
  return (
    <section className="mx-auto w-full max-w-[1600px]" aria-label="Web POS">
      <PosFeatureContainer />
    </section>
  );
}
