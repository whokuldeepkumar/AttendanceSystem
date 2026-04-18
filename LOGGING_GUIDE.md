# 📋 Attendance Sync Job - Complete Logging System Guide

## Overview

Your attendance sync job now has a **production-grade logging system** using Winston. This guide explains how to track, manage, and view logs for the scheduler, APIs, and errors.

## ✨ Features

- ✅ **Automatic Log Rotation** - Logs rotate at 5MB size limit
- ✅ **Multiple Log Files** - Scheduler, API, Error, and Combined logs
- ✅ **Console + File Logging** - Logs to both console (dev) and files (prod)
- ✅ **REST API Endpoints** - Query logs via HTTP
- ✅ **Log Levels** - error, warn, info, http, debug, silly
- ✅ **Timestamp Tracking** - All logs include precise timestamps
- ✅ **Stack Traces** - Full error stack traces in error logs
- ✅ **Organized Logs Directory** - Centralized logs/ folder

## 📂 Log Files Location

All logs are stored in: **`d:\Ang\Attend\logs\`**

```
logs/
├── scheduler.log      # Scheduler job execution logs
├── api.log            # External API calls and responses
├── error.log          # All errors from any module
├── combined.log       # All logs combined
```

### Log File Rotation

Each log file has automatic rotation:
- **Max Size**: 5MB per file
- **Max Files**: 5 backup files per log type
- **Example**: scheduler.log → scheduler.log.1 → scheduler.log.2 (when it reaches 5MB)

## 🔍 How to View Logs

### Option 1: Using REST API Endpoints (Easiest)

#### Get Log Status
```bash
curl http://localhost:3000/api/logs/status
```
Response:
```json
{
  "success": true,
  "message": "Log status retrieved",
  "logsDirectory": "d:\\Ang\\Attend\\logs",
  "logFiles": {
    "scheduler.log": {
      "size": "24.50 KB",
      "created": "2026-04-18T10:00:00.000Z",
      "modified": "2026-04-18T10:30:00.000Z"
    }
  }
}
```

#### View Scheduler Logs (Last 100 lines)
```bash
curl http://localhost:3000/api/logs/scheduler
```

#### View Scheduler Logs (Last 50 lines)
```bash
curl http://localhost:3000/api/logs/scheduler?lines=50
```

#### View API Logs
```bash
curl http://localhost:3000/api/logs/api
```

#### View Error Logs
```bash
curl http://localhost:3000/api/logs/error
```

#### View Combined Logs
```bash
curl http://localhost:3000/api/logs/combined
```

#### View Any Log File
```bash
curl http://localhost:3000/api/logs/scheduler.log?lines=200
```

#### Download a Log File
```bash
curl http://localhost:3000/api/logs/download/scheduler.log -o scheduler.log
# Or in browser: http://localhost:3000/api/logs/download/scheduler.log
```

#### Clear a Log File
```bash
curl -X DELETE http://localhost:3000/api/logs/scheduler.log
```

### Option 2: Direct File Access

**Navigate to the logs folder:**
```
D:\Ang\Attend\logs\
```

**View with any text editor:**
- Open `scheduler.log` in VS Code, Notepad, etc.
- Use `tail -f` command in terminal (Linux/Mac)

### Option 3: Terminal Commands

```bash
# Watch logs in real-time (Linux/Mac)
tail -f d:\Ang\Attend\logs\scheduler.log
tail -f d:\Ang\Attend\logs\error.log

# View last 50 lines
tail -n 50 d:\Ang\Attend\logs\scheduler.log

# Search for errors
grep "ERROR" d:\Ang\Attend\logs\scheduler.log

# Count log lines
wc -l d:\Ang\Attend\logs\scheduler.log
```

### Option 4: Real-time Console Output

When running server in development:
```bash
npm start
```

All logs appear in terminal with colors:
```
[2026-04-18 10:30:00] [info] [scheduler] Attendance sync process completed
[2026-04-18 10:30:01] [info] [api] Token stored for employee 400049
```

## 📊 Log Levels

Logs are recorded at different levels (configurable via `LOG_LEVEL` env var):

| Level | When Used | Color |
|-------|-----------|-------|
| **error** | Critical failures, exceptions | 🔴 Red |
| **warn** | Warnings, empty results | 🟡 Yellow |
| **info** | Important events, job completion | 🔵 Blue |
| **debug** | Detailed debug information | ⚪ Grey |
| **http** | HTTP requests | Green |
| **silly** | Very verbose debugging | Grey |

### Log Level Control

Set in `.env`:
```env
# Default is 'info'
LOG_LEVEL=debug    # More verbose
LOG_LEVEL=error    # Only errors
LOG_LEVEL=info     # Standard (default)
```

## 🎯 Common Log Tracking Scenarios

### 1. Track Scheduler Success
```bash
curl http://localhost:3000/api/logs/scheduler | grep "completed"
```
✅ Look for: `Attendance sync process completed`

### 2. Find Login Errors
```bash
curl http://localhost:3000/api/logs/error | grep -i "login\|auth"
```

### 3. Check Token Generation
```bash
curl http://localhost:3000/api/logs/api | grep -i "token"
```

### 4. Monitor Attendance Sync
```bash
curl http://localhost:3000/api/logs/scheduler?lines=50 | grep "Attendance synced"
```

### 5. Find All Errors (Last 24 Hours)
```bash
curl http://localhost:3000/api/logs/error?lines=1000
```

## 📈 Sample Log Output

### Scheduler Log Example
```
[2026-04-18 10:00:00] [info] Starting attendance sync process
[2026-04-18 10:00:00] [info] Found 5 employees to sync
[2026-04-18 10:00:01] [info] Successfully logged in to external API
[2026-04-18 10:00:02] [debug] Fetching calendar data for John Doe (month 042026)
[2026-04-18 10:00:03] [info] Attendance synced for John Doe on 2026-04-18
[2026-04-18 10:00:03] [debug] Fetching calendar data for Jane Smith (month 042026)
[2026-04-18 10:00:04] [info] Attendance synced for Jane Smith on 2026-04-18
[2026-04-18 10:00:05] [info] Attendance sync process completed
```

### Error Log Example
```
[2026-04-18 10:30:00] [error] External API credentials not configured in environment variables
[2026-04-18 10:35:00] [error] Error fetching employee calendar: Network timeout
[Stack trace...]
```

### API Log Example
```
[2026-04-18 10:00:01] [debug] Token stored for employee 400049
[2026-04-18 10:00:02] [debug] Attendance saved for employee 400049 on 2026-04-18
```

## 🔧 Configuration

### Environment Variables for Logging

```env
# Log level: error, warn, info, http, debug, silly
LOG_LEVEL=info

# Node environment (affects console output)
NODE_ENV=development    # Also logs to console
NODE_ENV=production     # Only logs to files
```

## 🛠️ Advanced Usage

### Create Custom Log Queries

**Using curl with JSON parsing:**
```bash
# Get error count
curl http://localhost:3000/api/logs/error | grep -c "ERROR"

# Find specific employee errors
curl http://localhost:3000/api/logs/scheduler | grep "Jane Smith"

# Get logs since specific time
curl http://localhost:3000/api/logs/combined?lines=500 | grep "10:30"
```

**Using PowerShell:**
```powershell
# View last 20 scheduler logs
(Invoke-WebRequest http://localhost:3000/api/logs/scheduler`?lines=20).Content | ConvertFrom-Json

# Download and save logs
(Invoke-WebRequest http://localhost:3000/api/logs/download/scheduler.log).Content | Out-File logs-backup.log
```

## 📋 REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs/status` | Get log files info and statistics |
| GET | `/api/logs/scheduler` | Get scheduler logs (100 lines default) |
| GET | `/api/logs/api` | Get API logs |
| GET | `/api/logs/error` | Get error logs |
| GET | `/api/logs/combined` | Get combined logs |
| GET | `/api/logs/:filename` | Get any log file |
| GET | `/api/logs/:filename?lines=N` | Get last N lines |
| GET | `/api/logs/download/:filename` | Download log file |
| DELETE | `/api/logs/:filename` | Clear a log file |

## 🚨 Troubleshooting

### Q: Logs directory is not created
**A:** It's created automatically on first server start. Check if server started successfully.

### Q: Can't access log endpoints
**A:** Ensure server is running with new code:
```bash
npm install  # Install winston
npm start    # Restart server
```

### Q: Logs are empty
**A:** Check `LOG_LEVEL` environment variable. May be set too high.

### Q: Log files growing too large
**A:** Rotation is automatic at 5MB. Old files are archived (scheduler.log.1, .2, etc)

### Q: Not seeing real-time logs in console
**A:** Ensure `NODE_ENV=development` (default). For production, logs go to files only.

## 📊 Monitoring Dashboard (Optional)

Create a monitoring page to view logs in real-time:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Log Viewer</title>
  <style>
    body { font-family: monospace; background: #1e1e1e; color: #00ff00; }
    pre { max-height: 600px; overflow-y: auto; padding: 10px; background: #000; }
  </style>
</head>
<body>
  <h1>📋 Attendance Sync Logs</h1>
  <button onclick="loadSchedulerLogs()">Load Scheduler</button>
  <button onclick="loadApiLogs()">Load API</button>
  <button onclick="loadErrorLogs()">Load Errors</button>
  <pre id="logs"></pre>

  <script>
    function loadSchedulerLogs() {
      fetch('/api/logs/scheduler?lines=100')
        .then(r => r.json())
        .then(d => {
          document.getElementById('logs').textContent = d.data.join('\n');
        });
    }
    function loadApiLogs() {
      fetch('/api/logs/api?lines=100')
        .then(r => r.json())
        .then(d => {
          document.getElementById('logs').textContent = d.data.join('\n');
        });
    }
    function loadErrorLogs() {
      fetch('/api/logs/error?lines=100')
        .then(r => r.json())
        .then(d => {
          document.getElementById('logs').textContent = d.data.join('\n');
        });
    }
    loadSchedulerLogs();
    setInterval(loadSchedulerLogs, 5000); // Auto-refresh every 5 seconds
  </script>
</body>
</html>
```

## 🎯 Next Steps

1. **Verify Logging**: Start server and check logs folder
2. **Test Endpoints**: Try `/api/logs/status` to verify system works
3. **Monitor**: Use log viewing endpoints to track job execution
4. **Setup Alerts**: Create monitoring to notify on errors
5. **Archive**: Regularly download and backup logs

## 📞 Quick Reference

```bash
# Check if logs are working
curl http://localhost:3000/api/logs/status

# View recent scheduler execution
curl http://localhost:3000/api/logs/scheduler?lines=50

# View all recent errors
curl http://localhost:3000/api/logs/error?lines=100

# View real-time scheduler logs
curl http://localhost:3000/api/logs/scheduler -s | tail -f

# Monitor scheduler every 5 seconds
watch -n 5 "curl http://localhost:3000/api/logs/scheduler?lines=20"
```

---

**Logging Status**: ✅ ACTIVE AND CONFIGURED

Your system is now fully logging all activity. Start the server to begin collecting logs!
