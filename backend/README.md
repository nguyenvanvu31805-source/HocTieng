# Quizlet Clone Backend

Backend REST API cho ứng dụng học từ vựng bằng Node.js, Express và MySQL.

## Chạy local

1. Đảm bảo MySQL đang chạy và database đã được tạo theo schema của project.
2. Cập nhật thông tin kết nối trong `.env`.
3. Cài dependencies:

```bash
npm install
```

4. Chạy development server:

```bash
npm run dev
```

API mặc định chạy tại `http://localhost:5000`.
Health check: `GET /api/health`

### Tạo dữ liệu demo

Sau khi cấu hình MySQL trong `.env`, chạy:

```bash
npm run seed:demo
```

Lệnh này tạo/cập nhật demo users, một Study Set public và cards mẫu. Có thể chạy lại mà không tạo thêm Study Set trùng.

Demo accounts:

- `teacher.demo@quizletclone.local` / `Teacher@12345`
- `student.demo@quizletclone.local` / `Student@12345`

Study Set demo có `setId = 1` nếu database đang trống. Trong Admin Web mở Cards và nhập `1` để tải cards.

## Auth API mẫu

- `POST /api/auth/register`: tạo tài khoản STUDENT, password được hash bằng bcryptjs.
- `POST /api/auth/login`: đăng nhập bằng email hoặc username và trả JWT.
- `GET /api/auth/me`: lấy thông tin user hiện tại từ JWT.

Gửi JWT cho các API cần đăng nhập bằng header `Authorization: Bearer <token>`.

### Postman

Chọn `Body -> raw -> JSON` cho các request POST.

#### Register

`POST http://localhost:5000/api/auth/register`

```json
{
  "username": "nguyenan",
  "email": "an@example.com",
  "password": "secret123",
  "full_name": "Nguyen Van An"
}
```

#### Login bằng email

`POST http://localhost:5000/api/auth/login`

```json
{
  "email": "an@example.com",
  "password": "secret123"
}
```

Có thể thay `email` bằng `username`.

#### Login response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<JWT_TOKEN>",
    "user": {
      "user_id": 1,
      "username": "nguyenan",
      "email": "an@example.com",
      "full_name": "Nguyen Van An",
      "avatar_url": null,
      "role": "STUDENT",
      "status": "ACTIVE"
    }
  }
}
```

#### Current user

`GET http://localhost:5000/api/auth/me`

Trong tab `Authorization`, chọn type `Bearer Token` và dán giá trị `token` nhận được từ login.

```json
{
  "success": true,
  "message": "Current user retrieved successfully",
  "data": {
    "user_id": 1,
    "username": "nguyenan",
    "email": "an@example.com",
    "full_name": "Nguyen Van An",
    "avatar_url": null,
    "role": "STUDENT",
    "status": "ACTIVE"
  }
}
```

## Cards API

Các request tạo, sửa và xóa card cần JWT của creator Study Set hoặc ADMIN.
GET cards không cần JWT khi Study Set là `PUBLIC` và `ACTIVE`.

### Lấy cards

`GET http://localhost:5000/api/study-sets/1/cards`

Response mẫu:

```json
{
  "success": true,
  "message": "Cards retrieved successfully",
  "data": [
    {
      "card_id": 1,
      "set_id": 1,
      "term": "abandon",
      "definition": "to leave behind",
      "pronunciation": "/əˈbændən/",
      "example": "He decided to abandon the plan.",
      "image_url": null,
      "audio_url": null,
      "position": 1
    }
  ]
}
```

### Tạo card

`POST http://localhost:5000/api/study-sets/1/cards`

Authorization: `Bearer <CREATOR_OR_ADMIN_TOKEN>`

```json
{
  "term": "abandon",
  "definition": "to leave behind",
  "pronunciation": "/əˈbændən/",
  "example": "He decided to abandon the plan.",
  "image_url": "https://example.com/abandon.jpg",
  "audio_url": "https://example.com/abandon.mp3",
  "position": 1
}
```

### Sửa card

`PUT http://localhost:5000/api/cards/1`

Authorization: `Bearer <CREATOR_OR_ADMIN_TOKEN>`

Body JSON dùng cùng cấu trúc với request tạo card.

### Xóa card

`DELETE http://localhost:5000/api/cards/1`

Authorization: `Bearer <CREATOR_OR_ADMIN_TOKEN>`

Response thành công:

```json
{
  "success": true,
  "message": "Card deleted successfully",
  "data": null
}
```

Nếu Study Set không tồn tại, `setId` không hợp lệ, card không tồn tại, hoặc user không phải creator/ADMIN, API trả lỗi JSON với `success: false`.

## Admin read APIs

Các API dưới đây yêu cầu JWT của user có role `ADMIN`:

- `GET /api/users`: danh sách users, không bao gồm `password_hash`.
- `GET /api/study-sets`: danh sách Study Sets, creator và số lượng cards.
- `GET /api/dashboard/stats`: tổng users, Study Sets, cards, study sessions và test results.

Lấy token:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"Admin@12345"}'
```

Sau đó gửi token trong header:

```bash
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer <JWT_TOKEN>"

curl http://localhost:5000/api/study-sets \
  -H "Authorization: Bearer <JWT_TOKEN>"

curl http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

## Cấu trúc thư mục

- `config/`: cấu hình môi trường và MySQL connection pool.
- `controllers/`: nhận request và trả response.
- `services/`: xử lý nghiệp vụ.
- `repositories/`: truy vấn database bằng prepared statements.
- `routes/`: khai báo endpoint và kết nối controller.
- `middleware/`: JWT, phân quyền role, CORS/error middleware.
- `utils/`: helper dùng chung như lỗi, response và async handler.
- `app.js`: cấu hình Express app.
- `server.js`: entry point khởi động HTTP server.

Các module domain khác như `study-sets`, `cards`, `classes` và `assignments` có thể được thêm theo cùng luồng `route -> controller -> service -> repository` mà không thay đổi schema.
