# Chạy RentFlow bằng Docker — hướng dẫn chi tiết

Tài liệu này gom lại toàn bộ các bước để chạy full app (backend + MongoDB qua Docker, frontend chạy riêng) từ đầu đến lúc mở được lên trình duyệt.

---

## 0. Chuẩn bị — tuỳ hệ điều hành

| Hệ điều hành | Cần làm gì trước |
|---|---|
| **Windows / macOS** | Cài **Docker Desktop** (tải tại docker.com), **mở app này lên** và để chạy nền trước — 2 hệ này không chạy Docker Engine natively, Docker Desktop tự dựng máy ảo Linux bên trong để chạy Docker. Đợi icon con cá voi hiện ổn định ở khay hệ thống là sẵn sàng. |
| **Ubuntu / Linux** | Không cần mở app nào cả — Docker Engine chạy natively như 1 service nền (`dockerd`), mặc định tự khởi động cùng lúc boot máy. Muốn kiểm tra service có đang chạy không: `sudo systemctl status docker` (thấy `active (running)` là ổn). |

Không mở Docker Desktop (ở Windows/macOS) mà chạy lệnh `docker compose up` sẽ báo lỗi kiểu `Cannot connect to Docker daemon` — đây là lỗi hay gặp nhất lúc mới bắt đầu.

---

## 1. Tạo file `backend/.env`

`docker-compose.yml` cần đọc biến môi trường từ `backend/.env` — file này **không được commit lên Git** (nằm trong `.gitignore`) vì chứa giá trị bí mật thật (JWT secret...), nên **mỗi máy phải tự tạo lấy 1 lần**.

Vị trí: nằm **ngang hàng** với `backend/.env.example`, cùng trong folder `backend/`:

```
backend/
├── .env.example   ← file mẫu, đã có sẵn, đã commit
├── .env           ← CẦN TỰ TẠO, cùng chỗ, KHÔNG commit
├── package.json
└── src/
```

Cách tạo — đứng ở thư mục gốc repo (nơi có `backend/`, `frontend/`):

```bash
cp backend/.env.example backend/.env
```

Sau đó mở `backend/.env` bằng editor (VS Code...), sửa các giá trị placeholder thành giá trị thật, ví dụ:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/rentflow

# Trước: JWT_SECRET=change-me
# Sau — tự nghĩ 1 chuỗi bí mật đủ dài, không share ra ngoài:
JWT_SECRET=a8f3k9x2mZ7qLp1vN5rW8yB4tC6eH0jU

ONBOARDING_TOKEN_SECRET=doi-cai-nay-thanh-chuoi-bi-mat-khac
ONBOARDING_TOKEN_EXPIRES_IN=30m
```

`PORT` và `MONGO_URI` thường giữ nguyên, không cần đổi để chạy local.

Kiểm tra đã tạo đúng:
```bash
ls -a backend/
```
(Dùng `-a` vì `.env` bắt đầu bằng dấu chấm, một số cách liệt kê mặc định sẽ ẩn nó đi.) Thấy có cả `.env` lẫn `.env.example` là đúng.

---

## 2. Đứng đúng thư mục khi chạy lệnh

Mở terminal (Git Bash trên Windows, Terminal trên macOS/Ubuntu) **tại thư mục gốc repo** — nơi có file `docker-compose.yml`, ngang hàng với `backend/`, `frontend/`. Không đứng bên trong `backend/`.

Chưa chắc đang đứng đâu thì gõ:
```bash
pwd   # in ra đường dẫn hiện tại
ls    # liệt kê file/folder ở đây, phải thấy backend/, frontend/, docker-compose.yml
```

---

## 3. Build và chạy container

```bash
docker compose up --build
```

Lệnh này làm gì:
1. Đọc `docker-compose.yml`.
2. Build image cho service `backend` từ `backend/Dockerfile`.
3. Tải image `mongo:7` về (nếu máy chưa có sẵn).
4. Khởi động cả 2 container (`rentflow-backend`, `rentflow-mongo`) cùng lúc, nối mạng nội bộ với nhau.

Cờ `--build`: bắt Docker build lại image từ đầu — **cần dùng mỗi khi vừa đổi code backend hoặc sửa `Dockerfile`**. Lần chạy sau nếu không đổi gì trong `backend/`, chỉ cần `docker compose up` (bỏ `--build`) cho nhanh hơn.

Lần đầu chạy sẽ hơi lâu (tải image `node:20-alpine`, `mongo:7` về máy) — các lần sau có cache rồi thì nhanh hơn nhiều.

---

## 4. Biết khi nào container đã sẵn sàng

Vì không có cờ `-d` (detach), terminal sẽ in log trực tiếp từ cả backend lẫn mongo, xen kẽ nhau. Thấy dòng kiểu server đang lắng nghe (tuỳ nội dung log trong `server.ts`, thường có chữ `listening on port 5000` hoặc tương tự) là backend đã chạy xong, kết nối MongoDB thành công.

Nếu thấy log lỗi kết nối Mongo lặp lại liên tục — kiểm tra lại `MONGO_URI` trong `backend/.env` có đúng `mongodb://mongo:27017/rentflow` không (chú ý: bên trong Docker network, host là tên service `mongo`, không phải `localhost`).

---

## 5. Mở lên trình duyệt

### Backend (API)
Vì `docker-compose.yml` map cổng `"5000:5000"`, backend chạy trong container sẽ truy cập được từ máy thật qua:
```
http://localhost:5000
```
Test thử 1 endpoint đơn giản bằng trình duyệt hoặc Postman, ví dụ:
```
GET http://localhost:5000/api/guest/rooms
```

### Frontend (web)
Frontend **hiện chưa nằm trong `docker-compose.yml`** (service đó đang để comment, vì chưa có `frontend/Dockerfile`) — chạy riêng bằng lệnh thường:

```bash
cd frontend
npm install     # nếu chưa cài lần nào
npm run dev
```

Terminal sẽ tự in ra URL để mở, ví dụ với Vite:
```
➜  Local:   http://localhost:5173/
```

Port cụ thể tuỳ công cụ build frontend đang dùng (xem `frontend/package.json` → `devDependencies`):

| Công cụ | Port mặc định |
|---|---|
| Vite | `http://localhost:5173` |
| Create React App | `http://localhost:3000` |
| Next.js | `http://localhost:3000` |

**Lưu ý:** mở web lên được không có nghĩa là gọi API thành công. Frontend cần biến môi trường trỏ đúng địa chỉ backend (thường kiểu `VITE_API_URL=http://localhost:5000` trong file `.env` riêng của `frontend/`). Web trắng trang hoặc lỗi fetch → kiểm tra lại giá trị này trước.

---

## 6. Tắt container khi xong việc

Cách 1 — đang đứng ở terminal chạy log:
```
Ctrl + C
```

Cách 2 — mở terminal khác, đứng ở thư mục gốc repo:
```bash
docker compose down
```

Muốn xoá luôn dữ liệu Mongo đã lưu (volume `mongo-data`) để test lại từ đầu:
```bash
docker compose down -v
```

---

## 7. Vài lỗi hay gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Cannot connect to Docker daemon` | Docker Desktop chưa mở (Windows/macOS) | Mở app Docker Desktop, đợi sẵn sàng rồi chạy lại |
| `port is already allocated` (5000 hoặc 27017) | Có chương trình khác đang chiếm port đó (vd. đã cài Mongo local chạy nền sẵn) | Tắt chương trình đang chiếm port, hoặc đổi port map trong `docker-compose.yml` |
| Backend log báo lỗi kết nối Mongo liên tục | Sai `MONGO_URI` trong `backend/.env`, đang để `localhost` thay vì `mongo` | Sửa thành `mongodb://mongo:27017/rentflow` |
| `no such file or directory` khi chạy `docker compose up` | Đang đứng sai thư mục, không thấy `docker-compose.yml` | `pwd` + `ls` kiểm tra lại, `cd` về đúng thư mục gốc repo |
| Web frontend trắng trang / lỗi fetch API | Frontend chưa trỏ đúng URL backend | Kiểm tra biến môi trường API URL trong `frontend/.env` |