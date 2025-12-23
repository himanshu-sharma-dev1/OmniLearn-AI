# OmniLearn DigitalOcean Deployment Guide
## Complete Step-by-Step Instructions

---

## 🚀 Phase 1: Prepare Local Files (DONE)

✅ Created `requirements-lite.txt` - lightweight version without Whisper/PyTorch

**Test locally (optional):**
```bash
cd /Users/himanshusharma/intelli-tutor/backend
pip install -r requirements-lite.txt
```

**Commit to GitHub:**
```bash
cd /Users/himanshusharma/intelli-tutor
git add backend/requirements-lite.txt
git commit -m "feat: Add lightweight requirements for DO deployment"
git push origin main
```

---

## 🌊 Phase 2: Create DigitalOcean Droplet

### Step 2.1: Go to DigitalOcean
1. Open [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Click **Create → Droplets**

### Step 2.2: Configure Droplet
| Setting | Value |
|---------|-------|
| **Region** | Bangalore (BLR1) |
| **Image** | Ubuntu 22.04 LTS |
| **Size** | Basic → Regular → **$6/mo** (1 vCPU, 1GB RAM) |
| **Authentication** | Password or SSH Key |
| **Hostname** | `omnilearn-api` |

### Step 2.3: Create and Note IP
Click **Create Droplet** and note the IP address: `___.___.___.__`

---

## 🔧 Phase 3: Server Setup

### Step 3.1: SSH into Droplet
```bash
ssh root@YOUR_DROPLET_IP
```

### Step 3.2: Update System & Install Dependencies
```bash
apt update && apt upgrade -y
apt install -y python3-pip python3-venv nginx certbot \
  python3-certbot-nginx git postgresql postgresql-contrib
```

### Step 3.3: Setup PostgreSQL Database
```bash
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE DATABASE omnilearn_db;
CREATE USER omnilearn_user WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE omnilearn_db TO omnilearn_user;
ALTER DATABASE omnilearn_db OWNER TO omnilearn_user;
\q
```

### Step 3.4: Clone Repository
```bash
cd /root
git clone https://github.com/himanshu-sharma-dev1/intelli-tutor.git
cd intelli-tutor/backend
```

### Step 3.5: Setup Python Environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements-lite.txt
```

> ⚠️ **Note:** `sentence-transformers` takes 5-10 mins to install. Be patient.

### Step 3.6: Create .env File
```bash
nano .env
```

Paste (replace values with your own):
```env
DATABASE_URL=postgresql://omnilearn_user:YOUR_PASSWORD@localhost:5432/omnilearn_db
JWT_SECRET_KEY=YOUR_JWT_SECRET_HERE
SECRET_KEY=YOUR_FLASK_SECRET_HERE
GEMINI_API_KEY=YOUR_GEMINI_KEY
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_SECRET
FRONTEND_URL=https://omnilearn.himanshu-sharma.me
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

Press `Ctrl+O` to save, `Ctrl+X` to exit.

### Step 3.7: Initialize Database
```bash
source venv/bin/activate
export FLASK_APP=app.py
flask db upgrade
```

### Step 3.8: Test Manually
```bash
gunicorn --bind 0.0.0.0:5000 --timeout 300 app:app
```
Press `Ctrl+C` to stop after confirming it works.

---

## ⚙️ Phase 4: Systemd Service

### Step 4.1: Create Service File
```bash
nano /etc/systemd/system/omnilearn-api.service
```

Paste:
```ini
[Unit]
Description=OmniLearn Flask API
After=network.target postgresql.service

[Service]
User=root
WorkingDirectory=/root/intelli-tutor/backend
Environment="PATH=/root/intelli-tutor/backend/venv/bin"
EnvironmentFile=/root/intelli-tutor/backend/.env
ExecStart=/root/intelli-tutor/backend/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 2 --timeout 300 app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Step 4.2: Enable and Start
```bash
systemctl daemon-reload
systemctl enable omnilearn-api
systemctl start omnilearn-api
systemctl status omnilearn-api
```

You should see **active (running)** in green.

---

## 🌐 Phase 5: Nginx Configuration

### Step 5.1: Create Nginx Site Config
```bash
nano /etc/nginx/sites-available/omnilearn-api
```

Paste:
```nginx
server {
    listen 80;
    server_name api.omnilearn.himanshu-sharma.me;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    client_max_body_size 50M;
}
```

### Step 5.2: Enable Site
```bash
ln -sf /etc/nginx/sites-available/omnilearn-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 🔗 Phase 6: DNS Configuration (Namecheap)

### Step 6.1: Login to Namecheap
Go to your domain's **Advanced DNS** settings.

### Step 6.2: Add DNS Records
| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | api.omnilearn | YOUR_DROPLET_IP | Automatic |
| CNAME | omnilearn | cname.vercel-dns.com. | Automatic |

### Step 6.3: Wait for Propagation
DNS can take 5-30 minutes. Check with:
```bash
ping api.omnilearn.himanshu-sharma.me
```

---

## 🔒 Phase 7: SSL Certificate

```bash
certbot --nginx -d api.omnilearn.himanshu-sharma.me \
  --non-interactive --agree-tos --email your@email.com
```

Verify HTTPS works:
```bash
curl https://api.omnilearn.himanshu-sharma.me/health
```

---

## 🎨 Phase 8: Deploy Frontend to Vercel

### Step 8.1: Import Project
1. Go to [vercel.com](https://vercel.com)
2. Click **Add New → Project**
3. Import from GitHub: `intelli-tutor`

### Step 8.2: Configure Build Settings
| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### Step 8.3: Add Environment Variable
| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://api.omnilearn.himanshu-sharma.me` |

### Step 8.4: Deploy
Click **Deploy** and wait.

### Step 8.5: Add Custom Domain
1. Go to Project Settings → Domains
2. Add: `omnilearn.himanshu-sharma.me`
3. Follow Vercel's DNS instructions

---

## 🔐 Phase 9: Update Google OAuth

### Step 9.1: Go to Google Cloud Console
[console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials

### Step 9.2: Edit OAuth 2.0 Client
Add to **Authorized JavaScript Origins:**
```
https://omnilearn.himanshu-sharma.me
https://api.omnilearn.himanshu-sharma.me
```

Add to **Authorized Redirect URIs:**
```
https://api.omnilearn.himanshu-sharma.me/api/auth/google/callback
```

### Step 9.3: Save

---

## ✅ Verification Checklist

- [ ] `https://api.omnilearn.himanshu-sharma.me/health` returns OK
- [ ] `https://omnilearn.himanshu-sharma.me` loads frontend
- [ ] Can register new account
- [ ] Can login with Google
- [ ] Can create course and upload PDF
- [ ] AI chat works

---

## 🔧 Useful Commands

```bash
# Check API status
systemctl status omnilearn-api

# View API logs
journalctl -u omnilearn-api -f

# Restart API after updates
cd /root/intelli-tutor && git pull
systemctl restart omnilearn-api

# Check Nginx logs
tail -f /var/log/nginx/error.log
```
