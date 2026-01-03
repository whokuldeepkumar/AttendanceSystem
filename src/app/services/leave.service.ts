import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string; // ISO Date string
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private readonly LEAVES_KEY = 'leave_requests';
  leaveRequests = signal<LeaveRequest[]>([]);

  constructor(private storageService: StorageService, private authService: AuthService) {
    this.loadLeaves();
  }

  private async loadLeaves() {
    try {
      const user = this.authService.currentUser();
      if (!user) {
        this.leaveRequests.set([]);
        return;
      }

      // Load from localStorage (leave requests are not synced to API)
      const data = this.storageService.getItem<LeaveRequest[]>(this.LEAVES_KEY) || [];
      this.leaveRequests.set(data);
      console.log('Leave requests loaded from localStorage:', data);
    } catch (error) {
      console.error('Error loading leave requests:', error);
      this.leaveRequests.set([]);
    }
  }

  requestLeave(startDate: string, endDate: string, reason: string) {
    const user = this.authService.currentUser();
    if (!user) return null;

    const leaveRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      userId: user.id,
      startDate,
      endDate,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.saveLeave(leaveRequest);
    return leaveRequest;
  }

  addLeave(date: string, reason: string) {
    const user = this.authService.currentUser();
    if (!user) return null;

    const leaveRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      userId: user.id,
      startDate: date,
      endDate: date,
      reason,
      status: 'approved',
      createdAt: new Date().toISOString()
    };

    this.saveLeave(leaveRequest);
    return leaveRequest;
  }

  private async saveLeave(leaveRequest: LeaveRequest) {
    const updated = [...this.leaveRequests(), leaveRequest];
    
    // Save to localStorage first
    this.leaveRequests.set(updated);
    this.storageService.setItem(this.LEAVES_KEY, updated);

    // Then sync to API
    try {
      await fetch(`${this.API_URL}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveRequest)
      });
      console.log('Leave request synced to API');
    } catch (error) {
      console.error('Error syncing leave to API:', error);
    }
  }

  approveLeave(leaveId: string) {
    this.updateLeaveStatus(leaveId, 'approved');
  }

  rejectLeave(leaveId: string) {
    this.updateLeaveStatus(leaveId, 'rejected');
  }

  private async updateLeaveStatus(leaveId: string, status: 'approved' | 'rejected') {
    const updated = this.leaveRequests().map(l =>
      l.id === leaveId ? { ...l, status } : l
    );
    
    // Save to localStorage
    this.leaveRequests.set(updated);
    this.storageService.setItem(this.LEAVES_KEY, updated);
    console.log('Leave status updated in localStorage');
    // Note: Leave requests are stored in localStorage. API sync not available in this version.
  }

  getUserLeaves(): LeaveRequest[] {
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.leaveRequests().filter(l => l.userId === user.id);
  }

  isOnLeave(date: string): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;

    const dateObj = new Date(date);
    return this.leaveRequests()
      .filter(l => l.userId === user.id && l.status === 'approved')
      .some(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        return dateObj >= start && dateObj <= end;
      });
  }

  getLeavesByMonth(month: number, year: number): LeaveRequest[] {
    const user = this.authService.currentUser();
    if (!user) return [];

    return this.leaveRequests()
      .filter(l => l.userId === user.id && l.status === 'approved')
      .filter(l => {
        const start = new Date(l.startDate);
        return start.getMonth() === month && start.getFullYear() === year;
      });
  }
}
