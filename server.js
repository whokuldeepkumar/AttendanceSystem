const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins (you can restrict this to your Vercel domain later)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Path to JSON files
const employeesFilePath = path.join(__dirname, 'public', 'employees.json');
const attendanceFilePath = path.join(__dirname, 'public', 'attendance.json');
const leaveFilePath = path.join(__dirname, 'public', 'leave.json');
const holidaysFilePath = path.join(__dirname, 'public', 'holidays.json');

// Helper functions to read/write JSON files
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

function ensureFileExists(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    writeJsonFile(filePath, defaultData);
  }
}

// Initialize files
ensureFileExists(employeesFilePath);
ensureFileExists(attendanceFilePath);
ensureFileExists(leaveFilePath);
ensureFileExists(holidaysFilePath);

// ==================== EMPLOYEES ====================

// GET /api/employees - Get all employees
app.get('/api/employees', (req, res) => {
  try {
    const employees = readJsonFile(employeesFilePath) || [];
    res.json(employees);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reading employees' });
  }
});

// POST /api/employees - Add new employee
app.post('/api/employees', (req, res) => {
  try {
    const { name, mobile, password } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile and password are required' });
    }

    const normalizedMobile = mobile.replace(/\D/g, '');
    const employees = readJsonFile(employeesFilePath) || [];

    const exists = employees.find(emp => emp.mobile === normalizedMobile);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Mobile number already registered' });
    }

    const newId = String((Math.max(...employees.map(e => parseInt(e.id) || 0)) || 0) + 1);
    const newEmployee = { id: newId, name, mobile: normalizedMobile, password };

    employees.push(newEmployee);
    writeJsonFile(employeesFilePath, employees);

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      employee: newEmployee
    });
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ success: false, message: 'Error adding employee' });
  }
});

// ==================== ATTENDANCE ====================

// GET /api/attendance - Get all attendance records
app.get('/api/attendance', (req, res) => {
  try {
    const attendance = readJsonFile(attendanceFilePath) || [];
    console.log('GET /api/attendance - Returning', attendance.length, 'records');
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reading attendance' });
  }
});

// GET /api/attendance/:userId - Get attendance for specific user
app.get('/api/attendance/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const attendance = readJsonFile(attendanceFilePath) || [];
    const userAttendance = attendance.filter(a => a.userId === userId);
    res.json(userAttendance);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reading attendance' });
  }
});

// POST /api/attendance - Add or update attendance record
app.post('/api/attendance', (req, res) => {
  try {
    console.log('POST /api/attendance called with body:', JSON.stringify(req.body, null, 2));
    
    const { userId, date, inTime, outTime, duration } = req.body;

    if (!userId || !date) {
      console.warn('Missing userId or date:', { userId, date });
      return res.status(400).json({ success: false, message: 'userId and date are required' });
    }

    const attendance = readJsonFile(attendanceFilePath) || [];
    console.log('Current attendance records:', attendance.length);
    
    const existingIndex = attendance.findIndex(a => a.userId === userId && a.date === date);
    console.log('Existing record index:', existingIndex);

    const record = { userId, date, inTime, outTime, duration };

    if (existingIndex > -1) {
      attendance[existingIndex] = record;
      console.log('Updated existing record');
    } else {
      attendance.push(record);
      console.log('Added new record');
    }

    const writeSuccess = writeJsonFile(attendanceFilePath, attendance);
    console.log('File write success:', writeSuccess);
    console.log('Total records after save:', attendance.length);

    res.json({
      success: true,
      message: 'Attendance record saved',
      record
    });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ success: false, message: 'Error saving attendance' });
  }
});

// DELETE /api/attendance/:userId/:date - Delete attendance record
app.delete('/api/attendance/:userId/:date', (req, res) => {
  try {
    const { userId, date } = req.params;
    const attendance = readJsonFile(attendanceFilePath) || [];
    const filtered = attendance.filter(a => !(a.userId === userId && a.date === date));

    writeJsonFile(attendanceFilePath, filtered);

    res.json({
      success: true,
      message: 'Attendance record deleted'
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ success: false, message: 'Error deleting attendance' });
  }
});

// ==================== LEAVE ====================

// GET /api/leave - Get all leave records
app.get('/api/leave', (req, res) => {
  try {
    const leave = readJsonFile(leaveFilePath) || [];
    res.json(leave);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reading leave' });
  }
});

// GET /api/leave/:userId - Get leave for specific user
app.get('/api/leave/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const leave = readJsonFile(leaveFilePath) || [];
    const userLeave = leave.filter(l => l.userId === userId);
    res.json(userLeave);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reading leave' });
  }
});

// POST /api/leave - Add leave request
app.post('/api/leave', (req, res) => {
  try {
    const { userId, startDate, endDate, reason, status = 'pending' } = req.body;

    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'userId, startDate, and endDate are required' });
    }

    const leave = readJsonFile(leaveFilePath) || [];
    const id = `leave-${Date.now()}`;
    const leaveRequest = {
      id,
      userId,
      startDate,
      endDate,
      reason,
      status,
      createdAt: new Date().toISOString()
    };

    leave.push(leaveRequest);
    writeJsonFile(leaveFilePath, leave);

    res.status(201).json({
      success: true,
      message: 'Leave request created',
      leaveRequest
    });
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ success: false, message: 'Error creating leave request' });
  }
});

// PUT /api/leave/:leaveId - Update leave status
app.put('/api/leave/:leaveId', (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    const leave = readJsonFile(leaveFilePath) || [];
    const index = leave.findIndex(l => l.id === leaveId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    leave[index].status = status;
    writeJsonFile(leaveFilePath, leave);

    res.json({
      success: true,
      message: 'Leave request updated',
      leaveRequest: leave[index]
    });
  } catch (error) {
    console.error('Error updating leave:', error);
    res.status(500).json({ success: false, message: 'Error updating leave' });
  }
});

// ==================== HOLIDAYS ====================

// GET /api/holidays - Get all holidays
app.get('/api/holidays', (req, res) => {
  try {
    const holidays = readJsonFile(holidaysFilePath) || [];
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reading holidays' });
  }
});

// POST /api/holidays - Add holiday
app.post('/api/holidays', (req, res) => {
  try {
    const { date, name, description } = req.body;

    if (!date || !name) {
      return res.status(400).json({ success: false, message: 'date and name are required' });
    }

    const holidays = readJsonFile(holidaysFilePath) || [];
    const exists = holidays.some(h => h.date === date);

    if (exists) {
      return res.status(400).json({ success: false, message: 'Holiday already exists for this date' });
    }

    const holiday = { date, name, description };
    holidays.push(holiday);
    writeJsonFile(holidaysFilePath, holidays);

    res.status(201).json({
      success: true,
      message: 'Holiday added',
      holiday
    });
  } catch (error) {
    console.error('Error adding holiday:', error);
    res.status(500).json({ success: false, message: 'Error adding holiday' });
  }
});

// DELETE /api/holidays/:date - Delete holiday
app.delete('/api/holidays/:date', (req, res) => {
  try {
    const { date } = req.params;
    const holidays = readJsonFile(holidaysFilePath) || [];
    const filtered = holidays.filter(h => h.date !== date);

    writeJsonFile(holidaysFilePath, holidays);

    res.json({
      success: true,
      message: 'Holiday deleted'
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ success: false, message: 'Error deleting holiday' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

