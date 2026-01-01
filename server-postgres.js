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
          'UPDATE leaves SET pl = $1, cl = $2 WHERE user_id = $3 AND month = $4 RETURNING *',
          [emp.pl, emp.cl, emp.userId, month]
        );
        results.push(result.rows[0]);
      } else {
        const result = await pool.query(
          'INSERT INTO leaves (user_id, month, pl, cl) VALUES ($1, $2, $3, $4) RETURNING *',
          [emp.userId, month, emp.pl, emp.cl]
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log('Database: PostgreSQL (Neon)');
});
