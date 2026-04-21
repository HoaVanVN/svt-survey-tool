# SVT Survey Tool

**Infrastructure Sizing & Customer Survey Platform**

Ứng dụng web thay thế bộ Excel khảo sát hạ tầng, hỗ trợ lưu trữ dữ liệu theo khách hàng và xuất báo cáo sizing.

---

## Tính năng

| Module | Mô tả |
|--------|--------|
| 👥 **Customer Management** | Quản lý danh sách khách hàng, thông tin dự án, presales |
| 💻 **Workload Survey** | Khai báo VM/Server: vCPU, RAM, Disk, IOPS, OS Type, Tier |
| 🌐 **Network & Infra Survey** | Topology, Network Fabric, Storage Network, Power & Cooling, Compliance |
| 💾 **Backup Survey** | Chính sách backup, RTO/RPO theo tier, nguồn dữ liệu |
| 🖥️ **Physical Inventory** | Kiểm kê Server, SAN Switch, Storage, Network Device, WiFi AP |
| 🔒 **Security Questionnaire** | 20 câu hỏi bảo mật với topic phân loại |
| ☸️ **OCP Sizing** | Sizing Red Hat OpenShift 4.x: Master, Worker, Infra, ODF nodes |
| 📊 **Sizing Results** | Kết quả auto-sizing: Compute, Storage, Backup, BOM tổng hợp |
| ⬇️ **Excel Export** | Xuất báo cáo đầy đủ với tất cả sheet, màu sắc, công thức |

---

## Cài đặt

### Option 1: Ubuntu Installer (khuyến nghị cho production)

```bash
git clone https://github.com/YOUR_USERNAME/svt-survey-tool.git
cd svt-survey-tool
sudo bash install.sh
```

Sau khi cài xong, truy cập: `http://SERVER_IP`

**Yêu cầu hệ thống:** Ubuntu 20.04/22.04/24.04, 2 CPU, 2GB RAM, 10GB disk

### Option 2: Docker Compose

```bash
git clone https://github.com/YOUR_USERNAME/svt-survey-tool.git
cd svt-survey-tool
docker compose up -d
```

Truy cập: `http://localhost`

### Option 3: Development (local)

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (terminal mới)
cd frontend
npm install
npm run dev
```

Truy cập: `http://localhost:5173`
API docs: `http://localhost:8000/docs`

---

## Cấu trúc project

```
svt-survey-tool/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic schemas + security questions
│   ├── sizing.py            # Sizing calculation engine
│   ├── database.py          # SQLite database setup
│   ├── routers/
│   │   ├── customers.py     # CRUD khách hàng
│   │   ├── surveys.py       # Survey endpoints (workload, network, backup, ...)
│   │   └── export.py        # Excel export
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js           # API client
│   │   ├── components/      # Layout
│   │   └── pages/           # CustomerList, WorkloadSurvey, NetworkSurvey, ...
│   └── package.json
├── install.sh               # Ubuntu installer
├── uninstall.sh             # Uninstaller
└── docker-compose.yml
```

---

## Quản lý service (Ubuntu)

```bash
# Xem trạng thái
sudo systemctl status svt-survey

# Khởi động lại
sudo systemctl restart svt-survey

# Xem logs
sudo journalctl -u svt-survey -f

# Gỡ cài đặt
sudo bash uninstall.sh
```

---

## Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy, SQLite, openpyxl
- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Deploy:** Nginx (reverse proxy), systemd, Docker
