# 🚀 Heroku Deployment Guide — Intelli-Tutor

## Why Heroku?

Your GitHub Student Pack includes **$13/month for 24 months ($312 total)**.
Intelli-Tutor needs ~$10/month (Flask dyno + PostgreSQL), fitting perfectly!

---

## Prerequisites

- [ ] GitHub Student Pack verified
- [ ] Heroku account linked to GitHub Student
- [ ] Heroku CLI installed

---

## Step 1: Claim Heroku Credits

1. Go to [heroku.com/github-students](https://www.heroku.com/github-students)
2. Click "Get the student offer"
3. Verify with GitHub Education
4. Credits appear in your account

---

## Step 2: Install Heroku CLI

```bash
# macOS
brew install heroku/brew/heroku

# Verify installation
heroku --version
```

---

## Step 3: Create Heroku App

```bash
cd /Users/himanshusharma/intelli-tutor

# Login to Heroku
heroku login

# Create app
heroku create omnilearn-api

# Add PostgreSQL database (Mini plan = $5/month)
heroku addons:create heroku-postgresql:mini
```

---

## Step 4: Configure Environment Variables

```bash
heroku config:set GEMINI_API_KEY=your_gemini_api_key
heroku config:set JWT_SECRET_KEY=your_jwt_secret
heroku config:set FRONTEND_URL=https://learn.himanshusharma.me
heroku config:set FLASK_ENV=production
```

---

## Step 5: Create Heroku-Specific Files

### Procfile (already exists or create)
```
web: gunicorn --bind 0.0.0.0:$PORT --timeout 300 app:app
```

### runtime.txt
```
python-3.11.4
```

---

## Step 6: Deploy

```bash
# Add Heroku remote
heroku git:remote -a omnilearn-api

# Deploy backend only (using git subtree)
git subtree push --prefix backend heroku main

# Or deploy entire repo if Procfile is in root
git push heroku main
```

---

## Step 7: Database Migration

```bash
heroku run flask db upgrade
```

---

## Step 8: Verify Deployment

```bash
# Check logs
heroku logs --tail

# Open app
heroku open
```

---

## Monthly Cost Breakdown

| Resource | Plan | Cost |
|----------|------|------|
| Web Dyno | Eco | $5/mo |
| PostgreSQL | Mini | $5/mo |
| **Total** | | **$10/mo** |

Your $13/mo credit covers this with $3/mo buffer! ✅

---

## Custom Domain Setup

1. In Heroku Dashboard → Settings → Domains
2. Add `api.learn.himanshusharma.me`
3. Copy the DNS target
4. Add CNAME in Namecheap:
   - Host: `api.learn`
   - Value: `<your-app>.herokudns.com`

---

## Troubleshooting

### Memory Issues (PyTorch/Whisper)
If you hit memory limits:
```bash
# Scale to larger dyno temporarily
heroku ps:resize web=basic
```

### Slug Size Too Large
```bash
# Add to .slugignore
*.pyc
__pycache__
.git
venv
```

---

## Links
- [Heroku Dashboard](https://dashboard.heroku.com)
- [Heroku Python Support](https://devcenter.heroku.com/articles/python-support)
- [GitHub Student Pack](https://education.github.com/pack)
