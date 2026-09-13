# Phân chia Task Backend
---

## Hồng Hạnh — Guest & Tenant & Auth

### 1. Public room discovery - guest
- Thông tin public của khu trọ (`/api/guest/parameters`)
- Danh sách phòng public (`/api/guest/rooms`)
- Chi tiết phòng public (`/api/guest/rooms/:roomID`)

### 2. Homepage, request page list - tenant
- Toàn bộ dữ liệu trang Home (`/api/user/dashboard`) — tham khảo tenant DASHBOARD trong backlog
- Danh sách 6 loại request (`/api/user/requests`)

### 3. Electricity - tenant
- Dữ liệu form và kỳ ghi điện (`/api/user/consumption-requests/context`)
- Gửi chỉ số điện (`/api/user/consumption-requests`)
- Xem request vừa gửi (`/api/user/consumption-requests/:requestID`)

### 4. Invoice - tenant
- Danh sách invoice của user (`/api/user/invoices`)
- Chi tiết invoice (`/api/user/invoices/:invoiceID`)
- Tạo paid request (`/api/user/invoices/:invoiceID/paid-request`)
- Tạo late request (`/api/user/invoices/:invoiceID/late-payment-request`)

### 5. Tickets - tenant
- Danh sách ticket của tenant (`/api/user/tickets`)
- Facility của phòng để tạo repair (`/api/user/tickets/repair/options`)
- Area và room để tạo complaint (`/api/user/tickets/complain/options`)
- Tạo repair ticket (`/api/user/tickets/repair`)
- Tạo complaint ticket (`/api/user/tickets/complain`)

### 13. Authentication
- Đăng nhập và xác định first-login (`/api/auth/login`)
- Lưu personal information & new password (`/api/auth/first-login/profile`)
- Render digital contract (`/api/auth/first-login/contract-preview`)
- Lưu chữ ký, tạo contract, activate account (`/api/auth/first-login/contract`)

**Tổng: 6 nhóm chức năng / 21 endpoint**

---

## Quỳnh Hương — Tenant & Admin 

### 7. Profile & Lease - tenant
- Personal details (`/api/user/profile`)
- Active lease (`/api/user/contract`)
- Xem chữ ký đã lưu (`/api/user/contract/signature`)
- Gửi notice ngày dự kiến rời đi (`/api/user/moveout-requests`)
- Gửi reading/ảnh ngày checkout (`/api/user/checkout-requests`)
- Xin gia hạn hợp đồng (`/api/user/extend-requests`)

### 8. Dashboard - admin
- Room/payment summary và work queues (`/api/admin/dashboard`) — xem thêm trong backlog

### 9. Rooms & Lease - admin
- Area options cho form/filter (`/api/admin/areas/options`)
- Danh sách room/lease (`/api/admin/rooms`)
- Room, active lease, tenant, account (`/api/admin/rooms/:roomID`)
- Update ROOM in4 (`/api/admin/rooms/:roomID`)
- Thêm phòng (`/api/admin/rooms`)
- Admin đặt mật khẩu mới (`/api/admin/rooms/:roomID/account/password`)

### 10. Parameter congiguration - admin
- Get all params (`/api/admin/parameters`)
- Update 1 param (`/api/admin/parameters/:parameterID`)

**Tổng: 4 nhóm chức năng / 15 endpoint**

---

## Khánh Ly — Admin nghiệp vụ (khối lượng ít hơn)

### 1`. User - Admin
- Danh sách user (`/api/admin/users`)

### 12. Invoices - Admin
- Danh sách invoice (`/api/admin/invoices`)
- Chi tiết invoice (`/api/admin/invoices/:invoiceID`)

### 13. Tickets - Admin
- Danh sách ticket toàn khu trọ (`/api/admin/tickets`)
- Update trạng thái ticket (`/api/admin/tickets/:ticketID/status`)

### 14. Approvals - Admin
- Bảng request với common fields (`/api/admin/requests`)
- Chi tiết theo request id (`/api/admin/requests/:requestID`)
- Approve request theo id (`/api/admin/requests/:requestID/approve`)

**Tổng: 4 nhóm chức năng / 8 endpoint**

---

## Tóm tắt khối lượng

| Nhóm | Số nhóm chức năng | Số endpoint |
|------|--------------------|-------------|
| A    | 6                  | 21          |
| B    | 4                  | 15          |
| C    | 4                  | 8           |