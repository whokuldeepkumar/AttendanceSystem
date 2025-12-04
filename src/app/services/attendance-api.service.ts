import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export interface AttendanceRecord {
  userId: string;
  date: string;
  inTime: string | null;
  outTime: string | null;
  duration: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceApiService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private authService: AuthService) {}

  /**
   * Get all attendance records for the current user
   */
  async getUserAttendance(): Promise<AttendanceRecord[]> {
    const user = this.authService.currentUser();
    if (!user) {
      console.warn('No user logged in');
      return [];
    }

    try {
      const response = await fetch(`${this.API_URL}/attendance/${user.id}`);
      if (response.ok) {
        const records = await response.json();
        console.log('Loaded attendance records from API:', records);
        return records;
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
    return [];
  }

  /**
   * Save or update an attendance record
   */
  async saveAttendance(date: string, inTime: string | null, outTime: string | null, duration: string): Promise<boolean> {
    const user = this.authService.currentUser();
    if (!user) {
      console.warn('No user logged in');
      return false;
    }

    try {
      const response = await fetch(`${this.API_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          date,
          inTime,
          outTime,
          duration
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Attendance saved successfully:', result);
        return true;
      } else {
        console.error('Error saving attendance:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error saving attendance to API:', error);
      return false;
    }
  }

  /**
   * Delete an attendance record
   */
  async deleteAttendance(date: string): Promise<boolean> {
    const user = this.authService.currentUser();
    if (!user) {
      console.warn('No user logged in');
      return false;
    }

    try {
      const response = await fetch(`${this.API_URL}/attendance/${user.id}/${date}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log('Attendance record deleted');
        return true;
      }
    } catch (error) {
      console.error('Error deleting attendance:', error);
    }
    return false;
  }
}
