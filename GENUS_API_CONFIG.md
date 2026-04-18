# ✅ Genus API Configuration - Updated

## API Details

Your code has been **updated to match the actual Genus API** specification.

---

## 📝 Login Endpoint (Corrected)

### Endpoint
```
POST https://apps.genus.in/clmsapi/api/Login/login
```

### Request Body
```json
{
  "empCode": "400049",
  "empPassword": "Myname@@123",
  "empCompany": "GPIL"
}
```

### Response Format
```json
{
  "statusCode": 200,
  "message": "Login successfully.",
  "result": {
    "employeeName": "Kuldeep Kumar",
    "employeeCode": "400049",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    ...other fields...
  }
}
```

---

## 🔧 .env Configuration (Updated)

Update your `.env` file with:

```env
# Genus API Credentials
EXTERNAL_API_EMPCODE=400049
EXTERNAL_API_EMPPASSWORD=Myname@@123
EXTERNAL_API_COMPANY=GPIL

# Database
DATABASE_URL=postgresql://user:pass@host/database

# Logging
LOG_LEVEL=info
NODE_ENV=development
PORT=3000
```

### Parameters Explained

| Parameter | Example | From |
|-----------|---------|------|
| `EXTERNAL_API_EMPCODE` | `400049` | Employee Code |
| `EXTERNAL_API_EMPPASSWORD` | `Myname@@123` | Employee Password |
| `EXTERNAL_API_COMPANY` | `GPIL` | Company Code |

---

## 🔐 Replace with Your Credentials

Get these from your Genus CLMS system:
- **Employee Code**: Your employee ID in Genus system
- **Password**: Your login password
- **Company**: Your company code (usually 4 letters)

---

## ✅ Updated Code Changes

### 1. external-api-service.js
- ✅ Changed endpoint from `/User/Login` to `/Login/login`
- ✅ Updated to use `empCode`, `empPassword`, `empCompany`
- ✅ Changed response parsing to `result.token`

### 2. attendance-scheduler.js
- ✅ Uses new environment variables
- ✅ Passes employee code to sync method
- ✅ Better error messages

### 3. .env
- ✅ Updated with correct variable names
- ✅ Pre-filled with your test credentials

---

## 🚀 Restart Server

```bash
node server-postgres.js
```

You should now see:
```
[2026-04-18 12:28:35] [info] [SCHEDULER] Starting attendance sync process
[2026-04-18 12:28:35] [info] [SCHEDULER] Found 12 employees to sync
[2026-04-18 12:28:36] [info] [SCHEDULER] Successfully logged in to external API
[2026-04-18 12:28:37] [info] [SCHEDULER] Attendance synced for Kuldeep Kumar on 2026-04-18
```

---

## 📊 API Response Mapping

The code now correctly extracts:

| Field | Path | Usage |
|-------|------|-------|
| Token | `result.token` | Bearer token for API calls |
| Employee Name | `result.employeeName` | Logging/tracking |
| Employee Code | `result.employeeCode` | Database storage |

---

## 🔗 Next: GetEmployeeCalender Endpoint

Once login works, the scheduler fetches calendar data using:

```
POST https://apps.genus.in/clmsapi/api/LeaveProcess/GetEmployeeCalender

Headers:
- Authorization: Bearer <token>

Body:
- EmployeeCode: 400049
- Type: GetMonthSummary
- LeaveMMYY: 042026
```

---

## ✨ Status

✅ API endpoints corrected  
✅ Environment variables updated  
✅ Code updated to match Genus API  
✅ Ready to test

**Restart your server:** `node server-postgres.js`

Check logs:
```bash
curl http://localhost:3000/api/logs/scheduler
```
