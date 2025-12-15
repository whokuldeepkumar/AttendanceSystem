import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { AttendanceReportViewComponent } from '../attendance-report-view/attendance-report-view';

@Component({
  selector: 'app-bulk-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, AttendanceReportViewComponent],
  templateUrl: './bulk-attendance.html',
  styleUrls: ['./bulk-attendance.css']
})
export class BulkAttendanceComponent {
  employees = signal<any[]>([]);
  selectedEmployees = signal<Set<string>>(new Set());
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  selectedType = signal<'present' | '1st-half' | '2nd-half' | 'absent' | 'leave' | 'sat-off' | 'sun-off' | 'holiday' | null>(null);
  holidayName = signal('');
  isSaving = signal(false);
  attendanceRecords = signal<any[]>([]);

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.loadEmployees();
    this.loadAttendanceRecords();
  }

  async loadEmployees() {
    try {
      const response = await fetch('https://knotend-attendance-backend.onrender.com/api/employees');
      if (response.ok) {
        const data = await response.json();
        this.employees.set(data);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      this.toastService.error('Failed to load employees');
    }
  }

  async loadAttendanceRecords() {
    try {
      console.log('Fetching attendance records from API...');
      const response = await fetch('https://knotend-attendance-backend.onrender.com/api/attendance');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw attendance data received:', data);
        
        // Handle both array and object responses
        let records = Array.isArray(data) ? data : (data?.records || data?.data || []);
        
        if (records && records.length > 0) {
          this.attendanceRecords.set(records);
          console.log('Attendance records loaded from API:', records.length, 'records');
          return;
        }
      }
      
      console.warn('No records from API, checking localStorage...');
      this.loadAttendanceFromLocalStorage();
      
    } catch (error) {
      console.error('Error loading attendance records from API:', error);
      console.log('Falling back to localStorage...');
      this.loadAttendanceFromLocalStorage();
    }
  }

  private loadAttendanceFromLocalStorage() {
    try {
      // First check for bulk_attendance_records
      const bulkRecords = localStorage.getItem('bulk_attendance_records');
      if (bulkRecords) {
        try {
          const parsed = JSON.parse(bulkRecords);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.attendanceRecords.set(parsed);
            console.log('Attendance records loaded from bulk_attendance_records:', parsed.length, 'records');
            return;
          }
        } catch (e) {
          console.warn('Could not parse bulk_attendance_records');
        }
      }

      // Get all attendance records from localStorage
      const allRecords: any[] = [];
      
      // Check for all possible localStorage keys that might contain attendance data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('attendance_') || key.includes('attendance'))) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed)) {
                allRecords.push(...parsed);
              }
            } catch (e) {
              console.warn('Could not parse localStorage key:', key);
            }
          }
        }
      }
      
      if (allRecords.length > 0) {
        this.attendanceRecords.set(allRecords);
        console.log('Attendance records loaded from localStorage:', allRecords.length, 'records');
      } else {
        console.log('No attendance records found in localStorage');
        this.attendanceRecords.set([]);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.attendanceRecords.set([]);
    }
  }

  toggleEmployee(employeeId: string) {
    const selected = new Set(this.selectedEmployees());
    if (selected.has(employeeId)) {
      selected.delete(employeeId);
    } else {
      selected.add(employeeId);
    }
    this.selectedEmployees.set(selected);
  }

  selectAll() {
    const allIds = new Set(this.employees().map(e => e.id));
    this.selectedEmployees.set(allIds);
  }

  deselectAll() {
    this.selectedEmployees.set(new Set());
  }

  selectType(type: 'present' | '1st-half' | '2nd-half' | 'absent' | 'leave' | 'sat-off' | 'sun-off' | 'holiday') {
    this.selectedType.set(type);
  }

  async markAttendance() {
    if (!this.selectedType()) {
      this.toastService.warning('Please select attendance type');
      return;
    }

    if (this.selectedType() === 'holiday' && !this.holidayName().trim()) {
      this.toastService.warning('Please enter holiday name');
      return;
    }

    if (this.selectedEmployees().size === 0) {
      this.toastService.warning('Please select at least one employee');
      return;
    }

    const date = this.selectedDate();
    const type = this.selectedType();
    const employeeIds = Array.from(this.selectedEmployees());

    this.isSaving.set(true);
    const createdRecords: any[] = [];
    
    try {
      for (const employeeId of employeeIds) {
        const payload = {
          userId: employeeId,
          date: date,
          inTime: type === 'present' ? new Date(`${date}T09:00:00`).toISOString() : null,
          outTime: type === 'present' ? new Date(`${date}T18:00:00`).toISOString() : null,
          duration: type === '1st-half' ? '1st Half Day' : type === '2nd-half' ? '2nd Half Day' : type === 'absent' ? 'Absent' : type === 'leave' ? 'Leave' : type === 'sat-off' ? 'Saturday Off' : type === 'sun-off' ? 'Sunday Off' : type === 'holiday' ? this.holidayName() : '9h 0m'
        };

        createdRecords.push(payload);

        try {
          await fetch('https://knotend-attendance-backend.onrender.com/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (apiError) {
          console.warn('API call failed for', employeeId, ':', apiError);
        }
      }

      // Save to localStorage as backup/cache
      this.saveRecordsToLocalStorage(createdRecords);

      this.toastService.success(`Marked ${employeeIds.length} employees as ${type}`);
      this.deselectAll();
      this.selectedType.set(null);
      this.holidayName.set('');
      
      // Reload attendance records to show updated data
      await this.loadAttendanceRecords();
    } catch (error) {
      console.error('Error marking attendance:', error);
      this.toastService.error('Failed to mark attendance');
    } finally {
      this.isSaving.set(false);
    }
  }

  private saveRecordsToLocalStorage(records: any[]) {
    try {
      // Get existing records
      const existing = this.attendanceRecords();
      
      // Merge new records with existing ones, avoiding duplicates
      const merged = [...existing];
      
      for (const newRecord of records) {
        const index = merged.findIndex(r => r.userId === newRecord.userId && r.date === newRecord.date);
        if (index > -1) {
          merged[index] = newRecord; // Update existing
        } else {
          merged.push(newRecord); // Add new
        }
      }
      
      // Save to localStorage with a key that the report can find
      localStorage.setItem('bulk_attendance_records', JSON.stringify(merged));
      console.log('Saved', merged.length, 'records to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  goBack() {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;
    
    if (state?.['fromAdmin']) {
      this.router.navigate(['/admin'], { state: { skipPin: true } });
    } else {
      this.router.navigate(['/home']);
    }
  }

  getReportStats() {
    const today = new Date().toISOString().split('T')[0];
    const allRecords = this.attendanceRecords();
    const todayRecords = allRecords.filter(r => r.date === today);

    console.log('Report stats - Today:', today, 'Total records:', allRecords.length, 'Today records:', todayRecords.length);
    
    const stats = {
      present: todayRecords.filter(r => r.inTime && r.outTime && r.duration && !['Leave', 'Saturday Off', 'Sunday Off'].some(label => r.duration.includes(label))).length,
      leave: todayRecords.filter(r => r.duration === 'Leave').length,
      satOff: todayRecords.filter(r => r.duration === 'Saturday Off').length,
      sunOff: todayRecords.filter(r => r.duration === 'Sunday Off').length,
      holiday: todayRecords.filter(r => !r.inTime && !r.outTime && r.duration && !['Leave', 'Saturday Off', 'Sunday Off'].includes(r.duration)).length,
      absent: this.employees().length - todayRecords.length
    };

    console.log('Report stats calculated:', stats);
    return stats;
  }

  getAttendanceRecords() {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = this.attendanceRecords().filter(r => r.date === today);
    
    // Create a map of userId to attendance record
    const recordMap = new Map(todayRecords.map(r => [r.userId, r]));
    
    return this.employees().map(emp => {
      const record = recordMap.get(emp.id);
      
      if (!record) {
        return {
          name: emp.name,
          status: 'Absent',
          date: today,
          details: 'No record'
        };
      }

      let status = 'Absent';
      let details = '';

      if (record.duration === 'Leave') {
        status = 'Leave';
        details = 'Leave marked';
      } else if (record.duration === 'Saturday Off') {
        status = 'Saturday Off';
        details = 'Weekend off';
      } else if (record.duration === 'Sunday Off') {
        status = 'Sunday Off';
        details = 'Weekend off';
      } else if (record.inTime && record.outTime) {
        status = 'Present';
        details = record.duration || '9h 0m';
      } else if (record.inTime) {
        status = 'Present';
        details = 'Clocked in';
      } else {
        status = 'Absent';
        details = 'No record';
      }

      return {
        name: emp.name,
        status: status,
        date: record.date,
        details: details
      };
    });
  }

  getDetailedAttendanceRecords() {
    // Return all attendance records with employee names and full details
    const records = this.attendanceRecords();
    
    if (!records || records.length === 0) {
      console.log('No attendance records to display');
      return [];
    }

    return records.map(record => {
      const employee = this.employees().find(e => e.id === record.userId);
      const name = employee?.name || record.userId || 'Unknown';

      let status = 'Absent';

      if (record.duration === 'Leave') {
        status = 'Leave';
      } else if (record.duration === 'Saturday Off') {
        status = 'Saturday Off';
      } else if (record.duration === 'Sunday Off') {
        status = 'Sunday Off';
      } else if (record.inTime && record.outTime) {
        status = 'Present';
      } else if (record.inTime) {
        status = 'Present';
      }

      return {
        name: name,
        status: status,
        date: record.date || new Date().toISOString().split('T')[0],
        inTime: record.inTime,
        outTime: record.outTime,
        duration: record.duration || '-'
      };
    }).sort((a, b) => {
      // Sort by date descending, then by name ascending
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) {
        return dateCompare;
      }
      // Safe name comparison
      const nameA = (a.name || 'Unknown').toString();
      const nameB = (b.name || 'Unknown').toString();
      return nameA.localeCompare(nameB);
    });
  }

  // Day-wise report methods
  getDaysInCurrentMonth = computed(() => {
    return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  });

  getDayNumbers = computed(() => {
    return Array.from({ length: this.getDaysInCurrentMonth() }, (_, i) => i + 1);
  });

  getEmployeeDayWiseData = computed(() => {
    const employees = this.employees();
    const allRecords = this.attendanceRecords();
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const daysCount = this.getDaysInCurrentMonth();

    return employees.map((emp: any, index: number) => {
      const records = allRecords.filter((r: any) => {
        const d = new Date(r.date);
        return r.userId === emp.id && d.getMonth() === month && d.getFullYear() === year;
      });

      const days: { [key: number]: string } = {};
      let presentDays = 0;
      let leaveDays = 0;
      let totalDays = 0;

      for (let day = 1; day <= daysCount; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = records.find(r => r.date.split('T')[0] === dateStr);

        if (record) {
          if (record.duration === 'Saturday Off' || record.duration === 'Sunday Off' || 
              (!record.inTime && !record.outTime && record.duration && record.duration !== 'Leave' && record.duration !== 'Absent')) {
            // Off day or holiday
            days[day] = 'Off';
            totalDays += 1;
          } else if (record.duration === 'Leave') {
            days[day] = 'L';
            leaveDays += 1;
          } else if (record.inTime && record.outTime) {
            days[day] = 'P';
            presentDays += 1;
            totalDays += 1;
          } else if (record.inTime) {
            days[day] = 'P';
            presentDays += 1;
            totalDays += 1;
          } else {
            days[day] = 'A';
          }
        } else {
          days[day] = '-';
        }
      }

      return {
        srNo: index + 1,
        empName: emp.name,
        days: days,
        totalDays: totalDays,
        presentDays: presentDays,
        leaveDays: leaveDays
      };
    });
  });
}
