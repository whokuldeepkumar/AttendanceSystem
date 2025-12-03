import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

export interface Holiday {
  date: string; // ISO Date string YYYY-MM-DD
  name: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private readonly HOLIDAYS_KEY = 'holidays';
  private readonly API_URL = 'http://localhost:3000/api';
  holidays = signal<Holiday[]>([]);

  constructor(private storageService: StorageService) {
    this.loadHolidays();
  }

  private async loadHolidays() {
    try {
      const response = await fetch(`${this.API_URL}/holidays`);
      if (response.ok) {
        const data = await response.json();
        this.holidays.set(data);
        console.log('Holidays loaded from API:', data);
      }
    } catch (error) {
      console.error('Error loading holidays from API:', error);
      // Fallback to localStorage
      const data = this.storageService.getItem<Holiday[]>(this.HOLIDAYS_KEY) || [];
      this.holidays.set(data);
      console.log('Holidays loaded from localStorage');
    }
  }

  async addHoliday(date: string, name: string, description?: string) {
    const current = this.holidays();
    const exists = current.some(h => h.date === date);
    
    if (!exists) {
      const holiday: Holiday = { date, name, description };
      
      // Save to localStorage first
      const updated = [...current, holiday];
      this.holidays.set(updated);
      this.storageService.setItem(this.HOLIDAYS_KEY, updated);

      // Then sync to API
      try {
        await fetch(`${this.API_URL}/holidays`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(holiday)
        });
        console.log('Holiday synced to API');
      } catch (error) {
        console.error('Error syncing holiday to API:', error);
      }
    }
  }

  async removeHoliday(date: string) {
    const updated = this.holidays().filter(h => h.date !== date);
    this.holidays.set(updated);
    this.storageService.setItem(this.HOLIDAYS_KEY, updated);

    // Sync to API
    try {
      await fetch(`${this.API_URL}/holidays/${date}`, {
        method: 'DELETE'
      });
      console.log('Holiday deleted from API');
    } catch (error) {
      console.error('Error deleting holiday from API:', error);
    }
  }

  isHoliday(date: string): boolean {
    return this.holidays().some(h => h.date === date);
  }

  getHolidaysByMonth(month: number, year: number): Holiday[] {
    return this.holidays().filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }

  getHolidayName(date: string): string | null {
    const holiday = this.holidays().find(h => h.date === date);
    return holiday?.name || null;
  }
}
