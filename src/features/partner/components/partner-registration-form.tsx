"use client";

import { useSubmitPartnerRegistration } from "../hooks/useSubmitPartnerRegistration";
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

export default function PartnerRegistrationForm() {
  const {
    formData,
    loading,
    isPopupOpen,
    popupContent,
    setIsPopupOpen,
    handleChange,
    handleHoursChange,
    submitForm,
  } = useSubmitPartnerRegistration();

  return (
    <>
      <Card className="max-w-2xl mx-auto bg-white border border-neutral-200 text-neutral-900 p-8 my-10 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] rounded-xl">
        {/* TIÊU ĐỀ CHÍNH */}
        <div className="border-b border-neutral-100 pb-5 mb-6">
          <h2 className="text-xl font-bold tracking-tight text-neutral-950">
            Đăng Ký Đối Tác Cafe Partner
          </h2>
          <p className="text-xs text-neutral-500 font-medium mt-1">
            Vui lòng hoàn thiện đầy đủ 3 mục thông tin dưới đây để gửi hồ sơ ứng
            tuyển
          </p>
        </div>

        <form onSubmit={submitForm} className="space-y-8">
          {/* MỤC 1: THÔNG TIN CÁ NHÂN & LIÊN HỆ */}
          <div className="space-y-4">
            <div className="pb-1 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                I. Thông tin cá nhân & Liên hệ
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1.5">
                  Email người đại diện *
                </label>
                <Input
                  type="email"
                  name="representativeEmail"
                  required
                  value={formData.representativeEmail}
                  onChange={handleChange}
                  placeholder="Ví dụ: hanphamviet@gmail.com"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1.5">
                  Số điện thoại hotline *
                </label>
                <Input
                  type="text"
                  name="hotline"
                  required
                  minLength={10}
                  maxLength={11}
                  pattern="^[0-9]+$"
                  value={formData.hotline}
                  onChange={handleChange}
                  placeholder="Ví dụ: 0854316662"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
            </div>
          </div>

          {/* MỤC 2: THÔNG TIN & ĐỊA CHỈ DOANH NGHIỆP */}
          <div className="space-y-4">
            <div className="pb-1 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                II. Thông tin & Địa chỉ doanh nghiệp
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Field>
                <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1.5">
                  Tên quán cafe *
                </label>
                <Input
                  type="text"
                  name="cafeName"
                  required
                  minLength={5}
                  maxLength={100}
                  value={formData.cafeName}
                  onChange={handleChange}
                  placeholder="Ví dụ: Boardverse Premium Cafe"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1.5">
                  Địa chỉ chi tiết của quán *
                </label>
                <Input
                  type="text"
                  name="address"
                  required
                  minLength={10}
                  maxLength={500}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Ví dụ: Số 123 Đường Nguyễn Trãi, Quận 5, TP. HCM"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
            </div>

            {/* Khung giờ hoạt động thuộc nhóm vận hành doanh nghiệp */}
            <div className="border border-neutral-200 p-5 bg-neutral-50 rounded-xl space-y-4 mt-2">
              <span className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Khung giờ mở cửa hoạt động
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <label className="block text-[11px] font-medium text-neutral-600 uppercase mb-1.5">
                    Ngày trong tuần (Thứ 2 - Thứ 6) *
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="time"
                      name="weekdayStart"
                      value={formData.workingHours.weekdayStart}
                      onChange={handleHoursChange}
                      className="bg-white border-neutral-200 p-2 text-xs rounded-md w-24 h-9 text-center"
                    />
                    <span className="text-xs text-neutral-400 font-medium">
                      đến
                    </span>
                    <Input
                      type="time"
                      name="weekdayEnd"
                      value={formData.workingHours.weekdayEnd}
                      onChange={handleHoursChange}
                      className="bg-white border-neutral-200 p-2 text-xs rounded-md w-24 h-9 text-center"
                    />
                  </div>
                </Field>
                <Field>
                  <label className="block text-[11px] font-medium text-neutral-600 uppercase mb-1.5">
                    Cuối tuần (Thứ 7 - Chủ Nhật) *
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="time"
                      name="weekendStart"
                      value={formData.workingHours.weekendStart}
                      onChange={handleHoursChange}
                      className="bg-white border-neutral-200 p-2 text-xs rounded-md w-24 h-9 text-center"
                    />
                    <span className="text-xs text-neutral-400 font-medium">
                      đến
                    </span>
                    <Input
                      type="time"
                      name="weekendEnd"
                      value={formData.workingHours.weekendEnd}
                      onChange={handleHoursChange}
                      className="bg-white border-neutral-200 p-2 text-xs rounded-md w-24 h-9 text-center"
                    />
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* MỤC 3: GIẤY TỜ PHÁP LÝ HỢP TÁC */}
          <div className="space-y-4">
            <div className="pb-1 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                III. Giấy tờ pháp lý hợp tác
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Field>
                <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1.5">
                  Mã số giấy phép đăng ký kinh doanh *
                </label>
                <Input
                  type="text"
                  name="businessLicense"
                  required
                  value={formData.businessLicense}
                  onChange={handleChange}
                  placeholder="Nhập mã số thuế hoặc số giấy phép kinh doanh"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
              <Field>
                <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1.5">
                  Đường dẫn ảnh chụp giấy phép * (Đuôi .jpg, .jpeg, .png, .pdf)
                </label>
                <Input
                  type="text"
                  name="businessLicenseImageUrl"
                  required
                  value={formData.businessLicenseImageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/license.png"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
            </div>
          </div>

          {/* NÚT SUBMIT BIỂU MẪU */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] text-white font-semibold text-sm rounded-lg border border-neutral-950 border-t-neutral-700 shadow-[0px_1px_2px_rgba(0,0,0,0.2),inset_0px_1px_0px_rgba(255,255,255,0.1)] hover:from-[#333333] hover:to-[#222222] active:from-[#1A1A1A] active:to-[#111111] disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:border-neutral-200 disabled:shadow-none transition-all duration-150 flex items-center justify-center tracking-normal uppercase-none"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý dữ liệu...</span>
                </div>
              ) : (
                "Gửi đơn đăng ký hợp tác"
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* POPUP THÔNG BÁO KẾT QUẢ */}
      <AlertDialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
        <AlertDialogContent className="bg-white border border-neutral-100 rounded-xl p-6 shadow-[0px_8px_32px_rgba(0,0,0,0.08)] max-w-sm mx-auto text-neutral-900">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle
              className={`text-base font-bold tracking-tight flex items-center gap-2 ${
                popupContent.status === "success"
                  ? "text-neutral-950"
                  : "text-red-600"
              }`}
            >
              <span className="text-lg">
                {popupContent.status === "success" ? "✓" : "⚠️"}
              </span>
              {popupContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-neutral-500 leading-relaxed">
              {popupContent.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogAction
              onClick={() => setIsPopupOpen(false)}
              className="bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-wider rounded-lg px-4 py-2.5 w-full sm:w-auto transition-colors"
            >
              Xác Nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
