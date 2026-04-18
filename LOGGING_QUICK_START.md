# 🚀 Logging System - Quick Start

## 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server
```bash
npm start
```

### 3. View Logs

**Using Browser:**
```
http://localhost:3000/api/logs/status
http://localhost:3000/api/logs/scheduler
http://localhost:3000/api/logs/error
```

**Using curl:**
```bash
# Check log files
curl http://localhost:3000/api/logs/status

# View scheduler logs (last 100 lines)
curl http://localhost:3000/api/logs/scheduler

# View error logs
curl http://localhost:3000/api/logs/error

# View last 50 lines
curl http://localhost:3000/api/logs/scheduler?lines=50
```

**Using File System:**
```
D:\Ang\Attend\logs\
```

## 📊 View Logs

### Real-time in Terminal
```bash
npm start
# See colored logs as they happen
```

### REST API
```bash
# Scheduler logs
curl http://localhost:3000/api/logs/scheduler?lines=100

# API logs
curl http://localhost:3000/api/logs/api?lines=50

# Error logs
curl http://localhost:3000/api/logs/error

# Get all logs
curl http://localhost:3000/api/logs/combined?lines=200
```

### Download Logs
```bash
curl http://localhost:3000/api/logs/download/scheduler.log -o my-logs.log
```

### Clear Logs
```bash
curl -X DELETE http://localhost:3000/api/logs/scheduler.log
```

## 🎯 Track Specific Events

### Track Successful Sync
```bash
curl http://localhost:3000/api/logs/scheduler | grep "completed"
```
Expected: `Attendance sync process completed`

### Track Errors
```bash
curl http://localhost:3000/api/logs/error
```

### Track Employee Syncs
```bash
curl http://localhost:3000/api/logs/scheduler | grep "Attendance synced"
```

### Track Login
```bash
curl http://localhost:3000/api/logs/api | grep -i "login"
```

## 📁 Log Files

All logs stored in: **`D:\Ang\Attend\logs\`**

- `scheduler.log` - Job execution logs
- `api.log` - External API calls
- `error.log` - All errors
- `combined.log` - Everything combined

## 🔧 Configuration

Set in `.env`:
```env
LOG_LEVEL=info          # Default
LOG_LEVEL=debug         # More verbose
LOG_LEVEL=error         # Only errors
NODE_ENV=development    # Console output (default)
NODE_ENV=production     # File only
```

## 🌐 API Endpoints

```
GET  /api/logs/status                    - Log files info
GET  /api/logs/scheduler                 - Scheduler logs
GET  /api/logs/api                       - API logs
GET  /api/logs/error                     - Error logs
GET  /api/logs/combined                  - All logs
GET  /api/logs/:filename                 - Any log file
GET  /api/logs/download/:filename        - Download log
DELETE /api/logs/:filename               - Clear log
```

## 💡 Examples

**Monitor sync every 5 seconds:**
```bash
watch -n 5 "curl http://localhost:3000/api/logs/scheduler?lines=20"
```

**Find all errors:**
```bash
curl http://localhost:3000/api/logs/error?lines=500
```

**Check last 10 scheduler runs:**
```bash
curl http://localhost:3000/api/logs/scheduler?lines=1000 | grep "completed"
```

**Export logs:**
```bash
curl http://localhost:3000/api/logs/combined > all-logs.txt
```

---

**For detailed guide, see:** [LOGGING_GUIDE.md](LOGGING_GUIDE.md)
