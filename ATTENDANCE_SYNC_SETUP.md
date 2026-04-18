# Attendance Sync Job Setup Guide

This document explains how to set up and configure the automatic attendance sync job that runs every 30 minutes.

## Overview

The scheduler performs the following workflow every 30 minutes:

1. **Login to External API**: Authenticates with the Genus attendance API using provided credentials
2. **Get Bearer Token**: Stores the token in the database for future use
3. **Fetch Calendar Data**: Retrieves employee attendance calendar from the external API
4. **Extract Today's Data**: Finds today's attendance record from the API response
5. **Save to Database**: Stores the attendance data in the local PostgreSQL database

## Environment Variables

You need to configure the following environment variables in your `.env` file:

```
# External API Credentials
EXTERNAL_API_USERNAME=your_username
EXTERNAL_API_PASSWORD=your_password

# Employee Code (optional - if you want to sync only specific employee)
# Leave empty to sync all employees
EMPLOYEE_CODE=400049

# Database URL (already configured)
DATABASE_URL=your_postgres_connection_string

# Server Port
PORT=3000
```

### Environment Variables Breakdown

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EXTERNAL_API_USERNAME` | Yes | Username for Genus API login | `admin@company.com` |
| `EXTERNAL_API_PASSWORD` | Yes | Password for Genus API login | `your_secure_password` |
| `EMPLOYEE_CODE` | No | Specific employee code to sync (optional) | `400049` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host/dbname` |
| `PORT` | No | Server port (default: 3000) | `3000` |

## Setup Instructions

### 1. Install Dependencies

```bash
cd d:\Ang\Attend
npm install
```

This will install the new dependencies:
- `node-cron`: ^3.0.3 (for scheduling)
- `axios`: ^1.6.5 (for HTTP requests)

### 2. Update .env File

Add the required environment variables to your `.env` file:

```env
# External API Credentials (from Genus)
EXTERNAL_API_USERNAME=your_username
EXTERNAL_API_PASSWORD=your_password

# Database - Neon PostgreSQL
DATABASE_URL=postgresql://user:password@host.neon.tech/database

# Server
PORT=3000
```

### 3. Database Migrations

The database tables will be automatically created when the server starts:
- `api_tokens`: Stores bearer tokens for employees
- `external_attendance`: Stores synced attendance data

These tables are created in `init-database.sql` and run automatically.

### 4. Start the Server

```bash
npm start
```

You should see output like:
```
Server running at http://localhost:3000
API available at http://localhost:3000/api
Database: PostgreSQL (Neon)

=== Starting Attendance Scheduler ===
[AttendanceScheduler] Starting scheduler - first run will execute immediately
Scheduler will run every 30 minutes
```

## How It Works

### Scheduler Runs Every 30 Minutes

The scheduler uses the cron pattern `*/30 * * * *` which means:
- Every 30 minutes, every hour, every day, every month, any day of week

**First run**: Executes immediately when the server starts
**Subsequent runs**: Every 30 minutes after that

### Workflow Process

1. **Get All Employees**
   - Fetches all employees from the `employees` table

2. **Login to External API**
   - Uses `EXTERNAL_API_USERNAME` and `EXTERNAL_API_PASSWORD`
   - Receives a bearer token in response

3. **Store Token**
   - Saves the token to `api_tokens` table with employee info
   - Stores token expiration time if provided

4. **Fetch Calendar Data**
   - For each employee, calls the external API endpoint:
     ```
     POST https://apps.genus.in/clmsapi/api/LeaveProcess/GetEmployeeCalender
     ```
   - Pass employee code, month, and bearer token

5. **Extract Today's Attendance**
   - Parses the API response to find today's date record
   - Extracts status and other attendance details

6. **Save to Database**
   - Saves/updates the attendance record in `external_attendance` table
   - Creates a new record or updates existing if the date already exists

## Database Tables

### api_tokens
```sql
- id: Primary key
- employee_id: Reference to employee
- employee_code: External employee code
- bearer_token: JWT bearer token
- token_expires_at: Token expiration timestamp
- created_at: When token was created
- updated_at: When token was last updated
```

### external_attendance
```sql
- id: Primary key
- employee_id: Reference to employee
- employee_code: External employee code
- attendance_date: Date of attendance record (YYYY-MM-DD)
- status: Attendance status (present, absent, leave, etc.)
- data: Full API response as JSON
- synced_at: When record was last synced
```

## API Details

### Login Endpoint
```
POST https://apps.genus.in/clmsapi/api/User/Login
Body: { username, password }
Response: { token: "bearer_token_value" }
```

### Get Employee Calendar
```
POST https://apps.genus.in/clmsapi/api/LeaveProcess/GetEmployeeCalender
Headers: { Authorization: "Bearer <token>" }
Body: { 
  EmployeeCode: "400049",
  Type: "GetMonthSummary",
  LeaveMMYY: "042026"
}
```

## Monitoring and Logging

All scheduler activities are logged to console with prefixes for easy tracking:

```
[AttendanceScheduler] - Scheduler lifecycle events
[AttendanceSync] - Main sync process logs
[AttendanceSync-EmployeeName] - Per-employee logs
```

Example console output:
```
[AttendanceScheduler] Running scheduled job at 4/18/2026, 10:30:00 AM
[AttendanceSync] Starting attendance sync process
[AttendanceSync] Found 5 employees to sync
[AttendanceSync] Successfully logged in to external API
[AttendanceSync-John Doe] Fetching calendar data for month 042026
[AttendanceSync-John Doe] Attendance synced for 2026-04-18
```

## Troubleshooting

### Scheduler Not Running
- Check if server started successfully
- Look for `=== Starting Attendance Scheduler ===` message in logs
- Verify `.env` file has correct `DATABASE_URL`

### Authentication Failures
- Verify `EXTERNAL_API_USERNAME` and `EXTERNAL_API_PASSWORD` are correct
- Check if the external API is accessible
- Ensure credentials have proper permissions

### No Data Synced
- Check if employees exist in the database
- Verify employee codes match those in the external system
- Check API response contains data for today's date
- Look for specific employee error messages in logs

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check PostgreSQL/Neon connection status
- Ensure database is initialized with schema

## Configuration Examples

### Using Environment File

Create a `.env` file in the project root:
```env
# Genus API Credentials
EXTERNAL_API_USERNAME=admin@company.com
EXTERNAL_API_PASSWORD=SecurePassword123!

# Database
DATABASE_URL=postgresql://user:password@db.neon.tech:5432/attendance_db

# Server
PORT=3000
```

### For Development vs Production

**Development (.env.development)**
```env
EXTERNAL_API_USERNAME=dev_user
EXTERNAL_API_PASSWORD=dev_password
DATABASE_URL=postgresql://dev:dev@localhost:5432/attendance_dev
PORT=3000
```

**Production (.env.production)**
```env
EXTERNAL_API_USERNAME=prod_user
EXTERNAL_API_PASSWORD=prod_secure_password
DATABASE_URL=postgresql://prod:secure@neon.tech/attendance_prod
PORT=8080
```

## API Response Data Integration

The attendance data from the external API is stored as JSON in the `external_attendance` table under the `data` column. You can query this data:

```sql
-- Get today's attendance for all employees
SELECT employee_code, data 
FROM external_attendance 
WHERE attendance_date = CURRENT_DATE;

-- Get specific employee's attendance
SELECT * FROM external_attendance 
WHERE employee_id = 1 
AND attendance_date = CURRENT_DATE;
```

## Next Steps

1. **Add employee code mapping**: Update the scheduler to properly map employee names/IDs to external employee codes
2. **Create API endpoint**: Add an endpoint to manually trigger sync
3. **Add retry logic**: Implement exponential backoff for failed API calls
4. **Set up monitoring**: Add email/Slack alerts for sync failures
5. **Create reports**: Add endpoints to query and display synced attendance data

## File Locations

- **Scheduler Logic**: [attendance-scheduler.js](attendance-scheduler.js)
- **API Service**: [external-api-service.js](external-api-service.js)
- **Server Setup**: [server-postgres.js](server-postgres.js)
- **Database Schema**: [init-database.sql](init-database.sql)
- **Dependencies**: [backend-package.json](backend-package.json)
