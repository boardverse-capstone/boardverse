"use client";

import { useOperationalProfile } from "../hooks/useOperationalProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function PartnerOperationalProfileForm() {
  const {
    formData,
    loading,
    isPopupOpen,
    popupContent,
    setIsPopupOpen,
    handleChange,
    handleHoursChange,
    handleSubmit,
  } = useOperationalProfile();

  return (
    <>
      {/* CARD CHÍNH: Đồng bộ shadow và viền mảnh tương thích với Sidebar và nền xám siêu nhạt #F6F6F7 */}
      <Card className="max-w-2xl mx-auto bg-white border border-neutral-200/80 text-neutral-900 p-8 my-6 shadow-[0px_1px_3px_rgba(0,0,0,0.05),0px_1px_2px_rgba(0,0,0,0.03)] rounded-xl">
        {/* TIÊU ĐỀ CHÍNH FORM */}
        <div className="border-b border-neutral-100 pb-5 mb-6">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            Cập Nhật Hồ Sơ Vận Hành
          </h2>
          <p className="text-xs text-neutral-500 font-medium mt-1">
            Giai đoạn 2: Thiết lập chi tiết cấu trúc hoạt động cơ sở quán
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* MỤC I: QUY MÔ KHÔNG GIAN CƠ SỞ */}
          <div className="space-y-4">
            <div className="pb-1 border-b border-neutral-100">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                I. Thiết lập quy mô không gian
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5 tracking-wide">
                  Số lượng bàn chơi *
                </label>
                <Input
                  type="number"
                  name="numberOfTables"
                  required
                  min={1}
                  value={formData.numberOfTables}
                  onChange={handleChange}
                  className="w-full h-9 border-neutral-200 rounded-lg focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
              <Field>
                <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5 tracking-wide">
                  Số phòng riêng (Private Rooms) *
                </label>
                <Input
                  type="number"
                  name="numberOfPrivateRooms"
                  required
                  min={0}
                  value={formData.numberOfPrivateRooms}
                  onChange={handleChange}
                  className="w-full h-9 border-neutral-200 rounded-lg focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
            </div>
          </div>

          {/* MỤC II: THÔNG TIN DỊCH VỤ BOARD GAME */}
          <div className="space-y-4">
            <div className="pb-1 border-b border-neutral-100">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                II. Thông tin dịch vụ Board Game
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5 tracking-wide">
                  Số lượng game sở hữu *
                </label>
                <Input
                  type="number"
                  name="numberOfGamesOwned"
                  required
                  min={0}
                  value={formData.numberOfGamesOwned}
                  onChange={handleChange}
                  className="w-full h-9 border-neutral-200 rounded-lg focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
              <Field>
                <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5 tracking-wide">
                  Mô hình / Giá tính phí (Billing Model) *
                </label>
                <Input
                  type="text"
                  name="billingModel"
                  required
                  value={formData.billingModel}
                  onChange={handleChange}
                  placeholder="Ví dụ: BY_HOUR, 30"
                  className="w-full h-9 border-neutral-200 rounded-lg focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
            </div>

            <Field>
              <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5 tracking-wide">
                Danh sách các tựa game nổi bật tại quán *
              </label>
              <Input
                type="text"
                name="popularGamesList"
                required
                value={formData.popularGamesList}
                onChange={handleChange}
                placeholder="Dune, Uno, Dice Throne, Azul..."
                className="w-full h-9 border-neutral-200 rounded-lg focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 bg-white text-sm"
              />
            </Field>

            {/* Checkbox Container: Đồng bộ viền mềm */}
            <div className="flex items-center gap-3 p-3.5 bg-neutral-50/60 border border-neutral-200 rounded-lg">
              <input
                type="checkbox"
                id="hasGameMaster"
                name="hasGameMaster"
                checked={formData.hasGameMaster}
                onChange={handleChange}
                className="w-4 h-4 accent-neutral-900 border-neutral-300 rounded cursor-pointer"
              />
              <label
                htmlFor="hasGameMaster"
                className="text-xs font-medium text-neutral-700 cursor-pointer select-none tracking-tight"
              >
                Cơ sở có nhân viên hỗ trợ giải thích luật chơi (Game Master)
              </label>
            </div>
          </div>

          {/* MỤC III: XEM TRƯỚC SƠ ĐỒ DANH SÁCH BÀN */}
          <div className="space-y-4">
            <div className="pb-1 border-b border-neutral-100">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                III. Sơ đồ danh sách bàn hệ thống ({formData.numberOfTables}{" "}
                bàn)
              </h3>
            </div>
            <div className="max-h-36 overflow-y-auto p-4 bg-neutral-50/60 border border-neutral-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono font-medium text-neutral-600 scrollbar-thin">
              {formData.tableNames.map((name, idx) => (
                <div
                  key={idx}
                  className="border border-neutral-200/80 p-2 bg-white text-center rounded-lg shadow-[0px_1px_2px_rgba(0,0,0,0.02)] truncate"
                >
                  #{idx + 1}: {name}
                </div>
              ))}
            </div>
          </div>

          {/* NÚT HOÀN TẤT: Đã vá lỗi thẻ đóng tại đây và đổi sang bg-linear-to-b giải quyết cảnh báo */}
          <div className="pt-3">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-linear-to-b from-[#2A2A2A] to-[#1A1A1A] text-white font-medium text-sm rounded-lg border border-neutral-950 border-t-neutral-700 shadow-[0px_1px_2px_rgba(0,0,0,0.15),inset_0px_1px_0px_rgba(255,255,255,0.08)] hover:from-[#333333] hover:to-[#222222] active:from-[#1A1A1A] active:to-[#111111] disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:border-neutral-200 disabled:shadow-none transition-all duration-150 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Đang cập nhật hồ sơ...</span>
                </>
              ) : (
                "Lưu hồ sơ vận hành"
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* POPUP PHẢN HỒI MODAL */}
      <AlertDialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
        <AlertDialogContent className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0px_8px_24px_rgba(0,0,0,0.06)] max-w-sm mx-auto text-neutral-900">
          <AlertDialogHeader className="space-y-1.5">
            <AlertDialogTitle
              className={`text-base font-bold tracking-tight flex items-center gap-2 ${
                popupContent.status === "success"
                  ? "text-neutral-900"
                  : "text-red-600"
              }`}
            >
              <span className="text-base">
                {popupContent.status === "success" ? "✓" : "⚠️"}
              </span>
              {popupContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-neutral-500 leading-relaxed">
              {popupContent.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3">
            <AlertDialogAction
              onClick={() => setIsPopupOpen(false)}
              className="bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold rounded-lg px-4 py-2 w-full sm:w-auto transition-colors"
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
