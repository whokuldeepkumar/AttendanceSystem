const cron = require('node-cron');
const ExternalAPIService = require('./external-api-service');
const { schedulerLogger } = require('./logger');
let isJobRunning = false;

class AttendanceScheduler {

  static startScheduler() {
    const task = cron.schedule('*/5 * * * *', async () => {
      schedulerLogger.info(`Running scheduled job at ${new Date().toLocaleString()}`);
      await this.syncAttendance();
    });

    schedulerLogger.info('Starting scheduler - first run will execute immediately');
    this.syncAttendance();

    return task;
  }

  // ✅ UPDATED FUNCTION
  static async syncAttendance(customDate = null) {
   

      if (isJobRunning) {
    schedulerLogger.warn("⚠️ Job already running, skipping...");
    return;
  }

   try {
  isJobRunning = true;

  

      schedulerLogger.info('Starting attendance sync process');

      // ✅ use custom date OR today
      let targetDate = customDate ? new Date(customDate) : new Date();

      const todayString = targetDate.toISOString().split('T')[0];
      const mmyy =
        String(targetDate.getMonth() + 1).padStart(2, '0') +
        targetDate.getFullYear();

      schedulerLogger.info(`📅 Syncing for date: ${todayString}`);

      const employees = await ExternalAPIService.getActiveEmployees();

      if (employees.length === 0) {
        schedulerLogger.warn('No employees found to sync');
        return;
      }

      const empCode = "400049";
      const empPassword = "Myname@@123";
      const empCompany = "GPIL";

      let bearerToken;

      try {
        bearerToken = await ExternalAPIService.loginAndGetToken(
          empCode,
          empPassword,
          empCompany
        );
      } catch (error) {
        schedulerLogger.error(`Login failed: ${error.message}`);
        bearerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6Ikt1bGRlZXAgS3VtYXIiLCJFbXBsb3llZUNvZGUiOiI0MDAwNDkiLCJleHAiOjE3NzYzMzM1NDMsImlzcyI6Ik15QXBwcm92YWxBcHAiLCJhdWQiOiJNeUFwcHJvdmFsVXNlciJ9.su1HJDQiS60hSagAFgA6LjU5uLc7UuI2ND7e_9oq98o';
        //return;
      }

      for (const employee of employees) {
        try {
          if (!employee.employee_code) continue;

          await this.syncEmployeeAttendance(
            employee.id,
            employee.name,
            employee.employee_code,
            bearerToken,
            mmyy,
            todayString
          );
        } catch (error) {
          schedulerLogger.error(`Error syncing ${employee.name}: ${error.message}`);
        }
      }

      schedulerLogger.info('Attendance sync process completed');

    } catch (error) {
      schedulerLogger.error(`Unexpected error: ${error.message}`);
  } finally {
    isJobRunning = false;
  }
}

  static async syncEmployeeAttendance(
    employeeId,
    employeeName,
    employeeCode,
    bearerToken,
    mmyy,
    todayString
  ) {
    try {
      let calendarData;

      try {
        calendarData = await ExternalAPIService.getEmployeeCalendar(
          employeeCode,
          bearerToken,
          mmyy
        );
      } catch (apiError) {
        schedulerLogger.error(`API failed for ${employeeName}: ${apiError.message}`);
        return;
      }

      const attendance =
        ExternalAPIService.extractTodayAttendance(calendarData, todayString);

      if (attendance) {
        await ExternalAPIService.saveAttendance(
          employeeId,
          employeeCode,
          todayString,
          attendance
        );
      }

    } catch (error) {
      schedulerLogger.error(`Error syncing ${employeeName}: ${error.message}`);
    }
  }

  static stopScheduler(task) {
    if (task) {
      task.stop();
    }
  }
}

module.exports = AttendanceScheduler;