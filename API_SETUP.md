# Attendance System API Setup

## Overview

The application now uses a backend API to persist all data to JSON files instead of localStorage:
- **Employees** - `public/employees.json`
- **Attendance Records** - `public/attendance.json`
- **Leave Requests** - `public/leave.json`
- **Holidays** - `public/holidays.json`

## How to Run the Application

### Option 1: Run Both Server and Angular App (Recommended)

```bash
npm run dev
```

This command will:
- Start the Express server on `http://localhost:3000`
- Start the Angular dev server on `http://localhost:4201`
- Both will run concurrently

### Option 2: Run Server and Angular App Separately

**Terminal 1 - Start the Backend Server:**
```bash
npm run server
```
The server will run on `http://localhost:3000`

**Terminal 2 - Start the Angular App:**
```bash
npm start
```
The app will run on `http://localhost:4200`

## API Endpoints

### EMPLOYEES

**GET `/api/employees`**
- Get all registered employees

**POST `/api/employees`**
- Register a new employee
- Body: `{ "name": "string", "mobile": "string" }`

### ATTENDANCE

**GET `/api/attendance`**
- Get all attendance records

**GET `/api/attendance/:userId`**
- Get attendance records for a specific user

**POST `/api/attendance`**
- Add or update an attendance record
- Body: `{ "userId": "string", "date": "YYYY-MM-DD", "inTime": "ISO-string", "outTime": "ISO-string", "duration": "string" }`

### LEAVE

**GET `/api/leave`**
- Get all leave requests

**GET `/api/leave/:userId`**
- Get leave requests for a specific user

**POST `/api/leave`**
- Create a new leave request
- Body: `{ "userId": "string", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "reason": "string", "status": "pending|approved" }`

**PUT `/api/leave/:leaveId`**
- Update leave request status
- Body: `{ "status": "pending|approved|rejected" }`

### HOLIDAYS

**GET `/api/holidays`**
- Get all holidays

**POST `/api/holidays`**
- Add a holiday
- Body: `{ "date": "YYYY-MM-DD", "name": "string", "description": "optional" }`

**DELETE `/api/holidays/:date`**
- Delete a holiday

## Data Persistence

All data is saved in the following JSON files:

```
public/
├── employees.json      # Employee registration data
├── attendance.json     # Attendance records (in/out times)
├── leave.json         # Leave requests and approvals
└── holidays.json      # Holidays and off days
```

## Data Flow

1. **Frontend** - Data is updated in Angular signals
2. **LocalStorage** - Data is saved to localStorage for immediate availability
3. **Backend API** - Data is synced to JSON files for persistence
4. **Reload** - On app reload, data is loaded from API (with localStorage fallback)

## File Structure

- `server.js` - Express backend server
- `src/app/services/attendance.service.ts` - Attendance data management
- `src/app/services/leave.service.ts` - Leave request management
- `src/app/services/holiday.service.ts` - Holiday management
- `src/app/services/auth.service.ts` - Employee authentication

## Notes

- All timestamps are in ISO format
- Mobile numbers are normalized (non-digits removed)
- The server must be running for data persistence to work
- The app works offline with localStorage data if API is unavailable
- Each user's data is isolated by userId

