/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { apiClient } from "@/core/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface StatusControlProps {
  // Nhận vào trạng thái hiện tại từ dữ liệu Hồ sơ vận hành đã fetch ở trang cha
  initialStatus: "DATA_BLANK" | "ACTIVE" | string;
  canActivate: boolean;
  activationBlockers?: string[];
}

export default function PartnerStatusControl({
  initialStatus = "DATA_BLANK",
  canActivate = false,
  activationBlockers = [],
}: StatusControlProps) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  // Quản lý Popup thông báo kết quả submit
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState({
    status: "success",
    title: "",
    desc: "",
  });

  // 1. Hàm xử lý KÍCH HOẠT QUÁN (POST /api/cafe-partner/me/activate)
  const handleActivate = async () => {
    if (!canActivate && currentStatus === "DATA_BLANK") {
      setPopupContent({
        status: "error",
        title: "CHƯA ĐỦ ĐIỀU KIỆN",
        desc: "Hồ sơ cơ sở chưa hoàn thiện hoặc chưa cấu hình sơ đồ bàn (Table Layout). Vui lòng hoàn thành các bước trước.",
      });
      setIsPopupOpen(true);
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/api/cafe-partner/me/activate");

      setCurrentStatus("ACTIVE");
      setPopupContent({
        status: "success",
        title: "KÍCH HOẠT THÀNH CÔNG",
        desc: "Quán cafe của bạn đã chuyển sang trạng thái ACTIVE. Hệ thống Boardverse đã sẵn sàng hoạt động tại cơ sở!",
      });
      setIsPopupOpen(true);
    } catch (err: any) {
      setPopupContent({
        status: "error",
        title: "KÍCH HOẠT THẤT BẠI",
        desc: err.message || "Yêu cầu kích hoạt bị từ chối từ hệ thống.",
      });
      setIsPopupOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // 2. Hàm xử lý TẠM DỪNG HOẠT ĐỘNG (POST /api/cafe-partner/me/deactivate)
  const handleDeactivate = async () => {
    setLoading(true);
    try {
      await apiClient.post("/api/cafe-partner/me/deactivate");

      setCurrentStatus("DATA_BLANK");
      setPopupContent({
        status: "success",
        title: "ĐÃ TẠM DỪNG HOẠT ĐỘNG",
        desc: "Quán cafe đã chuyển về trạng thái ẩn (DATA_BLANK). Khách hàng sẽ tạm thời không thể đặt bàn chơi tại cơ sở.",
      });
      setIsPopupOpen(true);
    } catch (err: any) {
      setPopupContent({
        status: "error",
        title: "THAO TÁC THẤT BẠI",
        desc: err.message || "Không thể tạm dừng hoạt động vào lúc này.",
      });
      setIsPopupOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="max-w-2xl mx-auto bg-white border-2 border-black text-black p-6 my-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* THÔNG TIN TRẠNG THÁI HIỆN TẠI */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Trạng thái vận hành cơ sở
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 border border-black ${currentStatus === "ACTIVE" ? "bg-black animate-pulse" : "bg-white"}`}
              ></span>
              <span className="text-sm font-black uppercase tracking-tight">
                {currentStatus === "ACTIVE"
                  ? "ĐANG HOẠT ĐỘNG (ACTIVE)"
                  : "CHƯA KÍCH HOẠT (DATA_BLANK)"}
              </span>
            </div>
          </div>

          {/* HỆ THỐNG NÚT ĐIỀU KHIỂN LOGIC THAY ĐỔI TRẠNG THÁI */}
          <div>
            {currentStatus !== "ACTIVE" ? (
              <Button
                onClick={handleActivate}
                disabled={loading}
                className="bg-black text-white hover:bg-neutral-800 font-bold uppercase tracking-wider text-xs px-6 py-4 rounded-none border border-black transition-colors disabled:bg-neutral-400"
              >
                {loading ? "ĐANG XỬ LÝ..." : "KÍCH HOẠT HOẠT ĐỘNG"}
              </Button>
            ) : (
              <Button
                onClick={handleDeactivate}
                disabled={loading}
                className="bg-white text-black hover:bg-gray-100 font-bold uppercase tracking-wider text-xs px-6 py-4 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all duration-150 disabled:bg-gray-200"
              >
                {loading ? "ĐANG XỬ LÝ..." : "TẠM DỪNG HOẠT ĐỘNG"}
              </Button>
            )}
          </div>
        </div>

        {/* THÔNG BÁO RÀNG BUỘC KHI CÓ BLOCKERS */}
        {currentStatus === "DATA_BLANK" && activationBlockers.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 border border-black text-[11px] font-medium text-neutral-700">
            <span className="block font-black text-red-600 uppercase mb-1">
              ⚠️ Các yếu tố còn thiếu trước khi kích hoạt:
            </span>
            <ul className="list-disc pl-4 space-y-0.5">
              {activationBlockers.map((blocker, index) => (
                <li key={index}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* POPUP PHẢN HỒI KẾT QUẢ CHO MANAGER CHUẨN TRẮNG ĐEN */}
      <AlertDialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
        <AlertDialogContent className="bg-white border-2 border-black rounded-none p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-sm mx-auto">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle
              className={`text-base font-black tracking-tight ${
                popupContent.status === "success"
                  ? "text-black"
                  : "text-red-600"
              }`}
            >
              {popupContent.status === "success" ? "✓" : "⚠️"}{" "}
              {popupContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-bold text-neutral-700 leading-relaxed">
              {popupContent.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3">
            <AlertDialogAction
              onClick={() => setIsPopupOpen(false)}
              className="bg-black text-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-wider rounded-none px-4 py-2 border border-black w-full sm:w-auto"
            >
              Xác Nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
