# 🐛 BUG REPORT — BE lobby-merge transfer nhầm hết active members thay vì đúng member được chọn

| Field | Value |
|---|---|
| **Reported by** | FE team (Boardverse) |
| **Date** | 2026-10-02 |
| **Severity** | High (data integrity — có thể chuyển nhầm người, sai data / sai state session) |
| **Affected feature** | Lobby Merge (POST /merge-requests) |
| **Affected endpoint** | `POST /api/cafes/{cafeId}/lobby-merge/merge-requests` |
| **Affected API doc** | `APIs/lobby-merge.md` § Request body |
| **Repro date** | 2026-10-02 |

---

## TL;DR

**Bug nghiêm trọng — cần BE xử lý:** Staff chọn 1 member để ghép, bấm "Gửi" → **BE tự ý chuyển TẤT CẢ member active của lobby nguồn** sang lobby đích (cụ thể case ghi nhận: chọn 2 → ghép 4). FE không thể fix phía client vì rule dự án cấm mock backend, và FE đã đúng theo API doc (body chỉ chứa `sourceLobbyId`/`targetLobbyId`/`reason`/`idempotencyKey`, **không có** `memberUserId`).

**Case thực tế:** Source lobby có 4 active members. Staff tick 2 member, bấm "Gửi" → cả 4 member đều được chuyển sang target lobby (không phải 2 như đã chọn).

**Expected behavior:** BE phải tạo đúng **1 merge request cho đúng 1 member** mà staff đã tick — không được loop qua tất cả active members của source lobby.

---

## FE đã làm đúng (phân tích)

Đọc `src/features/lobby-merge/components/lobby-merge-create-dialog.tsx`:

- Staff tick member qua UI → state `memberIds: string[]` lưu các `id` đã tick.
- Ở `handleSubmit` (line 568), `effectiveMemberIds` được filter theo `sourceLobbyId` hiện tại (đảm bảo bỏ tick "ma" — member thuộc lobby khác).
- Payload gửi lên BE (`createOne.mutate(...)`, line 715–731) chỉ chứa `sourceLobbyId`, `targetLobbyId`, `reason`, `idempotencyKey` — **không có `memberUserId`**.
- Service `LobbyMergeService.createMergeRequest` (`src/features/lobby-merge/services/lobby-merge.service.ts:79–105`) build body đúng theo API doc:

  ```ts
  const body: Record<string, unknown> = {
    sourceLobbyId,
    targetLobbyId,
  };
  if (payload.reason?.trim()) body.reason = payload.reason.trim();
  if (payload.idempotencyKey?.trim()) {
    body.idempotencyKey = payload.idempotencyKey.trim();
  }
  ```

→ **FE chỉ gửi 1 request duy nhất**, body đúng theo `APIs/lobby-merge.md` § Request. Không có cơ chế FE nào yêu cầu BE "loop qua tất cả active members".

**Vậy lỗi hoàn toàn thuộc BE:** BE đang nhận request 1 member nhưng tự động loop transfer toàn bộ source active members.

---

## Căn cứ từ API doc

`APIs/lobby-merge.md` § Request của `POST /merge-requests`:

```json
{
  "sourceLobbyId": "guid-nhom-a",
  "targetLobbyId": "guid-nhom-b",
  "reason": "Khách muốn chuyển sang nhóm bạn",
  "idempotencyKey": "MERGE-a3-user-id-1234567890"
}
```

**Quan sát quan trọng:**

1. **Body không có field `memberUserId` / `memberUserIds`** — nhưng `LobbyMergeRequest` entity (doc § LobbyMergeRequest entity) có field `MemberUserId` (Guid) — nghĩa là BE tự quyết member nào.
2. **Pattern `idempotencyKey`** gợi ý 1 key = 1 user: `MERGE-{memberId}-{timestampMs}`. FE đang generate key đúng pattern này → chứng minh contract là 1 member / 1 request.
3. **Response § `sourceMembersCount` vs `sourceActiveMembersAtRequest`** — BE đang trả 2 số liệu khác nhau → gợi ý BE phân biệt "tổng members source" và "active tại thời điểm request", nhưng đang transfer hết `sourceActiveMembersAtRequest` thay vì đúng member FE chọn.

---

## Repro steps

1. Đăng nhập POS với role Staff/Owner.
2. Tạo 2 session:
   - Lobby nguồn (A): có 4 member active.
   - Lobby đích (B): đang active.
3. Mở dialog "Ghép nhóm".
4. Chọn **Source** = A, **Target** = B.
5. Tick **đúng 2 member** trong danh sách member của A.
6. Bấm "Gửi 2 yêu cầu".

**Kết quả thực tế:** Sau khi staff duyệt, **cả 4 member** của A được chuyển sang B — không phải 2 như đã tick.

**Kết quả kỳ vọng:** Sau khi staff duyệt, chỉ **2 member đã tick** được chuyển sang B; 2 member còn lại vẫn ở A.

---

## Hệ quả

1. **Sai state khách hàng:** Khách không chọn chuyển nhóm nhưng bị chuyển → khiếu nại, trải nghiệm xấu.
2. **Sai business logic:** Member có thể chưa sẵn sàng chuyển (vd: đang đợi trả game, đang thanh toán riêng...) → ép chuyển gây lỗi billing/inventory.
3. **Khó audit** — khó trace "ai move member nào" vì BE không log mapping member nào do FE chọn vs member nào thực sự transfer.

---

## 🎯 BE cần làm gì (action items)

### 1. Fix logic transfer trong `LobbyMergeService.CreateAsync`

Hiện tại BE đang transfer **TẤT CẢ** active members của source lobby (theo `sourceActiveMembersAtRequest`), thay vì đúng member mà staff đã chọn ở FE.

**Cách 1 — Body phải có `memberUserId` (khuyến nghị, đúng contract 1 member = 1 request):**

BE cần update endpoint `POST /api/cafes/{cafeId}/lobby-merge/merge-requests` để nhận field `memberUserId` (Guid) trong body, và chỉ transfer đúng member đó:

```json
{
  "sourceLobbyId": "guid-nhom-a",
  "targetLobbyId": "guid-nhom-b",
  "memberUserId": "guid-user-cần-chuyển",   // ← mới
  "reason": "...",
  "idempotencyKey": "MERGE-{memberId}-{timestampMs}"
}
```

Sau khi update, BE transfer đúng member này (1 user), tạo 1 `LobbyMergeRequest` row với `MemberUserId = memberUserId`, set `LobbyMember.LobbyId` cho đúng 1 user đó (không loop).

**Cách 2 — Nếu BE muốn giữ contract cũ (body không có `memberUserId`):**

FE gửi N request riêng (mỗi request 1 member, idempotencyKey khác nhau) → BE xử lý 1 request = 1 member. Hiện tại FE đã làm đúng cách này rồi (xem `createBulkMergeRequests` ở `service.ts:254–288`), nhưng BE vẫn loop transfer toàn bộ → vẫn sai.

→ **Cách 1 là bắt buộc** — contract phải có `memberUserId` để BE biết "user nào" cần transfer.

### 2. Verify với case thực tế "ấn 1 → ghép 4"

Sau khi fix, chạy lại repro step:

1. Source lobby có 4 active members.
2. Staff tick **2 member** trong dialog FE.
3. Bấm "Gửi" → BE nhận 2 request (1 per member, idempotencyKey khác nhau).
4. Staff duyệt cả 2 → **kỳ vọng: đúng 2 member được chuyển**; 2 member còn lại vẫn ở source lobby.

### 3. Cập nhật API doc `APIs/lobby-merge.md`

- Thêm field `memberUserId` (Guid, required) vào § Request body của `POST /merge-requests`.
- Cập nhật § Entity `LobbyMergeRequest.MemberUserId` — đã có sẵn, chỉ rõ nó là required (không phải nullable).
- Cập nhật § Response — `membersTransferred` phải luôn = 1 (1 request = 1 member).

---

## Trạng thái hiện tại của FE

- FE đã đúng theo flow 1 member / 1 request (xem `lobby-merge-create-dialog.tsx:715-731` + `lobby-merge.service.ts:79-105`).
- FE không tự ý fix / bypass BE — tuân thủ rule "không mock backend".
- Khi BE update API, sẽ cập nhật:
  - `lobby-merge.service.ts` → thêm `memberUserId` vào `CreateMergeRequestPayload`.
  - `lobby-merge-create-dialog.tsx` → truyền `memberUserId: trimmedIds[0]` (single) hoặc loop cho bulk.
  - `lobby-merge.interface.ts` → thêm field tương ứng vào types.