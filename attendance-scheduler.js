const cron = require('node-cron');
const ExternalAPIService = require('./external-api-service');
const { schedulerLogger } = require('./logger');

/**
 * AttendanceScheduler - Handles scheduled tasks for syncing external attendance data
 */
class AttendanceScheduler {
  /**
   * Start the scheduler that runs every 30 minutes
   * Workflow:
   * 1. Login to external API and get bearer token
   * 2. Store token in database
   * 3. Fetch employee calendar data
   * 4. Extract today's attendance
   * 5. Save to database
   */
  static startScheduler() {
    // Run every 5 minutes - cron pattern: */5 * * * *
    const task = cron.schedule('*/5 * * * *', async () => {
      schedulerLogger.info(`Running scheduled job at ${new Date().toLocaleString()}`);
      await this.syncAttendance();
    });

    // Also run once when server starts
    schedulerLogger.info('Starting scheduler - first run will execute immediately');
    this.syncAttendance();

    return task;
  }

  /**
   * Main sync function that orchestrates the entire process
   */
  static async syncAttendance() {
    try {
      schedulerLogger.info('Starting attendance sync process');

      // Get all employees
      const employees = await ExternalAPIService.getActiveEmployees();
      schedulerLogger.info(`Found ${employees.length} employees to sync`);

      if (employees.length === 0) {
        schedulerLogger.warn('No employees found to sync');
        return;
      }

      // Get credentials from environment
      const empCode = process.env.EXTERNAL_API_EMPCODE;
      const empPassword = process.env.EXTERNAL_API_EMPPASSWORD;
      const empCompany = process.env.EXTERNAL_API_COMPANY;

      if (!empCode || !empPassword || !empCompany) {
        schedulerLogger.error('External API credentials not configured in environment variables (EXTERNAL_API_EMPCODE, EXTERNAL_API_EMPPASSWORD, EXTERNAL_API_COMPANY required)');
        return;
      }

      // Step 1: Login and get bearer token
      let bearerToken;
      try {
        bearerToken = await ExternalAPIService.loginAndGetToken(empCode, empPassword, empCompany);
        schedulerLogger.info('Successfully logged in to external API');
      } catch (error) {
        schedulerLogger.error(`Failed to login to external API: ${error.message}`);
        return;
      }

      // Get today's date and format for API call
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const mmyy = String(today.getMonth() + 1).padStart(2, '0') + today.getFullYear(); // MMYYYY

      // Step 2: Sync attendance for each employee using their Genus employee code
      for (const employee of employees) {
        try {
          // Verify employee code exists
          if (!employee.employee_code) {
            schedulerLogger.warn(`Skipping ${employee.name}: No employee_code configured in database`);
            continue;
          }

          await this.syncEmployeeAttendance(
            employee.id,
            employee.name,
            employee.employee_code,
            bearerToken,
            mmyy,
            todayString
          );
        } catch (error) {
          schedulerLogger.error(`Error syncing attendance for employee ${employee.name}: ${error.message}`);
          // Continue with next employee even if one fails
          continue;
        }
      }

      schedulerLogger.info('Attendance sync process completed');
    } catch (error) {
      schedulerLogger.error(`Unexpected error in sync process: ${error.message}`, { stack: error.stack });
    }
  }

  /**
   * Sync attendance for a single employee
   * @param {number} employeeId - Employee ID
   * @param {string} employeeName - Employee name
   * @param {string} employeeCode - Employee code from Genus system
   * @param {string} bearerToken - Bearer token
   * @param {string} mmyy - Month in MMYYYY format
   * @param {string} todayString - Today's date in YYYY-MM-DD format
   */
  static async syncEmployeeAttendance(employeeId, employeeName, employeeCode, bearerToken, mmyy, todayString) {
    try {
      // Step 1: Fetch employee calendar data
      schedulerLogger.debug(`Fetching calendar data for ${employeeName} (code: ${employeeCode}, month ${mmyy})`);
      
      let calendarData;
      try {
        calendarData = await ExternalAPIService.getEmployeeCalendar(
          employeeCode,
          bearerToken,
          mmyy
        );
      } catch (apiError) {
        // Skip employee if API returns 404 or other fetch errors
        if (apiError.response?.status === 404) {
          schedulerLogger.warn(`Skipping ${employeeName}: Employee code ${employeeCode} not found in Genus system (404)`);
        } else if (apiError.response?.status === 401) {
          schedulerLogger.warn(`Skipping ${employeeName}: Authentication failed (401) - token may be expired`);
        } else {
          schedulerLogger.warn(`Skipping ${employeeName}: Failed to fetch calendar data - ${apiError.message}`);
        }
        return; // Skip this employee and continue with next
      }

      // Step 2: Extract today's attendance from the calendar data
      const todayAttendance = ExternalAPIService.extractTodayAttendance(calendarData, todayString);

      if (todayAttendance) {
        // Step 3: Save to database
        await ExternalAPIService.saveAttendance(
          employeeId,
          employeeCode,
          todayString,
          todayAttendance
        );
        schedulerLogger.info(`Attendance synced for ${employeeName} on ${todayString}: status=${todayAttendance.status}`);
      } else {
        schedulerLogger.warn(`No attendance data found for ${employeeName} on ${todayString}`);
      }
    } catch (error) {
      schedulerLogger.error(`Error syncing ${employeeName}: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  static stopScheduler(task) {
    if (task) {
      task.stop();
      schedulerLogger.info('Scheduler stopped gracefully');
    }
  }
}

module.exports = AttendanceScheduler;
