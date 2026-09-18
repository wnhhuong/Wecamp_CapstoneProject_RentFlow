# RentFlow Backend API Specification

Phiên bản này chốt API theo UI hiện tại. `RentFlowERD.png` là source of truth cho tên field và quan hệ. Field join/derived được phép xuất hiện trong response nếu được ghi rõ trong `Description`; không cần thêm vào ERD.

## Quy ước chung

- Base path: `/api`.
- Role: `user`, `admin`; không có role `owner`.
- Response thành công: `{ "success": true, "data": ..., "message": null }`.
- Response lỗi: `{ "success": false, "data": null, "message": "...", "errors": [...] }`; `errors` là optional.
- GET list trả `data.items` và `data.pagination: { page, limit, totalItems, totalPages }`.
- GET list chỉ expose `search`, filter có tên rõ ràng, `page`, `limit`; không expose sorting. Backend tự trả thứ tự phù hợp UI.
- ID và JSON field dùng `camelCase`, giữ tên ID theo ERD: `roomID`, `userID`, `requestID`...
- Date-only gửi dạng `YYYY-MM-DD`; UI hiển thị `12 Sep 2026`.
- Timestamp gửi ISO 8601 UTC; UI hiển thị theo `Asia/Ho_Chi_Minh` (UTC+7).
- Tiền là integer VND, ví dụ `3200000`; UI hiển thị `₫ 3.200.000`.
- Ảnh/file là multipart khi upload; DB lưu relative path, API có thể trả relative path hoặc URL.
- `Required = Có` nghĩa là field luôn có trong input hoặc response. Field nullable được đánh dấu trong Type và có `Required = Không`.

---

# 1. Guest / Browse rooms

> **ERD note:** Không thiếu field lưu trữ. `propertyName`, `address` và thông tin liên hệ lấy từ `PARAMETER`.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|1|GET|`/api/guest/parameters`|Thông tin public của khu trọ|Guest header, room details|
|2|GET|`/api/guest/rooms`|Danh sách phòng public|Guest / Browse rooms|

## #1 — GET `/api/guest/parameters`

**Input/Params:** Không có.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`propertyName`|string|Có|`PARAMETER.propertyName`|
|`address`|string|Có|`PARAMETER.address`|
|`adminPhone`|string|Có|Số liên hệ owner/admin|
|`adminEmail`|string|Có|Email liên hệ|
|`adminFacebook`|string, nullable|Không|Facebook liên hệ|
|`adminZalo`|string, nullable|Không|Zalo liên hệ|

```json
{"success":true,"data":{"propertyName":"RentFlow Residence","address":"12 Nguyễn Trãi, Hà Nội","adminPhone":"0901234567","adminEmail":"owner@rentflow.vn","adminFacebook":null,"adminZalo":"0901234567"},"message":null}
```

## #2 — GET `/api/guest/rooms`

**Params** — backend mặc định ưu tiên `available now`, sau đó `available soon`.

|Field|Type|Required|Description|
|---|---|---|---|
|`search`|string|Không|Tìm theo `roomCode` hoặc `roomDetail`|
|`areaID`|integer|Không|Lọc khu vực|
|`status`|enum|Không|`available now`, `available soon`|
|`maxPeople`|integer|Không|Lọc sức chứa tối thiểu|
|`page`|integer|Không|Mặc định `1`|
|`limit`|integer|Không|Mặc định `12`, tối đa `100`|

**Output item**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer|Có|`ROOM.roomID`|
|`roomCode`|string|Có|`ROOM.roomCode`|
|`areaID`|integer|Có|`ROOM.areaID`|
|`areaName`|string|Có|Join `AREA`|
|`status`|enum|Có|ERD room status|
|`floor`|integer|Có|`ROOM.floor`|
|`maxPeople`|integer|Có|`ROOM.maxPeople`|
|`price`|integer|Có|`ROOM.price`|
|`availableFrom`|date-only, nullable|Không|Chỉ cần cho `available soon`|
|`coverImage`|string, nullable|Không|Ảnh đầu trong `ROOM.images`|

```json
{"success":true,"data":{"items":[{"roomID":101,"roomCode":"A-101","areaID":1,"areaName":"Building A","status":"available now","floor":1,"maxPeople":2,"price":3200000,"availableFrom":null,"coverImage":"uploads/rooms/101-1.jpg"}],"pagination":{"page":1,"limit":12,"totalItems":1,"totalPages":1}},"message":null}
```

---

# 2. Guest / Room details

> **ERD note:** Không thiếu field lưu trữ. Các trường dịch vụ cố định đọc từ `PARAMETER`.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|3|GET|`/api/guest/rooms/:roomID`|Chi tiết phòng trong popup|Guest / Room details|

## #3 — GET `/api/guest/rooms/:roomID`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer (path)|Có|Phòng cần xem|

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer|Có|`ROOM.roomID`|
|`roomCode`|string|Có|`ROOM.roomCode`|
|`areaID`|integer|Có|`ROOM.areaID`|
|`areaName`|string|Có|Join `AREA`|
|`status`|enum|Có|ERD room status|
|`floor`|integer|Có|`ROOM.floor`|
|`maxPeople`|integer|Có|`ROOM.maxPeople`|
|`roomDetail`|string|Có|`ROOM.roomDetail`|
|`price`|integer|Có|Tiền thuê tháng|
|`deposit`|integer|Có|`ROOM.deposit`|
|`availableFrom`|date-only, nullable|Không|Ngày có thể thuê|
|`images`|string[]|Có|`ROOM.images`|
|`contact`|object|Có|Phone/email/Facebook/Zalo từ `PARAMETER`|

```json
{"success":true,"data":{"roomID":101,"roomCode":"A-101","areaID":1,"areaName":"Building A","status":"available now","floor":1,"maxPeople":2,"roomDetail":"Bright corner room","price":3200000,"deposit":3200000,"availableFrom":"2026-09-20","images":["uploads/rooms/101-1.jpg"],"contact":{"adminPhone":"0901234567","adminEmail":"owner@rentflow.vn","adminFacebook":null,"adminZalo":"0901234567"}},"message":null}
```

---

# 3. Tenant / Home

> **ERD note:** Không thiếu field lưu trữ. `isOverdue`, breakdown và summary đều là derived/composed response.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|4|GET|`/api/user/dashboard`|Toàn bộ dữ liệu trang Home|Tenant / Home|

## #4 — GET `/api/user/dashboard`

**Input/Params:** Không có; user/room lấy từ token.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`currentInvoice`|object, nullable|Không|Invoice tháng hiện tại; null nếu chưa tạo|
|`currentInvoice.invoiceID`|integer|Không|`INVOICE.invoiceID`|
|`currentInvoice.totalBill`|integer|Không|`INVOICE.totalBill`|
|`currentInvoice.status`|enum|Không|`not_paid`, `pending`, `paid`|
|`currentInvoice.isOverdue`|boolean|Không|`dueDate < today` và chưa `paid`|
|`currentInvoice.dueDate`|date-only|Không|`INVOICE.dueDate`|
|`currentInvoice.breakdown`|object|Không|Các field bill trong `INVOICE`|
|`electricityReminder`|object|Có|Trạng thái kỳ ghi điện hiện tại|
|`electricityReminder.state`|enum|Có|`not_due`, `due_not_uploaded`, `submitted`|
|`electricityReminder.startDate`|date-only|Có|Parameter meter reading start|
|`electricityReminder.endDate`|date-only|Có|Parameter meter reading end|
|`activeTickets`|array|Có|Ticket có status khác `done`|
|`pendingRequests`|array|Có|Request có status `pending`|

```json
{"success":true,"data":{"currentInvoice":{"invoiceID":9001,"totalBill":4093000,"status":"not_paid","isOverdue":false,"dueDate":"2026-10-10","breakdown":{"roomBill":3200000,"electricalBill":518000,"waterBill":125000,"wifiBill":100000,"parkingBill":150000,"otherBill":0}},"electricityReminder":{"state":"due_not_uploaded","startDate":"2026-09-25","endDate":"2026-09-28"},"activeTickets":[],"pendingRequests":[]},"message":null}
```

---

# 4. Tenant / Electricity

> **ERD note:** Dùng canonical fields của `CONSUMP_REQUEST`: API `image`, `reading`, `capturedAt`. Không có previous reading và không có AI extraction.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|5|GET|`/api/user/consumption-requests/context`|Dữ liệu form và kỳ ghi điện|Tenant / Electricity step 1–2|
|6|POST|`/api/user/consumption-requests`|Gửi chỉ số điện|Tenant / Electricity step 2–3|
|7|GET|`/api/user/consumption-requests/:requestID`|Xem request vừa gửi|Tenant / Electricity step 4|

## #5 — GET `/api/user/consumption-requests/context`

**Input/Params:** Không có.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer|Có|Room của account|
|`roomCode`|string|Có|Join `ROOM`|
|`windowStart`|date-only|Có|Parameter|
|`windowEnd`|date-only|Có|Parameter|
|`canSubmit`|boolean|Có|Đang trong kỳ và chưa có request kỳ này|
|`electricityUnitPrice`|integer|Có|Parameter|
|`existingRequestID`|integer, nullable|Không|Request kỳ hiện tại nếu đã gửi|

```json
{"success":true,"data":{"roomID":101,"roomCode":"A-101","windowStart":"2026-09-25","windowEnd":"2026-09-28","canSubmit":true,"electricityUnitPrice":3500,"existingRequestID":null},"message":null}
```

## #6 — POST `/api/user/consumption-requests`

**Input — multipart/form-data**

|Field|Type|Required|Description|
|---|---|---|---|
|`image`|file|Có|Ảnh đồng hồ điện|
|`reading`|integer|Có|Chỉ số user nhập, `>= 0`|
|`capturedAt`|timestamp|Có|Thời điểm ảnh được upload/captured|

**Payload mẫu**

```json
{"image":"<file>","reading":148,"capturedAt":"2026-09-28T08:10:00Z"}
```

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|Request mới|
|`type`|enum|Có|`CONSUMP_REQUEST`|
|`image`|string|Có|Path ảnh đã lưu|
|`reading`|integer|Có|Reading đã gửi|
|`previousReading`|integer|Có|Reading trước đó|
|`usage`|integer|Có|Hiệu số sử dụng|
|`capturedAt`|timestamp|Có|Thời điểm ghi|
|`correspondingCost`|integer|Có|`reading × electricityUnitPrice`|
|`status`|enum|Có|`pending`|

## #7 — GET `/api/user/consumption-requests/:requestID`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer (path)|Có|Request cần xem|

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|Request cần xem|
|`type`|enum|Có|`CONSUMP_REQUEST`|
|`image`|string|Có|Path ảnh đã lưu|
|`reading`|integer|Có|Reading user đã gửi|
|`previousReading`|integer|Có|Reading trước đó|
|`usage`|integer|Có|Hiệu số sử dụng|
|`capturedAt`|timestamp|Có|Thời điểm ghi|
|`correspondingCost`|integer|Có|`consumpAmount(tự tính dựa trên reading này và reading gần nhất) × electricityUnitPrice`|
|`createDate`|date-only|Có|`REQUEST.createDate`|
|`resolveDate`|date-only, nullable|Không|`REQUEST.resolveDate`|
|`status`|enum|Có|Request status|

---

# 5. Tenant / Invoices

> **ERD note:** Dùng `INVOICE.isRequestLate`. Electricity chỉ có `meterReading`; `electricalBill = consumpAmount (tự tính) × electricityUnitPrice`.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|8|GET|`/api/user/invoices`|Danh sách invoice|Tenant / Invoices|
|9|GET|`/api/user/invoices/:invoiceID`|Chi tiết invoice|Tenant / Invoice details|
|10|POST|`/api/user/invoices/:invoiceID/paid-request`|Thông báo đã trả tiền|Tenant / Invoice details|
|11|POST|`/api/user/invoices/:invoiceID/late-payment-request`|Xin trả trễ|Tenant / Invoice details|

## #8 — GET `/api/user/invoices`

**Params** — backend mặc định invoice mới nhất trước.

|Field|Type|Required|Description|
|---|---|---|---|
|`search`|string|Không|Tìm theo displayID|
|`status`|enum|Không|`not_paid`, `pending`, `paid`|
|`year`|integer|Không|Lọc năm|
|`page`|integer|Không|Mặc định `1`|
|`limit`|integer|Không|Mặc định `12`, tối đa `100`|

**Output item**

|Field|Type|Required|Description|
|---|---|---|---|
|`invoiceID`|integer|Có|`INVOICE.invoiceID`|
|`displayID`|string|Có|`roomcode-ddmmyy` ddmmyy - createdDate|
|`createDate`|timestamp|Có|`INVOICE.createDate`|
|`dueDate`|date-only|Có|`INVOICE.dueDate`|
|`totalBill`|integer|Có|`INVOICE.totalBill`|
|`status`|enum|Có|ERD status|
|`isOverdue`|boolean|Có|Derived|
|`isRequestLate`|boolean|Có|`INVOICE.isRequestLate`|

## #9 — GET `/api/user/invoices/:invoiceID`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`invoiceID`|integer (path)|Có|Invoice cần xem|

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`invoiceID`|integer|Có|ERD|
|`displayID`|string|Có|`roomcode-ddmmyy` ddmmyy - createdDate|
|`roomCode`|string|Có|Join room qua consumption|
|`createDate`|timestamp|Có|ERD|
|`paymentDate`|timestamp, nullable|Không|ERD|
|`dueDate`|date-only|Có|ERD|
|`status`|enum|Có|ERD|
|`isOverdue`|boolean|Có|Derived|
|`isRequestLate`|boolean|Có|ERD|
|`meterReading`|integer|Có|Join `CONSUMPTION.meterReading` — chỉ số công tơ tích luỹ|
|`lastReading`|integer|Có|Chỉ số của lần đọc liền trước cùng phòng, kỳ đầu tiên = 0|
|`usage`|integer|Có|`meterReading - lastReading` — số kWh đã dùng trong kỳ|
|`unitPrice`|integer|Có|Đơn giá điện suy ngược `electricalBill / usage`, = 0 khi `usage <= 0`|
|`breakdown`|object|Có|room/electrical/water/wifi/parking/other bill|
|`totalBill`|integer|Có|ERD|

```json
{"success":true,"data":{"invoiceID":9001,"roomCode":"A-101","createDate":"2026-09-29T01:20:00Z","paymentDate":null,"dueDate":"2026-10-10","status":"not_paid","isOverdue":false,"isRequestLate":false,"meterReading":148,"lastReading":6,"usage":142,"unitPrice":3500,"breakdown":{"roomBill":3200000,"electricalBill":518000,"waterBill":125000,"wifiBill":100000,"parkingBill":150000,"otherBill":0},"totalBill":4093000},"message":null}
```

## #10 — POST `/api/user/invoices/:invoiceID/paid-request`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`invoiceID`|integer (path)|Có|Invoice tenant vừa thanh toán|

Không có body.

**Payload mẫu:** `{}`

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|Request mới|
|`invoiceID`|integer|Có|Invoice liên quan|
|`type`|enum|Có|`PAID_REQUEST`|
|`createDate`|date-only|Có|Ngày tạo|
|`status`|enum|Có|`pending`|

```json
{"success":true,"data":{"requestID":701,"invoiceID":9001,"type":"PAID_REQUEST","createDate":"2026-09-30","status":"pending"},"message":null}
```

## #11 — POST `/api/user/invoices/:invoiceID/late-payment-request`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`invoiceID`|integer (path)|Có|Invoice xin trả trễ|

Không có body. Backend chỉ tạo request `pending`; `INVOICE.isRequestLate` được set khi admin approve (#40).

**Payload mẫu:** `{}`

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|Request mới|
|`invoiceID`|integer|Có|Invoice liên quan|
|`type`|enum|Có|`LATE_PAYMENT_REQUEST`|
|`createDate`|date-only|Có|Ngày tạo|
|`status`|enum|Có|`pending`|

---

# 6. Tenant / Tickets

> **ERD note:** `TICKET.type` không bắt buộc thêm nếu backend derive `REPAIR`/`COMPLAIN` từ bảng con. `ticketName` nên được backend sinh để UI và dữ liệu nhất quán.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|12|GET|`/api/user/tickets`|Danh sách ticket của tenant|Tenant / Tickets|
|13|GET|`/api/user/tickets/repairs/options`|Facility của phòng để tạo repair|Create repair|
|14|GET|`/api/user/tickets/complains/options`|Area và room để tạo complaint|Create complaint|
|15|POST|`/api/user/tickets/repairs`|Tạo repair ticket|Create repair|
|16|POST|`/api/user/tickets/complains`|Tạo complaint ticket|Create complaint|

## #12 — GET `/api/user/tickets`

**Params** — backend mặc định ticket mới nhất trước.

|Field|Type|Required|Description|
|---|---|---|---|
|`search`|string|Không|Tìm theo ticket ID, name hoặc description|
|`status`|enum|Không|`need_action`, `in_progress`, `done`|
|`type`|enum|Không|`REPAIR`, `COMPLAIN`|
|`page`|integer|Không|Mặc định `1`|
|`limit`|integer|Không|Mặc định `12`, tối đa `100`|

**Output item**

|Field|Type|Required|Description|
|---|---|---|---|
|`ticketID`|integer|Có|`TICKET.ticketID`|
|`type`|enum|Có|Derived từ bảng con|
|`ticketName`|string|Có|`TICKET.ticketName`|
|`description`|string|Có|Child description|
|`location`|string|Có|Facility hoặc area/room label|
|`createDate`|date-only|Có|ERD|
|`resolveDate`|date-only, nullable|Không|ERD|
|`status`|enum|Có|ERD|

## #13 — GET `/api/user/tickets/repairs/options`

**Input/Params:** Không có; room lấy từ token.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer|Có|Room hiện tại|
|`roomCode`|string|Có|Join ROOM|
|`facilities`|array|Có|Danh sách `{ facilityID, typeID, typeName }` của room|

## #14 — GET `/api/user/tickets/complains/options`

**Input/Params:** Không có.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`areas`|array|Có|Area có thể chọn|
|`areas[].areaID`|integer|Có|`AREA.areaID`|
|`areas[].areaName`|string|Có|`AREA.areaName`|
|`areas[].rooms`|array|Có|Room thuộc area|
|`areas[].rooms[].roomID`|integer|Có|`ROOM.roomID`|
|`areas[].rooms[].roomCode`|string|Có|`ROOM.roomCode`|

## #15 — POST `/api/user/tickets/repairs`

**Input — multipart/form-data**

|Field|Type|Required|Description|
|---|---|---|---|
|`facilityID`|integer|Có|Facility thuộc phòng tenant|
|`description`|string|Có|Nội dung repair|
|`image`|file|Có|Ảnh facility cần sửa|

**Payload mẫu**

```json
{"facilityID":18,"description":"Bathroom tap is leaking","facilityImage":"<file>"}
```

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`ticketID`|integer|Có|Ticket mới|
|`type`|enum|Có|`REPAIR`|
|`ticketName`|string|Có|Backend sinh DisplayID|
|`roomID`|integer|Có|Room của tenant|
|`facilityID`|integer|Có|Facility được chọn|
|`description`|string|Có|Nội dung repair|
|`facilityImage`|string|Có|Path ảnh đã lưu|
|`createDate`|date-only|Có|Ngày tạo|
|`status`|enum|Có|`need_action`|

## #16 — POST `/api/user/tickets/complains`

**Input — JSON**

|Field|Type|Required|Description|
|---|---|---|---|
|`areaID`|integer|Có|Area được chọn|
|`roomID`|integer, nullable|Không|Room optional thuộc area|
|`description`|string|Có|Nội dung complaint|

```json
{"areaID":2,"roomID":204,"description":"Noise after 23:00"}
```

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`ticketID`|integer|Có|Ticket mới|
|`type`|enum|Có|`COMPLAIN`|
|`ticketName`|string|Có|displayID do Backend sinh|
|`areaID`|integer|Có|Area được chọn|
|`roomID`|integer, nullable|Không|Room optional|
|`description`|string|Có|Nội dung complaint|
|`createDate`|date-only|Có|Ngày tạo|
|`status`|enum|Có|`need_action`|

---

# 7. Tenant / Profile & Lease

> **ERD note:** Cần bổ sung `CONTRACT.signedAt DATETIME` để hiển thị thời điểm ký. `CONTRACT.signature` lưu path ảnh chữ ký; không lưu cả contract document. -> Đã thêm

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|17|GET|`/api/user/profile`|Personal details|Tenant / Profile & Lease|
|~~18~~|~~PATCH~~|~~`/api/user/profile`~~|~~Tenant sửa personal details~~|~~Edit profile~~|
|19|GET|`/api/user/contract`|Active lease|Tenant / Profile & Lease|
|20|GET|`/api/user/contract/signature`|Xem chữ ký đã lưu|View signature|
|21|POST|`/api/user/moveout-requests`|Gửi notice ngày dự kiến rời đi|Request flow|
|22|POST|`/api/user/checkout-requests`|Gửi reading/ảnh ngày checkout|Request flow|
|23|POST|`/api/user/extend-requests`|Xin gia hạn hợp đồng|Request flow|
|24|GET|`/api/user/requests`|Danh sách 6 loại request|Tenant / Requests|

## #17 — GET `/api/user/profile`

**Input/Params:** Không có.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`userID`|integer|Có|`USER.userID`|
|`fullName`|string|Có|`USER.fullName`|
|`dob`|date-only|Có|`USER.DoB`|
|`phoneNumber`|string|Có|`USER.phoneNumber`|
|`identityNo`|string|Có|`USER.identityNo`|
|`sex`|enum|Có|`male`, `female`, `other`|
|`nationality`|string|Có|`USER.nationality`|
|`por`|string|Có|`USER.PoR`|

## #18 — PATCH `/api/user/profile` BỎ CÁI NÀY
<!-- 
**Input — JSON**

|Field|Type|Required|Description|
|---|---|---|---|
|`fullName`|string|Có|Họ tên|
|`dob`|date-only|Có|Ngày sinh|
|`phoneNumber`|string|Có|Số điện thoại|
|`identityNo`|string|Có|Số CCCD|
|`sex`|enum|Có|`male`, `female`, `other`|
|`nationality`|string|Có|Quốc tịch|
|`por`|string|Có|Place of residence (`USER.PoR`)|

**Payload mẫu**

```json
{"fullName":"Nguyễn Văn An","dob":"2002-06-14","phoneNumber":"0901234567","identityNo":"001202000001","sex":"male","nationality":"Vietnamese","por":"Hà Nội"}
```

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`userID`|integer|Có|User đã cập nhật|
|`fullName`|string|Có|Họ tên|
|`dob`|date-only|Có|Ngày sinh|
|`phoneNumber`|string|Có|Số điện thoại|
|`identityNo`|string|Có|Số CCCD|
|`sex`|enum|Có|`male`, `female`, `other`|
|`nationality`|string|Có|Quốc tịch|
|`por`|string|Có|Place of residence| -->

## #19 — GET `/api/user/contract`

**Input/Params:** Không có.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`contractID`|integer|Có|ERD|
|`startDate`|date-only|Có|ERD|
|`expireDate`|date-only|Có|ERD|
|`propertyDeposit`|integer|Có|ERD|
|`rent`|integer|Có|`CONTRACT.rent` — giá thuê snapshot lúc ký, dùng để tính `roomBill`; không đổi khi `ROOM.price` đổi sau này|
|`status`|enum|Có|`active`, `expired`|
|`room`|object|Có|`roomID`, `roomCode`, `areaName`, `floor`, `price` (giá niêm yết hiện tại, chỉ để tham khảo)|
|`tenant`|object|Có|`userID`, `fullName`|
|`electricityUnitPrice`|integer|Có|Parameter|
|`monthlyServices`|object|Có|Các phí cố định từ Parameter|

## #20 — GET `/api/user/contract/signature`

**Input/Params:** Không có.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`contractID`|integer|Có|Active contract|
|`signature`|string|Có|Path/URL ảnh PNG|
|`signedAt`|timestamp|Có|Field ERD cần bổ sung|

## #21 — POST `/api/user/moveout-requests`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestMoveoutDate`|date-only|Có|Ngày tenant dự kiến rời đi|

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|Request mới|
|`type`|enum|Có|`MOVEOUT_REQUEST`|
|`contractID`|integer|Có|Active contract|
|`requestMoveoutDate`|date-only|Có|Ngày dự kiến rời đi|
|`createDate`|date-only|Có|Ngày tạo|
|`status`|enum|Có|`pending`|

```json
{"requestMoveoutDate":"2026-11-30"}
```

## #22 — POST `/api/user/checkout-requests`

**Input — multipart/form-data**

|Field|Type|Required|Description|
|---|---|---|---|
|`finalImage`|file|Có|Ảnh đồng hồ điện cuối cùng|
|`finalReading`|integer|Có|Chỉ số cuối, `>= 0`|

**Payload mẫu**

```json
{"finalImage":"<file>","finalReading":162}
```

Chỉ cho gửi khi MOVEOUT_REQUEST đã approved; ngày rời đi derive từ request đó.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|Request mới|
|`type`|enum|Có|`CHECKOUT_REQUEST`|
|`contractID`|integer|Có|Active contract|
|`finalImage`|string|Có|Path ảnh đã lưu|
|`finalReading`|integer|Có|Chỉ số cuối|
|`createDate`|date-only|Có|Ngày tạo|
|`status`|enum|Có|`pending`|

## #23 — POST `/api/user/extend-requests`

**Input:** Không có body.

**Payload mẫu:** `{}`

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|Request mới|
|`type`|enum|Có|`EXTEND_REQUEST`|
|`contractID`|integer|Có|Active contract|
|`yearToExtend`|integer|Có|Derived từ `PARAMETER`|
|`createDate`|date-only|Có|Ngày tạo|
|`status`|enum|Có|`pending`|

## #24 — GET `/api/user/requests`

**Params** — backend mặc định request mới nhất trước.

|Field|Type|Required|Description|
|---|---|---|---|
|`search`|string|Không|Tìm theo request ID hoặc related ID|
|`type`|enum|Không|Một trong 6 request types|
|`status`|enum|Không|`pending`, `approved`|
|`page`|integer|Không|Mặc định `1`|
|`limit`|integer|Không|Mặc định `12`, tối đa `100`|

**Output item**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|`REQUEST.requestID`|
|`type`|enum|Có|Một trong 6 request types|
|`createDate`|date-only|Có|ERD|
|`resolveDate`|date-only, nullable|Không|ERD|
|`status`|enum|Có|ERD|
|`summary`|string|Có|Label composed từ child request|

---

# 8. Admin / Dashboard

> **ERD note:** Không thiếu field lưu trữ; toàn bộ count và occupancy là aggregate/derived.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|25|GET|`/api/admin/dashboard`|Room/payment summary và work queues|Admin / Dashboard|

## #25 — GET `/api/admin/dashboard`

**Input/Params:** Không có.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomSummary`|object|Có|Count `availableNow`, `rented`, `availableSoon`, `notAvailable`, `total`|
|`roomSummary.occupancyRate`|number|Có|`rented / total × 100`|
|`paymentSummary`|object|Có|Count `paid`, `notPaid`, `overdue`|
|`requestsNeedingApproval`|array|Có|Request pending mới nhất|
|`ticketsNeedingAction`|array|Có|Ticket `need_action` mới nhất|

```json
{"success":true,"data":{"roomSummary":{"availableNow":8,"rented":31,"availableSoon":3,"notAvailable":2,"total":44,"occupancyRate":70.5},"paymentSummary":{"paid":28,"notPaid":9,"overdue":3},"requestsNeedingApproval":[],"ticketsNeedingAction":[]},"message":null}
```

---

# 9. Admin / Rooms & Leases

> **ERD note:** `stillOwed` là aggregate từ invoice (tổng mấy invoice not paid), không thêm vào ROOM. Reset room account là nghiệp vụ trên `ACCOUNT`, không cần field mới. Cần bổ sung `CONTRACT.rent INTEGER` — snapshot giá thuê tại thời điểm ký, độc lập với `ROOM.price`; đổi `ROOM.price` sau này không hồi tố các contract đang chạy. -> Đã cập nhật

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|26|GET|`/api/admin/areas/options`|Area options cho form/filter|Rooms & Leases|
|27|GET|`/api/admin/rooms`|Danh sách room/lease|Rooms & Leases|
|28|GET|`/api/admin/rooms/:roomID`|Room, active lease, tenant, account|Details drawer|
|28b|PATCH|`/api/admin/rooms/:roomID`|Update ROOM in4|Details drawer|
|29|POST|`/api/admin/rooms`|Thêm phòng|Add room popup|
|~~30~~|~~PATCH~~|~~`/api/admin/rooms/:roomID/account/reset`~~|~~Reset room account~~|~~Details drawer~~|
|31|PATCH|`/api/admin/rooms/:roomID/account/password`|Admin đặt mật khẩu mới|Details drawer|
|~~32~~|~~PATCH~~|~~`/api/admin/rooms/:roomID/contract/rent`~~|~~Sửa rent snapshot của active contract~~|~~Details drawer~~|

## #26 — GET `/api/admin/areas/options`

**Input/Params:** Không có.

**Output item**

|Field|Type|Required|Description|
|---|---|---|---|
|`areaID`|integer|Có|`AREA.areaID`|
|`areaName`|string|Có|`AREA.areaName`|

## #27 — GET `/api/admin/rooms`

**Params**

|Field|Type|Required|Description|
|---|---|---|---|
|`search`|string|Không|Tìm roomCode, tenant name, username|
|`areaID`|integer|Không|Lọc area|
|`status`|enum|Không|ERD room status|
|`maxPeople`|integer|Không|Lọc đúng sức chứa UI đã chọn|
|`owed`|enum|Không|`owed`, `not_owed`|
|`page`|integer|Không|Mặc định `1`|
|`limit`|integer|Không|Mặc định `12`, tối đa `100`|

**Output item**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer|Có|`ROOM.roomID`|
|`roomCode`|string|Có|`ROOM.roomCode`|
|`areaName`|string|Có|Join AREA|
|`floor`|integer|Có|ERD|
|`price`|integer|Có|ERD|
|`maxPeople`|integer|Có|ERD|
|`status`|enum|Có|ERD room status|
|`electricityState`|enum|Có|Derived: `checked`, `waiting_admin`, `late`, `not_applicable`|
|`tenantName`|string, nullable|Không|Active contract → USER|
|`contractExpireDate`|date-only, nullable|Không|Active contract|
|`stillOwed`|integer|Có|Tổng invoice chưa trả|

## #28 — GET `/api/admin/rooms/:roomID`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer (path)|Có|Room cần xem|

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`room`|object|Có|Tất cả ROOM fields, gồm `images`|
|`area`|object|Có|`areaID`, `areaName`|
|`activeContract`|object, nullable|Không|Tất cả CONTRACT fields, gồm `rent` (snapshot, khác `room.price`)|
|`tenant`|object, nullable|Không|Tất cả USER fields của main tenant|
|`account`|object, nullable|Không|`accountID`, `username`, `status`, `role`, `startDate`|
|`stillOwed`|integer|Có|Tổng invoice chưa trả|

## #28b — PATCH `/api/admin/rooms/:roomID`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer (path)|Có|Room cần sửa|
|`price`|integer|Không|Giá phòng mới; không truyền thì giữ nguyên|
|`deposit`|integer|Không|Tiền deposit mới; không truyền thì giữ nguyên|
|`images`|array[string]|Không|Danh sách URL/path ảnh mới của phòng; không truyền thì giữ nguyên|

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`room`|object|Có|Thông tin ROOM sau khi cập nhật, gồm `price`, `deposit`, `images`|
|`message`|string|Có|Thông báo cập nhật thành công|

**Example Request**

```json
{
  "price": 3500000,
  "deposit": 7000000,
  "images": [
    "/uploads/rooms/101-1.jpg",
    "/uploads/rooms/101-2.jpg",
    "/uploads/rooms/101-3.jpg"
  ]
}
```

**Example Response**

```json
{
  "success": true,
  "data": {
    "room": {
      "roomID": 101,
      "roomCode": "A101",
      "price": 3500000,
      "deposit": 7000000,
      "images": [
        "/uploads/rooms/101-1.jpg",
        "/uploads/rooms/101-2.jpg",
        "/uploads/rooms/101-3.jpg"
      ]
    }
  },
  "message": null
}
```

## #29 — POST `/api/admin/rooms`

**Input — multipart/form-data**

|Field|Type|Required|Description|
|---|---|---|---|
|`areaID`|integer|Có|Area có sẵn|
|`roomCode`|string|Có|Unique|
|`floor`|integer|Có|Tầng|
|`maxPeople`|integer|Có|Sức chứa|
|`roomDetail`|string|Có|Mô tả|
|`price`|integer|Có|Tiền thuê|
|`deposit`|integer|Có|Tiền cọc|
|`status`|enum|Có|ERD room status|
|`availableFrom`|date-only, nullable|Không|Dùng cho available soon|
|`images`|file[]|Có|Tối đa 4 ảnh|

**Payload mẫu**

```json
{"areaID":1,"roomCode":"A-105","floor":1,"maxPeople":2,"roomDetail":"Bright corner room","price":3200000,"deposit":3200000,"status":"available now","availableFrom":null,"images":["<file>"]}
```

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer|Có|Room mới|
|`areaID`|integer|Có|Area đã chọn|
|`roomCode`|string|Có|Code unique|
|`floor`|integer|Có|Tầng|
|`maxPeople`|integer|Có|Sức chứa|
|`roomDetail`|string|Có|Mô tả|
|`price`|integer|Có|Tiền thuê|
|`deposit`|integer|Có|Tiền cọc|
|`status`|enum|Có|ERD status|
|`availableFrom`|date-only, nullable|Không|Ngày available|
|`images`|string[]|Có|Path ảnh đã lưu|

## #30 — PATCH `/api/admin/rooms/:roomID/account/reset` - BỎ CÁI NÀY
<!-- 
**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer (path)|Có|Room account cần reset|

Không có body.

**Payload mẫu:** `{}`

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`accountID`|integer|Có|Room account|
|`roomID`|integer|Có|Room liên quan|
|`username`|string|Có|Username được giữ/tạo lại|
|`temporaryPassword`|string|Có|Chỉ trả một lần|
|`status`|enum|Có|Account status sau reset| -->

## #31 — PATCH `/api/admin/rooms/:roomID/account/password`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer (path)|Có|Room account|
|`newPassword`|string|Có|Mật khẩu mới; backend hash trước khi lưu|

```json
{"newPassword":"new-temporary-password"}
```

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`accountID`|integer|Có|Account đã đổi password|
|`roomID`|integer|Có|Room liên quan|
|`username`|string|Có|Username|
|`status`|enum|Có|Account status; không trả password/hash|

## #32 — PATCH `/api/admin/rooms/:roomID/contract/rent` - BỎ CÁI NÀY: sửa ROOM, ảnh hưởng rent CONTRACT mới, không ảnh hưởng CONTRACT cũ

<!-- Sửa `CONTRACT.rent` (giá thuê đã snapshot lúc ký) của active contract gắn với room. Không đụng `ROOM.price` — đổi `ROOM.price` chỉ ảnh hưởng phòng còn trống/hợp đồng ký sau này, không hồi tố hợp đồng đang chạy. Invoice đã tạo trước đó giữ nguyên `roomBill` đã chốt; chỉ kỳ invoice tạo sau khi PATCH mới dùng `rent` mới.

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`roomID`|integer (path)|Có|Room có active contract cần sửa rent|
|`rent`|integer|Có|Giá trị rent mới, `> 0`|

**Payload mẫu**

```json
{"rent":3400000}
```

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`contractID`|integer|Có|Active contract đã sửa|
|`roomID`|integer|Có|Room liên quan|
|`rent`|integer|Có|`CONTRACT.rent` sau khi cập nhật|

```json
{"success":true,"data":{"contractID":501,"roomID":101,"rent":3400000},"message":null}
``` -->

---

# 10. Admin / Users

> **ERD note:** Không thiếu field. Trang read-only; lease/room labels là join.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|33|GET|`/api/admin/users`|Danh sách user|Admin / Users|

## #33 — GET `/api/admin/users`

**Params**

|Field|Type|Required|Description|
|---|---|---|---|
|`search`|string|Không|Tìm fullName, phoneNumber, identityNo, roomCode|
|`sex`|enum|Không|`male`, `female`, `other`|
|`nationality`|string|Không|Lọc nationality|
|`page`|integer|Không|Mặc định `1`|
|`limit`|integer|Không|Mặc định `12`, tối đa `100`|

**Output item**

|Field|Type|Required|Description|
|---|---|---|---|
|`userID`|integer|Có|ERD|
|`fullName`|string|Có|ERD|
|`dob`|date-only|Có|`USER.DoB`|
|`phoneNumber`|string|Có|ERD|
|`identityNo`|string|Có|ERD|
|`sex`|enum|Có|ERD|
|`nationality`|string|Có|ERD|
|`por`|string|Có|`USER.PoR`|
|`roomCode`|string, nullable|Không|Join active contract → ROOM|
|`contractID`|integer, nullable|Không|Active/latest contract|
|`contractStatus`|enum, nullable|Không|`active`, `expired`|

---

# 11. Admin / Invoices

> **ERD note:** Không thiếu field. `tenantName`, `roomCode`, `isOverdue`, `received`, `stillOwed` là join/derived. Không có previous reading.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|34|GET|`/api/admin/invoices`|Danh sách invoice|Admin / Invoices|
|35|GET|`/api/admin/invoices/:invoiceID`|Chi tiết invoice|Invoice drawer|

## #34 — GET `/api/admin/invoices`

**Params** — backend mặc định invoice mới nhất trước.

|Field|Type|Required|Description|
|---|---|---|---|
|`search`|string|Không|Tìm display ID, roomCode, tenant name|
|`status`|enum|Không|`not_paid`, `pending`, `paid`|
|`isRequestLate`|boolean|Không|Lọc request late payment|
|`billingPeriod`|string|Không|Lọc theo kỳ tính tiền, dạng `YYYY-MM`|
|`page`|integer|Không|Mặc định `1`|
|`limit`|integer|Không|Mặc định `12`, tối đa `100`|

**Output item**

|Field|Type|Required|Description|
|---|---|---|---|
|`invoiceID`|integer|Có|ERD|
|`displayID`|string|Có|`roomcode-ddmmyy` ddmmyy - createdDate|
|`tenantName`|string, nullable|Có|Người thuê tại ngày phát hành hoá đơn|
|`roomCode`|string|Có|Join ROOM|
|`billingPeriod`|string|Có|Kỳ tính tiền `YYYY-MM`, từ CONSUMPTION|
|`createDate`|timestamp|Có|ERD|
|`dueDate`|date-only|Có|ERD|
|`totalBill`|integer|Có|ERD|
|`received`|integer|Có|Derived từ invoice status|
|`stillOwed`|integer|Có|Derived|
|`status`|enum|Có|ERD|
|`isOverdue`|boolean|Có|Derived|
|`isRequestLate`|boolean|Có|ERD|

Ngoài `items` và `pagination`, response trả thêm hai khối:

- `billingPeriods`: mảng các kỳ có dữ liệu, mới nhất trước, dùng để dựng bộ lọc tháng. Tính trên toàn bộ invoice, không phụ thuộc filter nào, nên bộ lọc đứng yên khi admin đổi lựa chọn.
- `summary`: `billingPeriod`, `billed`, `received`, `stillOwed` — tổng tiền của **kỳ mới nhất có dữ liệu**, kèm mã kỳ đó. `billingPeriod` là `null` và ba số bằng 0 khi chưa có invoice nào.

## #35 — GET `/api/admin/invoices/:invoiceID`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`invoiceID`|integer (path)|Có|Invoice cần xem|

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`invoiceID`|integer|Có|ERD|
|`displayID`|string|Có|`roomcode-ddmmyy` ddmmyy - createdDate|
|`tenant`|object, nullable|Có|Người thuê tại ngày phát hành hoá đơn|
|`roomCode`|string|Có|Join ROOM|
|`billingPeriod`|string|Có|Kỳ tính tiền `YYYY-MM`, từ CONSUMPTION|
|`createDate`|timestamp|Có|ERD|
|`paymentDate`|timestamp, nullable|Không|ERD|
|`dueDate`|date-only|Có|ERD|
|`status`|enum|Có|ERD|
|`isOverdue`|boolean|Có|Derived|
|`isRequestLate`|boolean|Có|ERD|
|`meterReading`|integer|Có|Chỉ số duy nhất từ CONSUMPTION|
|`usageKwh`|integer|Có|Derived: chỉ số kỳ này trừ kỳ trước|
|`electricityUnitPrice`|integer|Có|Derived: `electricalBill / usageKwh`|
|`electricityUnitPriceIsApprox`|boolean|Có|true khi usage = 0 và phải fallback giá hiện tại|
|`breakdown`|object|Có|Các bill component|
|`totalBill`|integer|Có|ERD|
|`received`|integer|Có|Derived|
|`stillOwed`|integer|Có|Derived|

---

# 12. Admin / Tickets

> **ERD note:** `accountID` trong response là join qua `TICKET.roomID → ACCOUNT.roomID`; không cần thêm vào TICKET.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|36|GET|`/api/admin/tickets`|Danh sách ticket toàn khu trọ|Admin / Tickets|
|37|PATCH|`/api/admin/tickets/:ticketID/status`|Update trạng thái ticket|Status dropdown|

## #36 — GET `/api/admin/tickets`

**Params**

|Field|Type|Required|Description|
|---|---|---|---|
|`search`|string|Không|Tìm ticket ID, description, facility, area, room|
|`status`|enum|Không|`need_action`, `in_progress`, `done`|
|`type`|enum|Không|`REPAIR`, `COMPLAIN`|
|`page`|integer|Không|Mặc định `1`|
|`limit`|integer|Không|Mặc định `12`, tối đa `100`|

**Output item**

|Field|Type|Required|Description|
|---|---|---|---|
|`ticketID`|integer|Có|ERD|
|`type`|enum|Có|Derived child table|
|`ticketName`|string|Có|ERD|
|`description`|string|Có|Child description|
|`location`|string|Có|Facility hoặc area/room label|
|`roomID`|integer|Có|Room account tạo ticket|
|`roomCode`|string|Có|Join ROOM|
|`accountID`|integer|Có|Join ACCOUNT qua room|
|`createDate`|date-only|Có|ERD|
|`resolveDate`|date-only, nullable|Không|ERD|
|`status`|enum|Có|ERD|

## #37 — PATCH `/api/admin/tickets/:ticketID/status`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`ticketID`|integer (path)|Có|Ticket cần update|
|`status`|enum|Có|Chỉ trạng thái kế tiếp hợp lệ|

Chỉ cho `need_action → in_progress → done`; không bỏ bước hoặc chuyển ngược. Khi sang `done`, backend set `resolveDate`.

```json
{"status":"in_progress"}
```

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`ticketID`|integer|Có|Ticket đã update|
|`status`|enum|Có|Status mới|
|`resolveDate`|date-only, nullable|Không|Có giá trị khi `done`|

---

# 13. Admin / Approvals

> **ERD note:** Cần cập nhật enum `REQUEST.type` từ tên legacy sang 6 giá trị: `LATE_PAYMENT_REQUEST`, `PAID_REQUEST`, `EXTEND_REQUEST`, `MOVEOUT_REQUEST`, `CHECKOUT_REQUEST`, `CONSUMP_REQUEST`; loại bỏ `SUBUSER`. UI hiện chỉ approve, không expose reject. `rejectionReason` có thể giữ nullable để tương thích dữ liệu cũ.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|38|GET|`/api/admin/requests`|Bảng request với common fields|Admin / Approvals|
|39|GET|`/api/admin/requests/:requestID`|Chi tiết theo request id|Approval drawer|
|40|PATCH|`/api/admin/requests/:requestID/approve`|Approve request theo id|Approval drawer|

## #38 — GET `/api/admin/requests`

**Params** — backend mặc định request mới nhất trước.

|Field|Type|Required|Description|
|---|---|---|---|
|`search`|string|Không|Tìm request ID, roomCode, user fullName|
|`type`|enum|Không|Một trong 6 request types|
|`relatedType`|enum|Không|`INVOICE`, `CONTRACT`, `ROOM`|
|`status`|enum|Không|`pending`, `approved`|
|`page`|integer|Không|Mặc định `1`|
|`limit`|integer|Không|Mặc định `12`, tối đa `100`|

**Output item**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|ERD|
|`type`|enum|Có|Một trong 6 types|
|`roomID`|integer|Có|ERD|
|`roomCode`|string|Có|Join ROOM|
|`userID`|integer|Có|ERD|
|`userFullName`|string|Có|Join USER|
|`createDate`|date-only|Có|ERD|
|`resolveDate`|date-only, nullable|Không|ERD|
|`status`|enum|Có|ERD|

## #39 — GET `/api/admin/requests/:requestID`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer (path)|Có|Request cần xem|

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|Common request|
|`type`|enum|Có|Request type|
|`room`|object|Có|`roomID`, `roomCode`|
|`user`|object|Có|`userID`, `fullName`|
|`createDate`|date-only|Có|Common request|
|`resolveDate`|date-only, nullable|Không|Common request|
|`status`|enum|Có|Common request|
|`details`|object|Có|Type-specific fields bên dưới|

`details` theo type:

|Type|Fields|
|---|---|
|`LATE_PAYMENT_REQUEST`|`invoiceID`, `invoiceDisplayID`, `invoiceTotalBill`, `invoiceDueDate`, `invoiceStatus`, `invoiceIsRequestLate`|
|`PAID_REQUEST`|`invoiceID`, `invoiceDisplayID`, `invoiceTotalBill`, `invoiceDueDate`, `invoiceStatus`, `invoiceIsRequestLate`|
|`EXTEND_REQUEST`|`contractID`, `yearToExtend` (derived Parameter)|
|`MOVEOUT_REQUEST`|`contractID`, `requestMoveoutDate`|
|`CHECKOUT_REQUEST`|`contractID`, `finalImage`, `finalReading`|
|`CONSUMP_REQUEST`|`image`, `currentReading`, `previousReading`, `usage`, `capturedAt`; khi đã approved thêm tóm tắt hoá đơn được tạo (`invoiceID`, `invoiceDisplayID`, `invoiceTotalBill`, `invoiceDueDate`, `invoiceStatus`, `invoiceIsRequestLate`)|

```json
{"success":true,"data":{"requestID":701,"type":"CONSUMP_REQUEST","room":{"roomID":101,"roomCode":"A-101"},"user":{"userID":51,"fullName":"Nguyễn Văn An"},"createDate":"2026-09-28","resolveDate":null,"status":"pending","details":{"image":"uploads/consumption/701.jpg","reading":148,"capturedAt":"2026-09-28T08:10:00Z"}},"message":null}
```

## #40 — PATCH `/api/admin/requests/:requestID/approve`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer (path)|Có|Pending request cần approve|

Không có body. Backend đọc type và thực hiện transaction tương ứng:

**Payload mẫu:** `{}`

- `LATE_PAYMENT_REQUEST`: chuyển request sang approved và set `INVOICE.isRequestLate=true`; không đổi `dueDate` và `status` của invoice.
- `PAID_REQUEST`: set invoice `paid`, `paymentDate=now`.
- `EXTEND_REQUEST`: cộng `yearToExtend` vào `CONTRACT.expireDate`.
- `MOVEOUT_REQUEST`: approve notice, mở điều kiện checkout.
- `CHECKOUT_REQUEST`: xử lý final reading/image, expire contract và reset/deactivate account theo nghiệp vụ.
- `CONSUMP_REQUEST`: tạo `CONSUMPTION` và invoice tương ứng; `roomBill` lấy từ `CONTRACT.rent` (active contract của room), không đọc `ROOM.price`.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`requestID`|integer|Có|Request đã xử lý|
|`type`|enum|Có|Request type|
|`resolveDate`|date-only|Có|Ngày approve|
|`status`|enum|Có|`approved`|
|`result`|object|Có|IDs/records được tạo hoặc cập nhật theo type|

# 13. Admin / Setting parameters

> Endpoint hiện có (`/api/guest/parameters`) chỉ là **public, read-only** cho Guest.
> Đây là 2 endpoint còn thiếu để Admin **xem** và **cập nhật** billing parameters, đáp ứng AC1–AC5 của Story 6.
> Chỉ cho phép update value, không update name của parameters
> UI tham khảo để cập nhật

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|41new|GET|`/api/admin/parameters`|Bảng parameters common fields|Admin / Setting|
|42new|PATCH|`/api/admin/parameters/:parameterID`|Admin cập nhật các allowed parameters cho kỳ hiện tại|Admin / Setting|

## #1. GET `/api/admin/parameters`
 
**Mục đích:** Admin xem parameters hiện tại đang áp dụng cho kỳ hiện tại và có id để update. (AC1)
>Đề xuất: otherFees đại diện cho tổng các chi phí không gọi tên.

**Auth:** Admin only (role guard)
 
```json
{
  "success": true, 
  "data":
    [
      { "id": "param_001", "name": "electricityUnitPrice", "value": "3500" },
      { "id": "param_002", "name": "waterPrice", "value": "15000" },
      { "id": "param_003", "name": "wifiFee", "value": "100000" },
      { "id": "param_004", "name": "otherFees", "value": "30000" },
      { "id": "param_005", "name": "meterReadingStartDate", "value": "2025-01-25" },
      { "id": "param_006", "name": "meterReadingEndDate", "value": "2025-01-31" },
      { "id": "param_007", "name": "paymentDueDate", "value": "2025-02-10" },
      { "id": "param_008", "name": "yearToExtend", "value": "1" },
      { "id": "param_009", "name": "adminPhone", "value": "0901234567" },
      { "id": "param_010", "name": "adminFacebook", "value": "https://facebook.com/rentflow" },
      { "id": "param_011", "name": "adminZalo", "value": "0901234567" },
      { "id": "param_012", "name": "address", "value": "123 Nguyễn Văn A, Q.1, TP.HCM" },
      { "id": "param_013", "name": "popertyName", "value": "RentFlow House" },
      { "id": "param_014", "name": "adminEmail", "value": "admin@rentflow.vn" },
      { "id": "param_015", "name": "contractPlaceholder", "value": "Hợp đồng thuê phòng số {contractID} giữa Bên A và {tenantName}..." }
    ]
  "message": null
}
```

---
 
## #2. PATCH `/api/admin/parameters/:parameterID`
 
**Mục đích:** Admin chọn 1 row theo `id` và cập nhật `value`, áp dụng cho kì hiện tại. (AC2)
 
**Auth:** Admin only
 
### Request Body
```json
{ "value": "3700" }
```
Không cho sửa `id`/`name` — chỉ `value`. Field lạ khác trong body → reject (400).

### Validation rules theo `name` (AC3)
 
| `name` | Rule |
|---|---|
| `electricityUnitPrice` | số, `> 0` |
| `waterPrice` | số, `> 0` |
| `wifiFee` | số, `>= 0` |
| `otherFees` | số, `>= 0` |
| `meterReadingStartDate` | ngày hợp lệ, phải **trước** `value` hiện tại của row `meterReadingEndDate` |
| `meterReadingEndDate` | ngày hợp lệ, phải **sau** `meterReadingStartDate` |
| `paymentDueDate` | ngày hợp lệ, phải **sau** `meterReadingEndDate` |
| `yearToExtend` | số nguyên, `> 0` |
| `adminPhone` | đúng định dạng số điện thoại VN |
| `adminEmail` | đúng định dạng email |
| `adminFacebook` | URL hợp lệ (hoặc rỗng) |
| `adminZalo` | số điện thoại hoặc URL, không rỗng |
| `address` | string, không rỗng |
| `popertyName` | string, không rỗng |
| `contractPlaceholder` | string, không rỗng (free text, cho phép chứa placeholder `{...}` dùng khi render Contract ở Story 5) |
| `id` không tồn tại | 404 |
| `id` hợp lệ nhưng gửi kèm `name` khác giá trị hiện tại | reject — `name` không được đổi qua endpoint này |
 
> Vì mỗi tham số update độc lập theo `id`, 3 field ngày (`meterReadingStartDate/EndDate`, `paymentDueDate`) validate **chéo** bằng cách đọc `value` hiện hành của các row liên quan khác trong lúc xử lý request.
 
```json
{ "success": true, "data": {"id": "param_001", "name": "electricityUnitPrice", "value": "3700"}, "message":null}
```
 
### Error responses
 
| Status | Case |
|---|---|
| 400 | Sai kiểu dữ liệu theo `name` / field lạ trong body / cố sửa `name` |
| 401 / 403 | Không phải Admin |
| 404 | `id` không tồn tại |
| 422 | Vi phạm rule ngày chéo (`meterReadingEndDate <= meterReadingStartDate`, `paymentDueDate <= meterReadingEndDate`) |
 
---




# 14. Login & First-login onboarding

> **ERD note:** Cần bổ sung `CONTRACT.signedAt DATETIME`. `PARAMETER.Value` cần hỗ trợ long text (`TEXT` hoặc type tương đương) vì `contractPlaceholder` là nội dung hợp đồng dài. Có thể dùng `ACCOUNT.status=inactive` để xác định account chưa hoàn tất first login; không cần `isFirstLogin`. `CONTRACT.signature` lưu path PNG. Hệ thống hiện không lưu snapshot toàn bộ contract text.

|#|Method|Endpoint|Mô tả|Tham chiếu UI|
|---|---|---|---|---|
|41|POST|`/api/auth/login`|Đăng nhập và xác định first-login|Login frame 1|
|42|POST|`/api/auth/first-login/profile`|Lưu personal information và password mới|Login frame 2|
|43|GET|`/api/auth/first-login/contract-preview`|Render digital contract|Login frame 3|
|44|POST|`/api/auth/first-login/contract`|Lưu chữ ký, tạo contract, activate account|Login frame 3|

## #41 — POST `/api/auth/login`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`username`|string|Có|`ACCOUNT.username`|
|`password`|string|Có|Plain input; backend so sánh password hash|

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`requireFirstLogin`|boolean|Có|`true` nếu account inactive|
|`onboardingToken`|string, nullable|Không|Token ngắn hạn cho bước 2–3|
|`accessToken`|string, nullable|Không|JWT dùng khi onboarding đã hoàn tất|
|`account`|object|Có|`accountID`, `roomID`, `username`, `role`, `status`|
|`user`|object, nullable|Không|User khi login bình thường|

- Nếu `ACCOUNT.status=inactive`: chưa cấp `accessToken`; trả `onboardingToken` để tiếp tục first-login.
- Nếu `ACCOUNT.status=active`: trả `accessToken` và các thông tin liên quan đến user/contract.

(nếu không phải first login) Thay req từ Request thành AuthRequest có chứa prop req.User.
req.User lưu {accountID, roomID, contractID, userID, startDate(của Account)} và sau này có thể dùng trong các logic cần auth

```json
{"username":"A101","password":"temporary-password"}
```

## #42 — POST `/api/auth/first-login/profile`
**Authorization**

`Bearer <onboardingToken>`

**Input**

|Field|Type|Required|Description|
|---|---|---|---|
|`fullName`|string|Có|Họ tên|
|`dob`|date-only|Có|Ngày sinh|
|`phoneNumber`|string|Có|Số điện thoại|
|`identityNo`|string|Có|Số CCCD|
|`sex`|enum|Có|`male`, `female`, `other`|
|`nationality`|string|Có|Quốc tịch|
|`por`|string|Có|Place of residence|
|`password`|string|Có|Plain input; backend lưu password hash|
|`confirmPassword`|string|Có|Plain input; check với password|
|`confirmInfo`|string|Có|"true" or "false" -> chỉ true mới đi tiếp|

```json
{"fullName":"Nguyễn Văn An","dob":"2002-06-14","phoneNumber":"0901234567","identityNo":"001202000001","sex":"male","nationality":"Vietnamese","por":"Hà Nội", "password": "my-new-pass"}
```

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`userID`|integer|Có|USER vừa tạo/cập nhật|
|`fullName`|string|Có|Họ tên|
|`dob`|date-only|Có|Ngày sinh|
|`phoneNumber`|string|Có|Số điện thoại|
|`identityNo`|string|Có|Số CCCD|
|`sex`|enum|Có|Sex|
|`nationality`|string|Có|Quốc tịch|
|`por`|string|Có|Place of residence|
|`password`|string|Có|hashed value|

Lưu/cập nhật thông tin `USER` và password mới cho account đang thực hiện first-login.
Chưa cấp `accessToken`. Tiếp tục sử dụng `onboardingToken`.

## #43 — GET `/api/auth/first-login/contract-preview`
**Authorization**

`Bearer <onboardingToken>`

**Input/Params:** Không có; chưa cần auth (giả định tiếp tục).
Backend xác định account/user/room từ `onboardingToken`.

**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`renderedText`|string|Có|`contractPlaceholder` chưa merge, lấy từ parameter|
|`user`|object|Có|Personal info vừa nhập|
|`room`|object|Có|Room suy ra từ account username/roomID|
|`draftContract`|object|Có|`startDate`, `expireDate`, `propertyDeposit`|

## #44 — POST `/api/auth/first-login/contract`
**Authorization**

`Bearer <onboardingToken>`
**Input — multipart/form-data**

|Field|Type|Required|Description|
|---|---|---|---|
|`signature`|file|Có|PNG xuất từ vùng ký bằng canvas|
|`acceptedTerms`|boolean|Có|Phải là `true`|

**Payload mẫu**

```json
{"signature":"<file>","acceptedTerms":true}
```

Backend thực hiện trong **một transaction**:

1. Lưu relative path của signature vào `CONTRACT.signature`.
2. Set `CONTRACT.signedAt`.
3. Snapshot `CONTRACT.rent = ROOM.price`.
4. Tạo `CONTRACT` mới.
5. Set contract status = `active`.
6. Set `ACCOUNT.status = active`.
7. Commit transaction.
8. Generate `accessToken`.

**JWT payload** chứa:

```json
{
  "accountID": 1,
  "roomID": 101,
  "contractID": 25,
  "userID": 10,
  "startDate": "2026-09-13"
}
```

Sau khi middleware xác thực JWT, backend tạo:

```text
req.auth = {
    accountID,
    roomID,
    contractID,
    userID,
    startDate
}
```
**Output**

|Field|Type|Required|Description|
|---|---|---|---|
|`accessToken`|string|Có|JWT sau khi onboarding hoàn tất|
|`account`|object|Có|Account đã active|
|`user`|object|Có|User vừa hoàn tất profile|
|`contract.contractID`|integer|Có|Contract mới|
|`contract.startDate`|date-only|Có|Ngày bắt đầu|
|`contract.expireDate`|date-only|Có|Ngày hết hạn|
|`contract.propertyDeposit`|integer|Có|Tiền cọc snapshot|
|`contract.rentPrice`|integer|Có|Giá thuê snapshot từ `ROOM.price` lúc tạo contract|
|`contract.status`|enum|Có|`active`|
|`contract.signature`|string|Có|Path PNG|
|`contract.signedAt`|timestamp|Có|Thời điểm ký|

---

# ERD changes required by the UI

Chỉ có ba thay đổi lưu trữ bắt buộc được phát hiện trong toàn bộ flow:

|Entity|Change|Reason|State|
|---|---|---|---|
|`CONTRACT`|Add `signedAt DATETIME`|Hiển thị và audit thời điểm ký|Done|
|`CONTRACT`|Add `rent INTEGER`|Snapshot giá thuê lúc ký; không đổi hồi tố khi `ROOM.price` đổi sau này|Done|
|`PARAMETER.Value`|Đổi sang `TEXT` hoặc type hỗ trợ long text|Lưu `contractPlaceholder` dài|Done|
|`REQUEST.type`|Replace legacy enum with 6 current request types; remove `subuser`|Đồng bộ flow Approvals hiện tại|Done|

Các field như `roomCode`, `tenantName`, `isOverdue`, `stillOwed`, summaries và labels là join/derived response, không thêm vào ERD.

---
# 15. Backend folder structure

> Giả định stack: **Node.js/Express + Mongoose (MERN)**, monorepo với thư mục `backend/` riêng. Nếu stack thực tế khác (vd. đổi sang NestJS hoặc SQL/Prisma) thì cấu trúc bên dưới cần điều chỉnh lại tương ứng — báo mình để update.

**Root repo (monorepo):**

```
rentflow/
├── .github/
│   └── workflows/
│       ├── backend-ci.yml      # chỉ chạy khi có thay đổi trong backend/ (path filter)
│       └── frontend-ci.yml     # chỉ chạy khi có thay đổi trong frontend/ (path filter)
├── backend/                    # xem cây chi tiết bên dưới
├── frontend/
├── docker-compose.yml          # backend + mongo + frontend, optional, tiện dev local
└── README.md
```

**Trong `backend/`:**

```
backend/
├── src/
│   ├── config/
│   │   ├── db.ts                   # Kết nối MongoDB/Mongoose
│   │   ├── env.ts                  # Load & validate biến môi trường
│   │   └── multer.ts               # Cấu hình upload ảnh (rooms, consumption, repair, checkout, signature)
│   │
│   ├── models/
│   │   ├── Parameter.ts
│   │   ├── User.ts
│   │   ├── Account.ts
│   │   ├── Area.ts
│   │   ├── Room.ts
│   │   ├── Contract.ts
│   │   ├── Consumption.ts
│   │   ├── Invoice.ts              # dùng `isRequestLate` — KHÔNG dùng `isRequestDelay`
│   │   ├── Facility.ts
│   │   ├── FacilityType.ts
│   │   ├── Ticket.ts
│   │   ├── Repair.ts               # discriminator/ref của Ticket
│   │   ├── Complain.ts             # discriminator/ref của Ticket
│   │   └── Request.ts              # base + 6 subtype: LatePayment, Paid, Extend, Moveout, Checkout, Consump
│   │                                 # (KHÔNG có SubUser/SubuserRequest — UI đã bỏ subuser, xem #13)
│   │
│   ├── routes/
│   │   ├── index.ts                # gộp router, mount `/api`
│   │   ├── guest.routes.ts         # #1–3
│   │   ├── auth.routes.ts          # #40–43 login & first-login
│   │   ├── user/
│   │   │   ├── dashboard.routes.ts    # #4
│   │   │   ├── consumption.routes.ts  # #5–7
│   │   │   ├── invoice.routes.ts      # #8–11
│   │   │   ├── ticket.routes.ts       # #12–16
│   │   │   └── profile.routes.ts      # #17–24
│   │   └── admin/
│   │       ├── dashboard.routes.ts    # #25
│   │       ├── room.routes.ts         # #26–31
│   │       ├── user.routes.ts         # #32
│   │       ├── invoice.routes.ts      # #33–34
│   │       ├── ticket.routes.ts       # #35–36
│   │       └── approval.routes.ts     # #37–39
│   │
│   ├── controllers/                # mirror cấu trúc routes/ ở trên (1 controller/route file)
│   │   ├── guest.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── user/
│   │   └── admin/
│   │
│   ├── services/                   # business logic tách khỏi controller (tính bill, approve theo type, v.v.)
│   │   ├── invoice.service.ts
│   │   ├── request.service.ts      # switch theo 6 request type khi approve (#39)
│   │   ├── contract.service.ts     # merge contractPlaceholder, tạo/activate contract
│   │   └── upload.service.ts
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # verify JWT / onboardingToken
│   │   ├── role.middleware.ts      # guard admin vs user
│   │   ├── upload.middleware.ts    # wrap multer cho từng endpoint
│   │   ├── validate.middleware.ts  # chạy schema validator
│   │   └── error.middleware.ts     # format response lỗi chung `{success:false,...}`
│   │
│   ├── validators/                 # Joi/Zod schema theo từng endpoint trong spec
│   │
│   ├── utils/
│   │   ├── response.ts             # helper trả `{success, data, message}`
│   │   ├── pagination.ts           # helper `data.items` + `data.pagination`
│   │   ├── hashPassword.ts         # hash password trước khi lưu
│   │   ├── generateRandomPassword.ts # dùng cho reset account (#30)
│   │   └── dateFormat.ts           # format date-only / ISO UTC / VND integer
│   │
│   ├── app.ts                      # khởi tạo express app, mount middlewares + routes
│   └── server.ts                   # entrypoint, listen port
│
├── uploads/                        # relative path lưu file (multer disk storage)
│   ├── rooms/
│   ├── consumption/
│   ├── repair/
│   ├── checkout/
│   └── signatures/
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── .env.example
├── .gitignore
├── Dockerfile
├── tsconfig.json
└── package.json
```