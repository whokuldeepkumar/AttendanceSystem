import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService, AttendanceRecord } from '../../services/attendance.service';
import { LeaveService } from '../../services/leave.service';
import { HolidayService } from '../../services/holiday.service';

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  totalHours: number;
  averageHours: number;
  percentage: number;
  leaveDays: number;
  approvedLeaves: number;
  pendingLeaves: number;
  satOffDays: number;
  sunOffDays: number;
  totalLeaves: number;
}

@Component({
  selector: 'app-attendance-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-container">
      <h3>Attendance Summary</h3>
      <div class="stats-grid">

        <div class="stat-card">
          <div class="stat-label">Present Days</div>
          <div class="stat-value present">
            <div class="present-count">{{ stats().presentDays }}</div>
            
            <div class="present-subtext" *ngIf="stats().satOffDays > 0 || stats().sunOffDays > 0">
              <span *ngIf="stats().satOffDays > 0">Sat: {{ stats().satOffDays }}</span>
              <span *ngIf="stats().satOffDays > 0 && stats().sunOffDays > 0"> | </span>
              <span *ngIf="stats().sunOffDays > 0">Sun: {{ stats().sunOffDays }}</span>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Absent Days</div>
          <div class="stat-value absent">{{ stats().absentDays }}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Total Hours</div>
          <div class="stat-value total-hours">{{ formatHours(stats().totalHours) }}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Attendance %</div>
          <div class="stat-value percentage">{{ stats().percentage }}%</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Leave</div>
          <div class="stat-value leave">{{ stats().leaveDays }}/{{ stats().totalLeaves }}</div>
        </div>
      </div>

      <!-- <h3 style="margin-top: 24px;">Leave Summary</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Approved Leaves</div>
          <div class="stat-value leaves-approved">{{ stats().approvedLeaves }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pending Leaves</div>
          <div class="stat-value leaves-pending">{{ stats().pendingLeaves }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Leave Days</div>
          <div class="stat-value leaves-total">{{ stats().leaveDays }}</div>
        </div>
      </div> -->
    </div>
  `,
  styles: [`
    .stats-container {
      margin-bottom: 24px;
    }

    .stats-container h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: var(--text-color);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      background: rgba(99, 102, 241, 0.15);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-color);
      line-height: 1;
    }

    .stat-value.present {
      color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
      padding: 8px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .present-count {
      font-size: 28px;
      font-weight: 700;
    }

    .present-subtext {
      font-size: 12px;
      color: rgba(34, 197, 94, 0.8);
      font-weight: 500;
    }

    .stat-value.absent {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
      padding: 8px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .absent-count {
      font-size: 28px;
      font-weight: 700;
    }

    .absent-subtext {
      font-size: 12px;
      color: rgba(239, 68, 68, 0.8);
      font-weight: 500;
    }

    .stat-value.total-hours {
      color: #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
      padding: 8px;
      border-radius: 8px;
    }

    .stat-value.percentage {
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      padding: 8px;
      border-radius: 8px;
    }

    .stat-value.leave {
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
      padding: 8px;
      border-radius: 8px;
    }

    .stat-value.leaves-approved {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      padding: 8px;
      border-radius: 8px;
    }

    .stat-value.leaves-pending {
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
      padding: 8px;
      border-radius: 8px;
    }

    .stat-value.leaves-total {
      color: #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
      padding: 8px;
      border-radius: 8px;
    }

    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .stat-card {
        padding: 12px;
      }

      .stat-value {
        font-size: 24px;
      }

      .stat-label {
        font-size: 11px;
      }
    }
  `]
})
export class AttendanceStatsComponent {
  @Input() records: AttendanceRecord[] = [];

  stats = computed(() => {
    const records = this.records;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Filter records for current month
    const monthRecords = records.filter(r => {
      const date = new Date(r.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Calculate present days with half day as 0.5
    let presentDays = 0;
    monthRecords.forEach(r => {
      if (r.duration === '1st Half Day' || r.duration === '2nd Half Day') {
        presentDays += 0.5;
      } else if (r.inTime && r.outTime) {
        const inTime = new Date(r.inTime).getTime();
        const outTime = new Date(r.outTime).getTime();
        const totalHours = (outTime - inTime) / (1000 * 60 * 60);
        if (totalHours >= 8.5) presentDays += 1;
        else if (totalHours >= 4.5) presentDays += 0.5;
      }
    });
    
    // Count Sat Off and Sun Off days from attendance records
    const satOffDays = monthRecords.filter(r => r.duration === 'Saturday Off').length;
    const sunOffDays = monthRecords.filter(r => r.duration === 'Sunday Off').length;
    
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    let absentDays = 0;
    monthRecords.forEach(r => {
      // Check if marked as 1st Half Day or 2nd Half Day (count as 0.5 absent)
      if (r.duration === '1st Half Day' || r.duration === '2nd Half Day') {
        absentDays += 0.5;
      }
      // Check if marked as Absent
      else if (r.duration === 'Absent') {
        absentDays += 1;
      }
      // Check if hours < 4.5
      else if (r.inTime && r.outTime) {
        const inTime = new Date(r.inTime).getTime();
        const outTime = new Date(r.outTime).getTime();
        const totalHours = (outTime - inTime) / (1000 * 60 * 60);
        if (totalHours < 4.5) absentDays += 1;
      }
    });

    // Calculate total hours
    let totalHours = 0;
    monthRecords.forEach(r => {
      if (r.inTime && r.outTime) {
        const inTime = new Date(r.inTime).getTime();
        const outTime = new Date(r.outTime).getTime();
        totalHours += (outTime - inTime) / (1000 * 60 * 60);
      }
    });

    // Calculate leave statistics
    const approvedLeaves = this.leaveService.getLeavesByMonth(currentMonth, currentYear).length;
    const allUserLeaves = this.leaveService.getUserLeaves();
    const pendingLeaves = allUserLeaves.filter(l => l.status === 'pending').length;

    // Count total leave days
    let leaveDays = 0;
    this.leaveService.getLeavesByMonth(currentMonth, currentYear).forEach(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      leaveDays += days;
    });

    const averageHours = presentDays > 0 ? totalHours / presentDays : 0;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Calculate total leaves (all user leaves regardless of month)
    let totalLeaves = 0;
    allUserLeaves.filter(l => l.status === 'approved').forEach(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalLeaves += days;
    });

    return {
      totalDays,
      presentDays,
      absentDays,
      totalHours,
      averageHours,
      percentage,
      leaveDays,
      approvedLeaves,
      pendingLeaves,
      satOffDays,
      sunOffDays,
      totalLeaves
    };
  });

  constructor(
    private leaveService: LeaveService,
    private holidayService: HolidayService
  ) {}

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }
}


