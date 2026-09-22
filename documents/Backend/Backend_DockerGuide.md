# Chạy RentFlow bằng Docker — hướng dẫn chi tiết

Tài liệu này gom lại toàn bộ các bước để chạy full app (backend + frontend qua Docker, dữ liệu dùng MongoDB Atlas) từ đầu đến lúc mở được lên trình duyệt.

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
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/rentflow?retryWrites=true&w=majority

# Trước: JWT_SECRET=change-me
# Sau — tự nghĩ 1 chuỗi bí mật đủ dài, không share ra ngoài:
JWT_SECRET=a8f3k9x2mZ7qLp1vN5rW8yB4tC6eH0jU

ONBOARDING_TOKEN_SECRET=doi-cai-nay-thanh-chuoi-bi-mat-khac
ONBOARDING_TOKEN_EXPIRES_IN=30m
```

`PORT` giữ nguyên. `MONGO_URI` phải là connection string của MongoDB Atlas, không dùng
`localhost` và cũng không dùng hostname `mongo` vì Compose không chạy Mongo local.

Trong MongoDB Atlas, vào **Network Access** và whitelist IP máy đang chạy Docker.
Cho development có thể dùng `0.0.0.0/0`, nhưng không nên dùng cách này trong production.

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
3. Build image frontend từ `frontend/Dockerfile`.
4. Khởi động hai container (`rentflow-backend`, `rentflow-frontend`).
5. Backend kết nối trực tiếp đến MongoDB Atlas bằng `MONGO_URI` trong `backend/.env`.

Cờ `--build`: bắt Docker build lại image từ đầu — **cần dùng mỗi khi vừa đổi code backend hoặc sửa `Dockerfile`**. Lần chạy sau nếu không đổi gì trong `backend/`, chỉ cần `docker compose up` (bỏ `--build`) cho nhanh hơn.

Lần đầu chạy sẽ hơi lâu (tải image `node:20-alpine` và `nginx:alpine` về máy) — các lần sau có cache rồi thì nhanh hơn nhiều.

---

## 4. Biết khi nào container đã sẵn sàng

Vì không có cờ `-d` (detach), terminal sẽ in log trực tiếp từ backend và frontend. Thấy dòng
`MongoDB Connected` và `Server is running at http://localhost:5000` là backend đã kết nối Atlas.

Nếu thấy log lỗi kết nối Mongo lặp lại liên tục, kiểm tra connection string, username/password
và IP whitelist trên Atlas.

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
Mở:
```
http://localhost:5173
```

Frontend được build với `VITE_API_URL` mặc định là `http://localhost:5000/api`, nên trình duyệt
gọi API qua port backend được publish ra máy host. Nếu đổi port API, đặt biến trước khi build:

PowerShell:
```powershell
$env:VITE_API_URL = "http://localhost:5001/api"
docker compose up --build
```

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

Không có volume Mongo local để xoá; dữ liệu nằm trên Atlas.

---

## 7. Vài lỗi hay gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Cannot connect to Docker daemon` | Docker Desktop chưa mở (Windows/macOS) | Mở app Docker Desktop, đợi sẵn sàng rồi chạy lại |
| `port is already allocated` (5000 hoặc 5173) | Có chương trình khác đang chiếm port đó | Tắt chương trình đang chiếm port, hoặc đổi port map trong `docker-compose.yml` |
| Backend log báo lỗi kết nối Mongo liên tục | Sai `MONGO_URI`, IP chưa whitelist trên Atlas, hoặc username/password sai | Kiểm tra connection string Atlas, Network Access và Database Access |
| `no such file or directory` khi chạy `docker compose up` | Đang đứng sai thư mục, không thấy `docker-compose.yml` | `pwd` + `ls` kiểm tra lại, `cd` về đúng thư mục gốc repo |
| Web frontend trắng trang / lỗi fetch API | Frontend build với sai URL backend | Kiểm tra `VITE_API_URL`, sau đó chạy lại `docker compose up --build` |