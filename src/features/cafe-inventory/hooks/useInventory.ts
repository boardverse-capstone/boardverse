/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "@/core/api/client";

export function useInventory() {
  const [viewMode, setViewMode] = useState<"active" | "trash">("active");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Khởi tạo các State dựa trên tài liệu Swagger từ hình ảnh image_625cf5.png
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<string>("All"); // "All" đại diện cho việc không lọc status cụ thể
  const [sortBy, setSortBy] = useState<string>("UpdatedAt");
  const [sortDescending, setSortDescending] = useState<boolean>(true);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Hàm tải dữ liệu danh mục kho kết hợp toàn bộ Query Params từ Swagger
  const loadInventory = useCallback(async (currentCafeId: string, searchKey: string) => {
    setLoading(true);
    try {
      let endpoint = "";
      
      if (viewMode === "active") {
  const encodedSearch = encodeURIComponent(searchKey.trim());
  let queryParams = `searchTerm=${encodedSearch}&sortBy=${sortBy}&sortDescending=${sortDescending}&pageNumber=${pageNumber}&pageSize=${pageSize}`;
  
  if (status !== "All") {
    queryParams += `&status=${status}`;
  }

  endpoint = `/api/cafes/${currentCafeId}/inventory?${queryParams}`;
} else { // Thay thế dấu "}" : "{" thành "}" else "{" ở đây
  endpoint = `/api/cafes/${currentCafeId}/inventory/deleted`;
}

      const response: any = await apiClient.get(endpoint);
      setInventoryList(response?.data || response || []);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu kho game:", err);
      setInventoryList([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode, status, sortBy, sortDescending, pageNumber, pageSize]);

  const refreshInventory = useCallback(async () => {
    if (cafeId) {
      await loadInventory(cafeId, searchTerm);
    }
  }, [cafeId, searchTerm, loadInventory]);

  // Lắng nghe sự thay đổi của mọi bộ lọc để tự động nạp lại dữ liệu (có Debounce cho ô Search)
  useEffect(() => {
    const initializePageData = async () => {
      try {
        let currentCafeId = cafeId;
        if (!currentCafeId) {
          const response: any = await apiClient.get("/api/manager/my-cafes");
          const cafes = response?.data || response || [];
          if (cafes.length > 0) {
            currentCafeId = cafes[0].id;
            setCafeId(currentCafeId);
          } else {
            setLoading(false);
            return;
          }
        }
        if (currentCafeId) {
          await loadInventory(currentCafeId, searchTerm);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      initializePageData();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [viewMode, searchTerm, status, sortBy, sortDescending, pageNumber, pageSize, cafeId, loadInventory]);

  const handleDelete = async (id: string) => {
    if (!cafeId) return;
    if (!confirm("Bạn có chắc chắn muốn xóa tựa game này vào thùng rác?")) return;
    try {
      await apiClient.delete(`/api/cafes/${cafeId}/inventory/${id}`);
      await loadInventory(cafeId, searchTerm);
    } catch (err: any) {
      toast.error(err.message || "Xóa thất bại");
    }
  };

  const handleRestore = async (id: string) => {
    if (!cafeId) return;
    try {
      await apiClient.post(`/api/cafes/${cafeId}/inventory/${id}/restore`);
      await loadInventory(cafeId, searchTerm);
    } catch (err: any) {
      toast.error(err.message || "Khôi phục thất bại");
    }
  };

  return {
    viewMode,
    setViewMode,
    isAddOpen,
    setIsAddOpen,
    isEditOpen,
    setIsEditOpen,
    selectedInventoryId,
    setSelectedInventoryId,
    cafeId,
    inventoryList,
    loading,
    searchTerm,
    setSearchTerm,
    status,
    setStatus,
    sortBy,
    setSortBy,
    sortDescending,
    setSortDescending,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    refreshInventory,
    handleDelete,
    handleRestore,
  };
}