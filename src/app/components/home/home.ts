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
  showInstallPrompt = signal(false);
  showDeleteModal = signal(false);
  markType = signal<'1st-half' | '2nd-half' | 'absent' | 'leave' | 'sat-off' | 'sun-off' | null>(null);
  todayHolidayName = signal<string | null>(null);
  todayLeaveStatus = signal<boolean>(false);
  deferredPrompt: any = null;
  canInstall = signal(false);
  deleteRecordDate = signal('');
  
  // Clock time signals
  clockInHour = signal<number | null>(null);
  clockInMin = signal<number | null>(null);
  clockInPeriod = signal<'AM' | 'PM'>('AM');
  clockOutHour = signal<number | null>(null);
  clockOutMin = signal<number | null>(null);
  clockOutPeriod = signal<'AM' | 'PM'>('PM');
  
  // Today's clock in time
  todayClockInTime = computed(() => {
    const todayRecord = this.attendanceService.getTodayRecord();
    return todayRecord?.inTime || null;
  });
  
  // Current time ticker for elapsed time
  currentTime = signal(new Date());
  
  // Elapsed time since clock in
  elapsedTime = computed(() => {
    const inTime = this.todayClockInTime();
    if (!inTime) return '';
    const now = this.currentTime().getTime();
    const start = new Date(inTime).getTime();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  });

  // Get records for current month
  currentMonthRecords = computed(() => {
    const now = new Date();
    return this.attendanceService.getRecordsByMonth(now.getMonth(), now.getFullYear())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });
  
  // Calendar data
  calendarDays = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days: any[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, record: null });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = this.currentMonthRecords().find(r => r.date.split('T')[0] === dateStr);
      days.push({ date: day, dateStr, record });
    }
    
    return days;
  });
  
  currentMonthName = computed(() => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[new Date().getMonth()];
  });
  
  currentYear = computed(() => new Date().getFullYear());
  
  isToday(dateStr: string | undefined): boolean {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }
  
  isSpecialDay(record: any): boolean {
    if (!record) return false;
    const status = this.getFinalAttendance(record);
    return status === 'Leave' || status === 'Saturday Off' || status === 'Sunday Off';
  }

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
    this.setupInstallPrompt();
    this.checkInstallPrompt();
    
    // Wait for data to load then trigger button visibility check
    setTimeout(() => {
      console.log('Triggering button visibility check after data load');
      this.canClockIn();
      this.canClockOut();
    }, 1000);
    
    // Update current time every second for elapsed time
    setInterval(() => {
      this.currentTime.set(new Date());
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
    if (duration === '1st Half Day') return '1st Half Day';
    if (duration === '2nd Half Day') return '2nd Half Day';
    
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
    if (status === 'Half Day' || status === '1st Half Day' || status === '2nd Half Day') return 'attendance-half';
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
        await this.attendanceService.loadRecords();
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
        await this.attendanceService.loadRecords();
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

  openDeleteModal(dateIso: string) {
    this.deleteRecordDate.set(dateIso);
    this.showDeleteModal.set(true);
  }
  
  async confirmDelete() {
    const dateIso = this.deleteRecordDate();
    if (dateIso) {
      await this.attendanceService.deleteRecord(dateIso);
      await this.attendanceService.loadRecords();
      this.toastService.success('Record deleted successfully');
    }
    this.showDeleteModal.set(false);
    this.deleteRecordDate.set('');
  }

  openMarkModal(type: '1st-half' | '2nd-half' | 'absent' | 'leave' | 'sat-off' | 'sun-off') {
    this.markType.set(type);
    this.showMarkModal.set(true);
  }

  async confirmMark() {
    const type = this.markType();
    if (!type) return;

    const today = new Date().toISOString().split('T')[0];
    try {
      if (type === '1st-half') {
        await this.attendanceService.markDay(today, '1st Half Day');
        this.toastService.success('Day marked as 1st Half Day');
      } else if (type === '2nd-half') {
        await this.attendanceService.markDay(today, '2nd Half Day');
        this.toastService.success('Day marked as 2nd Half Day');
      } else if (type === 'absent') {
        await this.attendanceService.markDay(today, 'Absent');
        this.toastService.success('Day marked as absent');
      } else if (type === 'leave') {
        this.leaveService.addLeave(today, 'Marked as leave');
        this.toastService.success('Day marked as leave');
      } else if (type === 'sat-off' || type === 'sun-off') {
        const label = type === 'sat-off' ? 'Saturday Off' : 'Sunday Off';
        this.holidayService.addHoliday(today, label);
        this.toastService.success(`Day marked as ${label}`);
      }
      await this.attendanceService.loadRecords();
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

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.toastService.success('App installed successfully!');
    });
  }

  checkInstallPrompt() {
    const hasSeenPrompt = localStorage.getItem('installPromptSeen');
    if (!hasSeenPrompt) {
      setTimeout(() => {
        this.showInstallPrompt.set(true);
      }, 2000);
    }
  }

  async installApp() {
    if (!this.deferredPrompt) {
      this.toastService.info('Installation not available. Please use browser menu.');
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      this.toastService.success('Installing app...');
    }
    
    this.deferredPrompt = null;
    this.canInstall.set(false);
    this.dismissInstallPrompt();
  }

  dismissInstallPrompt() {
    localStorage.setItem('installPromptSeen', 'true');
    this.showInstallPrompt.set(false);
  }

  logout() {
    this.authService.logout();
    this.toastService.info('Logged out successfully');
    this.router.navigate(['/login']);
  }
}
