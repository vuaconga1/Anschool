# AnSchool deploy — Neon + Railway + Vercel

```
Vercel (frontend)  →  https://your-app.vercel.app
Railway (API .NET) →  https://your-api.up.railway.app
Neon (PostgreSQL)  →  connection string trong Railway env
```

Repo: `https://github.com/vuaconga1/Anschool` — nhánh `main`

---

## 1) Neon (PostgreSQL)

1. Vào [https://console.neon.tech](https://console.neon.tech) → tạo project (region gần VN, ví dụ Singapore).
2. Dashboard → **Connection details** → copy connection string (pooler, SSL).
3. Đổi sang dạng .NET/Npgsql:

```text
Host=ep-xxxx.ap-southeast-1.aws.neon.tech;Port=5432;Database=neondb;Username=neondb_owner;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
```

4. Import schema + data (máy local đã có DB `wewin`):

```powershell
# Dump local
pg_dump -h localhost -U postgres -d wewin -F c -f wewin.dump

# Restore lên Neon (dùng connection string Neon)
pg_restore --no-owner --no-acl -d "postgresql://neondb_owner:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" wewin.dump
```

Hoặc trên Railway sau khi API chạy: gọi endpoint import Excel (nếu bạn dùng luồng admin import).

---

## 2) Railway (ASP.NET API)

1. [https://railway.app](https://railway.app) → Login bằng GitHub.
2. **New Project** → **Deploy from GitHub repo** → chọn `vuaconga1/Anschool`.
3. Cấu hình service:
   - **Root Directory:** `backend`
   - Dùng `backend/railway.json` + `backend/Dockerfile`
   - Port: **8080**
   - Healthcheck: `/api/health`
4. **Variables** (Settings → Variables):

```env
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
ConnectionStrings__DefaultConnection=Host=ep-xxxx...;Port=5432;Database=neondb;Username=neondb_owner;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
Cors__Origins__0=https://YOUR-VERCEL-APP.vercel.app
AzureSpeech__Key=
AzureSpeech__Region=southeastasia
```

5. Deploy → lấy Public URL, ví dụ `https://anschool-production.up.railway.app`.
6. Kiểm tra:

```powershell
curl https://YOUR-RAILWAY-API.up.railway.app/api/health
```

Kỳ vọng JSON `ok: true`.

---

## 3) Vercel (frontend Vite/React)

1. [https://vercel.com](https://vercel.com) → Import repo `vuaconga1/Anschool`.
2. Cấu hình project:

| Mục | Giá trị |
|---|---|
| **Root Directory** | `frontend` |
| **Framework** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

`frontend/vercel.json` đã có sẵn.

3. **Environment Variables** (Production):

```env
VITE_BASE_PATH=/
VITE_API_BASE_URL=https://YOUR-RAILWAY-API.up.railway.app/api
```

4. Deploy → lấy URL Vercel.
5. Quay lại Railway → cập nhật `Cors__Origins__0` = URL Vercel (không có `/` cuối) → Redeploy API.

---

## 4) Checklist sau deploy

- [ ] `GET /api/health` trên Railway OK
- [ ] `GET /api/app/bootstrap?game=kindergarten` trả units
- [ ] Mở Vercel → chọn Kindergarten → sidebar hiện unit
- [ ] Game nghe được audio (Network: `/assets/audios/...` status 200)
- [ ] CORS: không lỗi trong DevTools khi gọi API

---

## 5) Lưu ý

- **Không** commit password Neon / Azure key vào git.
- Assets (~100MB+) nằm trong `frontend/public/assets` — lần build Vercel có thể lâu.
- Nếu đổi domain Vercel/custom domain → cập nhật lại `Cors__Origins__0` trên Railway.
- Azure Speech chỉ cần cho game phát âm; để trống thì game khác vẫn chạy.
