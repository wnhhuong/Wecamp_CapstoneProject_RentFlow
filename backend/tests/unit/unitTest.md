# Unit Test Cases — RentFlow Core Modules

## 1. Authentication & First-Login Logic
| Test ID | Logic / Hàm kiểm tra | Đầu vào (Input) | Điều kiện giả lập (Mock) | Kết quả mong đợi (Expected) |
|---|---|---|---|---|
| **UT-AUTH-01** | Chuẩn hóa username từ roomCode | `roomCode: "A - 101 "` | Không | Trả về chuỗi `A-101` không chứa khoảng trắng |
| **UT-AUTH-02** | Validate độ dài mật khẩu mới | `newPassword: "12345"` | Không | Báo lỗi validation: mật khẩu tối thiểu 6 ký tự |
| **UT-AUTH-03** | Chặn đăng nhập khi Account bị khóa | `account.status = "banned"` | Mock tìm thấy account status BANNED | Ném lỗi 403 Forbidden hoặc Account is banned |
| **UT-AUTH-04** | Kiểm tra điều kiện First-Login | `account.status = "inactive"` | Mock tìm thấy account status INACTIVE | Trả cờ `requireFirstLogin: true` |

---

## 2. Room & Tenancy Business Rules
| Test ID | Logic / Hàm kiểm tra | Đầu vào (Input) | Điều kiện giả lập (Mock) | Kết quả mong đợi (Expected) |
|---|---|---|---|---|
| **UT-ROOM-01** | Validate số người tối đa phòng | `maxPeople: 0` | Không | Báo lỗi validation: `maxPeople` phải là số nguyên >= 1 |
| **UT-ROOM-02** | Chặn giá phòng / tiền cọc là số âm | `price: -2000000` | Không | Báo lỗi validation: `price` phải là số dương |
| **UT-ROOM-03** | Khởi tạo trạng thái phòng mới | DTO tạo phòng hợp lệ | Không | Trạng thái mặc định luôn là `AVAILABLE_NOW` |
| **UT-ROOM-04** | Chặn đổi trực tiếp Room Status khi update | Body: `{"status": "rented"}` | Mock room đang `available_now` | Trường `status` bị lờ đi hoặc báo lỗi chặn sửa vòng đời tự do |
| **UT-ROOM-05** | Tính độc lập giá thuê phòng và Hợp đồng cũ | Đổi `Room.price = 5000000` | Mock `Contract.rentPrice = 4200000` | Giá snapshot trong Contract giữ nguyên 4.200.000đ |

---

## 3. Tenant Contract & Requests Validation
| Test ID | Logic / Hàm kiểm tra | Đầu vào (Input) | Điều kiện giả lập (Mock) | Kết quả mong đợi (Expected) |
|---|---|---|---|---|
| **UT-REQ-01** | Validate ngày dự kiến rời đi (Move-out) | `requestMoveoutDate: "invalid-date"` | Không | Báo lỗi validation: ngày không đúng định dạng chuẩn YYYY-MM-DD |
| **UT-REQ-02** | Chỉ số điện chốt checkout âm | `finalReading: -10` | Không | Báo lỗi validation: chỉ số công tơ điện phải >= 0 |
| **UT-REQ-03** | Validate ràng buộc chéo ngày chu kỳ điện | `startDate: 2026-09-25`, `endDate: 2026-09-20` | Không | Báo lỗi logic: `endDate` phải xảy ra sau `startDate` |

---

## 4. Billing Engine Calculation
| Test ID | Logic / Hàm kiểm tra | Đầu vào (Input) | Điều kiện giả lập (Mock) | Kết quả mong đợi (Expected) |
|---|---|---|---|---|
| **UT-BILL-01** | Tính toán điện tiêu thụ trong tháng | `newReading: 250`, `prevReading: 150` | Không | Tiêu thụ = 100 kWh |
| **UT-BILL-02** | Tính tiền điện theo đơn giá Parameter | `consumpAmount: 100` | Mock `electricityUnitPrice = 3800` | Thành tiền điện = 380.000đ |
| **UT-BILL-03** | Tổng hóa đơn hàng tháng | `rent: 3.5M`, `elec: 380k`, `water: 100k` | Không | `totalBill` = 3.980.000đ |