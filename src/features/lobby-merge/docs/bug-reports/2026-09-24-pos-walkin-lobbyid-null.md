# 🐛 BUG REPORT — POS Session walk-in trả `lobbyId: null`

| Field | Value |
|---|---|
| **Reported by** | FE team (Boardverse) |
| **Date** | 2026-09-24 |
| **Severity** | Medium |
| **Affected feature** | Lobby Merge (tạo yêu cầu ghép lobby) |
| **Affected endpoint** | `GET /api/cafes/{cafeId}/pos/sessions/{sessionId}` |
| **Affected cafeId** | `a1aae9db-4f1b-44af-ac86-6038d085df94` |
| **Affected sessionId** | `43ab638b-744b-486c-9e56-3bb342870fac` |
| **Working reference (target)** | session+ `e721d504-fd39-4ec9-b406-2a914bdebaf9`, lobbyId `70c0e395-803e-496e-9424-4054ac220bdd` |

---

## TL;DR

Session POS được tạo bằng **walk-in** (staff bấm "Bắt đầu phiên" trực tiếp trong POS, không qua reservation) → BE trả `lobbyId: null` trong response của `GET /pos/sessions/{id}`. Hệ quả: FE không thể tạo `POST /lobby-merge/merge-requests` vì endpoint đó yêu cầu `lobbyId` thật của 2 lobby.

Session tạo bằng **check-in từ reservation** thì `lobbyId` đầy đủ → OK.

---

## Repro steps

1. Đăng nhập với role Staff/Owner, mở POS tại café `a1aae9db-4f1b-44af-ac86-6038d085df94`.
2. Chọn 1 bàn trống → bấm **"Bắt đầu phiên"** (walk-in, không qua reservation) → gán 1 board game → nhập khách → bấm xác nhận.
   - Kết quả: session `43ab638b-744b-486c-9e56-3bb342870fac` được tạo, có 1 member.
3. Tạo thêm 1 session khác từ reservation có sẵn (target).
   - Kết quả: session `e721d504-fd39-4ec9-b406-2a914bdebaf9` có lobbyId `70c0e395-803e-496e-9424-4054ac220bdd`.
4. Mở dialog **"Ghép nhóm lobby"** trong POS, chọn source = session walk-in, target = session reservation, chọn 1 member, bấm **Gửi**.

## Expected

FE gọi `POST /api/cafes/{cafeId}/lobby-merge/merge-requests` với payload:

```json
{
  "sourceLobbyId": "<uuid của lobby walk-in>",
  "targetLobbyId": "70c0e395-803e-496e-9424-4054ac220bdd",
  "reason": "...",
  "idempotencyKey": "..."
}
```

→ BE chấp nhận và tạo merge request.

## Actual

FE không bao giờ tới bước POST, vì FE resolve lobbyId qua `GET /pos/sessions/{sessionId}` và nhận `lobbyId: null`. FE block sớm với toast "Không tìm được lobbyId cho lobby nguồn" để khỏi spam BE với payload sai (đỡ phải xử lý 400/404 trả về).

---

## Evidence

### Request 1 — Session walk-in (BUG)

```http
GET /api/cafes/a1aae9db-4f1b-44af-ac86-6038d085df94/pos/sessions/43ab638b-744b-486c-9e56-3bb342870fac
```

Response (status `200 OK`, ~210ms):

```json
{
  "id": "43ab638b-744b-486c-9e56-3bb342870fac",
  "hostId": "<uuid>",
  "cafeTableId": "<uuid>",
  "tableName": "<tên bàn>",
  "lobbyId": null,          // ❌ BUG — kỳ vọng là UUID
  "reservationId": null,    // walk-in nên không có reservation → hợp lý
  "status": "Active",
  "startedAt": "2026-09-24T...",
  // ... 25 keys total (đầy đủ các field khác)
}
```

FE log xác nhận:

```
[lobby-merge] session detail payload {
  sessionId: '43ab638b-744b-486c-9e56-3bb342870fac',
  hasLobbyId: false,
  keys: Array(25),     // ← có field lobbyId, giá trị null
  lobbyId: null,
  reservationId: null,
  cafeTableId: '...',
  tableName: '...',
  hostId: '...',
  status: 'Active',
  startedAt: '...'
}
```

### Request 2 — Session từ reservation (OK)

```http
GET /api/cafes/a1aae9db-4f1b-44af-ac86-6038d085df94/pos/sessions/e721d504-fd39-4ec9-b406-2a914bdebaf9
```

Response (status `200 OK`):

```json
{
  "id": "e721d504-fd39-4ec9-b406-2a914bdebaf9",
  "lobbyId": "70c0e395-803e-496e-9424-4054ac220bdd",   // ✅ OK
  "reservationId": "<uuid reservation>",
  // ... cùng 25 keys
}
```

### FE log đầy đủ flow submit

```
[lobby-merge] handleSubmit start {hasResolveLobbyId: true, sourceLobbyId: '43ab638b-...', targetLobbyId: 'e721d504-...', memberCount: 1}
[lobby-merge] resolving lobbyIds {src: '43ab638b-...', tgt: 'e721d504-...'}
[lobby-merge] session detail payload {sessionId: 'e721d504-...', hasLobbyId: true, ...}     ← target OK
[lobby-merge] session detail payload {sessionId: '43ab638b-...', hasLobbyId: false, ...}    ← source BUG
[lobby-merge] resolved lobbyIds {srcLobby: null, tgtLobby: '70c0e395-...'}
[lobby-merge] BLOCKED: missing source lobbyId {                                       ← FE dừng ở đây
  sourceSessionId: '43ab638b-...',
  sourceLobbyIdReturned: null,
  hint: 'BE trả lobbyId=null cho session này — bug BE hoặc session walk-in không có lobby.'
}
```

---

## Phân tích nguyên nhân (FE hypothesis)

Cùng endpoint `GET /pos/sessions/{id}`, cùng response schema (25 keys), khác biệt duy nhất:

| Field | Source session (walk-in) | Target session (reservation) |
|---|---|---|
| `lobbyId` | `null` ❌ | `<uuid>` ✅ |
| `reservationId` | `null` | `<uuid>` ✅ |

→ Có thể logic BE:
- Khi staff check-in từ reservation → tạo `Lobby` record → gán `lobbyId` cho session
- Khi staff "Bắt đầu phiên" walk-in → **không tạo `Lobby` record** → `lobbyId` để null

Nếu giả thuyết đúng, có 2 cách fix (để BE chọn):

**Option A — Tạo lobby tự động cho walk-in session:**
- Khi `POST /pos/sessions/start` không truyền `reservationId` → BE tự tạo 1 `Lobby` mới (host = staff hoặc host mặc định), trả `lobbyId`.
- Pro: walk-in session vẫn có thể merge lobby như bình thường.
- Con: schema DB có thể cần `Lobby.sourceType = "walk-in"`.

**Option B — Trả 422 khi FE gọi lobby-merge với session walk-in:**
- BE trả error rõ ràng: "Session walk-in không thuộc lobby nào, không thể merge."
- Pro: ít thay đổi BE.
- Con: vẫn block 1 luồng nghiệp vụ quan trọng (POS staff muốn gộp khách walk-in vào lobby reservation đã có).

**Recommended: Option A** — vì về UX, walk-in và reservation về bản chất là 2 cách khác nhau để bắt đầu chơi, nhưng cùng cần 1 lobby để merge.

---

## Câu hỏi cho BE

1. Trong DB, session `43ab638b-...` có row trong bảng `Lobby` tương ứng không? Nếu có → tại sao response lại null?
2. Trong DB, session `e721d504-...` có row trong bảng `Lobby` không? Có FK giữa `PosSession.LobbyId` và `Lobby.Id` không?
3. Hàm `StartWalkInSession` / `StartSession` (handler cho `POST /pos/sessions/start` không có reservationId) có code nào tạo Lobby không?
4. Nếu Option A được chọn, có cần migration / thay đổi DB schema không?
5. ETA fix?

---

## Tóm tắt 1 dòng

> **Bug**: Session POS walk-in (`POST /pos/sessions/start` không có `reservationId`) trả `lobbyId: null` trong `GET /pos/sessions/{id}`. Cùng endpoint với session reservation thì trả lobbyId OK. Cần BE fix: tạo Lobby tự động cho walk-in session, hoặc trả 422 với message rõ ràng.
>
> Repro: cafeId `a1aae9db-4f1b-44af-ac86-6038d085df94`, sessionId `43ab638b-744b-486c-9e56-3bb342870fac`.

---

## Liên hệ

Nếu cần test trực tiếp hoặc cần FE debug thêm, ping qua channel này.

---

<!-- BEGIN:FE-TEMPORARY-WORKAROUND -->
## FE workaround tạm thời (chờ BE fix)

Hiện FE block dialog ngay khi phát hiện `lobbyId: null` (không POST lên BE). Khách muốn gộp khách walk-in vào lobby reservation → staff phải:
1. **Hủy session walk-in** trong POS.
2. Khách đặt bàn từ Lobby (reservation), staff **check-in** để có lobbyId.
3. Sau đó mới ghép được.

Đây là workaround nghiệp vụ, không phải fix kỹ thuật. Sẽ được bỏ khi BE fix Option A.
<!-- END:FE-TEMPORARY-WORKAROUND -->
