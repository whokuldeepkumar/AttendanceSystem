import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AttendanceService } from '../../services/attendance.service';
import { ToastService } from '../../services/toast.service';
import { ThemeService } from '../../services/theme.service';
import { HolidayService } from '../../services/holiday.service';
import { LeaveService } from '../../services/leave.service';
import { ModalComponent } from '../modal/modal';
import { AttendanceStatsComponent } from '../stats/stats';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, AttendanceStatsComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {
  currentUser;
  isLoading = signal(false);
  get isDarkMode() { return this.themeService.isDark(); }
  
  // Modal states
  showClockInModal = signal(false);
  showClockOutModal = signal(false);
  showMarkModal = signal(false);
  markType = signal<'leave' | 'sat-off' | 'sun-off' | null>(null);
  todayHolidayName = signal<string | null>(null);
  todayLeaveStatus = signal<boolean>(false);
  
  // Clock time signals
  clockInHour = signal<number | null>(null);
  clockInMin = signal<number | null>(null);
  clockInPeriod = signal<'AM' | 'PM'>('AM');
  clockOutHour = signal<number | null>(null);
  clockOutMin = signal<number | null>(null);
  clockOutPeriod = signal<'AM' | 'PM'>('PM');

  // Get records for current month
  currentMonthRecords = computed(() => {
    const now = new Date();
    return this.attendanceService.getRecordsByMonth(now.getMonth(), now.getFullYear())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  // Show Clock In button only if no record exists or no in-time today
  canClockIn = computed(() => {
    const todayRecord = this.attendanceService.getTodayRecord();
    console.log('canClockIn: todayRecord=', todayRecord);
    if (!todayRecord) {
      console.log('canClockIn: No record, showing button');
      return true;
    }
    if (todayRecord.inTime) {
      console.log('canClockIn: inTime exists, hiding button');
      return false;
    }
    console.log('canClockIn: No inTime, showing button');
    return true;
  });

  // Show Clock Out button only if there's an in-time today and no out-time yet
  canClockOut = computed(() => {
    const todayRecord = this.attendanceService.getTodayRecord();
    return !!todayRecord?.inTime && !todayRecord?.outTime;
  });

  // Show mark options only if no in-time today (before clock in)
  canShowMarkOptions = computed(() => {
    const todayRecord = this.attendanceService.getTodayRecord();
    return !todayRecord?.inTime;
  });

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private router: Router,
    private toastService: ToastService,
    private themeService: ThemeService,
    private holidayService: HolidayService,
    private leaveService: LeaveService
  ) {
    this.currentUser = this.authService.currentUser;
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
    this.checkTodayStatus();
    
    // Wait for data to load then trigger button visibility check
    setTimeout(() => {
      console.log('Triggering button visibility check after data load');
      this.canClockIn();
      this.canClockOut();
    }, 1000);
  }

  // Calculate final attendance status
  getFinalAttendance(record: any): string {
    const duration = record.duration;
    
    // Check for special cases first
    if (!duration || duration === '-') return 'Absent';
    if (duration === 'Saturday Off') return 'Saturday Off';
    if (duration === 'Sunday Off') return 'Sunday Off';
    if (duration === 'Leave') return 'Leave';
    
    // Check if it's a holiday/festival name (no time format)
    const timeMatch = duration.match(/(\d+)h\s*(\d+)m/);
    if (!timeMatch) return duration; // Return as-is for holidays/festivals
    
    // Parse duration and calculate hours
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const totalHours = hours + (minutes / 60);
    
    if (totalHours < 4.5) return 'Absent';
    if (totalHours >= 4.5 && totalHours < 8.5) return 'Half Day';
    return 'Full Day';
  }

  // Get CSS class for final attendance
  getFinalAttendanceClass(record: any): string {
    const status = this.getFinalAttendance(record);
    if (status === 'Full Day') return 'attendance-full';
    if (status === 'Half Day') return 'attendance-half';
    if (status === 'Absent') return 'attendance-absent';
    return 'attendance-special';
  }

  // Helper method to check if duration meets 9-hour requirement and calculate extra/remaining
  getDurationStatus(durationStr: string | null): { isSufficient: boolean; displayText: string } {
    if (!durationStr) {
      return { isSufficient: false, displayText: '-' };
    }

    // Parse duration string "Xh Ym"
    const matches = durationStr.match(/(\d+)h\s*(\d+)m/);
    if (!matches) {
      return { isSufficient: false, displayText: durationStr };
    }

    const hours = parseInt(matches[1], 10);
    const minutes = parseInt(matches[2], 10);
    const totalMinutes = hours * 60 + minutes;
    const requiredMinutes = 9 * 60; // 9 hours in minutes

    const isSufficient = totalMinutes >= requiredMinutes;

    if (isSufficient) {
      // Calculate extra time
      const extraMinutes = totalMinutes - requiredMinutes;
      const extraHours = Math.floor(extraMinutes / 60);
      const extraMins = extraMinutes % 60;
      const extraText = extraHours > 0 ? `+${extraHours}h ${extraMins}m` : `+${extraMins}m`;
      return { isSufficient: true, displayText: `${durationStr} (${extraText})` };
    } else {
      // Calculate remaining time
      const remainingMinutes = requiredMinutes - totalMinutes;
      const remainingHours = Math.floor(remainingMinutes / 60);
      const remainingMins = remainingMinutes % 60;
      const remainingText = remainingHours > 0 ? `-${remainingHours}h ${remainingMins}m` : `-${remainingMins}m`;
      return { isSufficient: false, displayText: `${durationStr} (${remainingText})` };
    }
  }

  checkTodayStatus() {
    const today = new Date().toISOString().split('T')[0];
    this.todayHolidayName.set(this.holidayService.getHolidayName(today));
    this.todayLeaveStatus.set(this.leaveService.isOnLeave(today));
  }

  openClockInModal() {
    if (this.todayHolidayName()) {
      this.toastService.info(`Today is ${this.todayHolidayName()}`);
      return;
    }
    if (this.todayLeaveStatus()) {
      this.toastService.info('You are on leave today');
      return;
    }
    // Set current time
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    this.clockInHour.set(hours);
    this.clockInMin.set(minutes);
    this.clockInPeriod.set(period);
    this.showClockInModal.set(true);
  }

  async confirmClockIn() {
    this.isLoading.set(true);
    console.log('confirmClockIn: Starting...');
    try {
      const todayRecord = this.attendanceService.getTodayRecord();
      console.log('confirmClockIn: todayRecord=', todayRecord);
      
      if (todayRecord?.inTime) {
        this.toastService.warning('Already clocked in today');
      } else {
        // Create custom time from inputs
        const customTime = this.createCustomTime(this.clockInHour(), this.clockInMin(), this.clockInPeriod());
        console.log('confirmClockIn: Calling attendanceService.clockIn() with time:', customTime);
        await this.attendanceService.clockIn(customTime);
        console.log('confirmClockIn: clockIn() completed');
        this.toastService.success('Clocked in successfully!');
      }
      this.showClockInModal.set(false);
    } catch (error) {
      this.toastService.error('Failed to clock in. Please try again.');
      console.error('Clock in error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openClockOutModal() {
    if (this.todayHolidayName()) {
      this.toastService.info(`Today is ${this.todayHolidayName()}`);
      return;
    }
    // Set current time
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    this.clockOutHour.set(hours);
    this.clockOutMin.set(minutes);
    this.clockOutPeriod.set(period);
    this.showClockOutModal.set(true);
  }

  async confirmClockOut() {
    this.isLoading.set(true);
    console.log('confirmClockOut: Starting...');
    try {
      const todayRecord = this.attendanceService.getTodayRecord();
      console.log('confirmClockOut: todayRecord=', todayRecord);
      
      if (!todayRecord?.inTime) {
        this.toastService.warning('Please clock in first');
      } else if (todayRecord?.outTime) {
        this.toastService.warning('Already clocked out today');
      } else {
        // Create custom time from inputs
        const customTime = this.createCustomTime(this.clockOutHour(), this.clockOutMin(), this.clockOutPeriod());
        console.log('confirmClockOut: Calling attendanceService.clockOut() with time:', customTime);
        await this.attendanceService.clockOut(customTime);
        console.log('confirmClockOut: clockOut() completed');
        this.toastService.success('Clocked out successfully!');
      }
      this.showClockOutModal.set(false);
    } catch (error) {
      this.toastService.error('Failed to clock out. Please try again.');
      console.error('Clock out error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  goToReport() {
    this.router.navigate(['/report']);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.toastService.info(`Switched to ${this.themeService.isDark() ? 'dark' : 'light'} mode`);
  }

  editRecord(record: any) {
    this.router.navigate(['/report'], { state: { editRecord: record } });
  }

  deleteRecord(dateIso: string) {
    if (confirm(`Delete attendance record for ${dateIso}?`)) {
      this.attendanceService.deleteRecord(dateIso);
      this.toastService.success('Record deleted successfully');
    }
  }

  openMarkModal(type: 'leave' | 'sat-off' | 'sun-off') {
    this.markType.set(type);
    this.showMarkModal.set(true);
  }

  confirmMark() {
    const type = this.markType();
    if (!type) return;

    const today = new Date().toISOString().split('T')[0];
    try {
      if (type === 'leave') {
        // Add to leave service
        this.leaveService.addLeave(today, 'Marked as leave');
        this.toastService.success('Day marked as leave');
      } else if (type === 'sat-off' || type === 'sun-off') {
        // Add to holiday service
        const label = type === 'sat-off' ? 'Saturday Off' : 'Sunday Off';
        this.holidayService.addHoliday(today, label);
        this.toastService.success(`Day marked as ${label}`);
      }
      this.checkTodayStatus();
    } catch (error) {
      this.toastService.error('Failed to mark day. Please try again.');
    } finally {
      this.showMarkModal.set(false);
      this.markType.set(null);
    }
  }

  cancelMark() {
    this.showMarkModal.set(false);
    this.markType.set(null);
  }
  
  createCustomTime(hour: number | null, min: number | null, period: 'AM' | 'PM'): Date {
    const now = new Date();
    let hours = hour || 0;
    const minutes = min || 0;
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    now.setHours(hours, minutes, 0, 0);
    return now;
  }

  logout() {
    this.authService.logout();
    this.toastService.info('Logged out successfully');
    this.router.navigate(['/login']);
  }
}
