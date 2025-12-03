import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HolidayService, Holiday } from '../../services/holiday.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-holiday-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="holiday-container">
      <h3>Holiday Management</h3>

      <!-- Add Holiday Form -->
      <div class="glass-card form-card">
        <h4>Add Holiday</h4>
        <form (ngSubmit)="addHoliday()" class="holiday-form">
          <div class="form-group">
            <label for="date">Date</label>
            <input
              id="date"
              type="date"
              class="glass-input"
              [(ngModel)]="newHoliday.date"
              name="date"
              required
            />
          </div>

          <div class="form-group">
            <label for="name">Holiday Name</label>
            <input
              id="name"
              type="text"
              class="glass-input"
              [(ngModel)]="newHoliday.name"
              name="name"
              placeholder="e.g., Christmas"
              required
            />
          </div>

          <div class="form-group">
            <label for="description">Description (Optional)</label>
            <input
              id="description"
              type="text"
              class="glass-input"
              [(ngModel)]="newHoliday.description"
              name="description"
              placeholder="Optional description"
            />
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="isAdding()">
            {{ isAdding() ? 'Adding...' : 'Add Holiday' }}
          </button>
        </form>
      </div>

      <!-- Holidays List -->
      <div class="glass-card holidays-card">
        <h4>Holidays</h4>
        <div *ngIf="holidays().length === 0" class="no-data">
          No holidays configured.
        </div>

        <div *ngFor="let holiday of getUpcomingHolidays()" class="holiday-item">
          <div class="holiday-header">
            <div>
              <strong>{{ holiday.name }}</strong>
              <p>{{ holiday.date | date:'fullDate' }}</p>
            </div>
            <button
              class="btn btn-delete"
              (click)="removeHoliday(holiday.date)"
              title="Delete holiday"
            >
              ✕
            </button>
          </div>
          <p *ngIf="holiday.description" class="holiday-description">{{ holiday.description }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .holiday-container {
      margin-top: 24px;
    }

    .holiday-container h3 {
      margin: 0 0 16px 0;
      color: var(--text-color);
    }

    .form-card {
      margin-bottom: 24px;
    }

    .form-card h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: var(--text-color);
    }

    .holiday-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color);
    }

    .glass-input {
      padding: 10px 12px;
      font-size: 14px;
      background: rgba(255, 255, 255, 0.1) !important;
      border: 1px solid var(--glass-border) !important;
      color: white;
      border-radius: 8px;
    }

    .glass-input::placeholder {
      color: var(--text-muted);
    }

    .holidays-card {
      margin-bottom: 20px;
    }

    .holidays-card h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: var(--text-color);
    }

    .no-data {
      padding: 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .holiday-item {
      padding: 16px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 8px;
      margin-bottom: 12px;
      transition: all 0.3s ease;
    }

    .holiday-item:hover {
      background: rgba(99, 102, 241, 0.15);
      transform: translateX(4px);
    }

    .holiday-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .holiday-header strong {
      color: var(--text-color);
      font-size: 15px;
    }

    .holiday-header p {
      margin: 4px 0 0 0;
      color: var(--text-muted);
      font-size: 13px;
    }

    .holiday-description {
      margin: 8px 0 0 0;
      color: var(--text-muted);
      font-size: 13px;
      font-style: italic;
    }

    .btn-delete {
      padding: 6px 8px !important;
      background: rgba(239, 68, 68, 0.2) !important;
      border: 1px solid rgba(239, 68, 68, 0.3) !important;
      color: #ff6b6b !important;
      font-size: 16px !important;
      min-width: auto;
      border-radius: 6px;
    }

    .btn-delete:hover {
      background: rgba(239, 68, 68, 0.3) !important;
    }

    .btn {
      align-self: flex-start;
    }

    @media (max-width: 600px) {
      .holiday-header {
        flex-direction: column;
      }

      .holiday-item {
        padding: 12px;
        margin-bottom: 10px;
      }

      .btn-delete {
        align-self: flex-end;
      }
    }
  `]
})
export class HolidayManagementComponent {
  newHoliday = {
    date: '',
    name: '',
    description: ''
  };

  isAdding = signal(false);

  holidays = () => this.holidayService.holidays();

  constructor(
    private holidayService: HolidayService,
    private toastService: ToastService
  ) {}

  addHoliday() {
    if (!this.newHoliday.date || !this.newHoliday.name) {
      this.toastService.error('Please fill required fields');
      return;
    }

    this.isAdding.set(true);

    try {
      this.holidayService.addHoliday(
        this.newHoliday.date,
        this.newHoliday.name,
        this.newHoliday.description || undefined
      );
      this.toastService.success('Holiday added successfully!');
      this.newHoliday = { date: '', name: '', description: '' };
    } catch (error) {
      this.toastService.error('Failed to add holiday');
    } finally {
      this.isAdding.set(false);
    }
  }

  removeHoliday(date: string) {
    this.holidayService.removeHoliday(date);
    this.toastService.success('Holiday removed');
  }

  getUpcomingHolidays(): Holiday[] {
    return this.holidays().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}
