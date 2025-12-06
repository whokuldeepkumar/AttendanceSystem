import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, ModalComponent, AttendanceStatsComponent],
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

  // Get records for current month
  currentMonthRecords = computed(() => {
    const now = new Date();
    return this.attendanceService.getRecordsByMonth(now.getMonth(), now.getFullYear())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  // Show Clock In button only if no record exists or no in-time today
  canClockIn = computed(() => {
    const todayRecord = this.attendanceService.getTodayRecord();
    return !todayRecord || !todayRecord.inTime;
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
        console.log('confirmClockIn: Calling attendanceService.clockIn()...');
        await this.attendanceService.clockIn();
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
        console.log('confirmClockOut: Calling attendanceService.clockOut()...');
        await this.attendanceService.clockOut();
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

  logout() {
    this.authService.logout();
    this.toastService.info('Logged out successfully');
    this.router.navigate(['/login']);
  }
}
