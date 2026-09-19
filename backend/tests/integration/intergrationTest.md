# Integration Test Cases — RentFlow API Endpoints

## 1. Authentication & First-Login API Flow
| Test ID | Endpoint | Method | Điều kiện DB (Pre-condition) | Payload & Header | Kỳ vọng (Status & Body) |
|---|---|---|---|---|---|
| **IT-AUTH-01** | `/api/auth/login` | `POST` | Account `status = "inactive"` | `{"username": "A-101", "password": "..."}` | **200 OK**<br>- `requireFirstLogin: true`<br>- Trả `onboardingToken` |
| **IT-AUTH-02** | `/api/auth/login` | `POST` | Account `status = "banned"` | `{"username": "B-101", "password": "..."}` | **403 Forbidden**<br>- Chặn không cấp bất kỳ token nào |
| **IT-AUTH-03** | `/api/auth/first-login/contract` | `POST` | Đang giữ `onboardingToken` | Form-data: `acceptedTerms=true`, `signature=<file>` | **200 OK**<br>- Tạo Contract `active`<br>- Account sang `active`<br>- Cấp `accessToken` chính thức |

---

## 2. Admin Room Management APIs
| Test ID | Endpoint | Method | Điều kiện DB (Pre-condition) | Payload & Header | Kỳ vọng (Status & Body) |
|---|---|---|---|---|---|
| **IT-ROOM-01** | `/api/admin/rooms` | `GET` | Có 10 phòng trong DB | `Bearer <AdminToken>`, `?page=1&limit=5` | **200 OK**<br>- Trả mảng 5 phòng<br>- Kèm metadata pagination, `electricityState`, `stillOwed` |
| **IT-ROOM-02** | `/api/admin/rooms` | `POST` | Đã có Area hợp lệ | Form-data: đủ fields bắt buộc + file ảnh | **201 Created**<br>- Tạo Room `AVAILABLE_NOW`<br>- Tự sinh Account `BANNED` trong transaction |
| **IT-ROOM-03** | `/api/admin/rooms` | `POST` | Đã tồn tại mã phòng `A-101` | Body chứa `roomCode: "A-101"` | **409 Conflict**<br>- Báo mã phòng đã tồn tại, rollback transaction |
| **IT-ROOM-04** | `/api/admin/rooms/:id/account/password` | `PATCH` | Account phòng có status `banned` | `Bearer <AdminToken>`, Body: `{"newPassword": "Pass@123"}` | **200 OK**<br>- Account đổi sang `inactive`<br>- Mật khẩu được mã hóa trong DB |
| **IT-ROOM-05** | `/api/admin/rooms/:id/account/password` | `PATCH` | Account phòng đang `active` | Body: `{"newPassword": "Pass@123"}` | **400 Bad Request**<br>- Chỉ cho phép chuẩn bị tài khoản khi đang `banned` |

---

## 3. Tenant Contract & Request APIs
| Test ID | Endpoint | Method | Điều kiện DB (Pre-condition) | Payload & Header | Kỳ vọng (Status & Body) |
|---|---|---|---|---|---|
| **IT-TEN-01** | `/api/user/contract` | `GET` | Tenant đang có hợp đồng `active` | `Bearer <TenantToken>` | **200 OK**<br>- Trả đúng snapshot hợp đồng của phòng mình<br>- Không xem được hợp đồng phòng khác |
| **IT-TEN-02** | `/api/user/contract/signature` | `GET` | Hợp đồng đã có chữ ký | `Bearer <TenantToken>` | **200 OK**<br>- Trả path ảnh `signature` và ngày `signedAt` |
| **IT-TEN-03** | `/api/user/moveout-requests` | `POST` | Contract đang `active`, chưa có pending request | `Bearer <TenantToken>`, Body: `{"requestMoveoutDate": "2026-11-30"}` | **201 Created**<br>- Tạo request `pending`<br>- Room và Contract giữ nguyên status |
| **IT-TEN-04** | `/api/user/moveout-requests` | `POST` | Đã có 1 move-out request đang `pending` | `Bearer <TenantToken>`, Body: `{"requestMoveoutDate": "2026-11-30"}` | **409 Conflict**<br>- Chặn spam gửi nhiều yêu cầu trả phòng |
| **IT-TEN-05** | `/api/user/checkout-requests` | `POST` | Move-out request đã được Admin duyệt | Form-data: `finalReading=165`, `finalImage=<file>` | **201 Created**<br>- Request checkout `pending` |

---

## 4. Parameter & System Configuration APIs
| Test ID | Endpoint | Method | Điều kiện DB (Pre-condition) | Payload & Header | Kỳ vọng (Status & Body) |
|---|---|---|---|---|---|
| **IT-PARAM-01**| `/api/admin/parameters` | `GET` | Đã nạp seed 15 parameters | `Bearer <AdminToken>` | **200 OK**<br>- Trả danh sách toàn bộ thông số cấu hình |
| **IT-PARAM-02**| `/api/admin/parameters/:id` | `PATCH` | Tồn tại parameter ID | `Bearer <AdminToken>`, Body: `{"value": "4000"}` | **200 OK**<br>- Giá trị cập nhật thành 4000 |
| **IT-PARAM-03**| `/api/admin/parameters/:id` | `PATCH` | Bất kỳ | `Bearer <TenantToken>` | **403 Forbidden**<br>- Tenant không có quyền chỉnh sửa cấu hình |