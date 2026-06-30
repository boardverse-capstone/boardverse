/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/core/api/client";

export interface MasterGameItem {
  id: string;
  name: string;
  description: string;
  components: any[];
}

export interface SelectedGameCartItem {
  gameTemplateId: string;
  gameName: string;
  boxQuantity: number;
  status: "Available" | "Maintenance" | "OutofStock";
  componentPenalties: any[];
}

export function useBulkAddInventory(isOpen: boolean, cafeId: string, onClose: () => void, onSuccess: () => void) {
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [masterGames, setMasterGames] = useState<MasterGameItem[]>([]);
  const [cart, setCart] = useState<SelectedGameCartItem[]>([]);
  const [cardConfigs, setCardConfigs] = useState<Record<string, { status: "Available" | "Maintenance"; quantity: number }>>({});

  // Danh sách ID dùng để đối chiếu lọc ẩn trùng
  const [existingGameIds, setExistingGameIds] = useState<string[]>([]);
  const [deletedGameIds, setDeletedGameIds] = useState<string[]>([]);

  // 1. Quét danh sách ID hiện tại của quán
  const fetchCurrentInventoryIds = useCallback(async () => {
    if (!cafeId) return;
    try {
      const [activeRes, deletedRes]: any = await Promise.all([
        apiClient.get(`/api/cafes/${cafeId}/inventory?sortDescending=true&pageNumber=1&pageSize=100`),
        apiClient.get(`/api/cafes/${cafeId}/inventory/deleted`)
      ]);

      const activeList = activeRes?.data || activeRes || [];
      const deletedList = deletedRes?.data || deletedRes || [];

      setExistingGameIds(activeList.map((item: any) => item.gameTemplateId || item.gameId || item.id));
      setDeletedGameIds(deletedList.map((item: any) => item.gameTemplateId || item.gameId || item.id));
    } catch (err) {
      console.error("Lỗi khi quét danh sách kiểm tra trùng kho:", err);
    }
  }, [cafeId]);

  // 2. Fetch danh sách game hệ thống và THỰC THI ẨN TRÙNG
  const fetchGames = useCallback(async (searchQuery: string, activeIds: string[], trashIds: string[]) => {
    setLoading(true);
    try {
      const endpoint = searchQuery.trim()
        ? `/api/v1/board-games?search=${encodeURIComponent(searchQuery)}&pageNumber=1&pageSize=20`
        : `/api/v1/board-games?pageNumber=1&pageSize=20`;

      const response: any = await apiClient.get(endpoint);
      const list: MasterGameItem[] = response?.data || response || [];
      
      // SỬA TẠI ĐÂY: Loại bỏ hoàn toàn các game đã tồn tại hoạt động hoặc đã bị xóa mềm
      const filteredList = list.filter(
        (game) => !activeIds.includes(game.id) && !trashIds.includes(game.id)
      );

      setMasterGames(filteredList);

      setCardConfigs((prev) => {
        const next = { ...prev };
        filteredList.forEach((game) => {
          if (!next[game.id]) {
            next[game.id] = { status: "Available", quantity: 1 };
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Lỗi tải danh sách game gốc từ hệ thống:", err);
      setMasterGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Điều tốc luồng gọi dữ liệu tuần tự chính xác
  useEffect(() => {
    const initializeBulkFlow = async () => {
      if (isOpen && cafeId) {
        // Luôn luôn lấy các ID trùng mới nhất về trước
        try {
          const [activeRes, deletedRes]: any = await Promise.all([
            apiClient.get(`/api/cafes/${cafeId}/inventory?sortDescending=true&pageNumber=1&pageSize=100`),
            apiClient.get(`/api/cafes/${cafeId}/inventory/deleted`)
          ]);
          const activeList = activeRes?.data || activeRes || [];
          const deletedList = deletedRes?.data || deletedRes || [];
          
          const activeIds = activeList.map((item: any) => item.gameTemplateId || item.gameId || item.id);
          const trashIds = deletedList.map((item: any) => item.gameTemplateId || item.gameId || item.id);
          
          setExistingGameIds(activeIds);
          setDeletedGameIds(trashIds);

          // Truyền trực tiếp mảng ID vừa fetch vào hàm tìm kiếm để lọc tức thì, không bị delay bởi nhịp render state
          await fetchGames(searchTerm, activeIds, trashIds);
        } catch (err) {
          console.error(err);
        }
      }
    };

    const delayDebounce = setTimeout(() => {
      initializeBulkFlow();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, isOpen, cafeId, fetchGames]);

  // Các hàm điều khiển phụ trợ giữ nguyên
  const toggleCardStatus = (gameId: string) => {
    setCardConfigs((prev) => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        status: prev[gameId].status === "Available" ? "Maintenance" : "Available",
      },
    }));
  };

  const updateCardQuantity = (gameId: string, val: number) => {
    setCardConfigs((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], quantity: Math.max(1, val) },
    }));
  };

  const addToCart = (game: MasterGameItem) => {
    const config = cardConfigs[game.id] || { status: "Available", quantity: 1 };
    setCart((prev) => {
      if (prev.some((item) => item.gameTemplateId === game.id)) return prev;
      const componentPenalties = (game.components || []).map((comp: any) => ({
        gameComponentTemplateId: comp.id,
        penaltyFee: 0,
      }));
      return [
        ...prev,
        {
          gameTemplateId: game.id,
          gameName: game.name,
          boxQuantity: config.quantity,
          status: config.status,
          componentPenalties,
        },
      ];
    });
  };

  const removeFromCart = (gameTemplateId: string) => {
    setCart((prev) => prev.filter((item) => item.gameTemplateId !== gameTemplateId));
  };

  const updateCartItemQuantity = (id: string, qty: number) => {
    setCart((prev) =>
      prev.map((item) => (item.gameTemplateId === id ? { ...item, boxQuantity: Math.max(1, qty) } : item))
    );
  };

  const updateCartItemStatus = (id: string, status: any) => {
    setCart((prev) =>
      prev.map((item) => (item.gameTemplateId === id ? { ...item, status } : item))
    );
  };

  const clearCart = () => setCart([]);

  const handleBulkSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitLoading(true);
    try {
      const requests = cart.map((item) =>
        apiClient.post(`/api/cafes/${cafeId}/inventory`, {
          gameTemplateId: item.gameTemplateId,
          boxQuantity: item.boxQuantity,
          status: item.status,
          componentPenalties: item.componentPenalties,
        })
      );
      await Promise.all(requests);
      alert(`Nhập kho thành công hàng loạt ${cart.length} tựa game!`);
      clearCart();
      setSearchTerm("");
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || "Nhập kho hàng loạt thất bại.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    masterGames,
    cart,
    clearCart,
    cardConfigs,
    loading,
    submitLoading,
    toggleCardStatus,
    updateCardQuantity,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    updateCartItemStatus,
    handleBulkSubmit,
  };
}