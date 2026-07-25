# 🚀 DisputeIQ - Setup & Deploy Guide for Friends

## 📋 What You Need

1. **GitHub account** (to fork the repo)
2. **Render account** (free at https://dashboard.render.com - sign up with GitHub)
3. **5 minutes** of your time

---

## 🎯 Option 1: Deploy on Render Web Service (RECOMMENDED - 100% FREE!)

> **⚠️ Use "Web Service" NOT "Blueprint"!** Blueprint tries to create a paid PostgreSQL database. Web Service free tier works perfectly with SQLite.

### Step 1: Fork the Repo on GitHub

```bash
# Go to: https://github.com/Pragati1466/AMEX
# Click "Fork" button (top right) → Create fork
```

### Step 2: Deploy on Render (Takes 3 minutes)

1. **Go to** https://dashboard.render.com
2. **Sign up** with GitHub (free account, no credit card needed)
3. Click **"New +"** → **"Web Service"** (NOT Blueprint!)
4. **Connect GitHub** → select your forked repo
5. **Fill these fields exactly**:

| Field | Value |
|-------|-------|
| Name | `disputiq-api` |
| Runtime | `Python 3` |
| Region | (any, pick closest to you) |
| Branch | `main` |
| Build Command | `cd backend && pip install -r requirements.txt && python -m spacy download en_core_web_sm` |
| Start Command | `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Plan | **Free** ($0/month) ✅ |

6. Click **"Advanced"** → **"Add Environment Variables"**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `sqlite:///./disputiq.db` |
| `SECRET_KEY` | Click "Generate" button |
| `CORS_ORIGINS` | `["*"]` |
| `APP_NAME` | `DisputeIQ` |
| `APP_VERSION` | `1.0.0` |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `LOG_LEVEL` | `INFO` |

7. Click **"Create Web Service"**

✅ **Render will:**
- Build the Python backend (~3 mins first time)
- Use SQLite (no database setup!)
- Give you a free URL like: `https://disputiq-api.onrender.com`

### Step 3: Open & Test

```
https://disputiq-api.onrender.com/docs
```

---

## � Option 2: Run Locally (For Development)

### Prerequisites
- Python 3.10+
- PostgreSQL (optional - can use SQLite for testing)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Pragati1466/AMEX.git
cd AMEX/backend

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate   # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Download spaCy model
python -m spacy download en_core_web_sm

# 5. Create .env file
cp .env.example .env
```

**Edit `.env` file:**
```env
# Use SQLite for easy testing (no PostgreSQL needed!)
DATABASE_URL=sqlite:///./test.db

# JWT - just use this default for testing
SECRET_KEY=test-secret-key-for-dev-only
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Optional - leave blank if you don't have these
GROQ_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Start the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open: http://localhost:8000/docs

---

## 🧪 How to Test (After Deploy or Local)

### Method 1: Swagger UI (Easiest - Just click buttons!)

```
Open: https://disputiq-api.onrender.com/docs
```

**30-Second Demo:**
```
1. Click POST /api/v1/auth/register → "Try it out"
2. Paste: {"email":"a@b.com","username":"test","password":"Test123!","full_name":"Tester"}
3. Click "Execute"
4. Click POST /api/v1/auth/login → "Try it out"
5. Paste: {"username":"test","password":"Test123!"}
6. Click "Execute" → Copy the "access_token" value
7. Click "Authorize" button → paste "Bearer <token>" → "Authorize"
8. Now try any endpoint below!
```

### Method 2: Python Script (Copy-paste & run)

Create `test_api.py`:
```python
import requests

BASE = "https://disputiq-api.onrender.com"  # Change to your Render URL

# 1. Health check
r = requests.get(f"{BASE}/health")
print(f"✅ Server: {r.json()}")

# 2. Register
r = requests.post(f"{BASE}/api/v1/auth/register", json={
    "email": "test@test.com",
    "username": "testuser",
    "password": "Test123!",
    "full_name": "Test User"
})
print(f"✅ Register: {r.status_code}")

# 3. Login
r = requests.post(f"{BASE}/api/v1/auth/login", json={
    "username": "testuser",
    "password": "Test123!"
})
token = r.json().get("access_token")
print(f"✅ Login: got token")

# 4-8. Test all features
headers = {"Authorization": f"Bearer {token}"}

tests = [
    ("POST", "/api/v1/evidence/collect", {"dispute_id": 1}),
    ("POST", "/api/v1/timeline/reconstruct", {"case_file_id": 1, "clear_existing": True}),
    ("POST", "/api/v1/validation/validate", {"case_file_id": 1, "clear_existing": True}),
    ("POST", "/api/v1/policy/map", {"case_file_id": 1, "clear_existing": True}),
    ("POST", "/api/v1/case-file/generate", {"case_file_id": 1}),
]

for method, path, data in tests:
    r = requests.post(f"{BASE}{path}", json=data, headers=headers)
    print(f"✅ {path}: {r.status_code}")

print("\n🎉 All tests done! Open the Swagger UI for more:")
print(f"{BASE}/docs")
```

Run:
```bash
pip install requests
python test_api.py
```

---

## 📋 Sample Data for All Endpoints

| Endpoint | Method | Request Body |
|----------|--------|-------------|
| `/health` | GET | (none) |
| `/api/v1/auth/register` | POST | `{"email":"a@b.com","username":"test","password":"Test123!","full_name":"Tester"}` |
| `/api/v1/auth/login` | POST | `{"username":"test","password":"Test123!"}` |
| `/api/v1/evidence/collect` | POST | `{"dispute_id": 1}` |
| `/api/v1/evidence/extract` | POST | `{"case_file_id": 1}` |
| `/api/v1/evidence/list/{case_file_id}` | GET | (none, use `1` as ID) |
| `/api/v1/timeline/reconstruct` | POST | `{"case_file_id": 1, "clear_existing": true}` |
| `/api/v1/timeline/case-file/{case_file_id}` | GET | (none, use `1` as ID) |
| `/api/v1/timeline/case-file/{id}/summary` | GET | (none, use `1` as ID) |
| `/api/v1/timeline/event/manual` | POST | `{"case_file_id":1,"event_type":"manual","event_date":"2026-07-24","title":"Test event"}` |
| `/api/v1/validation/validate` | POST | `{"case_file_id": 1, "clear_existing": true}` |
| `/api/v1/validation/case-file/{id}` | GET | (none, use `1` as ID) |
| `/api/v1/validation/case-file/{id}/summary` | GET | (none, use `1` as ID) |
| `/api/v1/validation/ai-suggestions` | POST | `{"case_file_id": 1}` |
| `/api/v1/policy/map` | POST | `{"case_file_id": 1, "clear_existing": true}` |
| `/api/v1/policy/case-file/{id}` | GET | (none, use `1` as ID) |
| `/api/v1/policy/policies` | GET | (none) |
| `/api/v1/policy/search-policies` | POST | `{"query": "refund policy", "n_results": 5}` |
| `/api/v1/policy/vector-store-stats` | GET | (none) |
| `/api/v1/case-file/generate` | POST | `{"case_file_id": 1}` |
| `/api/v1/case-file/{id}` | GET | (none, use `1` as ID) |
| `/api/v1/case-file/{id}/package` | GET | (none, use `1` as ID) |
| `/api/v1/case-file/{id}/confidence` | GET | (none, use `1` as ID) |
| `/api/v1/case-file/{id}/submit` | POST | (none, use `1` as ID) |

---

## 🔧 Troubleshooting

### "Cannot connect to Render"
- Wait 2-3 minutes after deploying (it takes time to build)
- Check: https://dashboard.render.com → your service → "Events" tab

### "401 Unauthorized"
- You need to login first and get a token
- Click "Authorize" button in Swagger and paste: `Bearer <your_token>`

### "404 Not Found"
- You're using the wrong ID. Always use `1` for testing.

### "422 Validation Error"
- Your JSON is malformed. Check for missing commas or quotes.

### "500 Internal Server Error"
- The AI features need GROQ_API_KEY. For basic testing, it still works without it.

---

## 📤 How to Share with Friends

### After deploying on Render:

```
Hey! Our project is live at:
https://disputiq-api.onrender.com/docs

Just open this link and click "Try it out" on any endpoint!
No setup needed. 🎉
```

### Sample data to share:
```
Register: {"email":"a@b.com","username":"test","password":"Test123!","full_name":"Tester"}
Login: {"username":"test","password":"Test123!"}
Then try any endpoint with ID = 1
```

---

## ✅ Quick Checklist

- [ ] Forked the repo on GitHub
- [ ] Deployed on Render Web Service
- [ ] Can access Swagger UI at `https://disputiq-api.onrender.com/docs`
- [ ] Health check works
- [ ] Can register a user
- [ ] Can login and get token
- [ ] Can test evidence endpoints
- [ ] Can test timeline endpoints
- [ ] Can test validation endpoints
- [ ] Can test policy endpoints
- [ ] Can test case file endpoints

---

## 🎯 Summary

| Step | What to do | Time |
|------|-----------|------|
| 1 | Fork repo on GitHub | 30 sec |
| 2 | Deploy Render Web Service | 3 min |
| 3 | Open Swagger UI | 5 sec |
| 4 | Test endpoints | 30 sec |
| **Total** | | **~3 minutes** |

**No local setup needed!** Just deploy on Render and share the URL. 🚀
