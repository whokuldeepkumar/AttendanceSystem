# 🚀 Quick Start Guide - Attendance Sync Job

## What's Been Added

Your Angular/Node.js attendance app now includes an automated job that:
- ✅ Runs every 30 minutes automatically
- ✅ Logs into the Genus API with credentials
- ✅ Fetches today's attendance data
- ✅ Stores it in the PostgreSQL database

## Files Created/Modified

### New Files
1. **attendance-scheduler.js** - Main scheduler (runs every 30 min)
2. **external-api-service.js** - API integration service
3. **ATTENDANCE_SYNC_SETUP.md** - Full documentation

### Updated Files
1. **backend-package.json** - Added dependencies
2. **server-postgres.js** - Integrated scheduler
3. **init-database.sql** - Added database tables

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Add to your `.env` file:
```env
# Genus API Credentials
EXTERNAL_API_USERNAME=your_username
EXTERNAL_API_PASSWORD=your_password

# Keep existing DB config
DATABASE_URL=your_existing_db_url
PORT=3000
```

### Step 3: Start Server
```bash
npm start
```

You'll see:
```
Server running at http://localhost:3000
=== Starting Attendance Scheduler ===
[AttendanceScheduler] Starting scheduler
Scheduler will run every 30 minutes
```

## How It Works

### Every 30 Minutes:
1. **Login** → Authenticates with Genus API
2. **Fetch** → Gets employee calendar/attendance data
3. **Store** → Saves to `external_attendance` table
4. **Log** → Outputs status to console

### First Run
- Executes immediately when server starts
- Then runs every 30 minutes after

## Database Tables Added

### `api_tokens`
- Stores bearer tokens for each employee
- Auto-updates on each login

### `external_attendance`
- Stores today's attendance for each employee
- JSON column contains full API response

## Monitoring

Watch the console for logs:
```
[AttendanceSync] Starting attendance sync process
[AttendanceSync] Found 5 employees to sync
[AttendanceSync-John Doe] Attendance synced for 2026-04-18
[AttendanceSync] Attendance sync process completed
```

## Important Notes

### Employee Codes
Currently syncs **all employees**. To map specific employee codes:
1. Update `attendance-scheduler.js` line ~141-148
2. Map employee name/mobile to external employee code
3. Or add `employee_code` field to employees table

### API Structure
The scheduler assumes API response structure like:
```json
{
  "data": [
    { "date": "2026-04-18", "status": "present", ... },
    ...
  ]
}
```

Adjust the `extractTodayAttendance()` method if structure differs.

## Customization

### Change Sync Interval
Edit `attendance-scheduler.js` line 23:
- Every 15 min: `*/15 * * * *`
- Every 1 hour: `0 * * * *`
- Every day at 9 AM: `0 9 * * *`

### Run Manual Sync
Would you like me to add an API endpoint to trigger manual sync?

### Add Retry Logic
Would you like automatic retry on failed API calls?

## Troubleshooting

### Scheduler Not Running?
- Check server started: Look for scheduler message in console
- Verify .env file exists and has DATABASE_URL
- Check `node-cron` is installed: `npm list node-cron`

### No Data Syncing?
- Verify EXTERNAL_API_USERNAME and EXTERNAL_API_PASSWORD
- Check if Genus API is accessible
- Look for error messages in console logs
- Ensure employee records exist in database

### Database Errors?
- Verify DATABASE_URL connection string
- Ensure database is running and accessible
- Check init-database.sql executed on startup

## Next Steps

1. **Test**: Start server and watch for sync logs
2. **Configure**: Add correct Genus API credentials to .env
3. **Verify**: Check `external_attendance` table for data
4. **Monitor**: Use provided logs to track sync health
5. **Extend**: Add endpoints to query synced attendance data

## Full Documentation

See **ATTENDANCE_SYNC_SETUP.md** for:
- Detailed architecture
- API endpoint specs
- Database schema
- Configuration examples
- Advanced troubleshooting

---

**Need Help?** Check the logs in console for detailed error messages and sync status updates.
