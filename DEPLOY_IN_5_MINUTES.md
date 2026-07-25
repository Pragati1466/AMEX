# 🚀 Deploy DisputeIQ in 5 Minutes

## Quick Deployment Guide

### Step 1: Get Your Groq API Key (1 minute)
1. Go to https://console.groq.com/
2. Sign up (free)
3. Get API key: `gsk_xxxx`
4. Copy this key

### Step 2: Deploy Backend to Render (2 minutes)
1. Go to https://render.com/
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect repository: `Pragati1466/AMEX`
5. Settings:
   - **Name**: `disputiq-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Environment Variables:
   - `DATABASE_URL` = `sqlite:///./disputiq.db`
   - `SECRET_KEY` = (click "Generate")
   - `GROQ_API_KEY` = (paste your key from step 1)
   - `APP_NAME` = `DisputeIQ`
   - `CORS_ORIGINS` = `["*"]`
7. Click "Create Web Service"
8. Wait 5-10 minutes → Get URL: `https://disputiq-backend.onrender.com`

### Step 3: Deploy Frontend to Vercel (2 minutes)
1. Go to https://vercel.com/
2. Sign up with GitHub
3. Click "Add New Project"
4. Select: `Pragati1466/AMEX`
5. Settings:
   - **Framework**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Environment Variables:
   - `VITE_API_URL` = `https://disputiq-backend.onrender.com`
7. Click "Deploy"
8. Wait 2-3 minutes → Get URL: `https://disputiq-frontend.vercel.app`

### Done! 🎉

Your DisputeIQ system is now live:
- **Backend**: `https://disputiq-backend.onrender.com`
- **Frontend**: `https://disputiq-frontend.vercel.app`
- **API Docs**: `https://disputiq-backend.onrender.com/docs`

## Test Your Deployment

1. **Backend Health**: Visit `https://disputiq-backend.onrender.com/health`
2. **Frontend**: Visit your Vercel URL
3. **API Docs**: Visit `https://disputiq-backend.onrender.com/docs`

## Troubleshooting

**Backend fails to build:**
- Check Render logs for errors
- Ensure GROQ_API_KEY is correct
- Try using SQLite database

**Frontend can't connect to backend:**
- Check VITE_API_URL environment variable
- Ensure backend is deployed and healthy
- Check CORS settings

**Need help?**
- Check `DEPLOY_NOW.md` for detailed guide
- Review Render and Vercel logs
- Verify environment variables

## Your Deployment URLs

After deployment, you'll have:
- 🌐 **Frontend**: Your Vercel URL
- 🔧 **Backend**: Your Render URL  
- 📚 **API Docs**: Backend URL + `/docs`

Share these URLs with users to access your DisputeIQ system!