# Backend — Quy trình code & CI

Tài liệu này để cả team làm đúng flow, tránh push lên bị CI đỏ hoặc đụng code nhau.

## 1. Setup lần đầu

```bash
cd backend
npm install
cp .env.example .env      # rồi tự điền giá trị thật vào .env (không commit file này)
```

Chạy dev bằng 1 trong 2 cách:

```bash
# Cách 1 — chạy trực tiếp, cần Mongo local hoặc Mongo Atlas
npm run dev

# Cách 2 — chạy full qua docker-compose (backend + mongo), ở ROOT repo
docker compose up --build
```

## 2. Trước khi code 1 tính năng mới

1. Kéo code mới nhất:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Tạo branch riêng, **không code thẳng trên `main`**:
   ```bash
   git checkout -b feature/ten-tinh-nang
   ```
   Đặt tên branch theo dạng: `feature/...`, `fix/...`, `chore/...`.

## 3. Trong lúc code

- Đi đúng cấu trúc đã chốt trong spec: route → controller → service → model. Logic tính toán (bill, approve theo request type...) để trong `services/`, đừng nhồi hết vào controller.
- Field/tên/enum phải khớp với `Backend_API_Spec.md` (đặc biệt: dùng `isRequestLate` không phải `isRequestDelay`, `REQUEST.type` chỉ có 6 giá trị, không có `SUBUSER`).
- Không hardcode secret/URL — lấy từ `process.env`, khai báo tương ứng trong `.env.example` (không phải `.env` thật) nếu thêm biến mới, để người khác biết cần set gì.

## 4. Trước khi commit/push — bắt buộc chạy local trước

CI (`backend-ci.yml`) sẽ chạy đúng 2 bước: **lint** rồi **build**. Chạy y hệt ở local trước để không bị fail lãng xẹt trên GitHub:

```bash
npm run lint
npm run build
```

- Lint lỗi → sửa hết warning/error trước khi push.
- Build lỗi (`tsc`) → thường là lỗi type, sửa xong build pass mới push.

Nếu `package.json` có thêm dependency mới, nhớ:
```bash
git add package-lock.json
```
Thiếu `package-lock.json` cập nhật → `npm ci` trên CI sẽ cài sai/thiếu package hoặc fail thẳng.

## 5. Commit & push

```bash
git add .
git commit -m "feat: mô tả ngắn gọn thay đổi"
git push origin feature/ten-tinh-nang
```

Convention cho commit message (không bắt buộc gắt nhưng nên theo):
`feat:` tính năng mới · `fix:` sửa bug · `chore:` việc lặt vặt (config, deps) · `docs:` tài liệu.

## 6. Mở Pull Request vào `main`

- Push branch xong thì mở PR trên GitHub, KHÔNG push thẳng lên `main`.
- `backend-ci.yml` chỉ tự chạy khi PR/commit có đổi file trong `backend/**` (path filter) — đổi frontend thì CI backend sẽ không chạy, đúng như thiết kế.
- Đợi CI xanh (lint + build pass) rồi mới merge. CI đỏ thì bấm vào tab **Actions** trên GitHub xem log, thường lỗi giống y hệt lúc chạy `npm run lint`/`npm run build` ở local.
- Merge xong, xoá branch cũ, quay lại bước 2 cho tính năng tiếp theo.

## 7. Mấy lỗi CI hay gặp

| Lỗi | Nguyên nhân thường gặp |
|---|---|
| CI fail ngay bước `npm ci` | Thiếu/không khớp `package-lock.json` — cài lại `npm install` rồi commit lock file |
| CI fail bước lint | Code chưa chạy `npm run lint` ở local trước khi push |
| CI fail bước build | Lỗi TypeScript (sai type, thiếu import...) — chạy `npm run build` ở local để thấy lỗi rõ hơn message trên GitHub |
| CI không chạy dù có push | Đổi file ngoài `backend/**` (vd. chỉ đổi frontend hoặc README ở root) — đúng hành vi vì có path filter, không phải bug |

## 8. Không commit

- `node_modules/`, `dist/`, `.env` thật — đã có trong `.gitignore` rồi, kiểm tra `git status` trước khi `add` nếu thấy nghi ngờ.
- File upload thật trong `uploads/` — chỉ giữ `.gitkeep`, ảnh thật không push lên repo.
