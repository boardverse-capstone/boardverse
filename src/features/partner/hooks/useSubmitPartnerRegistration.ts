"use client";

import { useState } from "react";
import { apiClient } from "@/core/api/client";

export interface WorkingHours {
  weekdayStart: string;
  weekdayEnd: string;
  weekendStart: string;
  weekendEnd: string;
}

export interface CafePartnerFormInput {
  cafeName: string;
  address: string;
  latitude: number;
  longitude: number;
  hotline: string;
  representativeEmail: string;
  workingHours: WorkingHours;
  businessLicense: string;
  businessLicenseImageUrl: string;
}

export function useSubmitPartnerRegistration(onSuccessAction?: () => void) {
  const [formData, setFormData] = useState<CafePartnerFormInput>({
    cafeName: "",
    address: "",
    latitude: 90,
    longitude: 180,
    hotline: "",
    representativeEmail: "",
    workingHours: {
      weekdayStart: "08:00",
      weekdayEnd: "22:00",
      weekendStart: "08:00",
      weekendEnd: "21:00",
    },
    businessLicense: "",
    businessLicenseImageUrl: "",
  });

  const [loading, setLoading] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState<{
    status: "success" | "error";
    title: string;
    desc: string;
  }>({
    status: "success",
    title: "",
    desc: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [name]: value,
      },
    }));
  };

  const resetForm = () => {
    setFormData((prev) => ({
      ...prev,
      cafeName: "",
      address: "",
      hotline: "",
      representativeEmail: "",
      businessLicense: "",
      businessLicenseImageUrl: "",
    }));
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Khâu kiểm tra định dạng ảnh đuôi hợp lệ (JPEG, PNG, PDF)
    const imageUrl = formData.businessLicenseImageUrl.toLowerCase();
    const isValidImage =
      imageUrl.endsWith(".jpg") ||
      imageUrl.endsWith(".jpeg") ||
      imageUrl.endsWith(".png") ||
      imageUrl.endsWith(".pdf");

    if (!isValidImage) {
      setPopupContent({
        status: "error",
        title: "ĐỊA CHỈ ẢNH KHÔNG HỢP LỆ",
        desc: "Ảnh chụp giấy phép đăng ký kinh doanh bắt buộc phải thuộc định dạng ảnh JPEG, PNG, hoặc file PDF.",
      });
      setIsPopupOpen(true);
      return;
    }

    setLoading(true);

    try {
      // Gọi qua apiClient chuẩn hóa của dự án
      await apiClient.post("/api/cafe-partner-applications", formData);

      setPopupContent({
        status: "success",
        title: "GỬI ĐƠN THÀNH CÔNG",
        desc: "Gửi đơn đăng ký thành công, vui lòng chờ kiểm duyệt từ hệ thống.",
      });
      setIsPopupOpen(true);
      resetForm();
      if (onSuccessAction) onSuccessAction();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setPopupContent({
        status: "error",
        title: "ĐĂNG KÝ THẤT BẠI",
        desc: err.message || "Hệ thống gặp sự cố khi xử lý dữ liệu. Vui lòng thử lại.",
      });
      setIsPopupOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    isPopupOpen,
    popupContent,
    setIsPopupOpen,
    handleChange,
    handleHoursChange,
    submitForm,
  };
}