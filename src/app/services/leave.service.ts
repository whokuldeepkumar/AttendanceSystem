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

  private loadLeaves() {
    const data = this.storageService.getItem<LeaveRequest[]>(this.LEAVES_KEY) || [];
    this.leaveRequests.set(data);
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

    const updated = [...this.leaveRequests(), leaveRequest];
    this.leaveRequests.set(updated);
    this.storageService.setItem(this.LEAVES_KEY, updated);
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

    const updated = [...this.leaveRequests(), leaveRequest];
    this.leaveRequests.set(updated);
    this.storageService.setItem(this.LEAVES_KEY, updated);
    return leaveRequest;
  }

  approveLeave(leaveId: string) {
    const updated = this.leaveRequests().map(l =>
      l.id === leaveId ? { ...l, status: 'approved' as const } : l
    );
    this.leaveRequests.set(updated);
    this.storageService.setItem(this.LEAVES_KEY, updated);
  }

  rejectLeave(leaveId: string) {
    const updated = this.leaveRequests().map(l =>
      l.id === leaveId ? { ...l, status: 'rejected' as const } : l
    );
    this.leaveRequests.set(updated);
    this.storageService.setItem(this.LEAVES_KEY, updated);
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
