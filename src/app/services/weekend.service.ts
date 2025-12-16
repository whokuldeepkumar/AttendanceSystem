import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class WeekendService {
  private readonly WEEKEND_KEY = 'weekend_offs';

  constructor(private storageService: StorageService) {}

  addWeekendOff(date: string, type: 'Saturday Off' | 'Sunday Off') {
    const weekends = this.storageService.getItem<{ date: string; type: string }[]>(this.WEEKEND_KEY) || [];
    const exists = weekends.find(w => w.date === date);
    if (!exists) {
      weekends.push({ date, type });
      this.storageService.setItem(this.WEEKEND_KEY, weekends);
    }
  }

  getWeekendOff(date: string): string | null {
    const weekends = this.storageService.getItem<{ date: string; type: string }[]>(this.WEEKEND_KEY) || [];
    const weekend = weekends.find(w => w.date === date);
    return weekend ? weekend.type : null;
  }

  getAllWeekendOffs(): { date: string; type: string }[] {
    return this.storageService.getItem<{ date: string; type: string }[]>(this.WEEKEND_KEY) || [];
  }
}
