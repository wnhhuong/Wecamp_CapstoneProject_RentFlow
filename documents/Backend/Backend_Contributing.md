# Backend — Quy trình code & CI

Tài liệu này để cả team làm đúng flow, tránh push lên bị CI đỏ hoặc đụng code nhau.

**Nguyên tắc cốt lõi cần nhớ trước tiên:** có 2 nhóm lệnh hoàn toàn khác mục đích, đừng lẫn lộn.

| Nhóm | Để làm gì | Chạy khi nào |
|---|---|---|
| **Chạy app** (`npm run dev`) | Bật backend lên để code và test tính năng, tự connect vào MongoDB Atlas dùng chung của team | 1 lần đầu buổi, để chạy nền suốt cả lúc code |
| **Chạy kiểm tra** (`npm run lint`, `npm run build`) | Soát lỗi chính tả/kiểu dữ liệu code — không chạy app, không kết nối Mongo | Chỉ 1 lần, ngay trước khi push |

---

## Flow đầy đủ 1 ngày code — làm theo đúng thứ tự này

### Bước 1 — Đầu buổi: kéo code mới, tạo branch

```bash
git checkout main
git pull origin main
git checkout -b feature/ten-tinh-nang
```
Không code thẳng trên `main`. Đặt tên branch: `feature/...`, `fix/...`, `chore/...`.

### Bước 2 — Bật app lên, để chạy nền suốt buổi

Database dùng chung của team là **MongoDB Atlas** (không phải Mongo chạy Docker local nữa). Setup lần đầu — chỉ cần làm 1 lần duy nhất khi mới clone repo về:

```bash
cd backend
npm install
cp .env.example .env
```

Mở `backend/.env` vừa tạo, thay dòng `MONGO_URI=` bằng connection string Atlas thật — **xin trong nhóm chat team** (KHÔNG có sẵn trong repo, không commit lên Git dưới bất kỳ hình thức nào — kể cả trong file `.md` này).

Sau khi có `.env` đúng, chạy backend bình thường:

```bash
cd backend && npm run dev        # tự connect vào Atlas qua MONGO_URI trong .env
```

> Chỉ dùng `docker compose up mongo` khi cần code offline (không có mạng) hoặc muốn test dữ liệu tự do mà không ảnh hưởng database chung Atlas của team — lúc đó tạm đổi `MONGO_URI` trong `.env` sang `mongodb://localhost:27017/rentflow`, xong việc thì đổi lại về Atlas.

> Không dùng `docker compose up --build` (full backend + mongo qua Docker) cho việc code hằng ngày — chậm vì phải rebuild image mỗi lần đổi code. Cách này chỉ dùng thi thoảng để test xem app chạy đúng trong container Docker chưa, trước khi merge/deploy.

### Bước 3 — Code tính năng, test ngay, lặp lại

1. Sửa code trong `src/` (đi đúng route → controller → service → model như spec đã chốt), lưu file — `npm run dev` tự reload, không cần restart gì.
2. Mở Postman/trình duyệt gọi thử API vừa viết, dùng đúng app đang chạy ở Bước 2.
3. Lặp lại 1-2 đến khi tính năng chạy đúng ý.

Trong lúc code, để ý:
- Field/tên/enum phải khớp `Backend_API_Spec.md` (vd. `isRequestLate` không phải `isRequestDelay`, `REQUEST.type` chỉ 6 giá trị, không có `SUBUSER`).
- Không hardcode secret/URL — lấy từ `process.env`; thêm biến mới thì khai báo luôn trong `.env.example` (không phải `.env` thật) để người khác biết cần set gì.

### Bước 4 — Xong tính năng, kiểm tra trước khi push (chạy đúng 1 lần)

```bash
npm run lint
npm run build
```
Đây là bước **duy nhất trong ngày** không liên quan gì đến app đang chạy ở Bước 2 — chạy xong vài giây là ra kết quả.

- Lint báo lỗi/warning → sửa hết rồi chạy lại.
- Build báo lỗi (`tsc`) → thường là lỗi type/thiếu import, sửa xong build pass mới qua bước tiếp.

Nếu có thêm dependency mới trong lúc code:
```bash
git add package-lock.json
```
Thiếu file này cập nhật → `npm ci` trên CI sẽ cài sai/thiếu package hoặc fail thẳng.

### Bước 5 — Không lỗi gì → commit & push

```bash
git add .
git commit -m "feat: mô tả ngắn gọn thay đổi"
git push origin feature/ten-tinh-nang
```
Convention commit message: `feat:` tính năng mới · `fix:` sửa bug · `chore:` việc lặt vặt (config, deps) · `docs:` tài liệu.

### Bước 6 — Mở Pull Request vào `main`

- Push branch xong thì mở PR trên GitHub, **không push thẳng lên `main`**.
- `backend-ci.yml` tự chạy lại đúng `npm run lint` + `npm run build` trên server GitHub (chỉ khi PR/commit có đổi file trong `backend/**`, đổi frontend thì không trigger).
- Đợi CI xanh mới merge. CI đỏ thì vào tab **Actions** xem log — thường lỗi giống y hệt lúc chạy ở Bước 4 tại local.
- Merge xong, xoá branch cũ, quay lại Bước 1 cho tính năng tiếp theo.

---

## Mấy lỗi CI hay gặp

| Lỗi | Nguyên nhân thường gặp |
|---|---|
| CI fail ngay bước `npm ci` | Thiếu/không khớp `package-lock.json` — cài lại `npm install` rồi commit lock file |
| CI fail bước lint | Chưa chạy `npm run lint` ở local trước khi push (bỏ qua Bước 4) |
| CI fail bước build | Lỗi TypeScript (sai type, thiếu import...) — chạy `npm run build` ở local để thấy lỗi rõ hơn message trên GitHub |
| CI không chạy dù có push | Đổi file ngoài `backend/**` (vd. chỉ đổi frontend hoặc README ở root) — đúng hành vi vì có path filter, không phải bug |

## Không commit

- `node_modules/`, `dist/`, `.env` thật — đã có trong `.gitignore`, kiểm tra `git status` trước khi `add` nếu thấy nghi ngờ.
- File upload thật trong `uploads/` — chỉ giữ `.gitkeep`, ảnh thật không push lên repo.