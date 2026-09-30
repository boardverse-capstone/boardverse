# 🐛 BUG REPORT — `GET /pos/sessions/{id}` trả `hostName` = player thay vì staff

| Field | Value |
|---|---|
| **Reported by** | FE team (Boardverse) |
| **Date** | 2026-09-29 |
| **Severity** | Low (display label) — không block flow nghiệp vụ, nhưng gây nhầm lẫn cho staff POS |
| **Affected feature** | POS Active Sessions — Modal "Chi tiết phiên" + Modal "Kết thúc phiên" |
| **Affected endpoint** | `GET /api/cafes/{cafeId}/pos/sessions/{sessionId}` |
| **Affected cafeId** | (bất kỳ cafe nào có session walk-in) |
| **Spec vi phạm** | `cafe-pos.md` dòng 2099 — BR-13 "Ẩn host user" |

---

## TL;DR

Modal chi tiết phiên / kết thúc phiên hiển thị label **"Người phụ trách"** và bind vào field `hostName` của session detail. Tuy nhiên với session walk-in, `hostName` đang trả về **tên khách** thay vì **tên staff tạo session**. Theo spec BR-13 dòng 2099:

> *"HostId là staff tạo session, lưu riêng ở `session.HostId` để audit (xem comment `// BR-13: Ẩn host user` tại `MapSessionDto`)."*

→ `hostName` phải map từ `AspNetUsers.FullName` của `session.HostId` (staff), **không phải** từ `Reservation.Host.FullName` (player host).

---

## Repro steps

1. Staff A login POS tại café `a1aae9db-4f1b-44af-ac86-6038d085df94` (hoặc bất kỳ cafe nào).
2. Khách tên "Trinh" đến quán chơi (walk-in, không đặt trước).
3. Staff A mở POS → chọn bàn trống → bấm **"Bắt đầu phiên"** → nhập khách "Trinh" → xác nhận.
   - Kết quả: session được tạo với `HostId = <staff-A-id>`, `ReservationId = null` (walk-in thuần).
4. Staff B (ca sau) mở POS, click vào session vừa tạo → modal **Chi tiết phiên** mở ra.

## Expected

Label **"Người phụ trách"** = tên staff A (người đã tạo session walk-in).

## Actual

Label **"Người phụ trách"** = "Trinh" (tên khách).

---

## Evidence

### Request

```http
GET /api/cafes/{cafeId}/pos/sessions/{sessionId}
```

Response (status `200 OK`):

```json
{
  "id": "<sessionId>",
  "hostId": "<staff-A-userId>",        // ← staff tạo session (đúng)
  "hostName": "Trinh",                 // ❌ BUG — đang là tên khách
  "cafeTableId": "<uuid>",
  "reservationId": null,               // walk-in thuần, không có reservation
  "status": "Active",
  "startedAt": "2026-09-29T...",
  "members": [
    { "userId": "<khachTrinhId>", "displayName": "Trinh", ... }
  ]
}
```

### Verify trong DB

```sql
SELECT 
  s.Id AS SessionId,
  s.HostId,
  u.FullName AS StaffFullName,         -- tên staff từ HostId
  s.ReservationId,                      -- null = walk-in thuần
  r.HostName AS ReservationHostName,    -- tên player host (đang bị leak)
  (SELECT FullName FROM AspNetUsers WHERE Id = '<khachTrinhId>') AS GuestFullName
FROM ActiveSessions s
LEFT JOIN AspNetUsers u ON u.Id = s.HostId
LEFT JOIN Reservations r ON r.Id = s.ReservationId
WHERE s.Id = '<sessionId-bàn-7>';
```

Kết quả kỳ vọng khi bug tồn tại:

| Column | Value |
|---|---|
| `HostId` | `<staff-A-uuid>` |
| `StaffFullName` | `"Staff A"` (hoặc tên nhân viên ca trước) |
| `ReservationId` | `NULL` |
| `ReservationHostName` | `NULL` |
| `GuestFullName` | `"Trinh"` |
| `session.hostName` (response) | `"Trinh"` ← BUG, khớp với GuestFullName |

---

## Phân tích nguyên nhân (FE hypothesis)

Nghi vấn `MapSessionDto` đang map `HostName` theo thứ tự fallback sai:

```csharp
// Có thể đang code thế này (SAI):
HostName = session.Reservation?.Host?.FullName
        ?? session.HostName
        ?? "",

// Phải là (ĐÚNG theo BR-13):
HostName = session.HostNavigation?.FullName      // staff từ HostId (AspNetUsers)
        ?? session.HostName
        ?? "",
```

Cùng endpoint `GET /pos/sessions/{id}`, cùng response schema, khác biệt duy nhất khi walk-in:

| Field | Walk-in session | Reservation session |
|---|---|---|
| `hostId` | `<staffId>` ✅ | `<staffId>` ✅ |
| `hostName` | `"Trinh"` ❌ (player) | `<staffName>` ✅ hoặc `<playerHostName>` (tuỳ cách map) |
| `reservationId` | `null` | `<uuid>` |

---

## Đề xuất fix

```csharp
// Trong MapSessionDto.cs — ActiveSession → ActiveSessionDto
public static ActiveSessionDto MapSessionDto(ActiveSession s)
{
    return new ActiveSessionDto
    {
        Id = s.Id,
        HostId = s.HostId,
        // BR-13: HostName = tên STAFF tạo session (audit), KHÔNG lấy từ Reservation.Host
        HostName = s.HostNavigation != null 
            ? s.HostNavigation.FullName 
            : null,
        CafeTableId = s.CafeTableId,
        TableName = s.CafeTable?.Name,
        ReservationId = s.ReservationId,
        LobbyId = s.LobbyId,
        Status = s.Status.ToString(),
        StartedAt = s.StartedAt,
        // ... các field khác
        Members = s.Members?.Select(MapSessionMemberDto).ToList() ?? new(),
    };
}
```

**Lưu ý quan trọng:** Với session tạo từ check-in reservation, `HostId` hiện tại đang lưu **staff thực hiện check-in** (không phải player host của reservation). Field `Reservation.HostName` chỉ nên hiển thị trong các luồng liên quan đến reservation (vd upcoming reservations), KHÔNG trong session detail.

---

## Câu hỏi cho BE

1. Trong DB, với session walk-in trên, bảng `ActiveSessions` cột `HostId` đang trỏ vào user nào? Là staff hay player?
2. Hàm `MapSessionDto` hiện đang map `HostName` từ đâu? Có include `Reservation.Host` không?
3. Có nên tách riêng 2 field: `staffHostName` (audit) và `reservationHostName` (player) để FE hiển thị đúng context?
4. ETA fix?

---

## Tóm tắt 1 dòng

> **Bug**: `GET /pos/sessions/{id}` trả `hostName` = tên khách (player) thay vì tên staff tạo session, vi phạm BR-13. Session walk-in hiển thị "Người phụ trách: Trinh" trong khi staff đang login là người khác. Cần BE fix `MapSessionDto` để map `HostName` từ `HostNavigation.FullName` (staff) thay vì `Reservation.Host.FullName` (player).
>
> Repro: tạo session walk-in cho khách "Trinh" → mở session detail → label "Người phụ trách" hiển thị "Trinh".

---

## Liên hệ

Nếu cần test trực tiếp hoặc cần FE debug thêm, ping qua channel này.

---

<!-- BEGIN:FE-VERIFICATION-STEPS -->
## Các bước FE kiểm tra sau khi BE fix

1. Tạo session walk-in mới cho 1 khách bất kỳ (vd "Khach Test").
2. Gọi `GET /pos/sessions/{id}` → verify `hostName` = tên staff đang login (không phải "Khach Test").
3. Mở POS session detail modal → verify "Người phụ trách" = tên staff.
4. Regression: tạo session từ reservation → verify `hostName` vẫn = staff check-in (không đổi behavior của luồng này).
<!-- END:FE-VERIFICATION-STEPS -->
