import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AttendanceService } from '../../services/attendance.service';
import { ExcelService } from '../../services/excel.service';
import { ToastService } from '../../services/toast.service';
import { AttendanceReportViewComponent } from '../attendance-report-view/attendance-report-view';

@Component({
  selector: 'app-attendance-report',
  standalone: true,
  imports: [CommonModule, AttendanceReportViewComponent],
  templateUrl: './attendance-report.html',
  styleUrls: ['./attendance-report.css']
})
export class AttendanceReportComponent implements OnInit {
  selectedMonth = signal(new Date().getMonth());
  selectedYear = signal(new Date().getFullYear());
  isExporting = signal(false);

  months = ['January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'];

  currentMonthName = computed(() => this.months[this.selectedMonth()]);
  
  daysInMonth = computed(() => {
    return new Date(this.selectedYear(), this.selectedMonth() + 1, 0).getDate();
  });

  dayNumbers = computed(() => {
    return Array.from({ length: this.daysInMonth() }, (_, i) => i + 1);
  });

  allRecords = signal<any[]>([]);
  allUsers = signal<any[]>([]);
  isLoading = signal(true);
  attendanceRecords = signal<any[]>([]);

  async ngOnInit() {
    try {
      // Wait a bit for auth service to load employees
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const users = this.authService.getAllUsers();
      console.log('Users loaded:', users);
      this.allUsers.set(users);
      
      // Load attendance records from API or localStorage
      await this.loadAttendanceRecords();
      
      console.log('Data loaded. Employee data will be computed:', this.employeeData().length, 'employees');
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  employeeData = computed(() => {
    const users = this.allUsers();
    const month = this.selectedMonth();
    const year = this.selectedYear();
    const daysCount = this.daysInMonth();
    const allRecords = this.allRecords();

    console.log('EmployeeData computed:', { users: users.length, records: allRecords.length, month, year });

    return users.map((user: any, index: number) => {
      const records = allRecords.filter((r: any) => {
        const d = new Date(r.date);
        return r.userId === user.id && d.getMonth() === month && d.getFullYear() === year;
      });
      
      const days: { [key: number]: string } = {};
      let presentDays = 0;
      let leaveDays = 0;

      for (let day = 1; day <= daysCount; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = records.find(r => r.date.split('T')[0] === dateStr);
        
        if (record) {
          if (record.duration === 'Saturday Off' || record.duration === 'Sunday Off') {
            days[day] = 'Off';
            presentDays += 1;
          } else if (!record.inTime && !record.outTime && record.duration && record.duration !== 'Leave' && record.duration !== 'Absent') {
            // Holiday (custom name like Diwali, Christmas, etc.)
            days[day] = 'Off';
            presentDays += 1;
          } else if (record.duration === 'Leave') {
            days[day] = 'L';
            leaveDays += 1;
          } else if (record.inTime && record.outTime) {
            const hours = (new Date(record.outTime).getTime() - new Date(record.inTime).getTime()) / (1000 * 60 * 60);
            if (hours >= 8.5) {
              days[day] = 'P';
              presentDays += 1;
            } else if (hours >= 4.5) {
              days[day] = 'H';
              presentDays += 0.5;
              leaveDays += 0.5;
            } else {
              days[day] = 'L';
              leaveDays += 1;
            }
          } else {
            days[day] = 'A';
          }
        } else {
          days[day] = '-';
        }
      }

      return {
        srNo: index + 1,
        empName: user.name,
        days,
        totalDays: daysCount,
        presentDays,
        leaveDays
      };
    });
  });

  loadAttendanceRecords = async () => {
    try {
      console.log('Fetching attendance records from API...');
      const response = await fetch('https://knotend-attendance-backend.onrender.com/api/attendance');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw attendance data received:', data);
        
        // Handle both array and object responses
        let records = Array.isArray(data) ? data : (data?.records || data?.data || []);
        
        if (records && records.length > 0) {
          this.allRecords.set(records);
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
  };

  private loadAttendanceFromLocalStorage() {
    try {
      // First check for bulk_attendance_records
      const bulkRecords = localStorage.getItem('bulk_attendance_records');
      if (bulkRecords) {
        const records = JSON.parse(bulkRecords);
        this.allRecords.set(records);
        this.attendanceRecords.set(records);
        console.log('Loaded from localStorage bulk_attendance_records:', records.length);
        return;
      }

      // Scan for attendance* keys
      const allRecords: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('attendance')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '');
            if (Array.isArray(data)) {
              allRecords.push(...data);
            }
          } catch (e) {
            console.warn(`Could not parse ${key}`);
          }
        }
      }

      if (allRecords.length > 0) {
        this.allRecords.set(allRecords);
        this.attendanceRecords.set(allRecords);
        console.log('Loaded from localStorage keys:', allRecords.length);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.allRecords.set([]);
      this.attendanceRecords.set([]);
    }
  }

  getDetailedAttendanceRecords = () => {
    const records = this.attendanceRecords();
    const users = this.allUsers();
    const month = this.selectedMonth();
    const year = this.selectedYear();

    // Filter records for current month and year
    const filteredRecords = records.filter((r: any) => {
      const d = new Date(r.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    // Map records with employee names
    return filteredRecords.map((record: any) => {
      const user = users.find(u => u.id === record.userId);
      const date = new Date(record.date);
      let status = 'Absent';

      if (record.duration === 'Saturday Off' || record.duration === 'Sunday Off') {
        status = 'Off';
      } else if (record.duration === 'Leave') {
        status = 'Leave';
      } else if (record.duration && record.duration !== 'Absent' && !record.inTime) {
        status = 'Off';
      } else if (record.inTime && record.outTime) {
        const hours = (new Date(record.outTime).getTime() - new Date(record.inTime).getTime()) / (1000 * 60 * 60);
        if (hours >= 8.5) {
          status = 'Present';
        } else if (hours >= 4.5) {
          status = 'Half Day';
        } else {
          status = 'Leave';
        }
      }

      return {
        date,
        name: user?.name || 'Unknown',
        status,
        inTime: record.inTime ? new Date(record.inTime) : null,
        outTime: record.outTime ? new Date(record.outTime) : null,
        duration: record.duration || '-'
      };
    }).sort((a: any, b: any) => {
      // Sort by date descending, then by name ascending
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      
      const nameA = (a.name || 'Unknown').toString().toLowerCase();
      const nameB = (b.name || 'Unknown').toString().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private excelService: ExcelService,
    private toastService: ToastService
  ) {}

  previousMonth() {
    if (this.selectedMonth() === 0) {
      this.selectedMonth.set(11);
      this.selectedYear.set(this.selectedYear() - 1);
    } else {
      this.selectedMonth.set(this.selectedMonth() - 1);
    }
  }

  nextMonth() {
    if (this.selectedMonth() === 11) {
      this.selectedMonth.set(0);
      this.selectedYear.set(this.selectedYear() + 1);
    } else {
      this.selectedMonth.set(this.selectedMonth() + 1);
    }
  }

  exportToExcel() {
    this.isExporting.set(true);
    try {
      const data = this.employeeData().map((emp: any) => {
        const row: any = {
          'Sr No': emp.srNo,
          'Employee Name': emp.empName
        };
        
        this.dayNumbers().forEach(day => {
          row[day] = emp.days[day] || '-';
        });
        
        row['Total Days'] = emp.totalDays;
        row['Present Days'] = emp.presentDays;
        row['Leave Days'] = emp.leaveDays;
        
        return row;
      });

      const fileName = `Attendance_Report_${this.currentMonthName()}_${this.selectedYear()}`;
      this.excelService.exportAsExcelFile(data, fileName);
      this.toastService.success('Report exported successfully!');
    } catch (error) {
      this.toastService.error('Failed to export report');
    } finally {
      this.isExporting.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/admin'], { state: { skipPin: true } });
  }
}
