# RentFlow seed data

`seed.json` là nguồn dữ liệu tham chiếu ban đầu cho seed **development/demo**. Script nên dùng là [`../src/seed.ts`](../src/seed.ts): nó tạo dữ liệu qua Mongoose model, vì thế MongoDB tự sinh ObjectId và mọi foreign key được lấy từ document cha vừa tạo.

> Không dùng `import-seed.cjs` cho seed mới. Nó được giữ lại để tham khảo format JSON cũ có fixed ObjectId. Dùng `npm run seed -- --reset` bên dưới.

Bộ dữ liệu cố ý có các trạng thái khác nhau để cả frontend lẫn backend đều có case để kiểm thử:

- 3 khu, 8 phòng: đang thuê, trống ngay, sắp trống và tạm đóng.
- 1 admin, 4 tenant đang hoạt động và 1 account tạm (`inactive`) để kiểm tra flow first-login.
- Hợp đồng, cơ sở vật chất, chỉ số điện, hoá đơn, ticket và đủ 6 loại request.
- Hoá đơn có cả `not_paid`, `pending`, `paid`; ticket có cả `need_action`, `in_progress`, `done`; request có cả `pending`, `approved`.

## Seed Mongoose được khuyến nghị

Từ thư mục `backend`, tạo `backend/.env` với `MONGO_URI` trỏ tới database test riêng. Sau đó chạy:

```powershell
npm install
npm run seed -- --reset
```

`--reset` là bắt buộc và sẽ xóa dữ liệu trong các collection RentFlow của database mà `MONGO_URI` trỏ tới, rồi tạo lại bộ seed. Chỉ dùng với database development riêng, ví dụ `rentflow_seed_test`; không dùng với Atlas/database chung hoặc production.

Script mới có các quy ước sau:

- MongoDB tự sinh `_id`; không có fixed ID trong code seed.
- Tenant username giữ nguyên room code, bao gồm dấu gạch ngang: `A-101`, `B-101`… Admin là `admin`.
- Parameter dùng day-of-month: `meterReadingStartDay=10`, `meterReadingEndDay=25`, `paymentDueDay=28`.
- Giá trị optional được bỏ nếu chưa phát sinh: admin không có `roomID`, invoice chưa trả không có `paymentDate`, ticket/request chưa giải quyết không có `resolveDate`.

## Import JSON cũ (không khuyến nghị)

File JSON dùng string 24 ký tự để con người dễ review trong Git. `mongoimport` trực tiếp sẽ lưu các string này thành string, trong khi schema Mongoose cần `ObjectId`; các lệnh `populate` và query theo ID sau đó sẽ không khớp. `import-seed.cjs` chuyển `_id` và toàn bộ foreign key sang `ObjectId`, chuyển ngày sang `Date`, rồi hash các password marker trước khi insert.

## Dùng với database local/dev

`import-seed.cjs` vẫn có thể dùng để đối chiếu dữ liệu JSON cố định, nhưng không phản ánh yêu cầu auto-generated ObjectId mới.

```powershell
node seed_data/validate-seed.cjs
$env:MONGO_URI = 'mongodb://localhost:27017/rentflow'
node seed_data/import-seed.cjs
```

Lần nạp đầu dùng lệnh trên. Nếu collection đã có dữ liệu, script sẽ dừng ở lỗi duplicate để không âm thầm ghi đè dữ liệu của team. Chỉ khi chắc chắn được phép xoá **toàn bộ collection RentFlow trong database đang trỏ tới** mới dùng:

```powershell
node seed_data/import-seed.cjs --reset
```

Không chạy `--reset` với MongoDB production hoặc Atlas dùng chung.

## Thứ tự và quan hệ dữ liệu

Script tự nạp theo dependency: `Parameter/Area/FacilityType` → `Room/User` → `Account/Contract/Facility` → `Consumption` → `Invoice/Request/Ticket` → các bảng chi tiết request và ticket.

Các foreign key như `roomID`, `userID`, `contractID`, `requestID` có thể tra thẳng trong file. Mọi `_id` đều được cố định, nên team có thể viết test hoặc gọi API bằng cùng ID mà không cần tìm lại ID sau mỗi lần seed.

## Lưu ý cho backend

- `password` có marker `__HASH_BEFORE_INSERT__:`; script sẽ hash bằng bcrypt (cost 10). Không insert marker hay password mẫu vào production.
- `comsumptionID` được giữ đúng theo schema/ERD hiện tại, dù có lỗi chính tả. Không tự đổi thành `consumptionID` nếu chưa đổi đồng bộ model, service và API.
- Enum trong data (`available_now`, `consump`, `delay`...) khớp enum Mongoose hiện tại. API có thể map chúng thành nhãn thân thiện như `available now` hoặc `CONSUMP_REQUEST` ở response; không nên đổi dữ liệu DB chỉ để khớp label UI.
