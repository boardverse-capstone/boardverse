"use client";

import { useState } from "react";
import { apiClient } from "@/core/api/client";
import {
  uploadToCloudinary,
  type CloudinaryUploadResult,
} from "./useCloudinaryUpload";
import type { PartnerRegistrationPayload } from "../types/partner.interface";

const VIETNAM_PHONE_REGEX = /^(0)(3|5|7|8|9)[0-9]{8}$/;
const BUSINESS_LICENSE_REGEX = /^[a-zA-Z0-9-]+$/;
const MAX_LICENSE_SIZE = 5 * 1024 * 1024; // 5 MB
const LICENSE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const SUBMIT_ENDPOINT = "/api/cafe-partner-applications";

export interface CafePartnerFormInput {
  cafeName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string;
  representativeEmail: string;
  businessLicense: string;
  /** File thực tế trong form — sẽ upload trước khi submit */
  businessLicenseFile: File | null;
  /** secure_url Cloudinary trả về sau khi upload file trên */
  businessLicenseImageUrl: string;
}

const EMPTY_FORM: CafePartnerFormInput = {
  cafeName: "",
  address: "",
  latitude: null,
  longitude: null,
  phoneNumber: "",
  representativeEmail: "",
  businessLicense: "",
  businessLicenseFile: null,
  businessLicenseImageUrl: "",
};

interface PopupContent {
  status: "success" | "error";
  title: string;
  desc: string;
  /** Khi true → form đóng popup rồi redirect về /login */
  shouldRedirect?: boolean;
}

function validateFormBeforeSubmit(form: CafePartnerFormInput): string | null {
  const cafeName = form.cafeName.trim().replace(/\s+/g, " ");
  const address = form.address.trim().replace(/\s+/g, " ");
  const phone = form.phoneNumber.trim();
  const email = form.representativeEmail.trim();
  const license = form.businessLicense.trim();

  if (!cafeName || cafeName.length < 5) {
    return "Tên quán phải có ít nhất 5 ký tự.";
  }
  if (cafeName.length > 100) {
    return "Tên quán không được vượt quá 100 ký tự.";
  }
  if (!address || address.length < 10) {
    return "Địa chỉ phải mô tả đầy đủ Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP.";
  }
  if (address.length > 500) {
    return "Địa chỉ không được vượt quá 500 ký tự.";
  }
  if (!VIETNAM_PHONE_REGEX.test(phone)) {
    return "Hotline phải là số Việt Nam hợp lệ (10 số, đầu 03/05/07/08/09).";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Email đại diện không hợp lệ.";
  }
  if (license.length < 5 || license.length > 32) {
    return "Mã số giấy phép đăng ký kinh doanh không hợp lệ (5–32 ký tự).";
  }
  // Đồng bộ với HTML5 pattern để tránh mismatch UX.
  if (!BUSINESS_LICENSE_REGEX.test(license)) {
    return "Mã số giấy phép chỉ chứa chữ cái, số và dấu gạch ngang.";
  }
  if (form.latitude == null || form.longitude == null) {
    return "Vui lòng lấy vị trí hiện tại của quán trước khi gửi đơn.";
  }
  if (
    form.latitude < -90 ||
    form.latitude > 90 ||
    form.longitude < -180 ||
    form.longitude > 180
  ) {
    return "Kinh độ/Vĩ độ nằm ngoài phạm vi cho phép.";
  }
  return null;
}

function validateLicenseFile(file: File): string | null {
  if (file.size === 0) return "File giấy phép rỗng.";
  if (file.size > MAX_LICENSE_SIZE) {
    return "Ảnh giấy phép vượt quá 5MB. Vui lòng chọn file nhỏ hơn.";
  }
  if (!LICENSE_MIME_TYPES.includes(file.type as (typeof LICENSE_MIME_TYPES)[number])) {
    return "Định dạng ảnh giấy phép phải là JPEG, PNG, WEBP hoặc PDF.";
  }
  return null;
}

export function useSubmitPartnerRegistration(onSuccessAction?: () => void) {
  const [formData, setFormData] = useState<CafePartnerFormInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState<PopupContent>({
    status: "success",
    title: "",
    desc: "",
  });

  const openErrorPopup = (title: string, desc: string) => {
    setPopupContent({ status: "error", title, desc });
    setIsPopupOpen(true);
  };

  const handleChange = (field: keyof CafePartnerFormInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null;
    setFormData((prev) => ({
      ...prev,
      businessLicenseFile: next,
      // Reset url cũ khi đổi file
      businessLicenseImageUrl: "",
    }));
  };

  const clearLicenseFile = () => {
    setFormData((prev) => ({
      ...prev,
      businessLicenseFile: null,
      businessLicenseImageUrl: "",
    }));
  };

  const handleLocationCaptured = (latitude: number, longitude: number) => {
    setFormData((prev) => ({ ...prev, latitude, longitude }));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
  };

  const clearLocation = () => {
    setFormData((prev) => ({ ...prev, latitude: null, longitude: null }));
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateFormBeforeSubmit(formData);
    if (validationError) {
      openErrorPopup("THIẾU THÔNG TIN", validationError);
      return;
    }

    if (!formData.businessLicenseFile) {
      openErrorPopup(
        "THIẾU ẢNH GIẤY PHÉP",
        "Vui lòng đính kèm ảnh chụp hoặc file PDF giấy phép kinh doanh.",
      );
      return;
    }

    const fileError = validateLicenseFile(formData.businessLicenseFile);
    if (fileError) {
      openErrorPopup("FILE KHÔNG HỢP LỆ", fileError);
      return;
    }

    setLoading(true);
    let uploaded: CloudinaryUploadResult | null = null;

    try {
      setUploadingFile(true);
      uploaded = await uploadToCloudinary({ file: formData.businessLicenseFile });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload ảnh lên Cloudinary thất bại.";
      openErrorPopup("UPLOAD ẢNH THẤT BẠI", message);
      return;
    } finally {
      setUploadingFile(false);
    }

    const payload: PartnerRegistrationPayload = {
      cafeName: formData.cafeName.trim().replace(/\s+/g, " "),
      address: formData.address.trim().replace(/\s+/g, " "),
      latitude: formData.latitude as number,
      longitude: formData.longitude as number,
      phoneNumber: formData.phoneNumber.trim(),
      representativeEmail: formData.representativeEmail.trim(),
      businessLicense: formData.businessLicense.trim(),
      businessLicenseImageUrl: uploaded.secure_url,
    };

    try {
      await apiClient.post(SUBMIT_ENDPOINT, payload);

      setPopupContent({
        status: "success",
        title: "GỬI ĐƠN THÀNH CÔNG",
        desc: "Tài khoản của bạn sẽ được xem xét và duyệt trong thời gian sớm nhất. Vui lòng kiểm tra email để nhận phản hồi từ hệ thống.",
        shouldRedirect: true,
      });
      setIsPopupOpen(true);
      resetForm();
      if (onSuccessAction) onSuccessAction();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Hệ thống gặp sự cố khi xử lý dữ liệu. Vui lòng thử lại.";
      openErrorPopup("ĐĂNG KÝ THẤT BẠI", message);
    } finally {
      // Reset loading duy nhất 1 lần ở finally để cả nhánh
      // success và error đều giải phóng spinner nút Submit.
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    uploadingFile,
    isPopupOpen,
    popupContent,
    shouldRedirect: popupContent.shouldRedirect,
    setIsPopupOpen,
    handleChange,
    handleFileChange,
    clearLicenseFile,
    handleLocationCaptured,
    clearLocation,
    submitForm,
  };
}