# ✅ Employee Code Configuration Guide

## What's Changed

Your code now uses the `employee_code` column from the employees table to fetch attendance data from Genus API.

---

## 📋 Populate Employee Codes

### Option 1: SQL Query (Recommended)

Run this SQL to add employee codes to your employees table:

```sql
-- Update employee codes for each employee
-- UPDATE employees SET employee_code = '400049' WHERE name = 'Kuldeep Kumar';
-- UPDATE employees SET employee_code = '400050' WHERE name = 'Bharat Mewara';
-- UPDATE employees SET employee_code = '400051' WHERE name = 'Pradeep Suwalka';
-- UPDATE employees SET employee_code = '400052' WHERE name = 'NAVEEN VERMA';
-- UPDATE employees SET employee_code = '400053' WHERE name = 'Shubham soni';
-- UPDATE employees SET employee_code = '400054' WHERE name = 'Badal Kumar';
-- UPDATE employees SET employee_code = '400055' WHERE name = 'Rishi Agrawal';
-- UPDATE employees SET employee_code = '400056' WHERE name = 'Rohit Gupta';
-- UPDATE employees SET employee_code = '400057' WHERE name = 'MD IRFAN';
-- UPDATE employees SET employee_code = '400058' WHERE name = 'Rohit Kumar';
-- UPDATE employees SET employee_code = '400059' WHERE name = 'Kamran Ashraf';
-- UPDATE employees SET employee_code = '400060' WHERE name = 'Irfan';

-- Verify all have codes
SELECT id, name, employee_code FROM employees;
```

### Option 2: Get from Genus System

1. Login to Genus CLMS system
2. Go to Employee master
3. Note down each employee's code
4. Update database accordingly

---

## 🔍 Verify Configuration

Check if all employees have codes:

```sql
-- Should show no NULL values in employee_code
SELECT id, name, employee_code FROM employees WHERE employee_code IS NULL;

-- Should show all employees with codes
SELECT id, name, employee_code FROM employees ORDER BY id;
```

---

## 🚀 Test the Fix

Restart your server:

```bash
node server-postgres.js
```

You should see:

✅ **Before (404 error):**
```
[error] Error fetching employee calendar: Request failed with status code 404
```

✅ **After (successful):**
```
[info] Fetching calendar for employee code: 400049, month: 042026
[info] Attendance synced for Kuldeep Kumar on 2026-04-18
```

---

## 📊 Check Logs

```bash
# View scheduler logs
curl http://localhost:3000/api/logs/scheduler

# Look for one of these:
# ✅ "Attendance synced for [employee] on [date]"
# ⚠️ "No employee_code configured in database" (if missing)
# ❌ "Request failed with status code 404" (if code is wrong)
```

---

## 🔧 What the Code Now Does

### Before
```
✗ Uses employee ID (1, 2, 3...) 
✗ Doesn't match Genus system
✗ Gets 404 errors
```

### After
```
✓ Uses employee_code column (400049, 400050, etc.)
✓ Matches Genus system codes
✓ Successfully fetches attendance data
```

---

## 📋 Database Query Example

```javascript
// Old way (broken)
const query = 'SELECT id, name, mobile FROM employees';
// Result: {id: 1, name: 'Kuldeep Kumar'} → API gets code "1" → 404 Error

// New way (working)
const query = 'SELECT id, name, mobile, employee_code FROM employees';
// Result: {id: 1, name: 'Kuldeep Kumar', employee_code: '400049'} → API gets code "400049" → Success!
```

---

## ✅ Steps to Complete

1. **[ ] Run SQL to populate employee_code** 
   ```sql
   UPDATE employees SET employee_code = '400XXX' WHERE ...
   ```

2. **[ ] Verify all employees have codes**
   ```sql
   SELECT * FROM employees WHERE employee_code IS NULL;
   -- Should return 0 rows
   ```

3. **[ ] Restart server**
   ```bash
   node server-postgres.js
   ```

4. **[ ] Check logs for success**
   ```bash
   curl http://localhost:3000/api/logs/scheduler | grep "synced"
   ```

---

## 🎯 Expected Output After Fix

```
[2026-04-18 13:02:45] [info] [SCHEDULER] Found 12 employees to sync
[2026-04-18 13:02:45] [info] [SCHEDULER] Successfully logged in to external API
[2026-04-18 13:02:46] [debug] Fetching calendar for employee code: 400049, month: 042026
[2026-04-18 13:02:47] [info] [SCHEDULER] Attendance synced for Kuldeep Kumar on 2026-04-18
[2026-04-18 13:02:47] [debug] Fetching calendar for employee code: 400050, month: 042026
[2026-04-18 13:02:48] [info] [SCHEDULER] Attendance synced for Bharat Mewara on 2026-04-18
[2026-04-18 13:02:49] [info] [SCHEDULER] Attendance sync process completed
```

---

## 📞 Troubleshooting

### Still seeing 404 errors?

1. **Check employee_code is not NULL**
   ```sql
   SELECT * FROM employees WHERE employee_code IS NULL;
   ```

2. **Verify employee_code format**
   ```sql
   -- Should be 6 digits like "400049"
   SELECT DISTINCT employee_code FROM employees;
   ```

3. **Check if codes match Genus system**
   - Login to Genus CLMS
   - Compare with your database codes
   - Update if different

### Seeing "No employee_code configured" warning?

- Some employees are missing `employee_code` value
- Update those specific employees:
   ```sql
   UPDATE employees SET employee_code = '400XXX' 
   WHERE name = 'employee_name_here';
   ```

---

## ✨ Status

**Code Updated**: ✅  
**Database Updated**: ✅  
**Ready to Test**: ✅

Next step: **Update employee codes** and restart server!
