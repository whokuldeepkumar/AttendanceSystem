const axios = require('axios');
const { pool } = require('./db');
const { apiLogger } = require('./logger');

const EXTERNAL_API_BASE_URL = 'https://apps.genus.in/clmsapi/api';
const LOGIN_ENDPOINT = '/Login/login';
const CALENDAR_ENDPOINT = '/LeaveProcess/GetEmployeeCalender';


  
  // Convert to IST string
  function convertToAdjustedTime(dateStr) {
  if (!dateStr) return null;

  const d = new Date(dateStr);

  // 🔥 subtract 5 hours 30 minutes
  d.setMinutes(d.getMinutes() - 330);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`
  };
}

class ExternalAPIService {
  /**
   * Login to external API and get bearer token
   * @param {string} empCode - Employee code (e.g., '400049')
   * @param {string} empPassword - Employee password
   * @param {string} empCompany - Employee company code (e.g., 'GPIL')
   * @returns {Promise<string>} Bearer token
   */
  static async loginAndGetToken(empCode, empPassword, empCompany) {
    try {
      apiLogger.debug(`Attempting login for employee code: ${empCode}`);
      
      const response = await axios.post(`${EXTERNAL_API_BASE_URL}${LOGIN_ENDPOINT}`, {
        empCode,
        empPassword,
        empCompany
      });

      if (response.data && response.data.result && response.data.result.token) {
        apiLogger.debug(`Login successful for employee: ${response.data.result.employeeName}`);
        return response.data.result.token;
      }
      throw new Error('No token received from login endpoint');
    } catch (error) {
      apiLogger.error(`Error logging in to external API: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Get employee calendar/attendance data from external API
   * @param {string} employeeCode - Employee code
   * @param {string} bearerToken - Bearer token from login
   * @param {string} leaveMMYY - Month in MMYYYY format (e.g., 042026 for April 2026)
   * @returns {Promise<Object>} Calendar data
   */
  static async getEmployeeCalendar(employeeCode, bearerToken, leaveMMYY) {
    try {
      apiLogger.debug(`Fetching calendar for employee code: ${employeeCode}, month: ${leaveMMYY}`);
      apiLogger.debug(`Using endpoint: ${EXTERNAL_API_BASE_URL}${CALENDAR_ENDPOINT}`);
      apiLogger.debug(`Request body: { EmployeeCode: ${employeeCode}, Type: GetMonthSummary, LeaveMMYY: ${leaveMMYY} }`);
      
      const response = await axios.post(
        `${EXTERNAL_API_BASE_URL}${CALENDAR_ENDPOINT}`,
        {
          EmployeeCode: employeeCode,
          Type: 'GetMonthSummary',
          LeaveMMYY: leaveMMYY
        },
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000 // 15 seconds
        }
      );

      return response.data;
    } catch (error) {
      apiLogger.error(`Error fetching employee calendar for code ${employeeCode}: ${error.message}`);
      if (error.response) {
        apiLogger.error(`  Status: ${error.response.status}`);
        apiLogger.error(`  Data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Extract today's attendance from calendar data
   * Genus API returns array with punchDate in "MM/DD/YYYY HH:MI:SS" format
   * @param {Object} calendarData - Calendar data from API (result array)
   * @param {string} todayDate - Today's date in YYYY-MM-DD format
   * @returns {Object} Today's attendance record or null
   */
  static extractTodayAttendance(calendarData, todayDate) {
    try {
      // calendarData is the response object with .result property containing the array
      const attendanceArray = calendarData && calendarData.result ? calendarData.result : calendarData;
      
      if (!Array.isArray(attendanceArray) || attendanceArray.length === 0) {
        apiLogger.debug(`No attendance data found in calendar response`);
        return null;
      }

      // Convert YYYY-MM-DD to MM/DD/YYYY for matching
      const [year, month, day] = todayDate.split('-');
      const searchDate = `${month}/${day}/${year}`;

      // Find record matching today's date
      const todayRecord = attendanceArray.find(record => {
        if (!record.punchDate) return false;
        // punchDate format: "04/18/2026 00:00:00"
        return record.punchDate.startsWith(searchDate);
      });

      if (todayRecord) {
        apiLogger.debug(`Found attendance record for ${todayDate}: status=${todayRecord.status}`);
      } else {
        apiLogger.debug(`No attendance found for date ${todayDate}`);
      }

      return todayRecord || null;
    } catch (error) {
      apiLogger.error(`Error extracting today attendance: ${error.message}`);
      return null;
    }
  }

  /**
   * Store API token in database
   * @param {number} employeeId - Employee ID
   * @param {string} employeeCode - Employee code
   * @param {string} bearerToken - Bearer token
   * @param {Date} expiresAt - Token expiration date (optional)
   */
  static async storeToken(employeeId, employeeCode, bearerToken, expiresAt = null) {
    try {
      const query = `
        INSERT INTO api_tokens (employee_id, employee_code, bearer_token, token_expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (employee_id) 
        DO UPDATE SET bearer_token = $3, token_expires_at = $4, updated_at = CURRENT_TIMESTAMP
      `;
      await pool.query(query, [employeeId, employeeCode, bearerToken, expiresAt]);
      apiLogger.debug(`Token stored for employee ${employeeCode}`);
    } catch (error) {
      apiLogger.error(`Error storing token: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Retrieve API token from database
   * @param {number} employeeId - Employee ID
   * @returns {Promise<Object>} Token object or null
   */
  static async getStoredToken(employeeId) {
    try {
      const query = 'SELECT bearer_token, token_expires_at FROM api_tokens WHERE employee_id = $1';
      const result = await pool.query(query, [employeeId]);
      return result.rows[0] || null;
    } catch (error) {
      apiLogger.error(`Error retrieving token: ${error.message}`, { stack: error.stack });
      return null;
    }
  }

  /**
   * Save attendance data to database
   * @param {number} employeeId - Employee ID
   * @param {string} employeeCode - Employee code
   * @param {string} attendanceDate - Attendance date in YYYY-MM-DD format
   * @param {Object} attendanceRecord - Full attendance record from API
   */


  static async saveAttendance(employeeId, employeeCode, attendanceDate, attendanceRecord) {
    try {
      const status = attendanceRecord.status || 'Unknown';
      const data = {
        punchDate: attendanceRecord.punchDate,
        status: attendanceRecord.status,
        firstPunchIn: attendanceRecord.firstPunchIn,
        lastPunchOut: attendanceRecord.lastPunchOut,
        totalMinutes: attendanceRecord.totalMinutes,
        shiftName: attendanceRecord.shiftName,
        overtimeminutes: attendanceRecord.overtimeminutes,
        isNightShift: attendanceRecord.isNightShift,
        firstPunchInDT: attendanceRecord.firstPunchInDT,
        lastPunchOutDt: attendanceRecord.lastPunchOutDt,
        totalWorkingHour: attendanceRecord.totalWorkingHour
      };

      // Step 1: Save to external_attendance table (always update)
      const extQuery = `
        INSERT INTO external_attendance (employee_id, employee_code, attendance_date, status, data, synced_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (employee_id, attendance_date)
        DO UPDATE SET status = $4, data = $5, synced_at = CURRENT_TIMESTAMP
      `;
      await pool.query(extQuery, [employeeId, employeeCode, attendanceDate, status, JSON.stringify(data)]);
      apiLogger.debug(`External attendance saved for employee ${employeeCode}: status=${status}, date=${attendanceDate}`);

      // Step 2: Check if attendance already exists with punch times (from app)
      // Only update from biometric API if attendance is not already punched in the app
      const checkQuery = `
        SELECT id, in_time, out_time FROM attendance 
        WHERE user_id = $1 AND date = $2
      `;
      const checkResult = await pool.query(checkQuery, [employeeId, attendanceDate]);

      // If attendance exists and has punch times, don't overwrite from biometric system
      if (checkResult.rows.length > 0) {
        const existing = checkResult.rows[0];
        if (existing.in_time || existing.out_time) {
          apiLogger.info(`Attendance not updated for employee ${employeeCode}: Already punched in app on ${attendanceDate}`);
          return; // Skip updating attendance from biometric API
        }
      }

      // Step 3: Save to main attendance table with punch times (only if not already punched)
      // Build complete TIMESTAMP values: attendanceDate + HH:MM:00
      let inTime = null;
      let outTime = null;
      let finalDate = attendanceDate;

      // ✅ IN TIME
      if (attendanceRecord.firstPunchInDT) {
        const ist = convertToAdjustedTime(attendanceRecord.firstPunchInDT);
        if (ist) {
          inTime = `${ist.date} ${ist.time}:00`;
          finalDate = ist.date; // 🔥 important
        }
      } else if (attendanceRecord.firstPunchIn) {
        inTime = `${attendanceDate} ${attendanceRecord.firstPunchIn}:00`;
      }

      // ✅ OUT TIME
      if (attendanceRecord.lastPunchOutDt) {
        const ist = convertToAdjustedTime(attendanceRecord.lastPunchOutDt);
        if (ist) {
          outTime = `${ist.date} ${ist.time}:00`;
          finalDate = ist.date;
        }
      } else if (attendanceRecord.lastPunchOut) {
        outTime = `${attendanceDate} ${attendanceRecord.lastPunchOut}:00`;
      }

      let duration = null;

if (attendanceRecord.totalMinutes && parseInt(attendanceRecord.totalMinutes) > 0) {
  const totalMinutes = parseInt(attendanceRecord.totalMinutes);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

      // Only insert if record doesn't exist, or update only if in_time and out_time are NULL
      const attQuery = `
        INSERT INTO attendance (user_id, date, in_time, out_time, duration)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, date)
        DO UPDATE SET in_time = COALESCE(attendance.in_time, $3), 
                      out_time = COALESCE(attendance.out_time, $4),
                      duration = COALESCE(attendance.duration, $5)
      `;
      await pool.query(attQuery, [employeeId, finalDate, inTime, outTime, duration]);
      apiLogger.info(`Attendance saved for employee ${employeeCode}: inTime=${inTime}, outTime=${outTime}, date=${finalDate}`);
    } catch (error) {
      apiLogger.error(`Error saving attendance: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  
  /**
   * Get all active employees
   * @returns {Promise<Array>} Array of employees with their Genus employee codes
   */
  static async getActiveEmployees() {
    try {
      const query = 'SELECT id, name, mobile, employee_code FROM employees ORDER BY id';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      apiLogger.error(`Error fetching employees: ${error.message}`, { stack: error.stack });
      return [];
    }
  }
}

module.exports = ExternalAPIService;
