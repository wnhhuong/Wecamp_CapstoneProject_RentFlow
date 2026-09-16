# RentFlow Frontend — quy ước code

Đọc trước khi viết code. Đây là quy ước đã có sẵn trong `frontend/src`.

## Nguyên tắc bắt buộc

- Mọi request đi qua `apiRequest` trong `shared/api/client.ts`.
- Token do `shared/api/auth-adapter.ts` tự gắn, đã nối sẵn với `shared/auth/auth-store.ts`.
- Một file một nhiệm vụ. Page chỉ render và nối dữ liệu; gọi API nằm ở `shared/api`, endpoint ở `shared/api/endpoints.ts`, type ở `shared/types`, format ở `shared/utils`.
- Tái sử dụng trước khi tạo mới. Xem `components/ui`, `components/feedback`, `components/layout`, `shared/utils` trước. Không tự viết lại button, input, select, spinner, status badge, hay hàm format tiền/ngày.
- Các file rỗng trong repo là khung dựng sẵn (ví dụ `shared/api/user/invoices.api.ts`, `pages/user/invoices/InvoiceListPage.tsx`).
- Import bằng alias @/.

## Cấu trúc thư mục

- `components/ui` — thành phần cơ bản: button, input, dialog, table…
- `components/feedback` — `PageLoading`, `ErrorState`, `EmptyState`
- `components/layout` — `Header`, `Sidebar`, `PageContainer`
- `components/status` — `StatusBadge`
- `pages/<admin|user|guest|auth>` — mỗi màn hình một page
- `pages/<khu vực>/<feature>/` — dialog, step, hook, util riêng của feature đó, không đẩy lên `shared`
- `router/` — `routes.ts` (đường dẫn), `index.tsx` (bảng route), `require-auth.tsx` (guard)
- `shared/api/<scope>/<resource>.api.ts` — mỗi resource một file
- `shared/types` — type dùng chung từ hai nơi trở lên: shape trả về từ backend, shape dùng cho UI, và type dùng chung như `ApiResponse`, `ApiPagination`, `status`. Type chỉ một file dùng thì để ngay tại file đó.
- `shared/utils` — `cn`, `currencyFormatter`, `dateFormatter`, `statusMapper`

## Khi làm tính năng gọi API

- Thêm đường dẫn vào `shared/api/endpoints.ts`, đúng nhóm `guest` / `user` / `admin` / `auth`. Đường dẫn có tham số thì viết thành hàm và bọc `encodeURIComponent`.
- Khai báo type (shape của backend và shape dùng cho UI) trong `shared/types`. Dùng lại `ApiResponse<T>`, `ApiPagination` từ `shared/types/api.ts`.
- Viết hàm gọi API trong `shared/api/<scope>/<resource>.api.ts`, truyền `auth: 'admin' | 'user' | 'guest'` theo quyền của endpoint (mặc định là `guest`).
- `apiRequest` đã tự bóc lớp `{success, data, message}`, gắn header, gắn token, xử lý 401 và ném `ApiError` (có `status`, `message`).
- Chuyển dữ liệu backend sang shape UI trong file api, không làm trong component. Status phải đi qua `statusMapper` để `StatusBadge` nhận đúng giá trị.
- Đăng ký route trong `routes.ts` và `router/index.tsx`, bọc bằng `<RequireAuth role="user">` hoặc `role="admin"`.
- Trong page sau khi login, lấy thông tin đăng nhập bằng `useAuth()` (`session`, `account`, `isAuthenticated`, `signIn`, `signOut`). Không tự suy ra người dùng từ localStorage.

## Layout và trạng thái màn hình

- Mọi page sau khi đăng nhập bắt đầu bằng `<PageContainer>` từ `@/components/layout`. Nó lo max-width, lề và khoảng cách để các trang thẳng hàng với sidebar.
- Đang tải dùng `<PageLoading />`, lỗi dùng `<ErrorState onRetry={...} />`, không có dữ liệu dùng `<EmptyState />`.
- Trạng thái (phòng, hoá đơn, request, ticket, account) dùng `<StatusBadge>`.

## Format dữ liệu

- Tiền: `formatCurrency` khi hiển thị (ra `3.200.000 ₫`), `formatAmountInput` cho ô nhập, `toAmountDigits` trước khi lưu/gửi. Label trong form vẫn ghi VND.
- Ngày: `formatDate` để hiển thị, `getDateKey` để so sánh.
- Không gọi `Intl.NumberFormat`, `toLocaleString`, `toLocaleDateString` trong component. Thiếu kiểu format nào thì bổ sung vào file util, không viết tại chỗ.
