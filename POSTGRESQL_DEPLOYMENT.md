# PostgreSQL Deployment Guide

## Overview
- **Frontend**: Vercel (Angular)
- **Backend**: Render.com (Node.js + Express)
- **Database**: Neon.tech (PostgreSQL)

---

## Step 1: Setup Neon Database (5 minutes)

### 1.1 Create Neon Account
1. Go to https://neon.tech
2. Sign up with GitHub
3. Click "Create Project"

### 1.2 Get Database Connection String
1. After project creation, go to "Dashboard"
2. Copy the **Connection String** (looks like):
   ```
   postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Save this - you'll need it for Render

### 1.3 Initialize Database (Optional - Auto-creates on first run)
The server automatically creates tables on startup. No manual SQL needed!

---

## Step 2: Deploy Backend to Render (10 minutes)

### 2.1 Push Code to GitHub
```bash
git add .
git commit -m "Migrate to PostgreSQL"
git push origin master
```

### 2.2 Deploy on Render
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `attendance-backend`
   - **Environment**: `Node`
   - **Build Command**: `cp backend-package.json package.json && npm install`
   - **Start Command**: `node server-postgres.js`
   - **Plan**: Free

### 2.3 Add Environment Variable
1. In Render dashboard, go to "Environment"
2. Add variable:
   - **Key**: `DATABASE_URL`
   - **Value**: (Paste your Neon connection string)
3. Click "Save Changes"
4. Render will auto-deploy

### 2.4 Get Backend URL
After deployment, copy your backend URL:
```
https://attendance-backend-xxxx.onrender.com
```

---

## Step 3: Update Frontend Environment

### 3.1 Update Production Environment
Edit `src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://attendance-backend-xxxx.onrender.com/api'
};
```

### 3.2 Push to GitHub
```bash
git add .
git commit -m "Update API URL"
git push origin master
```

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Vercel Auto-Deploy
- Vercel automatically deploys when you push to GitHub
- Wait 2-3 minutes for build
- Check: https://your-app.vercel.app

### 4.2 Manual Deploy (if needed)
1. Go to https://vercel.com
2. Import your repository
3. Configure:
   - **Framework**: Angular
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/attendance-app/browser`
4. Click "Deploy"

---

## Step 5: Test Your Application

### 5.1 Test Backend
```bash
# Health check
curl https://attendance-backend-xxxx.onrender.com/health

# Test employees endpoint
curl https://attendance-backend-xxxx.onrender.com/api/employees
```

### 5.2 Test Frontend
1. Visit your Vercel URL
2. Try to register a new user
3. Login and test attendance features

---

## Step 6: Add Initial Data (Optional)

### 6.1 Add Test Employee via API
```bash
curl -X POST https://attendance-backend-xxxx.onrender.com/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "mobile": "1234567890",
    "password": "test123"
  }'
```

### 6.2 Or Use Neon SQL Editor
1. Go to Neon Dashboard → SQL Editor
2. Run:
```sql
INSERT INTO employees (name, mobile, password) 
VALUES ('Admin User', '9876543210', 'admin123');
```

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Create .env File
Create `.env` in project root:
```
DATABASE_URL=your_neon_connection_string_here
PORT=3000
```

### 3. Run Backend
```bash
npm run server
```

### 4. Run Frontend (separate terminal)
```bash
npm start
```

---

## Troubleshooting

### Backend Not Starting
- Check Render logs for errors
- Verify DATABASE_URL is set correctly
- Ensure Neon database is active

### Database Connection Error
- Check if Neon project is active (free tier sleeps after inactivity)
- Verify connection string includes `?sslmode=require`
- Check Neon dashboard for connection issues

### Frontend Not Connecting
- Verify API URL in `environment.prod.ts`
- Check browser console for CORS errors
- Ensure backend is deployed and running

### Render Free Tier Limitations
- Backend sleeps after 15 minutes of inactivity
- First request takes 30-60 seconds to wake up
- 750 hours/month free

### Neon Free Tier Limitations
- 1 project
- 10 GB storage
- Compute sleeps after 5 minutes of inactivity
- Wakes up automatically on first query

---

## Migration from JSON to PostgreSQL

### What Changed:
1. ✅ Data now stored in PostgreSQL (not JSON files)
2. ✅ All APIs updated to use database queries
3. ✅ Auto-creates tables on first run
4. ✅ Same UI and workflow - no frontend changes needed

### Benefits:
- ✅ Better data integrity
- ✅ Concurrent user support
- ✅ Faster queries
- ✅ Scalable architecture
- ✅ No file system dependencies

---

## Quick Commands

```bash
# Install dependencies
npm install

# Run backend locally
npm run server

# Run frontend locally
npm start

# Build for production
npm run build

# Deploy backend
git push origin master  # Render auto-deploys

# Deploy frontend
git push origin master  # Vercel auto-deploys
```

---

## Support

### Neon Dashboard
https://console.neon.tech

### Render Dashboard
https://dashboard.render.com

### Vercel Dashboard
https://vercel.com/dashboard

---

## Database Schema

### employees
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- mobile (VARCHAR UNIQUE)
- password (VARCHAR)
- created_at (TIMESTAMP)

### attendance
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FK)
- date (DATE)
- in_time (TIMESTAMP)
- out_time (TIMESTAMP)
- duration (VARCHAR)
- created_at (TIMESTAMP)

### leaves
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FK)
- start_date (DATE)
- end_date (DATE)
- reason (TEXT)
- status (VARCHAR)
- created_at (TIMESTAMP)

### holidays
- id (SERIAL PRIMARY KEY)
- date (DATE UNIQUE)
- name (VARCHAR)
- description (TEXT)
- created_at (TIMESTAMP)
