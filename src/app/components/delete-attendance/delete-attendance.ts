import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { AttendanceReportViewComponent } from '../attendance-report-view/attendance-report-view';

@Component({
  selector: 'app-delete-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, AttendanceReportViewComponent],
  templateUrl: './delete-attendance.html',
  styleUrls: ['./delete-attendance.css']
})
export class DeleteAttendanceComponent {
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  isDeleting = signal(false);
  employees = signal<any[]>([]);
  selectedEmployees = signal<Set<string>>(new Set());
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
    const users = this.authService.getAllUsers();
    this.employees.set(users);
  }

  async loadAttendanceRecords() {
    try {
      const response = await fetch('https://knotend-attendance-backend.onrender.com/api/attendance');
      if (response.ok) {
        const data = await response.json();
        this.attendanceRecords.set(Array.isArray(data) ? data : []);
        return;
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
    
    const allRecords: any[] = [];
    const users = this.authService.getAllUsers();
    users.forEach(user => {
      const key = `attendance_${user.id}`;
      const records = JSON.parse(localStorage.getItem(key) || '[]');
      allRecords.push(...records);
    });
    this.attendanceRecords.set(allRecords);
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

      for (let day = 1; day <= daysCount; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = records.find(r => r.date.split('T')[0] === dateStr);

        if (record) {
          if (record.duration === 'Saturday Off' || record.duration === 'Sunday Off') {
            days[day] = 'Off';
            presentDays += 1;
          } else if (!record.inTime && !record.outTime && record.duration && record.duration !== 'Leave' && record.duration !== 'Absent') {
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
        empName: emp.name,
        days: days,
        totalDays: daysCount,
        presentDays: presentDays,
        leaveDays: leaveDays
      };
    });
  });

  async deleteAttendance() {
    const date = this.selectedDate();
    const selectedIds = Array.from(this.selectedEmployees());
    
    if (selectedIds.length === 0) {
      this.toastService.warning('Please select at least one employee');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete attendance records for ${selectedIds.length} employee(s) on ${date}? This action cannot be undone.`)) {
      return;
    }

    this.isDeleting.set(true);
    try {
      let deletedCount = 0;

      for (const userId of selectedIds) {
        try {
          const response = await fetch(`https://knotend-attendance-backend.onrender.com/api/attendance/${userId}/${date}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            deletedCount++;
          }

          const key = `attendance_${userId}`;
          const records = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = records.filter((r: any) => r.date.split('T')[0] !== date);
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch (error) {
          console.warn(`Failed to delete for user ${userId}:`, error);
        }
      }

      // Also clean bulk_attendance_records
      const bulkRecords = JSON.parse(localStorage.getItem('bulk_attendance_records') || '[]');
      const filteredBulk = bulkRecords.filter((r: any) => r.date.split('T')[0] !== date);
      localStorage.setItem('bulk_attendance_records', JSON.stringify(filteredBulk));

      this.toastService.success(`Deleted attendance for ${deletedCount} employees on ${date}`);
      this.deselectAll();
      await this.loadAttendanceRecords();
    } catch (error) {
      console.error('Error deleting attendance:', error);
      this.toastService.error('Failed to delete attendance');
    } finally {
      this.isDeleting.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/admin'], { state: { skipPin: true } });
  }
}
