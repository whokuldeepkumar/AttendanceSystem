# Deployment Checklist

## Issues Fixed:
1. ✅ Header/Footer hidden on login page (already working)
2. ✅ Attendance summary calculations fixed
3. ✅ Employee data loading with delay for API

## Deploy Steps:

### 1. Push to GitHub
```bash
git add .
git commit -m "Fix: employee loading, stats calculation, password field"
git push origin master
```

### 2. Verify Backend (Render)
- Go to: https://attendance-backend-gsur.onrender.com/api/employees
- Should return employee list (not empty)
- If empty, backend needs data initialization

### 3. Initialize Backend Data
If employees endpoint returns `[]`, you need to add employees via API:

```bash
# Add employee via API
curl -X POST https://attendance-backend-gsur.onrender.com/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","mobile":"1234567890","password":"test123"}'
```

Or manually update `public/employees.json` on Render.

### 4. Vercel Auto-Deploy
- Vercel will auto-deploy when you push to GitHub
- Wait 2-3 minutes for build
- Check: https://your-app.vercel.app

### 5. Test Live Site
1. Login page (no header/footer) ✓
2. Home page - check attendance summary counts
3. Employees page - check if data shows
4. Edit employee - check password field

## Common Issues:

### Employees Not Showing:
- Backend might be sleeping (Render free tier)
- First request takes 30-60 seconds
- Refresh page after 1 minute

### Stats Not Calculating:
- Check browser console for errors
- Verify attendance records exist in current month

### Changes Not Reflecting:
- Clear browser cache (Ctrl+Shift+R)
- Check Vercel deployment logs
- Verify correct environment.prod.ts API URL

## Quick Test Commands:

```bash
# Test backend is alive
curl https://attendance-backend-gsur.onrender.com/api/employees

# Test attendance endpoint
curl https://attendance-backend-gsur.onrender.com/api/attendance

# Build locally to test
npm run build
```
