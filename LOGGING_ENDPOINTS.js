/**
 * LOGGING ENDPOINTS
 * Add these endpoints to server-postgres.js to enable log viewing and management
 */

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
// Usage: /api/logs/scheduler.log?lines=50
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
