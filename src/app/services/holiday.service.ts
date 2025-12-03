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
  holidays = signal<Holiday[]>([]);

  constructor(private storageService: StorageService) {
    this.loadHolidays();
  }

  private loadHolidays() {
    const data = this.storageService.getItem<Holiday[]>(this.HOLIDAYS_KEY) || [];
    this.holidays.set(data);
  }

  addHoliday(date: string, name: string, description?: string) {
    const current = this.holidays();
    const exists = current.some(h => h.date === date);
    
    if (!exists) {
      const holiday: Holiday = { date, name, description };
      const updated = [...current, holiday];
      this.holidays.set(updated);
      this.storageService.setItem(this.HOLIDAYS_KEY, updated);
    }
  }

  removeHoliday(date: string) {
    const updated = this.holidays().filter(h => h.date !== date);
    this.holidays.set(updated);
    this.storageService.setItem(this.HOLIDAYS_KEY, updated);
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
