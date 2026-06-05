# TÀI LIỆU ĐẶC TẢ KIẾN TRÚC MÃ NGUỒN VÀ QUY CHUẨN LẬP TRÌNH FRONTEND (NEXT.JS)

## 1. NGUYÊN TẮC THIẾT KẾ CỐT LÕI (ARCHITECTURE PRINCIPLES)

Hệ thống áp dụng kiến trúc kết hợp giữa **Kiến trúc phân lớp (Layered Architecture)** để tách biệt trách nhiệm và **Quản lý theo tính năng (Feature-based)** để dễ dàng mở rộng. Mọi thành phần mã nguồn phải tuân thủ 3 nguyên tắc bảo trì sau:

1. **Tách biệt tuyệt đối giao diện và logic (Separation of Concerns):** Component UI không trực tiếp thực hiện tính toán nghiệp vụ, không quản lý các chuỗi URL API và không tự xử lý thông báo lỗi hệ thống.
2. **Đơn nhiệm (Single Responsibility Principle - SRP):** Một tệp tin chỉ thực hiện một nhiệm vụ duy nhất (hoặc là hiển thị giao diện, hoặc là xử lý logic, hoặc là định nghĩa dữ liệu).
3. **Bất biến giao diện qua Service (Dependency Inversion):** UI phụ thuộc vào Hooks, Hooks phụ thuộc vào Services, Services phụ thuộc vào API Client. Không gọi trực tiếp thư viện HTTP (Axios) từ giao diện.

---

## 2. QUY CHUẨN TỔ CHỨC THƯ MỤC CHI TIẾT (FOLDER STRUCTURE)

Mã nguồn bên trong thư mục `src/` được phân bổ thành 5 lớp chức năng rạch ròi:

```text
src/
├── app/                           # LỚP 1: ROUTING & ENTRY POINT (SERVER COMPONENTS)
│   ├── (auth)/                    # Nhóm tuyến đường (Route Group) phục vụ Xác thực
│   │   ├── login/page.tsx         # Trang Đăng nhập (Chỉ nhúng Container Component)
│   │   └── register/page.tsx      
│   ├── admin/                     # Phân hệ Admin Portal
│   ├── cafe/                      # Phân hệ Cafe Partner POS
│   │   └── inventory/page.tsx     # Trang Nhập kho Board Game
│   └── layout.tsx                 # Layout gốc hệ thống (Cấu hình Providers toàn cục)
│
├── components/                    # LỚP 2: UI DÙNG CHUNG TOÀN HỆ THỐNG (STATELESS)
│   ├── common/                    # Nguyên tử UI dùng chung không chứa nghiệp vụ (Button, Input)
│   │   └── pagination.tsx         # Thanh điều hướng phân trang dùng chung toàn cục
│   └── ui/                        # Các linh kiện giao diện mặc định của Shadcn UI
│
├── features/                      # LỚP 3: LỚP NGHIỆP VỤ THEO MIỀN (FEATURE-BASED)
│   ├── [feature_name]/            # Ví dụ: auth, partner, inventory
│   │   ├── components/            # Các cấu phần UI đặc thù của tính năng (Giao diện thuần)
│   │   ├── hooks/                 # Custom Hooks điều khiển trạng thái & Nghiệp vụ (React Query)
│   │   ├── services/              # Lớp xử lý gọi HTTP Request riêng của tính năng
│   │   └── types/                 # Định nghĩa Data Contracts, Interfaces, và Dữ liệu Phân trang
│
├── core/                          # LỚP 4: CẤU HÌNH HỆ THỐNG TOÀN CỤC (INFRASTRUCTURE)
│   ├── api/                       # Khởi tạo Axios Instance & Bộ chặn (Interceptors) xử lý Token
│   ├── constants/                 # Hệ thống Hằng số, Enum trạng thái (Bất biến)
│   └── providers/                 # Tập hợp Providers (React Query, Theme, Toast)
│
└── shared/                        # LỚP 5: TIỆN ÍCH VÀ XÁC THỰC SƠ KHỞI
    ├── utils/                     # Hàm bổ trợ thuần túy (Định dạng tiền tệ, xử lý thời gian)
    └── validators/                # File Zod Validation Schemas (Kiểm tra dữ liệu đầu vào Form)

```

---

## 3. ĐẶC TẢ CƠ CHẾ PHÂN TRANG CHUẨN HÓA (STANDARDIZED PAGINATION DATA CONTRACT)

Để quản lý các danh sách dữ liệu lớn (Danh sách đơn đăng ký của Admin, danh sách kho game của POS) mà không gây quá tải cho bộ nhớ và băng thông đường truyền, hệ thống áp dụng cơ chế **Phân trang dựa trên vị trí (Offset-based Pagination)** một cách đồng bộ từ API Backend lên giao diện Frontend theo cấu trúc dưới đây:

### 3.1. Định nghĩa Kiểu dữ liệu Phân trang (Data Contracts)

Mọi API trả về danh sách phân trang từ Backend phải được ép kiểu dữ liệu (Type Interface) theo cấu trúc bọc (Wrapper) chuẩn hóa sau:

```typescript
// src/shared/types/pagination.interface.ts

// Tham số gửi đi lên Server khi yêu cầu lấy dữ liệu
export interface PaginationParams {
  page: number;      // Chỉ mục trang hiện tại (Bắt đầu từ 1)
  limit: number;     // Số lượng bản ghi trên một trang
  search?: string;   // Từ khóa tìm kiếm nếu có
}

// Cấu trúc dữ liệu Meta phân trang do Server trả về
export interface PaginationMeta {
  currentPage: number; // Trang hiện tại
  limit: number;       // Số lượng phần tử mỗi trang
  totalItems: number;  // Tổng số lượng bản ghi có trong Database
  totalPages: number;  // Tổng số lượng trang tương ứng (= totalItems / limit)
  hasPrevious: boolean;// Có trang trước đó hay không
  hasNext: boolean;    // Có trang kế tiếp hay không
}

// Cấu trúc dữ liệu phản hồi tổng thể từ API cho một danh sách phân trang
export interface PaginatedResponse<T> {
  data: T[];           // Mảng chứa danh sách các thực thể dữ liệu (ví dụ: BoardGame, Partner)
  meta: PaginationMeta; // Thông tin metadata phân trang phục vụ vẽ UI điều hướng
}

```

---

## 4. QUY TRÌNH THỰC THI CHUẨN HÓA CHO AI (STEP-BY-STEP WORKFLOW FOR AI AGENT)

Khi AI Agent thực hiện sinh mã nguồn cho một tính năng có danh sách phân trang (Ví dụ: *Xem danh sách đơn đăng ký đối tác chờ duyệt của Admin*), bắt buộc phải tuân thủ nghiêm ngặt 4 bước phân lớp mã nguồn như sau:

### BƯỚC 1: Khai báo Service gọi API (Tầng Triệu gọi dữ liệu)

Định nghĩa hàm nhận vào `PaginationParams` và trả về `Promise<PaginatedResponse<T>>`.

*Vị trí tệp tin:* `src/features/partner/services/partner.service.ts`

```typescript
import { apiClient } from '@/core/api/client';
import { PaginationParams, PaginatedResponse } from '@/shared/types/pagination.interface';
import { PartnerApplication } from '../types/partner.interface';

export const PartnerService = {
  getPendingApplications: async (params: PaginationParams): Promise<PaginatedResponse<PartnerApplication>> => {
    return apiClient.get('/admin/partners/pending', {
      params: {
        page: params.page,
        limit: params.limit,
        q: params.search,
      },
    });
  },
};

```

### BƯỚC 2: Xây dựng Custom Hook (Tầng Xử lý logic & Quản lý trạng thái)

Sử dụng `useQuery` của TanStack Query để tự động theo dõi, kích hoạt gọi lại API khi tham số `page` hoặc `search` thay đổi, và tự động lưu bộ nhớ đệm (cache).

*Vị trí tệp tin:* `src/features/partner/hooks/usePendingPartners.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { PartnerService } from '../services/partner.service';
import { PaginationParams } from '@/shared/types/pagination.interface';

export const usePendingPartners = (params: PaginationParams) => {
  return useQuery({
    // Khóa kích hoạt bộ nhớ đệm: API tự gọi lại khi page hoặc search thay đổi giá trị
    queryKey: ['partner-pending', params.page, params.limit, params.search],
    queryFn: () => PartnerService.getPendingApplications(params),
    placeholderData: (previousData) => previousData, // Giữ lại dữ liệu trang cũ khi đang tải trang mới (Tránh giật màn hình)
    staleTime: 5000, // Dữ liệu được coi là mới trong 5 giây
  });
};

```

### BƯỚC 3: Xây dựng Component điều hướng phân trang dùng chung (Tầng Giao diện gốc)

Component hiển thị thanh bấm số trang (`1`, `2`, `3`, `Next`, `Previous`) sử dụng UI của Shadcn, là một thành phần thuần (Pure Component) nhận vào trạng thái và phát ra sự kiện chuyển trang.

*Vị trí tệp tin:* `src/components/common/pagination.tsx`

```typescript
import React from 'react';
import { PaginationMeta } from '@/shared/types/pagination.interface';

interface CommonPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export const CommonPagination: React.FC<CommonPaginationProps> = ({ meta, onPageChange }) => {
  const { currentPage, totalPages, hasPrevious, hasNext } = meta;

  if (totalPages <= 1) return null; // Không hiển thị nếu tổng số trang nhỏ hơn hoặc bằng 1

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          disabled={!hasPrevious}
          onClick={() => onPageChange(currentPage - 1)}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Trước
        </button>
        <button
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Sau
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Hiển thị trang <span className="font-medium">{currentPage}</span> trên tổng số{' '}
            <span className="font-medium">{totalPages}</span> trang.
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              disabled={!hasPrevious}
              onClick={() => onPageChange(currentPage - 1)}
              className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <span>Trước</span>
            </button>
            
            {/* Vòng lặp hiển thị danh sách số trang */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold border ${
                  pageNumber === currentPage
                    ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                    : 'text-gray-900 border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              disabled={!hasNext}
              onClick={() => onPageChange(currentPage + 1)}
              className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <span>Sau</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

```

### BƯỚC 4: Tích hợp và Render dữ liệu (Tầng Giao diện tính năng)

Tập hợp toàn bộ các thành phần trên lại với nhau tại giao diện hiển thị danh sách của tính năng.

*Vị trí tệp tin:* `src/features/partner/components/partner-pending-table.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { usePendingPartners } from '../hooks/usePendingPartners';
import { CommonPagination } from '@/components/common/pagination';

export const PartnerPendingTable: React.FC = () => {
  // Quản lý trạng thái phân trang cục bộ tại giao diện
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');

  // Kích hoạt hook nghiệp vụ lấy dữ liệu phân trang từ Server
  const { data, isLoading, isError } = usePendingPartners({ page, limit: 10, search });

  if (isLoading) return <div className="text-sm p-4">Đang tải danh sách dữ liệu...</div>;
  if (isError) return <div className="text-sm text-red-500 p-4">Lỗi hệ thống khi tải danh sách đối tác.</div>;

  return (
    <div className="space-y-4">
      {/* Thanh công cụ tìm kiếm */}
      <input
        type="text"
        placeholder="Tìm kiếm quán cafe..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1); // Reset chỉ mục về trang 1 khi người dùng gõ từ khóa tìm kiếm mới
        }}
        className="border p-2 rounded-md w-full max-w-sm mb-2"
      />

      {/* Bảng kết quả hiển thị */}
      <div className="bg-white rounded-lg shadow overflow-hidden border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên Quán</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Địa Chỉ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số Điện Thoại</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.data.map((partner) => (
              <tr key={partner.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{partner.cafeName}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{partner.address}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{partner.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nhúng Component phân trang và truyền Metadata thu được từ Server vào */}
      {data?.meta && (
        <CommonPagination meta={data.meta} onPageChange={(targetPage) => setPage(targetPage)} />
      )}
    </div>
  );
};

```

---

## 5. KẾT LUẬN & CAM KẾT VẬN HÀNH CHO AI

Tài liệu này định hình một chuỗi liên kết logic khép kín (API Contract -> HTTP Service -> React Query State -> Pure Component View).