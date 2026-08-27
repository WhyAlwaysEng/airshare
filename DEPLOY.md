# 🚀 AirShare Deployment Guide

## สิ่งที่ต้องเตรียมก่อน Deploy

### 1. Firebase Setup (จำเป็น)

```
1. ไปที่ https://console.firebase.google.com
2. เลือกโปรเจกต์ airshare-wmathongsa
3. Authentication → Sign-in method → เปิด Email/Password
4. (ถ้าต้องการ Google Sign-In → เปิด Google ด้วย)
```

### 2. Environment Variables

**Client** (`client/.env`):
```env
VITE_FIREBASE_API_KEY=AIzaSyAn7HB1u9wG48o3HHaV6rCAMMA9FnD9bZw
VITE_FIREBASE_AUTH_DOMAIN=airshare-wmathongsa.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=airshare-wmathongsa
VITE_FIREBASE_STORAGE_BUCKET=airshare-wmathongsa.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=975469401120
VITE_FIREBASE_APP_ID=1:975469401120:web:5fb9cff85a5ffd08b59845
```

**Server** (`.env`):
```env
PORT=3001
IP_SALT=<สุ่ม-string-อะไรก็ได้>
FIREBASE_PROJECT_ID=airshare-wmathongsa
FIREBASE_SERVICE_ACCOUNT_KEY=<JSON จาก Firebase Console>
CORS_ORIGIN=https://your-domain.com
```

### 3. สร้าง Service Account Key

```
1. Firebase Console → Project Settings → Service accounts
2. Click "Generate new private key"
3. ได้ไฟล์ JSON → เอาเนื้อหาทั้งหมดใส่ใน FIREBASE_SERVICE_ACCOUNT_KEY
```

---

## วิธี Deploy

### วิธีที่ 1: Docker (แนะนำ)

```bash
# 1. Build
docker compose build

# 2. Run
docker compose up -d

# 3. Check
curl http://localhost:3001/health
```

### วิธีที่ 2: Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel)**:
```bash
# 1. Push โค้ดขึ้น GitHub
# 2. ไป vercel.com → Import → เลือก repo
# 3. ตั้งค่า:
#    - Framework: Vite
#    - Build Command: cd client && npm install && npm run build
#    - Output: client/dist
# 4. ใส่ Environment Variables ใน Vercel
# 5. Deploy
```

**Backend (Railway)**:
```bash
# 1. ไป railway.app → New Project → Docker
# 2. เลือก repo
# 3. ใส่ Environment Variables
# 4. Deploy
```

### วิธีที่ 3: Cloudflare Pages + Koyeb

**Frontend (Cloudflare Pages)**:
```bash
# 1. ไป dash.cloudflare.com → Pages
# 2. Create → Connect to Git
# 3. Build settings:
#    - Build command: cd client && npm install && npm run build
#    - Output: client/dist
```

**Backend (Koyeb)**:
```bash
# 1. ไป koyeb.com
# 2. Create Service → Docker
# 3. ใส่ Environment Variables
```

### วิธีที่ 4: Self-Hosted (VPS)

```bash
# 1. SSH เข้า VPS
ssh user@your-vps-ip

# 2. Clone โค้ด
git clone https://github.com/YOUR_USERNAME/airshare.git
cd airshare

# 3. ตั้งค่า .env
cp .env.example .env
nano .env  # แก้ไขค่า

# 4. Build & Run
docker compose up -d

# 5. ตั้งค่า Nginx (ถ้าต้องการ)
# ดูตัวอย่างด้านล่าง
```

---

## Nginx Config (สำหรับ Self-Hosted)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

---

## Security Checklist

- [x] Firebase Auth (Email/Password)
- [x] Service Account Key สำหรับ server-side verification
- [x] Rate limiting (API: 100/15min, WS: 10/min)
- [x] Helmet security headers
- [x] CORS configuration
- [x] Input sanitization
- [x] Non-root Docker user
- [x] HTTPS (via Cloudflare/Vercel/Nginx)
- [x] Environment variables (ไม่ hardcode secrets)
- [x] .gitignore (ป้องกัน .env หลุด)

---

## Post-Deploy Checklist

- [ ] ทดสอบ login/register
- [ ] ทดสอบ file transfer
- [ ] ทดสอบ clipboard sync
- [ ] ทดสอบ cross-network PIN
- [ ] ตรวจสอบ WebSocket connection
- [ ] ตรวจสอบ Firebase token verification
- [ ] ตรวจสอบ rate limiting
- [ ] ตรวจสอบ HTTPS

---

## Troubleshooting

### WebSocket ไม่เชื่อมต่อ
```
- ตรวจสอบว่า CORS_ORIGIN ตั้งค่าถูกต้อง
- ตรวจสอบว่า nginx proxy WebSocket ถูกต้อง
- ตรวจสอบว่า port 3001 เปิดอยู่
```

### Firebase Auth ไม่ทำงาน
```
- ตรวจสอบว่า Email/Password เปิดอยู่ใน Firebase Console
- ตรวจสอบ .env ค่า Firebase config ถูกต้อง
- ตรวจสอบ Service Account Key ถูกต้อง
```

### File Transfer ไม่สำเร็จ
```
- ตรวจสอบว่า STUN/TURN server ทำงาน
- ตรวจสอบ browser WebRTC support
- ตรวจสอบ firewall (port UDP)
```
