/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/core/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ComponentPenalty {
  id: string;
  gameComponentTemplateId: string;
  componentName: string;
  penaltyFee: number;
}

interface EditGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cafeId: string;
  inventoryId: string | null;
  onSuccess: () => void;
}

export function EditGameDialog({
  isOpen,
  onClose,
  cafeId,
  inventoryId,
  onSuccess,
}: EditGameDialogProps) {
  const [loading, setLoading] = useState(false);
  const [gameName, setGameName] = useState("");
  const [boxQuantity, setBoxQuantity] = useState<number>(1);
  const [status, setStatus] = useState("Available");
  const [penalties, setPenalties] = useState<ComponentPenalty[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // GET /api/cafes/{cafeId}/inventory/{inventoryId} - Láº¥y chi tiáº¿t cáº¥u hÃ¬nh game
  useEffect(() => {
    if (!isOpen || !inventoryId) return;

    const fetchDetail = async () => {
      try {
        const response: any = await apiClient.get(
          `/api/cafes/${cafeId}/inventory/${inventoryId}`,
        );
        const detail = response?.data || response;
        setGameName(detail.gameName);
        setBoxQuantity(detail.boxQuantity);
        setStatus(detail.status);
        setPenalties(detail.componentPenalties || []);
      } catch (err: any) {
        console.error("Lá»—i táº£i chi tiáº¿t game:", err.message);
      }
    };

    fetchDetail();
  }, [isOpen, inventoryId, cafeId]);

  const handlePenaltyFeeChange = (index: number, value: string) => {
    const updated = [...penalties];
    updated[index].penaltyFee = parseInt(value) || 0;
    setPenalties(updated);
  };

  // PUT /api/cafes/{cafeId}/inventory/{inventoryId} - Cáº­p nháº­t thay Ä‘á»•i
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryId) return;

    setLoading(true);
    setMessage(null);

    const apiPayload = {
      boxQuantity,
      status,
      componentPenalties: penalties.map(
        ({ gameComponentTemplateId, penaltyFee }) => ({
          gameComponentTemplateId,
          penaltyFee,
        }),
      ),
    };

    try {
      await apiClient.put(
        `/api/cafes/${cafeId}/inventory/${inventoryId}`,
        apiPayload,
      );
      setMessage({
        type: "success",
        text: "Cáº­p nháº­t há»“ sÆ¡ kho game thÃ nh cÃ´ng!",
      });
      setTimeout(() => {
        onSuccess();
        onClose();
        setMessage(null);
      }, 1200);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Cáº­p nháº­t tháº¥t báº¡i." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      {/* Cáº¬P NHáº¬T: Bo gÃ³c rounded-xl, viá»n máº£nh neutral, Ä‘á»• bÃ³ng má»‹n nháº¹ nhÃ ng */}
      <AlertDialogContent className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-[0px_8px_24px_rgba(0,0,0,0.06)] max-w-lg mx-auto text-neutral-900">
        <AlertDialogHeader className="border-b border-neutral-100 pb-3 mb-4 space-y-1">
          <AlertDialogTitle className="text-lg font-bold tracking-tight text-neutral-900">
            Chá»‰nh Sá»­a Kho Game: {gameName}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs font-medium text-neutral-500">
            Thay Ä‘á»•i sá»‘ lÆ°á»£ng há»™p hiá»‡n cÃ³, cáº­p nháº­t tráº¡ng thÃ¡i hoáº¡t Ä‘á»™ng hoáº·c
            tÃ¹y chá»‰nh biá»ƒu phÃ­ Ä‘á»n bÃ¹ linh kiá»‡n.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {message && (
          <div
            className={`p-3 mb-4 text-xs font-semibold border rounded-lg ${
              message.type === "success"
                ? "bg-neutral-50 border-neutral-200 text-neutral-900"
                : "bg-orange-50 border-orange-100 text-orange-600"
            }`}
          >
            {message.type === "success" ? "âœ“ " : "âš ï¸ "}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* GRID: ÄÃ£ tÃ­ch há»£p cáº£ Ã´ nháº­p sá»‘ lÆ°á»£ng láº«n chá»n tráº¡ng thÃ¡i song song cho cÃ¢n Ä‘á»‘i */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5 tracking-wide">
                Sá»‘ lÆ°á»£ng há»™p hiá»‡n cÃ³ *
              </label>
              <Input
                type="number"
                required
                min={1}
                value={boxQuantity}
                onChange={(e) => setBoxQuantity(parseInt(e.target.value) || 1)}
                className="w-full h-9 border-neutral-200 rounded-lg focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 bg-white text-sm"
              />
            </Field>

            <Field>
              <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5 tracking-wide">
                Tráº¡ng thÃ¡i kho *
              </label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value)}
              >
                <SelectTrigger className="w-full h-9 px-3 py-2 border border-neutral-200 bg-white font-medium text-sm rounded-lg focus:ring-1 focus:ring-neutral-400 focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 text-left text-neutral-900">
                  <SelectValue placeholder="Chá»n tráº¡ng thÃ¡i..." />
                </SelectTrigger>

                <SelectContent className="bg-white border border-neutral-200 rounded-lg shadow-[0px_4px_12px_rgba(0,0,0,0.05)] text-neutral-900">
                  <SelectItem
                    value="Available"
                    className="font-medium text-sm rounded-md focus:bg-neutral-50 focus:text-neutral-900 cursor-pointer py-2"
                  >
                    Available
                  </SelectItem>
                  <SelectItem
                    value="Maintenance"
                    className="font-medium text-sm rounded-md focus:bg-neutral-50 focus:text-neutral-900 cursor-pointer py-2"
                  >
                    Maintenance
                  </SelectItem>
                  <SelectItem
                    value="OutofStock"
                    className="font-medium text-sm rounded-md focus:bg-neutral-50 focus:text-neutral-900 cursor-pointer py-2"
                  >
                    Out of Stock
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* ÄIá»€U CHá»ˆNH PHÃ PHáº T LINH KIá»†N */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-neutral-800 uppercase tracking-wide">
              Äiá»u chá»‰nh phÃ­ pháº¡t linh kiá»‡n ({penalties.length} má»¥c)
            </label>

            {penalties.length > 0 ? (
              <div className="max-h-40 overflow-y-auto border border-neutral-200 p-3 bg-neutral-50/60 rounded-xl space-y-1.5 scrollbar-thin">
                {penalties.map((item, index) => (
                  <div
                    key={item.id || item.gameComponentTemplateId}
                    className="flex items-center justify-between gap-4 bg-white p-2 border border-neutral-200/60 rounded-lg shadow-[0px_1px_2px_rgba(0,0,0,0.01)]"
                  >
                    <span className="text-xs font-semibold text-neutral-700 truncate max-w-280px">
                      {item.componentName}
                    </span>
                    <Input
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={item.penaltyFee}
                      onChange={(e) =>
                        handlePenaltyFeeChange(index, e.target.value)
                      }
                      className="w-28 h-8 text-right px-2 py-1 border border-neutral-200 rounded-md text-xs font-mono font-bold focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium text-neutral-400 italic p-4 border border-dashed border-neutral-200 rounded-xl text-center bg-neutral-50/40">
                Tá»±a game nÃ y khÃ´ng cÃ³ cáº¥u trÃºc linh kiá»‡n riÃªng láº» Ä‘á»ƒ Ä‘iá»u chá»‰nh.
              </p>
            )}
          </div>

          {/* FOOTER ACTIONS: Äá»“ng bá»™ nÃºt báº¥m pháº³ng, gradient vÃ  shadow chÃ¬m Ä‘á»• khá»‘i */}
          <AlertDialogFooter className="pt-3 border-t border-neutral-100 flex sm:items-center gap-2">
            <AlertDialogCancel
              type="button"
              onClick={onClose}
              className="h-9 border border-neutral-200 bg-white text-neutral-700 font-semibold text-xs uppercase tracking-wider rounded-lg px-5 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            >
              Há»§y
            </AlertDialogCancel>

            <Button
              type="submit"
              disabled={loading}
              className="h-9 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] text-white font-semibold text-xs uppercase tracking-wider rounded-lg border border-neutral-950 border-t-neutral-700 shadow-[0px_1px_2px_rgba(0,0,0,0.15),inset_0px_1px_0px_rgba(255,255,255,0.08)] hover:from-[#333333] hover:to-[#222222] active:from-[#1A1A1A] active:to-[#111111] disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:border-neutral-200 disabled:shadow-none transition-all duration-150 flex items-center justify-center gap-2 px-6"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>ÄANG LÆ¯U...</span>
                </>
              ) : (
                "LÆ°u thay Ä‘á»•i"
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
