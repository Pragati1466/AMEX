# 🚀 DisputeIQ - Quick Test Guide for Friends

## 📱 3 Ways to Test (Pick the Easiest One!)

---

## 🥇 METHOD 1: Test via Swagger UI (EASIEST - No Setup!)

Just open this link in your browser:
```
http://localhost:8000/docs
```

**But first**, someone needs to start the server once:
```bash
cd AMEX/backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then share your **IP address** so friends can use:
```
http://YOUR_IP:8000/docs
```

---

## 🥈 METHOD 2: Test with Python Script (No Database Needed!)

Create a file called `test_disputiq.py` and paste this:

```python
"""
DisputeIQ Quick Test - Just run it! No setup needed.
"""
import requests
import json

BASE_URL = "http://localhost:8000"  # Change this to your friend's IP

def test_health():
    """Test if API is running"""
    r = requests.get(f"{BASE_URL}/health")
    print(f"✅ Health: {r.json()}")
    return r.status_code == 200

def test_register():
    """Create a test user"""
    data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPass123!",
        "full_name": "Test User"
    }
    r = requests.post(f"{BASE_URL}/api/v1/auth/register", json=data)
    print(f"✅ Register: {r.status_code}")
    return r.json().get("id")

def test_login():
    """Login and get token"""
    data = {"username": "testuser", "password": "TestPass123!"}
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", json=data)
    print(f"✅ Login: {r.status_code}")
    return r.json().get("access_token")

def test_collect_evidence(token):
    """Collect evidence for a dispute"""
    headers = {"Authorization": f"Bearer {token}"}
    data = {"dispute_id": 1}
    r = requests.post(f"{BASE_URL}/api/v1/evidence/collect", json=data, headers=headers)
    print(f"✅ Collect Evidence: {r.status_code}")
    if r.status_code == 200:
        print(f"   Response: {json.dumps(r.json(), indent=2)[:200]}...")

def test_reconstruct_timeline(token):
    """Reconstruct timeline"""
    headers = {"Authorization": f"Bearer {token}"}
    data = {"case_file_id": 1, "clear_existing": True}
    r = requests.post(f"{BASE_URL}/api/v1/timeline/reconstruct", json=data, headers=headers)
    print(f"✅ Reconstruct Timeline: {r.status_code}")
    if r.status_code == 200:
        print(f"   Response: {json.dumps(r.json(), indent=2)[:200]}...")

def test_validate(token):
    """Validate case file"""
    headers = {"Authorization": f"Bearer {token}"}
    data = {"case_file_id": 1, "clear_existing": True}
    r = requests.post(f"{BASE_URL}/api/v1/validation/validate", json=data, headers=headers)
    print(f"✅ Validate: {r.status_code}")
    if r.status_code == 200:
        print(f"   Response: {json.dumps(r.json(), indent=2)[:200]}...")

def test_map_policies(token):
    """Map policies"""
    headers = {"Authorization": f"Bearer {token}"}
    data = {"case_file_id": 1, "clear_existing": True}
    r = requests.post(f"{BASE_URL}/api/v1/policy/map", json=data, headers=headers)
    print(f"✅ Map Policies: {r.status_code}")
    if r.status_code == 200:
        print(f"   Response: {json.dumps(r.json(), indent=2)[:200]}...")

def test_generate_case_file(token):
    """Generate final case file"""
    headers = {"Authorization": f"Bearer {token}"}
    data = {"case_file_id": 1}
    r = requests.post(f"{BASE_URL}/api/v1/case-file/generate", json=data, headers=headers)
    print(f"✅ Generate Case File: {r.status_code}")
    if r.status_code == 200:
        print(f"   Response: {json.dumps(r.json(), indent=2)[:200]}...")

# ===== RUN ALL TESTS =====
print("=" * 50)
print("🚀 DisputeIQ API Quick Test")
print("=" * 50)

if test_health():
    user_id = test_register()
    token = test_login()
    
    if token:
        test_collect_evidence(token)
        test_reconstruct_timeline(token)
        test_validate(token)
        test_map_policies(token)
        test_generate_case_file(token)
    
    print("\n" + "=" * 50)
    print("✅ All tests completed!")
    print("📖 For full API docs: http://localhost:8000/docs")
    print("=" * 50)
else:
    print("❌ Server is not running! Start with: uvicorn app.main:app --reload")
```

**To run:**
```bash
pip install requests
python test_disputiq.py
```

---

## 🥉 METHOD 3: Test with cURL (No Python needed!)

Open **Terminal** (Mac) or **Command Prompt** (Windows) and copy-paste these:

```bash
# 1. Check if API is alive
curl http://localhost:8000/health

# 2. Register a user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"friend@test.com","username":"friend1","password":"Test123!","full_name":"Friend"}'

# 3. Login (save the token)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"friend1","password":"Test123!"}'

# 4. Collect evidence (replace TOKEN with what you got from login)
curl -X POST http://localhost:8000/api/v1/evidence/collect \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dispute_id":1}'

# 5. Reconstruct timeline
curl -X POST http://localhost:8000/api/v1/timeline/reconstruct \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_file_id":1}'

# 6. Validate
curl -X POST http://localhost:8000/api/v1/validation/validate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_file_id":1}'

# 7. Map policies
curl -X POST http://localhost:8000/api/v1/policy/map \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_file_id":1}'

# 8. Generate case file
curl -X POST http://localhost:8000/api/v1/case-file/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"case_file_id":1}'
```

---

## 📋 Sample Data You Can Use

### Dispute Scenario: "Customer didn't receive Amazon package"

| Field | Value |
|-------|-------|
| Customer | John Doe |
| Merchant | Amazon.com |
| Item | Electronics Gadget |
| Amount | $299.99 |
| Date | June 15, 2026 |
| Issue | Package marked delivered but not received |

### Quick API Test Data

**Register:**
```json
{"email":"any@email.com","username":"anyname","password":"Pass123!","full_name":"Your Name"}
```

**Login:**
```json
{"username":"anyname","password":"Pass123!"}
```

**Collect Evidence:**
```json
{"dispute_id": 1}
```

**Reconstruct Timeline:**
```json
{"case_file_id": 1, "clear_existing": true}
```

**Validate:**
```json
{"case_file_id": 1, "clear_existing": true}
```

**Map Policies:**
```json
{"case_file_id": 1, "clear_existing": true}
```

**Generate Case File:**
```json
{"case_file_id": 1}
```

---

## 🎯 What Each Endpoint Does (Simple Explanation)

| Endpoint | What it does | Like... |
|----------|-------------|---------|
| `/health` | Checks if server is alive | "Are you there?" |
| `/auth/register` | Creates account | Signing up for a game |
| `/auth/login` | Gets access token | Getting a wristband at a club |
| `/evidence/collect` | Gathers all evidence | Detective collecting clues |
| `/evidence/extract` | Finds key info in evidence | Highlighting important parts |
| `/timeline/reconstruct` | Puts events in order | Making a timeline of what happened |
| `/timeline/event/manual` | Add missing events | "Oh wait, this also happened" |
| `/validation/validate` | Checks for problems | Quality check |
| `/validation/ai-suggestions` | AI gives advice | "Here's what you should do" |
| `/policy/map` | Finds relevant rules | "Which rules apply here?" |
| `/policy/search-policies` | Search policies | Google for company rules |
| `/case-file/generate` | Creates final report | Writing the final report |
| `/case-file/{id}/confidence` | Shows confidence score | "How sure are we?" |

---

## 🔧 Troubleshooting

**"Connection refused"**
→ Server not running. Ask whoever has it running to start it.

**"401 Unauthorized"**
→ Your token expired. Login again to get a new one.

**"404 Not Found"**
→ Wrong ID. Use `1` for testing.

**"422 Validation Error"**
→ Check your JSON format. Missing commas? Extra brackets?

---

## 📤 How to Share with Friends

### Option A: Share the Swagger Link
```
Hey! Our project is running at http://192.168.x.x:8000/docs
Just open this in your browser and click "Try it out" on any endpoint!
```

### Option B: Share the Python Script
Send them the `test_disputiq.py` file above. They just need:
```bash
pip install requests
python test_disputiq.py
```

### Option C: Share the cURL Commands
Copy-paste the cURL commands above into a text message.

---

## ✅ Checklist for Each Friend

- [ ] Can access Swagger UI at `http://IP:8000/docs`
- [ ] Health check returns `{"status": "healthy"}`
- [ ] Can register a new user
- [ ] Can login and get a token
- [ ] Can collect evidence
- [ ] Can reconstruct timeline
- [ ] Can validate case file
- [ ] Can map policies
- [ ] Can generate case file
- [ ] Can see confidence score

---

## 🏆 Quick Demo (30 seconds)

```
1. Open http://localhost:8000/docs
2. Click POST /api/v1/auth/register → Try it out → Execute
3. Click POST /api/v1/auth/login → Try it out → Execute → Copy token
4. Click Authorize → paste "Bearer <token>" → Authorize
5. Click POST /api/v1/evidence/collect → Try it out → Execute
6. Click POST /api/v1/timeline/reconstruct → Try it out → Execute
7. Click POST /api/v1/validation/validate → Try it out → Execute
8. Click POST /api/v1/policy/map → Try it out → Execute
9. Click POST /api/v1/case-file/generate → Try it out → Execute
10. Click GET /api/v1/case-file/{id}/confidence → Try it out → Execute
```

**Total time: ~30 seconds!** 🎉