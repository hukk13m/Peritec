# PERITEC — B2B Sales Support System (MVP)

Hệ thống hỗ trợ bán hàng B2B cho PERITEC: website công khai cho khách xem thiết bị
đo lường RF & vô tuyến, cổng khách hàng để theo dõi YCBG / báo giá / đơn hàng, và
không gian nội bộ cho Sales / Kỹ thuật / Admin xử lý yêu cầu và tiến độ nhập khẩu.

> Trạng thái hiện tại: **`[TESTED]`** — xem chi tiết ở [`STATUS.md`](./STATUS.md).
> Hợp đồng API đầy đủ ở [`../CONTRACT.md`](../CONTRACT.md).

---

## 1. Thành phần

| Thành phần | Thư mục | Công nghệ | Cổng |
|---|---|---|---|
| Backend API | `backend/` | Node.js + TypeScript (`tsx`) + Express + Mongoose | `3000` |
| Frontend web | `frontend/` | Angular 22 (standalone) + Tailwind 3.4 | `4200` |
| Cơ sở dữ liệu | — | MongoDB `mongodb://localhost:27017/Peritec` | `27017` |

Frontend dev server tự proxy `/api` sang `http://localhost:3000` (cấu hình ở
`frontend/proxy.conf.json`), nên **phải bật backend trước**.

---

## 2. Ba phân hệ

### 2.1 Public Web (`/`)
- Trang chủ, danh mục thiết bị, chi tiết thiết bị, tìm kiếm & lọc theo ứng dụng/hãng.
- **So sánh tối đa 3 thiết bị** cùng nhóm ứng dụng (BR-13); thông số chưa xác nhận
  hiển thị là *"Cần xác nhận theo datasheet/cấu hình"*, không tự suy diễn.
- **Giỏ RFQ** 3 bước → gửi yêu cầu báo giá, trang xác nhận thành công, form liên hệ,
  đăng nhập / đăng ký doanh nghiệp.

### 2.2 Customer Portal (`/portal`)
- Tổng quan, lịch sử YCBG, chi tiết YCBG, xác nhận / yêu cầu chỉnh sửa báo giá.
- Theo dõi đơn hàng nhập khẩu theo **5 giai đoạn**; tài liệu (chỉ loại khách xem được).
- Dữ liệu được giới hạn theo `companyId` của khách (BR-12): không thấy giá nội bộ,
  không thấy ghi chú nội bộ, truy cập chéo công ty → `403`.

### 2.3 Internal Workspace (`/workspace`)
- Dashboard / hàng đợi YCBG, phân công Sales + Kỹ thuật, ghi chú nội bộ vs khách hàng.
- Tạo báo giá (v1), chỉnh sửa phiên bản mới (v2…), gửi báo giá.
- Quản lý đơn hàng: 5 giai đoạn nhập khẩu, cập nhật ETA (bắt buộc lý do), thông tin giao hàng.
- Danh bạ công ty, xác thực / khoá doanh nghiệp.
- Kỹ thuật **không** được tạo/gửi/sửa báo giá hay phân công (BR-08 → `403`).

---

## 3. Yêu cầu cài đặt

- **Node.js ≥ 20** (khuyến nghị 22+)
- **MongoDB** đang chạy ở `mongodb://localhost:27017` (service, Docker, hoặc Atlas tuỳ chỉnh)
- npm (repo dùng `npm@12`; nếu bị chặn install scripts, thêm `--ignore-scripts`)

Kiểm tra nhanh:

```powershell
node -v
mongosh --eval "db.runCommand({ping:1})"
```

---

## 4. Cách chạy

### Cách A — chạy từng phần (khuyến nghị khi phát triển)

**Terminal 1 — Backend**

```powershell
cd peritec-mvp/backend
npm install
npm run seed     # nạp dữ liệu mẫu (chạy lại bất cứ lúc nào để reset)
npm run dev      # auto-reload khi sửa code → http://localhost:3000
```

Kiểm tra: http://localhost:3000/api/health → `{"status":"ok","db":"connected"}`.

**Terminal 2 — Frontend**

```powershell
cd peritec-mvp/frontend
npm install      # nếu npm chặn install scripts: npm install --ignore-scripts
npm start        # → http://localhost:4200
```

### Cách B — dùng script gốc `peritec-mvp/`

```powershell
cd peritec-mvp
npm run install:all      # cài cả backend + frontend
npm run seed             # nạp dữ liệu mẫu

# mở 2 terminal:
npm run dev:backend      # backend watch mode
npm run dev:frontend     # frontend dev server
```

> `npm run start:backend` chạy backend **không** watch — dùng khi chỉ demo.
> Sau khi sửa code backend, phải khởi động lại (hoặc dùng `dev:backend`).

---

## 5. Tài khoản đăng nhập

Mật khẩu chung: **`Peritec@123`**

| Vào đâu | URL | Email | Vai trò |
|---|---|---|---|
| Web công khai | http://localhost:4200 | — | khách (không cần login) |
| Customer Portal | http://localhost:4200/portal | `customer@anviet.example` | customer (An Việt) |
| Nội bộ — Sales | http://localhost:4200/workspace | `sales@peritec.vn` | sales |
| Nội bộ — Kỹ thuật | http://localhost:4200/workspace | `engineering@peritec.vn` | engineering |
| Nội bộ — Admin | http://localhost:4200/workspace | `admin@peritec.vn` | admin |

---

## 6. Dữ liệu mẫu (sau `npm run seed`)

| Thực thể | Số lượng / ghi chú |
|---|---|
| Companies | 3 — An Việt (active), Minh Phát (active), Sao Việt (pending) |
| Users | 4 — admin / sales / engineering / customer |
| Products | 8 — HAROGIC SAN-45/60/90, NI mioDAQ-8, Ettus USRP X420, Digilent AD3, Pickering PXIe-1092, AMETEK Asterion |
| RFQs | 4 — `RFQ-261025-014` (đã gửi BG), `RFQ-261018-006` (→ đơn), `RFQ-261119-001` (mới), `RFQ-261120-002` (đang kiểm tra) |
| Quotations | 3 — `BG-261025-014` v1 (hết hạn), `BG-261105-001` v2 (đang hiệu lực), `BG-261018-006` v1 (đã xác nhận) |
| Orders | 1 — `PO-261018-006`, giai đoạn 3/5, ETA 2026-12-12 |
| Logs / Docs | 15 xử lý · 6 chứng từ |

Mã tự sinh (BR-05): `RFQ-YYMMDD-NNN`, `BG-YYYYMMDD-NNN`, `PO-YYYYMMDD-NNN`.

---

## 7. Kiểm thử

```powershell
cd peritec-mvp/backend
npm run smoke     # bộ nghiệm thu (44 case) — bao phủ BR-02/03/05/08/09/10/11/12/13
npm run seed      # BẮT BUỘC chạy lại sau smoke vì smoke ghi vào DB
```

- `npm run typecheck` — kiểm tra TypeScript backend.
- `npm run build` (trong `frontend/`) — build production; cảnh báo vượt 500 kB là
  **warning**, không phải lỗi.
- `qa-testing/` ở thư mục gốc repo chứa biên bản QA (55/55 case API PASS).

---

## 8. Quy tắc nghiệp vụ đã thực thi

| Mã | Nội dung |
|---|---|
| BR-02 | YCBG có ≥ 1 thiết bị, số lượng ≥ 1 |
| BR-03 | Bắt buộc trường liên hệ + đồng ý chính sách bảo mật |
| BR-05 | Tự sinh mã RFQ / báo giá / PO |
| BR-08 | Kỹ thuật bị chặn tạo/gửi/sửa báo giá và phân công (`403`) |
| BR-09 | Phiên bản báo giá: bản đã gửi bất biến, bản hết hạn không tạo được đơn |
| BR-10 | Chỉ tạo đơn từ báo giá đã xác nhận và còn hiệu lực |
| BR-11 | 5 giai đoạn đúng thứ tự; mọi thay đổi ETA ghi lý do + người + thời gian |
| BR-12 | Khách chỉ thấy dữ liệu công ty mình; ẩn giá & ghi chú nội bộ |
| BR-13 | So sánh 2–3 thiết bị cùng nhóm; giá trị chưa xác nhận giữ nguyên trạng thái |

---

## 9. Cấu trúc thư mục

```
peritec-mvp/
├── backend/
│   ├── src/
│   │   ├── config/         # biến môi trường
│   │   ├── middleware/     # auth, phân quyền, xử lý lỗi
│   │   ├── models/         # Mongoose schemas (User, Company, Product, RFQ, ...)
│   │   ├── routes/         # auth, public, portal, workspace, quotations, orders, files
│   │   ├── services/       # logic nghiệp vụ (vd: tiến trình giai đoạn đơn hàng)
│   │   ├── utils/          # sinh mã, PDF, ...
│   │   ├── seed/           # seed.ts (dữ liệu mẫu), smoke.ts (bộ test)
│   │   ├── app.ts          # khai báo Express app
│   │   └── server.ts       # entrypoint
│   └── package.json
├── frontend/
│   ├── src/app/
│   │   ├── core/           # auth service, API client, guards, interceptors
│   │   ├── public/         # trang công khai
│   │   ├── portal/         # cổng khách hàng
│   │   ├── workspace/      # không gian nội bộ
│   │   └── shared/         # component/UI dùng chung, theme
│   ├── proxy.conf.json     # proxy /api → :3000
│   └── package.json
├── package.json            # script gốc (install:all, seed, dev:backend, ...)
├── STATUS.md               # trạng thái build & QA
└── README.md               # file này
```

Tài liệu liên quan: [`CONTRACT.md`](../CONTRACT.md) (đặc tả API), [`STATUS.md`](./STATUS.md)
(trạng thái & hạn chế), `../qa-testing/` (kết quả kiểm thử), `../report-docs/` (báo cáo).

---

## 10. Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| `EADDRINUSE` (cổng bận) | `Get-NetTCPConnection -LocalPort 3000 -State Listen \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` (đổi 3000 → 4200 cho frontend) |
| `npm install` bị chặn install scripts | Thêm `--ignore-scripts` |
| Trang trắng / API 404 | Backend chưa bật, hoặc vừa sửa backend mà dùng `start` (không watch) → khởi động lại |
| Dữ liệu demo bị lẫn | `npm run seed` để nạp lại dữ liệu chuẩn |
| Ảnh/PDF không tải | PDF sinh tại chỗ bằng `pdfkit`; email gửi chỉ là mô phỏng, không có mail thật |

---

## 11. Hạn chế đã biết (MVP)

- Email và "gửi" PDF là **mô phỏng**; PDF sinh tại chỗ và stream, không gửi mail.
- Token JWT lưu trong `localStorage` — đủ cho MVP, chưa phải cấu hình auth production.
- Bundle frontend vượt ngưỡng cảnh báo 500 kB (không phải lỗi); có thể lazy-load route.
- `npm run smoke` thay đổi DB → chạy `npm run seed` lại trước khi demo.
