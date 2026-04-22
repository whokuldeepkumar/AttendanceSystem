const express = require('express');
const cors = require('cors');
require('dotenv').config();
process.on('unhandledRejection', err => {
  console.error('UNHANDLED PROMISE ERROR:', err);
});

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
const { pool, initializeDatabase } = require('./db');
const AttendanceScheduler = require('./attendance-scheduler');
const { logger, schedulerLogger, readLogFile, getLogStats, logsDir } = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Initialize database on startup
initializeDatabase().catch(console.error);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 🔍 Test external API connectivity
app.get('/test-external', async (req, res) => {
  const axios = require('axios');

  try {
    const response = await axios.get('https://apps.genus.in');

    console.log("✅ External API reachable");
    res.send("SUCCESS - External API reachable");

  } catch (e) {
    console.error("❌ External API failed:", e.message);

    res.send({
      success: false,
      error: e.message
    });
  }
});

// ==================== EMPLOYEES ====================

// GET /api/employees - Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, mobile, password FROM employees ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Error fetching employees' });
  }
});

// POST /api/employees - Add new employee
app.post('/api/employees', async (req, res) => {
  try {
    const { name, mobile, password } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile, and password are required' });
    }

    const normalizedMobile = mobile.replace(/\D/g, '');

    // Check if employee exists
    const existing = await pool.query('SELECT id FROM employees WHERE mobile = $1', [normalizedMobile]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Mobile number already registered' });
    }

    const result = await pool.query(
      'INSERT INTO employees (name, mobile, password) VALUES ($1, $2, $3) RETURNING *',
      [name, normalizedMobile, password]
    );

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ success: false, message: 'Error adding employee' });
  }
});

// PUT /api/employees/:id - Update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, password } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name and mobile are required' });
    }

    const normalizedMobile = mobile.replace(/\D/g, '');

    let query, params;
    if (password) {
      query = 'UPDATE employees SET name = $1, mobile = $2, password = $3 WHERE id = $4 RETURNING *';
      params = [name, normalizedMobile, password, id];
    } else {
      query = 'UPDATE employees SET name = $1, mobile = $2 WHERE id = $3 RETURNING *';
      params = [name, normalizedMobile, id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, message: 'Error updating employee' });
  }
});

// DELETE /api/employees/:id - Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Error deleting employee' });
  }
});

// ==================== ATTENDANCE ====================

// GET /api/attendance - Get all attendance records
app.get('/api/attendance', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM attendance ORDER BY date DESC'
    );
    res.json(result.rows.map(row => ({
      userId: row.user_id,
      date: row.date,
      inTime: row.in_time,
      outTime: row.out_time,
      duration: row.duration
    })));
  } catch (error) {
    console.error('Error fetching all attendance:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// GET /api/attendance/:userId - Get attendance for specific user
app.get('/api/attendance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    );
    res.json(result.rows.map(row => ({
      userId: row.user_id,
      date: row.date,
      inTime: row.in_time,
      outTime: row.out_time,
      duration: row.duration
    })));
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// POST /api/attendance - Add or update attendance record
app.post('/api/attendance', async (req, res) => {
  try {
    const { userId, date, inTime, outTime, duration } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ success: false, message: 'userId and date are required' });
    }

    // Check if record exists
    const existing = await pool.query(
      'SELECT id FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing record
      result = await pool.query(
        'UPDATE attendance SET in_time = $1, out_time = $2, duration = $3 WHERE user_id = $4 AND date = $5 RETURNING *',
        [inTime, outTime, duration, userId, date]
      );
    } else {
      // Insert new record
      result = await pool.query(
        'INSERT INTO attendance (user_id, date, in_time, out_time, duration) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, date, inTime, outTime, duration]
      );
    }

    res.json({
      success: true,
      message: 'Attendance record saved',
      record: {
        userId: result.rows[0].user_id,
        date: result.rows[0].date,
        inTime: result.rows[0].in_time,
        outTime: result.rows[0].out_time,
        duration: result.rows[0].duration,
        inLatitude: result.rows[0].in_latitude,
        inLongitude: result.rows[0].in_longitude,
        outLatitude: result.rows[0].out_latitude,
        outLongitude: result.rows[0].out_longitude,
        inImage: result.rows[0].in_image ? '***IMAGE_DATA***' : null,
        outImage: result.rows[0].out_image ? '***IMAGE_DATA***' : null
      }
    });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ success: false, message: 'Error saving attendance' });
  }
});

// DELETE /api/attendance/:userId/:date - Delete attendance record
app.delete('/api/attendance/:userId/:date', async (req, res) => {
  try {
    const { userId, date } = req.params;

    const result = await pool.query(
      'DELETE FROM attendance WHERE user_id = $1 AND date = $2 RETURNING *',
      [userId, date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    res.json({
      success: true,
      message: 'Attendance record deleted'
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ success: false, message: 'Error deleting attendance' });
  }
});

// ==================== LEAVES ====================

// GET /api/leaves - Get all leaves
app.get('/api/leaves', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leaves ORDER BY month DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ success: false, message: 'Error fetching leaves' });
  }
});

// GET /api/leaves/:userId/:month - Get leave for specific user and month
app.get('/api/leaves/:userId/:month', async (req, res) => {
  try {
    const { userId, month } = req.params;
    const result = await pool.query(
      'SELECT * FROM leaves WHERE user_id = $1 AND month = $2',
      [userId, month]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching leave:', error);
    res.status(500).json({ success: false, message: 'Error fetching leave' });
  }
});

// POST /api/leaves/assign - Assign leaves to employees
app.post('/api/leaves/assign', async (req, res) => {
  try {
    const { employees, month } = req.body;

    if (!employees || !month) {
      return res.status(400).json({ success: false, message: 'employees and month are required' });
    }

    const results = [];
    for (const emp of employees) {
      const existing = await pool.query(
        'SELECT id FROM leaves WHERE user_id = $1 AND month = $2',
        [emp.userId, month]
      );

      if (existing.rows.length > 0) {
        const result = await pool.query(
          'UPDATE leaves SET pl = $1, cl = $2, carry_forward = $3 WHERE user_id = $4 AND month = $5 RETURNING *',
          [emp.pl, emp.cl, emp.carry_forward || 0, emp.userId, month]
        );
        results.push(result.rows[0]);
      } else {
        const result = await pool.query(
          'INSERT INTO leaves (user_id, month, pl, cl, carry_forward) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [emp.userId, month, emp.pl, emp.cl, emp.carry_forward || 0]
        );
        results.push(result.rows[0]);
      }
    }

    res.json({
      success: true,
      message: 'Leaves assigned successfully',
      results
    });
  } catch (error) {
    console.error('Error assigning leaves:', error);
    res.status(500).json({ success: false, message: 'Error assigning leaves' });
  }
});

// ==================== HOLIDAYS ====================

// GET /api/holidays - Get all holidays
app.get('/api/holidays', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM holidays ORDER BY date');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ success: false, message: 'Error fetching holidays' });
  }
});

// POST /api/holidays - Add holiday
app.post('/api/holidays', async (req, res) => {
  try {
    const { date, name, description } = req.body;

    if (!date || !name) {
      return res.status(400).json({ success: false, message: 'date and name are required' });
    }

    // Check if holiday exists
    const existing = await pool.query('SELECT id FROM holidays WHERE date = $1', [date]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Holiday already exists for this date' });
    }

    const result = await pool.query(
      'INSERT INTO holidays (date, name, description) VALUES ($1, $2, $3) RETURNING *',
      [date, name, description]
    );

    res.status(201).json({
      success: true,
      message: 'Holiday added',
      holiday: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding holiday:', error);
    res.status(500).json({ success: false, message: 'Error adding holiday' });
  }
});

// DELETE /api/holidays/:date - Delete holiday
app.delete('/api/holidays/:date', async (req, res) => {
  try {
    const { date } = req.params;

    const result = await pool.query('DELETE FROM holidays WHERE date = $1 RETURNING *', [date]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    res.json({
      success: true,
      message: 'Holiday deleted'
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ success: false, message: 'Error deleting holiday' });
  }
});

// ==================== SETTINGS ====================

// GET /api/settings - Get all settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
});

// PUT /api/settings - Update settings
app.put('/api/settings', async (req, res) => {
  try {
    const { company_name, admin_pin, app_logo } = req.body;

    const updates = [];
    if (company_name !== undefined) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
        ['company_name', company_name]
      );
      updates.push('company_name');
    }
    if (admin_pin !== undefined) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
        ['admin_pin', admin_pin]
      );
      updates.push('admin_pin');
    }
    if (app_logo !== undefined) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
        ['app_logo', app_logo]
      );
      updates.push('app_logo');
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      updated: updates
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Error updating settings' });
  }
});

// ==================== LOGGING ENDPOINTS ====================

// GET /api/logs/status - Get log file status and statistics
app.get('/api/logs/status', (req, res) => {
  try {
    const stats = getLogStats();
    res.json({
      success: true,
      message: 'Log status retrieved',
      logsDirectory: logsDir,
      logFiles: stats
    });
  } catch (error) {
    logger.error(`Error getting log status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error getting log status',
      error: error.message
    });
  }
});

// GET /api/logs/scheduler - Get scheduler logs (last N lines)
app.get('/api/logs/scheduler', (req, res) => {
  try {
    const lines = req.query.lines ? parseInt(req.query.lines) : 100;
    const logContent = readLogFile('scheduler.log', lines);
    
    if (logContent.error) {
      return res.status(404).json({
        success: false,
        message: logContent.error
      });
    }

    res.json({
      success: true,
      file: 'scheduler.log',
      lines: logContent.length,
      data: logContent
    });
  } catch (error) {
    logger.error(`Error reading scheduler logs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error reading logs',
      error: error.message
    });
  }
});

// GET /api/logs/api - Get API logs (last N lines)
app.get('/api/logs/api', (req, res) => {
  try {
    const lines = req.query.lines ? parseInt(req.query.lines) : 100;
    const logContent = readLogFile('api.log', lines);
    
    if (logContent.error) {
      return res.status(404).json({
        success: false,
        message: logContent.error
      });
    }

    res.json({
      success: true,
      file: 'api.log',
      lines: logContent.length,
      data: logContent
    });
  } catch (error) {
    logger.error(`Error reading API logs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error reading logs',
      error: error.message
    });
  }
});

// GET /api/logs/error - Get error logs (last N lines)
app.get('/api/logs/error', (req, res) => {
  try {
    const lines = req.query.lines ? parseInt(req.query.lines) : 100;
    const logContent = readLogFile('error.log', lines);
    
    if (logContent.error) {
      return res.status(404).json({
        success: false,
        message: logContent.error
      });
    }

    res.json({
      success: true,
      file: 'error.log',
      lines: logContent.length,
      data: logContent
    });
  } catch (error) {
    logger.error(`Error reading error logs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error reading logs',
      error: error.message
    });
  }
});

// GET /api/logs/combined - Get combined logs (last N lines)
app.get('/api/logs/combined', (req, res) => {
  try {
    const lines = req.query.lines ? parseInt(req.query.lines) : 100;
    const logContent = readLogFile('combined.log', lines);
    
    if (logContent.error) {
      return res.status(404).json({
        success: false,
        message: logContent.error
      });
    }

    res.json({
      success: true,
      file: 'combined.log',
      lines: logContent.length,
      data: logContent
    });
  } catch (error) {
    logger.error(`Error reading combined logs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error reading logs',
      error: error.message
    });
  }
});

// GET /api/logs/:filename - Get any log file with custom number of lines
app.get('/api/logs/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const lines = req.query.lines ? parseInt(req.query.lines) : 100;
    
    // Validate filename to prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const logContent = readLogFile(filename, lines);
    
    if (logContent.error) {
      return res.status(404).json({
        success: false,
        message: logContent.error
      });
    }

    res.json({
      success: true,
      file: filename,
      lines: logContent.length,
      data: logContent
    });
  } catch (error) {
    logger.error(`Error reading log file: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error reading log file',
      error: error.message
    });
  }
});

// DELETE /api/logs/:filename - Clear a specific log file
app.delete('/api/logs/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const fs = require('fs');
    const path = require('path');

    // Validate filename
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const filePath = path.join(logsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: `Log file not found: ${filename}`
      });
    }

    fs.writeFileSync(filePath, '');
    logger.info(`Log file cleared: ${filename}`);

    res.json({
      success: true,
      message: `Log file cleared: ${filename}`
    });
  } catch (error) {
    logger.error(`Error clearing log file: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error clearing log file',
      error: error.message
    });
  }
});

// GET /api/logs/download/:filename - Download a log file
app.get('/api/logs/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const fs = require('fs');
    const path = require('path');

    // Validate filename
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const filePath = path.join(logsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: `Log file not found: ${filename}`
      });
    }

    res.download(filePath, filename);
    logger.debug(`Log file downloaded: ${filename}`);
  } catch (error) {
    logger.error(`Error downloading log file: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error downloading log file',
      error: error.message
    });
  }
});

// POST /api/external-attendance/sync - Save external attendance data manually or for specific date
// Request body: { employeeId, employeeCode, attendanceDate, attendanceData }
// Example: { employeeId: 1, employeeCode: "400049", attendanceDate: "2026-04-18", attendanceData: { status: "AA", firstPunchIn: "09:10", ... } }
app.post('/api/external-attendance/sync', async (req, res) => {
  try {
    const { employeeId, employeeCode, attendanceDate, attendanceData } = req.body;

    // Validate required fields
    if (!employeeId || !employeeCode || !attendanceDate || !attendanceData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeId, employeeCode, attendanceDate, attendanceData'
      });
    }

    // attendanceData should contain at least status field
    if (!attendanceData.status) {
      return res.status(400).json({
        success: false,
        message: 'attendanceData must contain status field'
      });
    }

    // Save to database using ExternalAPIService
    const ExternalAPIService = require('./external-api-service');
    await ExternalAPIService.saveAttendance(
      employeeId,
      employeeCode,
      attendanceDate,
      attendanceData
    );

    res.json({
      success: true,
      message: 'Attendance data saved successfully',
      data: {
        employeeId,
        employeeCode,
        attendanceDate,
        status: attendanceData.status,
        syncedAt: new Date().toISOString()
      }
    });

    logger.info(`External attendance synced manually for employee ${employeeCode} on ${attendanceDate}`);
  } catch (error) {
    logger.error(`Error syncing external attendance: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error syncing attendance data',
      error: error.message
    });
  }
});

// GET /api/external-attendance/:employeeId - Get external attendance records for an employee
app.get('/api/external-attendance/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 30, offset = 0 } = req.query;

    const query = `
      SELECT 
        id, 
        employee_id,
        employee_code,
        attendance_date,
        status,
        data,
        synced_at
      FROM external_attendance
      WHERE employee_id = $1
      ORDER BY attendance_date DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [employeeId, limit, offset]);

    // Count total records
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM external_attendance WHERE employee_id = $1',
      [employeeId]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error(`Error fetching external attendance: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
});

// GET /api/external-attendance - Get all external attendance records with filters
app.get('/api/external-attendance', async (req, res) => {
  try {
    const { fromDate, toDate, employeeCode, status, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM external_attendance WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (fromDate) {
      query += ` AND attendance_date >= $${paramCount++}`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND attendance_date <= $${paramCount++}`;
      params.push(toDate);
    }

    if (employeeCode) {
      query += ` AND employee_code = $${paramCount++}`;
      params.push(employeeCode);
    }

    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY attendance_date DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error(`Error fetching external attendance: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
});

// 🔔 External cron trigger (IMPORTANT)
app.get('/run-attendance-job', async (req, res) => {
  try {
    const date = req.query.date;

    logger.info("🔔 External cron triggered at " + new Date());

    if (date && isNaN(new Date(date))) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD"
      });
    }

    await AttendanceScheduler.syncAttendance(date);

    res.json({
      success: true,
      message: date
        ? `Attendance synced for ${date}`
        : "Attendance synced for today",
      date: date || new Date().toISOString().split('T')[0]
    });

  } catch (error) {
    logger.error("❌ Job failed: " + error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
let schedulerTask;
app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);
  logger.info(`API available at http://localhost:${PORT}/api`);
  logger.info('Database: PostgreSQL (Neon)');

  // Start the attendance scheduler
  //logger.info('===== Starting Attendance Scheduler =====');
  try {
  //schedulerTask = AttendanceScheduler.startScheduler();
  //logger.info('Scheduler started successfully');
  logger.info('⚠️ Scheduler disabled (using external cron)');
} catch (err) {
  logger.error('Scheduler failed to start:', err);
}
  logger.info('Scheduler will run every 5 minutes');
  logger.info('===== Logging System Initialized =====');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  if (schedulerTask) {
    AttendanceScheduler.stopScheduler(schedulerTask);
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  if (schedulerTask) {
    AttendanceScheduler.stopScheduler(schedulerTask);
  }
  process.exit(0);
});
