# 🚀 Deploy AirShare — ทำตามได้เลย

## วิธีที่เร็วที่สุด: Docker (5 นาที)

### ขั้นตอน

```bash
# 1. Build ทุกอย่าง
cd E:/Engprogram/webfile
docker compose build

# 2. Run
docker compose up -d

# 3. เปิดเว็บ
# Frontend: http://localhost:3001
# Health check: http://localhost:3001/health
```

### ต้องมี
- Docker Desktop ติดตั้งแล้ว
- `.env` มีค่า `IP_SALT` (ใส่อะไรก็ได้ เช่น `my-secret-salt-123`)

---

## วิธีที่ 2: Vercel (Frontend) + Railway (Backend) — ฟรี

### Step 1: Push โค้ดขึ้น GitHub

```bash
cd E:/Engprogram/webfile
git init
git add .
git commit -m "AirShare v1.0"
git remote add origin https://github.com/YOUR_USERNAME/airshare.git
git push -u origin main
```

### Step 2: Deploy Backend (Railway)

1. ไปที่ https://railway.app
2. สมัคร/เข้าสู่ระบบด้วย GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. เลือก repo `airshare`
5. ตั้งค่า:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npx tsc`
   - **Start Command**: `node dist/index.js`
6. ใส่ **Environment Variables**:
   ```
   PORT=3001
   IP_SALT=your-random-secret
   FIREBASE_PROJECT_ID=airshare-wmathongsa
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   NODE_ENV=production
   ```
7. Click **Deploy**
8. จด URL ที่ Railway ให้มา (เช่น `https://airshare-server.up.railway.app`)

### Step 3: Deploy Frontend (Vercel)

1. ไปที่ https://vercel.com
2. สมัคร/เข้าสู่ระบบด้วย GitHub
3. Click **New Project** → Import `airshare` repo
4. ตั้งค่า:
   - **Framework**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `pnpm install && pnpm build`
   - **Output Directory**: `dist`
5. ใส่ **Environment Variables**:
   ```
   VITE_FIREBASE_API_KEY=AIzaSyAn7HB1u9wG48o3HHaV6rCAMMA9FnD9bZw
   VITE_FIREBASE_AUTH_DOMAIN=airshare-wmathongsa.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=airshare-wmathongsa
   VITE_FIREBASE_STORAGE_BUCKET=airshare-wmathongsa.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=975469401120
   VITE_FIREBASE_APP_ID=1:975469401120:web:5fb9cff85a5ffd08b59845
   ```
6. Click **Deploy**
7. จด URL ที่ Vercel ให้มา (เช.g., `https://airshare.vercel.app`)

### Step 4: แก้ CORS

แก้ `.env` ของ Railway backend:
```
CORS_ORIGIN=https://airshare.vercel.app
```

แล้ว Railway จะ auto-redeploy

---

## วิธีที่ 3: Cloudflare Pages (Frontend) + Koyeb (Backend)

### Frontend (Cloudflare Pages)
1. ไป https://dash.cloudflare.com → Pages
2. Create → Connect to Git
3. Build settings:
   - Build command: `cd client && npm install && npm run build`
   - Output: `client/dist`

### Backend (Koyeb)
1. ไป https://koyeb.com
2. Create Service → Docker
3. ใส่ Environment Variables
4. Deploy

---

## ✅ Post-Deploy Checklist

- [ ] เปิด Firebase Console → Authentication → Email/Password
- [ ] ทดสอบ login/register
- [ ] ทดสอบ Guest mode
- [ ] ทดสอบ file transfer (เปิด 2 devices)
- [ ] ทดสอบ clipboard sync
- [ ] ตรวจสอบ HTTPS

---

## 🔧 ปัญหาที่อาจเจอ

### WebSocket ไม่เชื่อมต่อ
- ตรวจสอบ `CORS_ORIGIN` ตั้งค่าถูกต้อง
- ตรวจสอบว่า Railway/Koyeb port ถูกเปิด

### Firebase Auth ไม่ทำงาน
- ตรวจสอบ Email/Password เปิดอยู่ใน Firebase Console
- ตรวจสอบ Environment Variables ถูกต้อง

### File Transfer ไม่สำเร็จ
- ตรวจสอบว่า browser รองรับ WebRTC
- ตรวจสอบ firewall (port UDP)
- ลองเปิด DevTools → Console ดู error
