# Deployment Guide

## Backend Deployment on Render.com (Free)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub

### Step 2: Deploy Backend
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: attendance-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free

4. Click "Create Web Service"
5. Wait for deployment (5-10 minutes)
6. Copy your backend URL (e.g., `https://attendance-backend-xxxx.onrender.com`)

### Step 3: Update Frontend Environment
1. Open `src/environments/environment.prod.ts`
2. Replace `apiUrl` with your Render backend URL:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://attendance-backend-xxxx.onrender.com/api'
   };
   ```

### Step 4: Deploy Frontend on Vercel
1. Push code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Configure:
   - **Framework Preset**: Angular
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/attendance-app/browser`
5. Click "Deploy"

### Step 5: Test
1. Visit your Vercel URL
2. Login and test attendance features
3. Data will be saved to backend on Render

## Important Notes

### Render Free Tier Limitations:
- Backend sleeps after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- 750 hours/month free (enough for one service)

### Alternative Free Backend Hosting:
- **Railway.app**: 500 hours/month free
- **Fly.io**: 3 VMs free
- **Cyclic.sh**: Unlimited free tier

### To Use Railway Instead:
1. Go to https://railway.app
2. "New Project" → "Deploy from GitHub"
3. Select your repo
4. Add environment variable: `PORT=3000`
5. Copy the generated URL
6. Update `environment.prod.ts` with Railway URL

## Local Development
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm start
```

## Production Build Test
```bash
npm run build
```

## Troubleshooting

### CORS Errors:
Update `server.js` CORS origin to your Vercel domain:
```javascript
app.use(cors({
  origin: 'https://your-app.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
```

### Backend Not Responding:
- Check Render logs
- Verify PORT environment variable
- Ensure `public` folder exists with JSON files

### Data Not Saving:
- Check browser console for errors
- Verify API URL in environment.prod.ts
- Check Render backend logs
