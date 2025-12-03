import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService, LeaveRequest } from '../../services/leave.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="leave-container">
      <h3>Leave Management</h3>

      <!-- Request Leave Form -->
      <div class="glass-card form-card">
        <h4>Request Leave</h4>
        <form (ngSubmit)="submitLeaveRequest()" class="leave-form">
          <div class="form-group">
            <label for="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              class="glass-input"
              [(ngModel)]="leaveForm.startDate"
              name="startDate"
              required
            />
          </div>

          <div class="form-group">
            <label for="endDate">End Date</label>
            <input
              id="endDate"
              type="date"
              class="glass-input"
              [(ngModel)]="leaveForm.endDate"
              name="endDate"
              required
            />
          </div>

          <div class="form-group">
            <label for="reason">Reason</label>
            <textarea
              id="reason"
              class="glass-input"
              [(ngModel)]="leaveForm.reason"
              name="reason"
              placeholder="Enter reason for leave"
              rows="3"
              required
            ></textarea>
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="isSubmitting()">
            {{ isSubmitting() ? 'Submitting...' : 'Submit Request' }}
          </button>
        </form>
      </div>

      <!-- Leave Requests List -->
      <div class="glass-card requests-card">
        <h4>Your Leave Requests</h4>
        <div *ngIf="userLeaves().length === 0" class="no-data">
          No leave requests yet.
        </div>

        <div *ngFor="let leave of userLeaves()" class="leave-item" [ngClass]="'status-' + leave.status">
          <div class="leave-header">
            <span class="leave-dates">
              {{ leave.startDate | date:'mediumDate' }} - {{ leave.endDate | date:'mediumDate' }}
            </span>
            <span class="leave-status">{{ leave.status | uppercase }}</span>
          </div>
          <p class="leave-reason">{{ leave.reason }}</p>
          <small class="leave-date">Applied on {{ leave.createdAt | date:'short' }}</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leave-container {
      margin-top: 24px;
    }

    .leave-container h3 {
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

    .leave-form {
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
      resize: vertical;
    }

    .glass-input::placeholder {
      color: var(--text-muted);
    }

    .requests-card {
      margin-bottom: 20px;
    }

    .requests-card h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: var(--text-color);
    }

    .no-data {
      padding: 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .leave-item {
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border-left: 4px solid;
      margin-bottom: 12px;
      transition: all 0.3s ease;
    }

    .leave-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .status-pending {
      border-left-color: #f59e0b;
    }

    .status-approved {
      border-left-color: #10b981;
    }

    .status-rejected {
      border-left-color: #ef4444;
    }

    .leave-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .leave-dates {
      font-weight: 600;
      color: var(--text-color);
      font-size: 14px;
    }

    .leave-status {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
    }

    .leave-reason {
      margin: 8px 0 0 0;
      color: var(--text-muted);
      font-size: 13px;
    }

    .leave-date {
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
    }

    .btn {
      align-self: flex-start;
    }

    @media (max-width: 600px) {
      .leave-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .leave-item {
        margin-bottom: 10px;
        padding: 12px;
      }
    }
  `]
})
export class LeaveManagementComponent {
  leaveForm = {
    startDate: '',
    endDate: '',
    reason: ''
  };

  isSubmitting = signal(false);

  userLeaves = () => this.leaveService.getUserLeaves();

  constructor(
    private leaveService: LeaveService,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  submitLeaveRequest() {
    if (!this.leaveForm.startDate || !this.leaveForm.endDate || !this.leaveForm.reason) {
      this.toastService.error('Please fill all fields');
      return;
    }

    if (new Date(this.leaveForm.startDate) > new Date(this.leaveForm.endDate)) {
      this.toastService.error('End date must be after start date');
      return;
    }

    this.isSubmitting.set(true);

    try {
      this.leaveService.requestLeave(
        this.leaveForm.startDate,
        this.leaveForm.endDate,
        this.leaveForm.reason
      );
      this.toastService.success('Leave request submitted successfully!');
      this.leaveForm = { startDate: '', endDate: '', reason: '' };
    } catch (error) {
      this.toastService.error('Failed to submit leave request');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
