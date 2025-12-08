import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-bulk-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-attendance.html',
  styleUrls: ['./bulk-attendance.css']
})
export class BulkAttendanceComponent {
  employees = signal<any[]>([]);
  selectedEmployees = signal<Set<string>>(new Set());
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  selectedType = signal<'present' | 'leave' | 'sat-off' | 'sun-off' | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.loadEmployees();
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

  selectType(type: 'present' | 'leave' | 'sat-off' | 'sun-off') {
    this.selectedType.set(type);
  }

  async markAttendance() {
    if (!this.selectedType()) {
      this.toastService.warning('Please select attendance type');
      return;
    }

    if (this.selectedEmployees().size === 0) {
      this.toastService.warning('Please select at least one employee');
      return;
    }

    const date = this.selectedDate();
    const type = this.selectedType();
    const employeeIds = Array.from(this.selectedEmployees());

    try {
      for (const employeeId of employeeIds) {
        const payload = {
          userId: employeeId,
          date: date,
          inTime: type === 'present' ? new Date(`${date}T09:00:00`).toISOString() : null,
          outTime: type === 'present' ? new Date(`${date}T18:00:00`).toISOString() : null,
          duration: type === 'leave' ? 'Leave' : type === 'sat-off' ? 'Saturday Off' : type === 'sun-off' ? 'Sunday Off' : '9h 0m'
        };

        await fetch('https://knotend-attendance-backend.onrender.com/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      this.toastService.success(`Marked ${employeeIds.length} employees as ${type}`);
      this.deselectAll();
      this.selectedType.set(null);
    } catch (error) {
      console.error('Error marking attendance:', error);
      this.toastService.error('Failed to mark attendance');
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
}
