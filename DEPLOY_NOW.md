# 🚀 DisputeIQ - Deploy Now Guide

## Method 1: Render (Backend) + Vercel (Frontend) - RECOMMENDED ✅

### Step 1: Deploy Backend to Render (2 minutes)

1. **Go to Render.com**
   - Visit https://render.com/
   - Sign up/login with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `Pragati1466/AMEX`
   - Select the repository

3. **Configure the Service**
   - **Name**: `disputiq-backend`
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables** (Click "Advanced" → "Add Environment Variable")
   ```
   DATABASE_URL = sqlite:///./disputiq.db
   SECRET_KEY = (click "Generate" or enter your own)
   GROQ_API_KEY = your_groq_api_key_here
   APP_NAME = DisputeIQ
   APP_VERSION = 1.0.0
   LOG_LEVEL = INFO
   CORS_ORIGINS = ["*"]
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment
   - You'll get a URL like: `https://disputiq-backend.onrender.com`

6. **Test Your Backend**
   - Visit: `https://disputiq-backend.onrender.com/health`
   - Should return: `{"status": "healthy"}`

### Step 2: Deploy Frontend to Vercel (2 minutes)

1. **Go to Vercel.com**
   - Visit https://vercel.com/
   - Sign up/login with GitHub

2. **Import Your Repository**
   - Click "Add New Project"
   - Select: `Pragati1466/AMEX`
   - Click "Import"

3. **Configure the Project**
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Add Environment Variables**
   ```
   VITE_API_URL = https://disputiq-backend.onrender.com
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - You'll get a URL like: `https://disputiq-frontend.vercel.app`

6. **Test Your Frontend**
   - Visit your Vercel URL
   - Should see the DisputeIQ login page

### Step 3: Update Frontend API URL (if needed)

If the backend URL is different, update:
```bash
# Edit frontend/src/App.jsx
# Change: const API_BASE = 'http://localhost:8000/api/v1'
# To: const API_BASE = 'https://disputiq-backend.onrender.com/api/v1'
```

---

## Method 2: One-Click Blueprint Deployment (EASIEST) 🎯

### Render Blueprint Deployment

1. **Go to Render.com**
   - Visit https://dashboard.render.com/blueprints
   - Click "New Blueprint Instance"

2. **Connect Repository**
   - Select: `Pragati1466/AMEX`
   - Render will automatically detect `render.yaml`

3. **Review Configuration**
   - Name: `disputiq-backend`
   - Region: `Oregon` (or closest to you)
   - Add environment variables:
     ```
     GROQ_API_KEY = your_groq_api_key_here
     ```

4. **Deploy**
   - Click "Apply Changes"
   - Wait 5-10 minutes
   - Done! Backend is deployed

5. **Then deploy frontend using Vercel** (as shown in Method 1)

---

## Method 3: Docker Deployment

### Push to Docker Hub

```bash
# Build Docker image
cd backend
docker build -t pragati1466/disputiq-backend:latest .

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push pragati1466/disputiq-backend:latest
```

### Deploy to Render with Docker

1. In Render.com, create new Web Service
2. Select "Docker" as runtime
3. Image: `pragati1466/disputiq-backend:latest`
4. Add environment variables
5. Deploy

---

## Required API Keys

### Get Groq API Key (FREE)
1. Go to https://console.groq.com/
2. Sign up for free account
3. Navigate to API Keys
4. Copy your API key
5. Add to Render environment variables

### Cloudinary (Optional - for file uploads)
1. Go to https://cloudinary.com/
2. Get free account
3. Copy credentials
4. Add to environment variables (optional)

---

## Troubleshooting

### Backend Deployment Issues

**Build fails on spaCy download:**
```bash
# Alternative: Download model in requirements.txt
# Add this line to requirements.txt:
# https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl
```

**Database connection issues:**
- Use SQLite for testing: `DATABASE_URL=sqlite:///./disputiq.db`
- For PostgreSQL, Render provides free PostgreSQL database

**Port issues:**
- Render automatically sets `$PORT` environment variable
- Don't hardcode port 8000 in production

### Frontend Deployment Issues

**API connection errors:**
- Ensure CORS is enabled on backend
- Check environment variable `VITE_API_URL`
- Verify backend is accessible

**Build failures:**
- Ensure Node.js version is 18+
- Clear cache: `npm cache clean --force`
- Delete node_modules and reinstall

---

## Monitor Your Deployments

### Render Monitoring
- Visit Render Dashboard
- View logs: Click on service → "Logs"
- Health checks: Automatically monitored
- Metrics: Response time, CPU, memory

### Vercel Monitoring
- Visit Vercel Dashboard
- View logs: Click on project → "Logs"
- Analytics: Visit "Analytics" tab
- Deployments: View deployment history

---

## Production Checklist

- [ ] Add GROQ_API_KEY to environment variables
- [ ] Enable SSL (automatic on Render/Vercel)
- [ ] Set up monitoring alerts
- [ ] Add rate limiting (in code)
- [ ] Configure backup strategy
- [ ] Set up custom domain (optional)
- [ ] Enable error tracking (Sentry, etc.)
- [ ] Add analytics (Google Analytics, etc.)

---

## Post-Deployment Testing

1. **Test Backend Health**
   ```bash
   curl https://disputiq-backend.onrender.com/health
   ```

2. **Test API Documentation**
   - Visit: `https://disputiq-backend.onrender.com/docs`
   - Try API endpoints directly

3. **Test Frontend**
   - Visit: `https://disputiq-frontend.vercel.app`
   - Try login with test credentials
   - Check dashboard loads correctly

4. **Test Full Flow**
   - Create a test dispute
   - Run evidence collection
   - Test timeline reconstruction
   - Check resolution dashboard

---

## Support

If you encounter issues:
1. Check Render logs for backend errors
2. Check Vercel logs for frontend errors
3. Verify environment variables are set correctly
4. Test API endpoints using the /docs endpoint
5. Review error messages in logs

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Vercel
3. ✅ Test both deployments
4. ✅ Set up custom domain (optional)
5. ✅ Add monitoring and analytics
6. ✅ Share your deployed URL!

Your DisputeIQ system will be live and accessible to users worldwide! 🎉