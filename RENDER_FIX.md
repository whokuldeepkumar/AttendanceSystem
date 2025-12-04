# Fix Render Memory Error

## Option 1: Use render.yaml (Recommended)

1. **Push the new files to GitHub**:
   - `render.yaml`
   - `backend-package.json`
   - `.renderignore`

2. **In Render Dashboard**:
   - Delete the existing service
   - Click "New +" → "Blueprint"
   - Connect your GitHub repo
   - It will auto-detect `render.yaml`
   - Click "Apply"

## Option 2: Manual Configuration

1. **In Render Dashboard**, go to your service settings:

2. **Update Build Command**:
   ```
   cp backend-package.json package.json && npm install
   ```

3. **Update Start Command**:
   ```
   node server.js
   ```

4. **Add Environment Variable**:
   - Key: `NODE_ENV`
   - Value: `production`

5. **Click "Manual Deploy" → "Clear build cache & deploy"**

## Option 3: Use Railway.app Instead (Easier)

Railway has better free tier and auto-detects backend:

1. Go to https://railway.app
2. "New Project" → "Deploy from GitHub"
3. Select your repo
4. Railway auto-detects and deploys `server.js`
5. Copy the generated URL
6. Update `src/environments/environment.prod.ts`:
   ```typescript
   apiUrl: 'https://your-app.railway.app/api'
   ```

## Why This Happened

Render tried to install ALL dependencies (including Angular dev tools) which needs 2GB+ memory. The fix ensures only backend dependencies (express, cors) are installed, using ~50MB.

## Verify Backend is Working

After deployment, test:
```
https://your-backend-url.onrender.com/api/employees
```

Should return: `[]` or employee list
