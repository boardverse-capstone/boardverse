# CAFE PARTNER ONBOARDING — ĐẶC TẢ NGHIỆP VỤ

> Tài liệu nghiệp vụ. Triển khai frontend tuân thủ kiến trúc tại [`structure_code.md`](./structure_code.md).

## API Contract (Admin)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/partners/pending?page&limit&q` | Danh sách đơn cần xử lý |
| GET | `/admin/partners/{id}` | Chi tiết đơn (4 khối dữ liệu) |
| POST | `/admin/partners` | Gửi form Landing Page |
| POST | `/admin/partners/{id}/approve` | Hành động duyệt chính theo trạng thái |
| POST | `/admin/partners/{id}/reject` | Từ chối (body: `{ reason }`) |
| POST | `/admin/partners/{id}/transition` | Chuyển trạng thái workflow |

## Kiến trúc Frontend (`features/partner`)

```
features/partner/
├── types/partner.interface.ts    # PartnerApplication (list) + Registration (detail)
├── services/partner.service.ts
├── hooks/usePendingPartners.ts
├── components/partner-pending-table.tsx
└── utils/partner.mapper.ts       # Registration → PartnerApplication
```

## PartnerApplication (danh sách phẳng)

```typescript
interface PartnerApplication {
  id: string;
  cafeName: string;
  address: string;
  phone: string;
  status: RegistrationStatus;
  createdAt: string;
  hasAlerts: boolean;
}
```

## Vòng đời trạng thái

`PENDING_REVIEW` → `NEEDS_OPS_VERIFICATION` / `PENDING_INFO` / `PENDING_NEGOTIATION` / `REJECTED`

`PENDING_NEGOTIATION` → `CONTRACT_SIGNED` → `DATA_BLANK` (+ CAFE_MANAGER) → `ACTIVE`

Terminal: `REJECTED`, `CANCELLED`, `EXPIRED_CANCELLED`, `ACTIVE`

## Quy tắc

- Chỉ `ACTIVE` hiển thị trên Mobile App
- Email đại diện = username CAFE_MANAGER (duy nhất)
- Từ chối bắt buộc có `reason` (max 500 ký tự)

## Mock dev

```env
NEXT_PUBLIC_USE_MOCK_PARTNER_API=true
```
