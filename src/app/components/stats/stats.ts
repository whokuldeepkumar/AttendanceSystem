import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService, AttendanceRecord } from '../../services/attendance.service';

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  totalHours: number;
  averageHours: number;
  percentage: number;
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
          <div class="stat-value present">{{ stats().presentDays }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Absent Days</div>
          <div class="stat-value absent">{{ stats().absentDays }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Hours</div>
          <div class="stat-value">{{ formatHours(stats().totalHours) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Attendance %</div>
          <div class="stat-value percentage">{{ stats().percentage }}%</div>
        </div>
      </div>
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
    }

    .stat-value.absent {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
      padding: 8px;
      border-radius: 8px;
    }

    .stat-value.percentage {
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
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

    const presentDays = monthRecords.filter(r => r.inTime).length;
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const absentDays = Math.max(0, totalDays - presentDays);

    // Calculate total hours
    let totalHours = 0;
    monthRecords.forEach(r => {
      if (r.inTime && r.outTime) {
        const inTime = new Date(r.inTime).getTime();
        const outTime = new Date(r.outTime).getTime();
        totalHours += (outTime - inTime) / (1000 * 60 * 60);
      }
    });

    const averageHours = presentDays > 0 ? totalHours / presentDays : 0;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      totalHours,
      averageHours,
      percentage
    };
  });

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }
}
