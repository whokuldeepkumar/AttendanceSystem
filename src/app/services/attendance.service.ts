import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

export interface AttendanceRecord {
    userId?: string;
    date: string; // ISO Date string YYYY-MM-DD
    inTime: string | null; // ISO String
    outTime: string | null; // ISO String
    duration: string; // Calculated duration
}

@Injectable({
    providedIn: 'root'
})
export class AttendanceService {
    private records = signal<AttendanceRecord[]>([]);
    private readonly API_URL = 'http://localhost:3000/api';

    // Computed signal to get records sorted by date descending
    sortedRecords = computed(() => {
        return this.records().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    constructor(private storageService: StorageService, private authService: AuthService) {
        this.loadRecords();
    }

    private getStorageKey(): string {
        const user = this.authService.currentUser();
        return user ? `attendance_${user.id}` : '';
    }

    async loadRecords() {
        try {
            const user = this.authService.currentUser();
            if (!user) {
                this.records.set([]);
                return;
            }

            const response = await fetch(`${this.API_URL}/attendance/${user.id}`);
            if (response.ok) {
                const data = await response.json();
                this.records.set(data);
                console.log('Attendance records loaded from API:', data);
            }
        } catch (error) {
            console.error('Error loading attendance from API:', error);
            // Fallback to localStorage
            const key = this.getStorageKey();
            if (key) {
                const data = this.storageService.getItem<AttendanceRecord[]>(key) || [];
                this.records.set(data);
                console.log('Attendance records loaded from localStorage');
            }
        }
    }

    getTodayRecord(): AttendanceRecord | undefined {
        const today = new Date().toISOString().split('T')[0];
        return this.records().find(r => r.date === today);
    }

    async clockIn() {
        const user = this.authService.currentUser();
        if (!user) {
            console.error('clockIn: No user logged in');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        let currentRecords = this.records();
        const existingRecordIndex = currentRecords.findIndex(r => r.date === today);

        if (existingRecordIndex > -1) {
            if (!currentRecords[existingRecordIndex].inTime) {
                currentRecords[existingRecordIndex].inTime = now;
            }
        } else {
            const newRecord: AttendanceRecord = {
                userId: user.id,
                date: today,
                inTime: now,
                outTime: null,
                duration: ''
            };
            currentRecords = [...currentRecords, newRecord];
        }

        console.log('clockIn: Saving record:', currentRecords);
        await this.saveRecords(currentRecords);
    }

    /**
     * Mark a day with a label (e.g., 'Leave', 'Saturday Off') so it appears in attendance records.
     */
    markDay(dateIso: string, label: string) {
        const key = this.getStorageKey();
        if (!key) return;

        let currentRecords = this.records();
        const existingIndex = currentRecords.findIndex(r => r.date === dateIso);

        if (existingIndex > -1) {
            const existing = { ...currentRecords[existingIndex] };
            existing.inTime = null;
            existing.outTime = null;
            existing.duration = label;
            currentRecords = [...currentRecords.slice(0, existingIndex), existing, ...currentRecords.slice(existingIndex + 1)];
        } else {
            const record = {
                date: dateIso,
                inTime: null,
                outTime: null,
                duration: label
            } as any;
            currentRecords = [...currentRecords, record];
        }

        this.saveRecords(currentRecords);
    }

    async clockOut() {
        const user = this.authService.currentUser();
        if (!user) {
            console.error('clockOut: No user logged in');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        let currentRecords = this.records();
        const existingRecordIndex = currentRecords.findIndex(r => r.date === today);

        if (existingRecordIndex > -1) {
            currentRecords[existingRecordIndex].outTime = now;
            currentRecords[existingRecordIndex].duration = this.calculateDuration(
                currentRecords[existingRecordIndex].inTime,
                now
            );
            console.log('clockOut: Saving record:', currentRecords[existingRecordIndex]);
            await this.saveRecords(currentRecords);
        }
    }

    private async saveRecords(records: AttendanceRecord[]) {
        const user = this.authService.currentUser();
        if (!user) return;

        // Save to localStorage first for immediate availability
        const key = this.getStorageKey();
        if (key) {
            this.storageService.setItem(key, records);
            this.records.set(records);
        }

        // Then sync to API
        try {
            for (const record of records) {
                const response = await fetch(`${this.API_URL}/attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        date: record.date,
                        inTime: record.inTime,
                        outTime: record.outTime,
                        duration: record.duration
                    })
                });
                
                if (!response.ok) {
                    console.error(`API error: ${response.status} ${response.statusText}`);
                    const error = await response.json();
                    console.error('API response:', error);
                } else {
                    const data = await response.json();
                    console.log('Record saved to API:', data);
                }
            }
            console.log('Attendance records synced to API');
        } catch (error) {
            console.error('Error syncing attendance to API:', error);
        }
    }

    private calculateDuration(start: string | null, end: string | null): string {
        if (!start || !end) return '';
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const diff = endTime - startTime;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    }

    getRecordsByMonth(month: number, year: number): AttendanceRecord[] {
        return this.records().filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }

    /**
     * Add or update a manual attendance record for a given date.
     * dateIso should be YYYY-MM-DD. inTimeIso/outTimeIso should be full ISO strings or null.
     */
    addOrUpdateRecord(dateIso: string, inTimeIso: string | null, outTimeIso: string | null) {
        const user = this.authService.currentUser();
        console.log('addOrUpdateRecord: currentUser =', user);
        
        if (!user) {
            console.error('addOrUpdateRecord: No user logged in, cannot save');
            return;
        }

        let currentRecords = this.records();
        console.log('addOrUpdateRecord: Current records count =', currentRecords.length);
        
        const existingIndex = currentRecords.findIndex(r => r.date === dateIso);

        const record: AttendanceRecord = {
            userId: user.id,
            date: dateIso,
            inTime: inTimeIso,
            outTime: outTimeIso,
            duration: this.calculateDuration(inTimeIso, outTimeIso)
        };

        if (existingIndex > -1) {
            const existing = { ...currentRecords[existingIndex] };
            existing.inTime = record.inTime ?? existing.inTime;
            existing.outTime = record.outTime ?? existing.outTime;
            existing.duration = this.calculateDuration(existing.inTime, existing.outTime);
            currentRecords = [...currentRecords.slice(0, existingIndex), existing, ...currentRecords.slice(existingIndex + 1)];
            console.log('addOrUpdateRecord: Updated existing record for date', dateIso);
        } else {
            currentRecords = [...currentRecords, record];
            console.log('addOrUpdateRecord: Created new record for date', dateIso);
        }

        console.log('addOrUpdateRecord: Final record to save:', record);
        this.saveRecords(currentRecords);
        console.log('addOrUpdateRecord: Saved. New total records:', this.records().length);
    }

    /**
     * Delete attendance record for a given date.
     */
    deleteRecord(dateIso: string) {
        const key = this.getStorageKey();
        if (!key) return;

        let currentRecords = this.records();
        const filtered = currentRecords.filter(r => r.date !== dateIso);
        this.saveRecords(filtered);
    }
}
