const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool, initializeDatabase } = require('./db');

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
        duration: result.rows[0].duration
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

// GET /api/leave/:userId - Get leave for specific user
app.get('/api/leave/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM leaves WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at
    })));
  } catch (error) {
    console.error('Error fetching leave:', error);
    res.status(500).json({ success: false, message: 'Error fetching leave' });
  }
});

// POST /api/leave - Add leave request
app.post('/api/leave', async (req, res) => {
  try {
    const { userId, startDate, endDate, reason, status = 'pending' } = req.body;

    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'userId, startDate, and endDate are required' });
    }

    const result = await pool.query(
      'INSERT INTO leaves (user_id, start_date, end_date, reason, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, startDate, endDate, reason, status]
    );

    res.status(201).json({
      success: true,
      message: 'Leave request created',
      leaveRequest: {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        startDate: result.rows[0].start_date,
        endDate: result.rows[0].end_date,
        reason: result.rows[0].reason,
        status: result.rows[0].status
      }
    });
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ success: false, message: 'Error creating leave request' });
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log('Database: PostgreSQL (Neon)');
});
