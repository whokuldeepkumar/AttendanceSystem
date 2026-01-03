import { Injectable, signal } from '@angular/core';

export interface LeaveBalance {
  carry_forward: number;
  pl: number;
  cl: number;
  total: number;
  taken: number;
  remaining: number;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveBalanceService {
  private leaveBalance = signal<LeaveBalance>({ carry_forward: 0, pl: 0, cl: 0, total: 0, taken: 0, remaining: 0 });
  private currentUserId: number | null = null;
  private currentMonth: string | null = null;

  async loadLeaveBalance(userId: number, month: string, attendanceRecords: any[]) {
    this.currentUserId = userId;
    this.currentMonth = month;
    await this.calculateAndUpdateBalance(attendanceRecords, userId, month);
  }

  private async calculateAndUpdateBalance(attendanceRecords: any[], userId: number, month: string) {
    try {
      const response = await fetch(`http://localhost:3000/api/leaves`);
      const allLeaves = await response.json();
      const userLeave = allLeaves.find((l: any) => l.user_id === userId && l.month === month);
      
      // Calculate leaves taken from attendance records (same logic as stats)
      let leavesTaken = 0;
      attendanceRecords.forEach((r: any) => {
        if (r.duration === 'Leave') {
          leavesTaken += 1;
        } else if (r.inTime && r.outTime) {
          const inTime = new Date(r.inTime).getTime();
          const outTime = new Date(r.outTime).getTime();
          const hours = (outTime - inTime) / (1000 * 60 * 60);
          if (hours < 4.5) leavesTaken += 1;
          else if (hours >= 4.5 && hours < 8.5) leavesTaken += 0.5;
        }
      });
      
      if (userLeave) {
        const carry_forward = parseFloat(userLeave.carry_forward || 0);
        const pl = parseFloat(userLeave.pl || 0);
        const cl = parseFloat(userLeave.cl || 0);
        const total = carry_forward + pl + cl;
        const remaining = Math.max(0, total - leavesTaken);
        
        this.leaveBalance.set({ carry_forward, pl, cl, total, taken: leavesTaken, remaining });
      } else {
        this.leaveBalance.set({ carry_forward: 0, pl: 0, cl: 0, total: 0, taken: leavesTaken, remaining: 0 });
      }
    } catch (error) {
      console.error('Error calculating leave balance:', error);
    }
  }

  refreshLeaveBalance(attendanceRecords: any[]) {
    if (this.currentUserId && this.currentMonth) {
      this.calculateAndUpdateBalance(attendanceRecords, this.currentUserId, this.currentMonth);
    }
  }

  getLeaveBalance() {
    return this.leaveBalance();
  }

  getLeaveBalanceSignal() {
    return this.leaveBalance;
  }
}
