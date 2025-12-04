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
import { SpinnerComponent } from '../spinner/spinner';
import { ModalComponent } from '../modal/modal';
import { LeaveManagementComponent } from '../leave/leave';
import { HolidayManagementComponent } from '../holiday/holiday';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent, LeaveManagementComponent, HolidayManagementComponent, ModalComponent],
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
    return this.attendanceService.getRecordsByMonth(this.selectedMonth(), this.selectedYear())
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
  }

  // Mark modal state (Mark Leave / Sat Off / Sun Off)
  showMarkModal = signal(false);
  markType = signal<'leave' | 'sat-off' | 'sun-off' | null>(null);
  markDate = signal('');

  openMarkModal(type: 'leave' | 'sat-off' | 'sun-off') {
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
      if (type === 'leave') {
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
      const label = type === 'leave' ? 'Leave' : (type === 'sat-off' ? 'Saturday Off' : 'Sunday Off');
      await this.attendanceService.markDay(date, label);
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
  async markFromManual(type: 'leave' | 'sat-off' | 'sun-off') {
    const date = this.manualDate() || new Date().toISOString().split('T')[0];
    if (!date) {
      this.toastService.error('Select a date to mark');
      return;
    }

    const confirmed = confirm(`Confirm mark ${type === 'leave' ? 'Leave' : (type === 'sat-off' ? 'Saturday Off' : 'Sunday Off')} for ${date}?`);
    if (!confirmed) return;

    try {
      if (type === 'leave') {
        this.leaveService.addLeave(date, 'Marked via manual modal');
        this.toastService.success('Marked as leave');
      } else if (type === 'sat-off') {
        this.holidayService.addHoliday(date, 'Saturday Off');
        this.toastService.success('Marked as Saturday Off');
      } else if (type === 'sun-off') {
        this.holidayService.addHoliday(date, 'Sunday Off');
        this.toastService.success('Marked as Sunday Off');
      }

      const label2 = type === 'leave' ? 'Leave' : (type === 'sat-off' ? 'Saturday Off' : 'Sunday Off');
      await this.attendanceService.markDay(date, label2);
      console.log('markFromManual: marked', type, date);
    } catch (err) {
      this.toastService.error('Failed to mark day');
      console.error('markFromManual error:', err);
    } finally {
      this.showManualModal.set(false);
    }
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
    
    if (h < 1 || h > 12 || m < 0 || m > 59) {
      console.error('Values out of range:', { h, m });
      return '';
    }
    
    let hour24 = h;
    
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

  confirmManualEntry() {
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

    // Validate that hour is a valid number
    if ((inHour && (isNaN(+inHour) || +inHour < 1 || +inHour > 12)) || 
        (inMin && (isNaN(+inMin) || +inMin < 0 || +inMin > 59))) {
      this.toastService.error('Please enter valid In time');
      console.error('Invalid In time:', inHour, inMin);
      return;
    }

    if ((outHour && (isNaN(+outHour) || +outHour < 1 || +outHour > 12)) || 
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
      this.attendanceService.addOrUpdateRecord(date, inIso, outIso);
      
      // Force reload to ensure UI updates
      this.attendanceService.loadRecords();
      
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
}
