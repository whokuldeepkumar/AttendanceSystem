/**
 * API Endpoints for Attendance Sync Job
 * Add these endpoints to server-postgres.js to expose synced data
 */

// ==================== EXTERNAL ATTENDANCE ENDPOINTS ====================

// GET /api/external-attendance/today/:employeeId - Get today's synced attendance
app.get('/api/external-attendance/today/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT * FROM external_attendance 
      WHERE employee_id = $1 AND attendance_date = $2
    `;
    const result = await pool.query(query, [employeeId, today]);
    
    if (result.rows.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No attendance data for today',
        data: null 
      });
    }
    
    res.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// GET /api/external-attendance/month/:employeeId - Get month's synced attendance
app.get('/api/external-attendance/month/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const query = `
      SELECT * FROM external_attendance 
      WHERE employee_id = $1 
      AND attendance_date BETWEEN $2 AND $3
      ORDER BY attendance_date DESC
    `;
    const result = await pool.query(query, [employeeId, firstDay, lastDay]);
    
    res.json({ 
      success: true, 
      count: result.rows.length,
      data: result.rows 
    });
  } catch (error) {
    console.error('Error fetching month attendance:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// GET /api/external-attendance/date/:employeeId/:date - Get specific date's attendance
app.get('/api/external-attendance/date/:employeeId/:date', async (req, res) => {
  try {
    const { employeeId, date } = req.params;
    
    const query = `
      SELECT * FROM external_attendance 
      WHERE employee_id = $1 AND attendance_date = $2
    `;
    const result = await pool.query(query, [employeeId, date]);
    
    if (result.rows.length === 0) {
      return res.json({ 
        success: true, 
        message: `No attendance data for ${date}`,
        data: null 
      });
    }
    
    res.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Error fetching attendance for date:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// GET /api/external-attendance/all - Get all synced attendance for all employees (today)
app.get('/api/external-attendance/all', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT ea.*, e.name, e.mobile
      FROM external_attendance ea
      JOIN employees e ON ea.employee_id = e.id
      WHERE ea.attendance_date = $1
      ORDER BY e.name
    `;
    const result = await pool.query(query, [today]);
    
    res.json({ 
      success: true, 
      count: result.rows.length,
      data: result.rows 
    });
  } catch (error) {
    console.error('Error fetching all attendance:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
});

// GET /api/api-tokens/current/:employeeId - Get current API token for employee
app.get('/api/api-tokens/current/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const query = `
      SELECT bearer_token, token_expires_at, updated_at 
      FROM api_tokens 
      WHERE employee_id = $1
    `;
    const result = await pool.query(query, [employeeId]);
    
    if (result.rows.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No API token stored',
        data: null 
      });
    }
    
    // Don't return actual token in production, only metadata
    res.json({ 
      success: true, 
      data: {
        token_expires_at: result.rows[0].token_expires_at,
        updated_at: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching API token:', error);
    res.status(500).json({ success: false, message: 'Error fetching token' });
  }
});

// POST /api/external-attendance/sync-now - Manually trigger sync job
app.post('/api/external-attendance/sync-now', async (req, res) => {
  try {
    // Import the scheduler at the top of server.js if not already done
    const AttendanceScheduler = require('./attendance-scheduler');
    
    console.log('[Manual Trigger] Starting manual sync...');
    
    // Run sync in background
    AttendanceScheduler.syncAttendance().then(() => {
      console.log('[Manual Trigger] Sync completed');
    }).catch(err => {
      console.error('[Manual Trigger] Error:', err);
    });
    
    res.json({ 
      success: true, 
      message: 'Attendance sync job triggered manually',
      note: 'Sync runs in background. Check logs for progress.'
    });
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    res.status(500).json({ success: false, message: 'Error triggering sync' });
  }
});

// GET /api/external-attendance/sync-status - Get last sync status
app.get('/api/external-attendance/sync-status', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT employee_id) as employees_synced,
        MAX(synced_at) as last_sync_time,
        MIN(synced_at) as first_sync_time
      FROM external_attendance
      WHERE synced_at >= CURRENT_DATE
    `;
    const result = await pool.query(query);
    
    res.json({ 
      success: true, 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ success: false, message: 'Error fetching status' });
  }
});

// DELETE /api/external-attendance/:id - Delete a synced attendance record
app.delete('/api/external-attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM external_attendance WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Attendance record deleted',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ success: false, message: 'Error deleting record' });
  }
});
