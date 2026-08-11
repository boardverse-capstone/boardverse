/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  X,
  History,
  AlertTriangle,
  Clock,
  UserCheck,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BoxComponentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyData: any | null;
  onConfirmProceed?: () => void;
}

export function BoxComponentHistoryModal({
  isOpen,
  onClose,
  historyData,
  onConfirmProceed,
}: BoxComponentHistoryModalProps) {
  if (!isOpen || !historyData) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-in fade-in-50 duration-150">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950 flex items-center gap-2">
                <span>Lịch Sử Mất Đồ & Linh Kiện</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                  {historyData.totalIncidents || 0} lần ghi nhận
                </span>
              </h3>
              <p className="text-xs text-neutral-500 font-medium truncate max-w-xs">
                {historyData.gameName} • Barcode:{" "}
                <span className="font-mono text-neutral-800">
                  {historyData.barcode}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-950 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DANH SÁCH CÁC SỰ CỐ MẤT ĐỒ TỪ CÁC PHIÊN TRƯỚC */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {historyData.incidents && historyData.incidents.length > 0 ? (
            historyData.incidents.map((incident: any, idx: number) => (
              <div
                key={incident.sessionGameId || idx}
                className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs text-neutral-600 border-b border-neutral-200/60 pb-2">
                  <span className="flex items-center gap-1 font-semibold text-neutral-900">
                    <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                    NV kiểm: {incident.staffName || "Staff"}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-neutral-500">
                    <Clock className="w-3 h-3" />
                    {new Date(incident.checkedAt).toLocaleString("vi-VN")}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    Mảnh/Linh kiện bị mất/hỏng:
                  </div>

                  {incident.missingComponents?.map(
                    (comp: any, cIdx: number) => (
                      <div
                        key={comp.componentId || cIdx}
                        className="bg-white border border-rose-100 p-2 rounded-lg flex items-center justify-between text-xs shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-neutral-900">
                            {comp.componentName}{" "}
                            <span className="text-rose-600 font-mono">
                              (Thiếu: {comp.missingQuantity}/
                              {comp.expectedQuantity})
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            Loại: {comp.componentKind}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-rose-600">
                          +{comp.penaltyFee.toLocaleString("vi-VN")}đ
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-neutral-400 space-y-2 border border-dashed border-neutral-200 rounded-xl">
              <ShieldAlert className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-semibold text-neutral-700">
                Hộp game này chưa từng có lịch sử mất/hỏng đồ!
              </p>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs rounded-lg border-neutral-200"
          >
            Đóng
          </Button>

          {onConfirmProceed && (
            <Button
              type="button"
              onClick={onConfirmProceed}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-4 flex items-center gap-1.5 shadow-2xs"
            >
              <span>Tiến Hành Thanh Toán</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
