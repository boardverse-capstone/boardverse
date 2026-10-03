import PartnerRegistrationForm from "@/features/partner/components/partner-registration-form";
import { PartnerRegistrationLayout } from "@/features/partner/components/partner-registration-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký đối tác Cafe — BoardVerse",
  description:
    "Đăng ký quán cafe board game trở thành đối tác của nền tảng BoardVerse.",
};

export default function PartnerRegisterPage() {
  return (
    <PartnerRegistrationLayout>
      <PartnerRegistrationForm />
    </PartnerRegistrationLayout>
  );
}
