# 🐛 BUG REPORT — BE lobby-merge validate ghế không chặn khi tổng vượt capacity

| Field | Value |
|---|---|
| **Reported by** | FE team (Boardverse) |
| **Date** | 2026-10-01 |
| **Severity** | High (data integrity — có thể gây trạng thái phiên không hợp lệ) |
| **Affected feature** | Lobby Merge (POST /merge-requests) |
| **Affected endpoint** | `POST /api/cafes/{cafeId}/lobby-merge/merge-requests` |
| **Affected API doc** | `APIs/lobby-merge.md` § Validation |
| **Repro date** | 2026-10-01 |

---

## TL;DR

**Bug nghiêm trọng — cần BE xử lý:** Backend lobby-merge cho phép tạo yêu cầu ghép **khi tổng số người sau ghép vượt quá `seatCapacity` của bàn đích**, dù API doc có ghi "Ghế khả dụng đủ (AvailableSeats >= sourceActiveMembers)". FE không thể fix phía client vì rule dự án cấm mock / tự ý bypass backend.

**Case thực tế:** Bàn 7 đang có **4 người active** (đúng bằng `seatCount = 4` → đầy), ghép thêm **1 người** từ lobby khác → tổng sau ghép = **5 người**. Hệ thống vẫn cho phép tạo request thành công (HTTP 201), xuất hiện trong popup "Đang chờ" — trong khi bàn đích đã không còn ghế trống.

**Expected behavior:** BE phải reject request với HTTP 400/409 + error code `InsufficientSeatsForMerge`, message rõ ràng kiểu "Bàn đích không đủ ghế trống (5 người > 4 ghế)".

---

## 🎯 BE cần làm gì (action items)

### 1. Fix logic validation ở `POST /api/cafes/{cafeId}/lobby-merge/merge-requests`

Hiện tại API doc (`lobby-merge.md` § Validation) chỉ ghi: *"Ghế khả dụng đủ (AvailableSeats >= sourceActiveMembers)"* — nhưng BE đang **không enforce đúng** điều kiện này, hoặc đang check điều kiện khác mà không ngăn được case vượt ghế.

**Công thức đúng cần enforce ở cả `POST /merge-requests` (create) lẫn `POST /merge-requests/{id}/approve` (approve):**

```text
targetActiveMembers + sourceActiveMembers <= targetSeatCapacity
```

Trong đó:

- `targetActiveMembers` = số member active của lobby đích tại thời điểm validate.
- `sourceActiveMembers` = số member active của lobby nguồn (tức số người sẽ chuyển sang).
- `targetSeatCapacity` = `seatCount` của bàn đang chứa lobby đích (lấy từ `Lobby.seatCount` hoặc `CafeTable.seatCount` tương ứng).

**Lưu ý:** công thức trên tương đương `AvailableSeats >= sourceActiveMembers` (vì `AvailableSeats = targetSeatCapacity − targetActiveMembers`), nên nếu BE check đúng công thức hiện tại thì không thể xảy ra bug. Vì case thực tế bị lọt → BE **đang check sai** (vd: đảo dấu, check member count của source khác scope, hoặc bỏ qua validation).

### 2. Trả error code & message rõ ràng

Khi reject, trả về:

- **HTTP 400** hoặc **409** (theo chuẩn hiện tại của `lobby-merge.md` → `409 InsufficientSeatsForMerge`).
- **Error code:** `InsufficientSeatsForMerge`.
- **Message (tiếng Việt):** `Bàn đích không đủ ghế trống — đã có X người, chỉ còn Y ghế trống, không thể nhận thêm Z người.`
- **Kèm metadata** trong response (nếu có thể): `targetActiveMembers`, `targetSeatCapacity`, `availableSeats`, `requestedMembers` → giúp FE hiển thị toast chính xác.

### 3. Áp dụng cho cả create + approve

- Tại `POST /merge-requests` (create): validate **trước khi insert DB**.
- Tại `POST /merge-requests/{id}/approve` (approve): re-validate vì member có thể join/leave lobby đích giữa 2 thời điểm (BR-REQUIRED §17.4 đã có FOR UPDATE lock → có thể đã check, nhưng cần xác nhận lại logic cụ thể).

### 4. Verify với case thực tế "Bàn 7"

Sau khi fix, chạy lại repro step:

1. Session walk-in cho Bàn 7 (`seatCount = 4`).
2. Thêm 4 member active → lobby đích **đầy**.
3. Tạo merge request từ lobby khác (1 member) sang Bàn 7.
4. Submit → **kỳ vọng: HTTP 409 + `InsufficientSeatsForMerge`**, **không insert DB**.

---

FE có check `availableSeats` (`seatCount − activeMembers`) trước khi submit, nhưng nếu BE trả `seatCount` ở bàn đích không khớp với FE dự tính (hoặc staff chọn target qua dialog mà FE không thấy capacity), FE không chặn được.

---

## Repro steps

1. Đăng nhập POS với role Staff/Owner.
2. Tạo session walk-in cho Bàn 7 — bàn này theo schema có `seatCount = 4`.
3. Thêm 4 member active vào session đó.
4. Tạo 1 session khác ở bàn bất kỳ (lobby nguồn) có 1 member.
5. Tạo yêu cầu ghép: **source** = session nguồn, **target** = Bàn 7.
   - Chọn 1 member để chuyển.
6. Bấm submit.

**Kết quả thực tế:** Request được tạo thành công (HTTP 201), xuất hiện trong popup "Yêu cầu ghép lobby đang chờ".

**Kết quả kỳ vọng:** HTTP 400 / 409 với message "Bàn đích không đủ ghế trống" (5 người > 4 ghế).

---

## Căn cứ từ API doc

`APIs/lobby-merge.md` § Validation của `POST /merge-requests`:

> - Ghế khả dụng đủ (AvailableSeats >= sourceActiveMembers)
> - Member muốn ghép phải là IsActive = true trong Nguồn

**Diễn giải hiện tại của BE (theo case thực tế):**

- `AvailableSeats = seatCapacity − targetActiveMembers` (= 4 − 4 = 0)
- `sourceActiveMembers = 1`
- Check: `0 >= 1` → FALSE → lẽ ra phải reject.
- Nhưng BE lại cho phép tạo request → có thể BE tính ngược lại hoặc bỏ qua validation.

**Hoặc:** BE check đúng `AvailableSeats >= sourceActiveMembers` nhưng lại không check **`targetActiveMembers + sourceActiveMembers <= seatCapacity`** (= tổng sau ghép). Đây mới là điều kiện cần để tránh vượt ghế.

---

## Hệ quả

1. Request hợp lệ về mặt HTTP nhưng không hợp lệ về logic capacity.
2. Staff duyệt → BE reject tại approve? → staff nhận toast lỗi lúc duyệt, UX khó chịu. Hoặc BE vẫn duyệt → phiên bị vượt ghế, có thể gây lỗi inventory / billing khi EndGame.
3. Số liệu capacity trong báo cáo không khớp với thực tế.

---

## Đề xuất hướng xử lý (FE side — KHÔNG tự ý sửa)

> Theo rule dự án: FE không mock, không tự ý sửa logic backend. Đây là bug BE.

1. **BE fix logic validation ở `POST /merge-requests`:**
   - Check `targetActiveMembers + sourceActiveMembers <= targetSeatCapacity` (tổng sau ghép không vượt ghế).
   - Giữ nguyên check hiện tại `AvailableSeats >= sourceActiveMembers` (= `seatCapacity − targetActiveMembers >= sourceActiveMembers`, tương đương `targetActive + source <= seatCapacity`).
   - Trả về HTTP 400 với code rõ ràng (vd: `InsufficientSeats`) thay vì 409.

2. **FE tăng cường hint realtime (nice-to-have, không thay thế BE):**
   - Hiển thị "Tổng sau ghép: X/Y người" realtime trong dialog.
   - Nếu `seatCount = null` (không map được) → hiện banner cảnh báo "Không rõ số ghế — chỉ BE kiểm tra".
   - Hiện tại FE đã có (xem `lobby-merge-create-dialog.tsx` → `seatCheck` useMemo) — đang hoạt động đúng khi `seatCount` được truyền.

3. **Tracking:**
   - Bug này block việc staff tạo yêu cầu ghép chính xác — ưu tiên fix sớm.

---

## Trạng thái hiện tại của FE

- FE check `availableSeats` ở `handleSubmit` (lobby-merge-create-dialog.tsx:599-612).
- FE hiển thị hint realtime (lobby-merge-create-dialog.tsx:1229-1252) — đang hoạt động đúng khi `seatCount` được truyền.
- FE **không** bypass check khi `availableSeats = null` — chỉ tin tưởng BE.

Nếu sau khi BE fix, vui lòng update endpoint contract + đảm bảo `seatCapacity` / `fitsCapacity` được trả về đầy đủ trong response của `POST /merge-requests`.