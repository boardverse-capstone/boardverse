"use client";

import { useState } from "react";
import { apiClient } from "@/core/api/client";

interface WorkingHours {
  weekdayStart: string;
  weekdayEnd: string;
  weekendStart: string;
  weekendEnd: string;
}

export interface OperationalProfileInput {
  cafeName: string;
  address: string;
  latitude: number;
  longitude: number;
  hotline: string;
  representativeEmail: string;
  workingHours: WorkingHours;
  businessLicense: string;
  businessLicenseImageUrl: string;
  numberOfTables: number;
  numberOfPrivateRooms: number;
  spaceImageUrls: string[];
  numberOfGamesOwned: number;
  popularGamesList: string;
  hasGameMaster: boolean;
  billingModel: string;
  tableNames: string[];
}

export function useOperationalProfile() {
  const [formData, setFormData] = useState<OperationalProfileInput>({
    cafeName: "Vietcold Cafe",
    address: "123 Nguyen Thai Hoc, Q1, TP.HCM",
    latitude: 90,
    longitude: 180,
    hotline: "0954315552",
    representativeEmail: "hanphamviet6@gmail.com",
    workingHours: {
      weekdayStart: "08:00",
      weekdayEnd: "22:00",
      weekendStart: "08:00",
      weekendEnd: "21:00",
    },
    businessLicense: "23456788765434568",
    businessLicenseImageUrl: "https://www.facebook.png",
    numberOfTables: 20,
    numberOfPrivateRooms: 3,
    spaceImageUrls: ["image1.jpg", "image2.jpg", "image3.jpg"],
    numberOfGamesOwned: 100,
    popularGamesList: "Dune, Uno, Dice Throne",
    hasGameMaster: true,
    billingModel: "30",
    tableNames: Array.from({ length: 20 }, (_, i) => `Bàn ${i + 1}`),
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      const numValue = parseInt(value) || 0;
      setFormData((prev) => {
        const updated = { ...prev, [name]: numValue };
        // Tự động đồng bộ số lượng phần tử mảng bàn nếu số lượng bàn thay đổi
        if (name === "numberOfTables") {
          updated.tableNames = Array.from({ length: numValue }, (_, i) => `Bàn ${i + 1}`);
        }
        return updated;
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      workingHours: { ...prev.workingHours, [name]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.put("/api/cafe-partner/me/operational-profile", formData);
      setPopupContent({
        status: "success",
        title: "CẬP NHẬT THÀNH CÔNG",
        desc: "Hồ sơ vận hành đã được cập nhật thành công. Cơ sở đã sẵn sàng kích hoạt.",
      });
      setIsPopupOpen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setPopupContent({
        status: "error",
        title: "CẬP NHẬT THẤT BẠI",
        desc: err.message || "Cập nhật hồ sơ thất bại. Vui lòng kiểm tra lại dữ liệu đầu vào.",
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
    handleSubmit,
  };
}