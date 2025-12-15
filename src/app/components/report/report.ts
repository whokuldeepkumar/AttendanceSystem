import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AttendanceService } from '../../services/attendance.service';
import { ExcelService } from '../../services/excel.service';
import { ToastService } from '../../services/toast.service';
import { HolidayService } from '../../services/holiday.service';
import { LeaveService } from '../../services/leave.service';
import { ModalComponent } from '../modal/modal';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './report.html',
  styleUrls: ['./report.css']
})
export class ReportComponent {
  months = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ];

  years = [2024, 2025, 2026];

  selectedMonth = signal(new Date().getMonth());
  selectedYear = signal(new Date().getFullYear());
  isExporting = signal(false);
  // Manual entry modal state and form
  showManualModal = signal(false);
  manualDate = signal(''); // YYYY-MM-DD
  manualIn = signal(''); // HH (1-12)
  manualInMin = signal(''); // MM (0-59)
  manualInPeriod = signal('AM'); // AM or PM
  manualOut = signal(''); // HH (1-12)
  manualOutMin = signal(''); // MM (0-59)
  manualOutPeriod = signal('AM'); // AM or PM

  records = computed(() => {
    // Access sortedRecords to create dependency on the signal
    const allRecords = this.attendanceService.sortedRecords();
    return allRecords
      .filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === this.selectedMonth() && d.getFullYear() === this.selectedYear();
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private excelService: ExcelService,
    private router: Router,
    private toastService: ToastService,
    private holidayService: HolidayService,
    private leaveService: LeaveService
  ) {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
    
    // Check if navigated with edit record
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['editRecord']) {
      const record = navigation.extras.state['editRecord'];
      this.loadRecordForEdit(record);
    }
  }

  loadRecordForEdit(record: any) {
    // Extract date part only (YYYY-MM-DD)
    const dateOnly = record.date.split('T')[0];
    this.manualDate.set(dateOnly);
    
    if (record.inTime) {
      const inDate = new Date(record.inTime);
      let hours = inDate.getHours();
      const minutes = inDate.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      
      this.manualIn.set(String(hours));
      this.manualInMin.set(String(minutes).padStart(2, '0'));
      this.manualInPeriod.set(period);
    }
    
    if (record.outTime) {
      const outDate = new Date(record.outTime);
      let hours = outDate.getHours();
      const minutes = outDate.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      
      this.manualOut.set(String(hours));
      this.manualOutMin.set(String(minutes).padStart(2, '0'));
      this.manualOutPeriod.set(period);
    }
    
    this.showManualModal.set(true);
  }

  editRecord(record: any) {
    this.loadRecordForEdit(record);
  }

  // Mark modal state (Mark Leave / Sat Off / Sun Off)
  showMarkModal = signal(false);
  markType = signal<'1st-half' | '2nd-half' | 'absent' | 'leave' | 'sat-off' | 'sun-off' | null>(null);
  markDate = signal('');
  
  // Delete confirmation modal
  showDeleteModal = signal(false);
  deleteRecordDate = signal('');

  openMarkModal(type: '1st-half' | '2nd-half' | 'absent' | 'leave' | 'sat-off' | 'sun-off') {
    this.markType.set(type);
    // Prefer manualDate if set, otherwise default to today
    const dateToMark = this.manualDate() || new Date().toISOString().split('T')[0];
    this.markDate.set(dateToMark);
    this.showMarkModal.set(true);
  }

  async confirmMark() {
    const type = this.markType();
    const date = this.markDate();
    if (!type || !date) return;

    try {
      if (type === '1st-half') {
        await this.attendanceService.markDay(date, '1st Half Day');
        this.toastService.success('Marked as 1st Half Day');
      } else if (type === '2nd-half') {
        await this.attendanceService.markDay(date, '2nd Half Day');
        this.toastService.success('Marked as 2nd Half Day');
      } else if (type === 'absent') {
        await this.attendanceService.markDay(date, 'Absent');
        this.toastService.success('Marked as absent');
      } else if (type === 'leave') {
        this.leaveService.addLeave(date, 'Marked via Reports');
        this.toastService.success('Marked as leave');
      } else if (type === 'sat-off') {
        this.holidayService.addHoliday(date, 'Saturday Off');
        this.toastService.success('Marked as Saturday Off');
      } else if (type === 'sun-off') {
        this.holidayService.addHoliday(date, 'Sunday Off');
        this.toastService.success('Marked as Sunday Off');
      }

      // Also create/update an attendance record with label so it shows in reports
      if (type !== 'absent') {
        const label = type === 'leave' ? 'Leave' : (type === 'sat-off' ? 'Saturday Off' : 'Sunday Off');
        await this.attendanceService.markDay(date, label);
      }
    } catch (err) {
      this.toastService.error('Failed to mark day');
      console.error('confirmMark error:', err);
    } finally {
      this.showMarkModal.set(false);
      this.markType.set(null);
      this.markDate.set('');
    }
  }

  /**
   * Mark directly from the Manual Entry modal for the currently selected manualDate.
   * Closes the manual modal after marking.
   */
  async markFromManual(type: '1st-half' | '2nd-half' | 'absent' | 'leave' | 'sat-off' | 'sun-off') {
    const date = this.manualDate() || new Date().toISOString().split('T')[0];
    if (!date) {
      this.toastService.error('Select a date to mark');
      return;
    }

    // Close manual modal and open mark modal
    this.showManualModal.set(false);
    this.markType.set(type);
    this.markDate.set(date);
    this.showMarkModal.set(true);
    return;

  }

  openManualModal() {
    // default date to today or first day of selected month
    const defaultDate = new Date(this.selectedYear(), this.selectedMonth(), 1);
    const iso = new Date().toISOString().split('T')[0];
    // Prefer a sensible default: if selected month/year matches current, default to today
    if (this.selectedMonth() === new Date().getMonth() && this.selectedYear() === new Date().getFullYear()) {
      this.manualDate.set(iso);
    } else {
      this.manualDate.set(defaultDate.toISOString().split('T')[0]);
    }
    this.manualIn.set('09');
    this.manualInMin.set('00');
    this.manualInPeriod.set('AM');
    this.manualOut.set('06');
    this.manualOutMin.set('00');
    this.manualOutPeriod.set('PM');
    this.showManualModal.set(true);
  }

  private convertTo24Hour(hour: string, minute: string, period: string): string {
    console.log('convertTo24Hour input:', { hour, minute, period });
    
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    
    console.log('Parsed values:', { h, m, isNanH: isNaN(h), isNanM: isNaN(m) });
    
    if (isNaN(h) || isNaN(m)) {
      console.error('Invalid number format');
      return '';
    }
    
    if (h < 0 || h > 12 || m < 0 || m > 59) {
      console.error('Values out of range:', { h, m });
      return '';
    }
    
    let hour24 = h;
    
    // Handle 0:0 as 12:00 AM
    if (h === 0) {
      hour24 = period === 'AM' ? 0 : 12;
      const formatted = `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      console.log('Converted 0:0 to 24hr:', formatted);
      return formatted;
    }
    
    // Handle AM/PM conversion
    if (period === 'PM' && h !== 12) {
      hour24 = h + 12;
    } else if (period === 'AM' && h === 12) {
      hour24 = 0;
    }
    
    const formatted = `${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    console.log('Converted to 24hr:', formatted);
    return formatted;
  }

  async confirmManualEntry() {
    const date = this.manualDate();
    if (!date) {
      this.toastService.error('Please select a date');
      this.showManualModal.set(false);
      return;
    }

    const inHour = String(this.manualIn()).trim();
    const inMin = String(this.manualInMin()).trim();
    const outHour = String(this.manualOut()).trim();
    const outMin = String(this.manualOutMin()).trim();
    const inPeriod = this.manualInPeriod();
    const outPeriod = this.manualOutPeriod();

    console.log('Form inputs - inHour:', inHour, 'inMin:', inMin, 'outHour:', outHour, 'outMin:', outMin);

    // Validate that hour is a valid number (0-12 for 12-hour format)
    if ((inHour && (isNaN(+inHour) || +inHour < 0 || +inHour > 12)) || 
        (inMin && (isNaN(+inMin) || +inMin < 0 || +inMin > 59))) {
      this.toastService.error('Please enter valid In time');
      console.error('Invalid In time:', inHour, inMin);
      return;
    }

    if ((outHour && (isNaN(+outHour) || +outHour < 0 || +outHour > 12)) || 
        (outMin && (isNaN(+outMin) || +outMin < 0 || +outMin > 59))) {
      this.toastService.error('Please enter valid Out time');
      console.error('Invalid Out time:', outHour, outMin);
      return;
    }

    const toIso = (d: string, h: string, m: string, period: string) => {
      if (!h || !m) return null;
      const time24 = this.convertTo24Hour(h, m, period);
      if (!time24) {
        console.error('Failed to convert time to 24hr:', h, m, period);
        return null;
      }
      // Create date in local timezone to avoid UTC offset issues
      const dateObj = new Date(`${d}T${time24}`);
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date created:', d, time24);
        return null;
      }
      console.log('Created ISO string:', d, time24, '=> ', dateObj.toISOString());
      return dateObj.toISOString();
    };

    const inIso = inHour && inMin ? toIso(date, inHour, inMin, inPeriod) : null;
    const outIso = outHour && outMin ? toIso(date, outHour, outMin, outPeriod) : null;

    // Basic validation: at least one time should be provided
    if (!inIso && !outIso) {
      this.toastService.error('Please provide at least an In or Out time');
      return;
    }

    const user = this.authService.currentUser();
    console.log('Current user:', user);
    console.log('Attempting to save:', { date, inIso, outIso });

    if (!user) {
      this.toastService.error('You must be logged in to save attendance');
      return;
    }

    try {
      console.log('Before save - current records:', this.attendanceService.sortedRecords().length);
      await this.attendanceService.addOrUpdateRecord(date, inIso, outIso);
      
      // Force reload to ensure UI updates
      await this.attendanceService.loadRecords();
      
      // Verify record was saved by checking service
      const savedRecords = this.attendanceService.sortedRecords();
      console.log('After save - all records:', savedRecords);
      console.log('New record saved:', { date, inIso, outIso });
      
      this.toastService.success('Manual attendance entry saved');
    } catch (err) {
      this.toastService.error('Failed to save manual entry');
      console.error('Error saving record:', err);
    } finally {
      this.showManualModal.set(false);
    }
  }

  export() {
    if (this.records().length === 0) {
      this.toastService.warning('No records to export for this month');
      return;
    }

    this.isExporting.set(true);

    try {
      const data = this.records().map(r => ({
        Date: r.date,
        'In Time': r.inTime ? new Date(r.inTime).toLocaleTimeString() : '-',
        'Out Time': r.outTime ? new Date(r.outTime).toLocaleTimeString() : '-',
        Duration: r.duration
      }));

      const user = this.authService.currentUser();
      const fileName = `${user?.name}_Attendance_${this.months[this.selectedMonth()].label}_${this.selectedYear()}`;

      this.excelService.exportAsExcelFile(data, fileName);
      this.toastService.success('Report exported successfully!');
    } catch (error) {
      this.toastService.error('Failed to export report. Please try again.');
    } finally {
      this.isExporting.set(false);
    }
  }

  exportAll() {
    const allRecords = this.attendanceService.sortedRecords();
    
    if (allRecords.length === 0) {
      this.toastService.warning('No records to export');
      return;
    }

    this.isExporting.set(true);

    try {
      const groupedData = new Map<string, any[]>();

      allRecords.forEach(r => {
        const d = new Date(r.date);
        const key = `${this.months[d.getMonth()].label}_${d.getFullYear()}`;

        if (!groupedData.has(key)) {
          groupedData.set(key, []);
        }

        groupedData.get(key)?.push({
          Date: r.date,
          'In Time': r.inTime ? new Date(r.inTime).toLocaleTimeString() : '-',
          'Out Time': r.outTime ? new Date(r.outTime).toLocaleTimeString() : '-',
          Duration: r.duration
        });
      });

      const user = this.authService.currentUser();
      const fileName = `${user?.name}_Attendance_Full_History`;
      this.excelService.exportMonthWise(groupedData, fileName);
      this.toastService.success('Full history exported successfully!');
    } catch (error) {
      this.toastService.error('Failed to export full history. Please try again.');
    } finally {
      this.isExporting.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/home']);
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

  getFinalAttendance(record: any): string {
    const duration = record.duration;
    if (!duration || duration === '-') return 'Absent';
    if (duration === 'Saturday Off') return 'Saturday Off';
    if (duration === 'Sunday Off') return 'Sunday Off';
    if (duration === 'Leave') return 'Leave';
    if (duration === '1st Half Day') return '1st Half Day';
    if (duration === '2nd Half Day') return '2nd Half Day';
    const timeMatch = duration.match(/(\d+)h\s*(\d+)m/);
    if (!timeMatch) return duration;
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const totalHours = hours + (minutes / 60);
    // Check if user is on leave for this date OR if hours are very low (< 4.5), treat as leave
    const dateStr = record.date.split('T')[0];
    if (this.leaveService.isOnLeave(dateStr) || totalHours < 4.5) return 'Leave';
    if (totalHours >= 4.5 && totalHours < 8.5) return 'Half Day';
    return 'Full Day';
  }

  getFinalAttendanceClass(record: any): string {
    const status = this.getFinalAttendance(record);
    if (status === 'Full Day') return 'attendance-full';
    if (status === 'Half Day' || status === '1st Half Day' || status === '2nd Half Day') return 'attendance-half';
    if (status === 'Absent') return 'attendance-absent';
    return 'attendance-special';
  }

  getDurationStatus(durationStr: string | null): { isSufficient: boolean; displayText: string } {
    if (!durationStr) return { isSufficient: false, displayText: '-' };
    const matches = durationStr.match(/(\d+)h\s*(\d+)m/);
    if (!matches) return { isSufficient: false, displayText: durationStr };
    const hours = parseInt(matches[1], 10);
    const minutes = parseInt(matches[2], 10);
    const totalMinutes = hours * 60 + minutes;
    const requiredMinutes = 9 * 60;
    const isSufficient = totalMinutes >= requiredMinutes;
    if (isSufficient) {
      const extraMinutes = totalMinutes - requiredMinutes;
      const extraHours = Math.floor(extraMinutes / 60);
      const extraMins = extraMinutes % 60;
      const extraText = extraHours > 0 ? `+${extraHours}h ${extraMins}m` : `+${extraMins}m`;
      return { isSufficient: true, displayText: `${durationStr} (${extraText})` };
    } else {
      const remainingMinutes = requiredMinutes - totalMinutes;
      const remainingHours = Math.floor(remainingMinutes / 60);
      const remainingMins = remainingMinutes % 60;
      const remainingText = remainingHours > 0 ? `-${remainingHours}h ${remainingMins}m` : `-${remainingMins}m`;
      return { isSufficient: false, displayText: `${durationStr} (${remainingText})` };
    }
  }
}
