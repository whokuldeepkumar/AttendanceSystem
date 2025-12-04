# Deployment Guide

## Deploy Frontend to Vercel

1. **Push your code to GitHub** (already done)

2. **Go to Vercel**
   - Visit https://vercel.com
   - Sign in with GitHub
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Build Settings**
   - Framework Preset: Angular
   - Build Command: `npm run build`
   - Output Directory: `dist/attendance-app/browser`
   - Install Command: `npm install`

4. **Environment Variables** (Optional)
   - Add any environment variables if needed

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your app will be live at: `https://your-app.vercel.app`

## Deploy Backend to Render

1. **Go to Render**
   - Visit https://render.com
   - Sign in with GitHub
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Select your GitHub repository
   - Click "Connect"

3. **Configure Service**
   - Name: `attendance-backend`
   - Environment: `Node`
   - Build Command: `npm install --production`
   - Start Command: `node server.js`
   - Plan: `Free`

4. **Environment Variables**
   - Add: `NODE_ENV` = `production`
   - Add: `PORT` = `10000`

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Your API will be live at: `https://your-app.onrender.com`

## Update Frontend to Use Backend API

After deploying backend to Render, update your frontend environment:

1. **Update `src/environments/environment.ts`**
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000/api'  // For local development
   };
   ```

2. **Update `src/environments/environment.prod.ts`**
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://your-backend.onrender.com/api'  // Your Render URL
   };
   ```

3. **Commit and push changes**
   ```bash
   git add .
   git commit -m "Update production API URL"
   git push
   ```

4. **Vercel will auto-deploy** the updated frontend

## Important Notes

- **Render Free Tier**: Backend may sleep after 15 minutes of inactivity
- **First Request**: May take 30-60 seconds to wake up the backend
- **Data Persistence**: JSON files on Render are temporary and reset on restart
- **For Production**: Consider using a proper database (MongoDB, PostgreSQL)

## Troubleshooting

### Vercel Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Angular version compatibility

### Render Backend Not Working
- Check logs in Render dashboard
- Verify PORT environment variable is set
- Ensure `public` folder exists with JSON files

### CORS Issues
- Backend already configured to allow all origins
- Can restrict to specific domain in production

## Testing Deployment

1. **Test Frontend**: Visit your Vercel URL
2. **Test Backend**: Visit `https://your-backend.onrender.com/api/employees`
3. **Test Integration**: Try login/registration on frontend
