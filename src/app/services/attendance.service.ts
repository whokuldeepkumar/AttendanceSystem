import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

export interface AttendanceRecord {
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

    loadRecords() {
        const key = this.getStorageKey();
        if (key) {
            const data = this.storageService.getItem<AttendanceRecord[]>(key) || [];
            this.records.set(data);
        } else {
            this.records.set([]);
        }
    }

    getTodayRecord(): AttendanceRecord | undefined {
        const today = new Date().toISOString().split('T')[0];
        return this.records().find(r => r.date === today);
    }

    clockIn() {
        const key = this.getStorageKey();
        if (!key) return;

        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        let currentRecords = this.records();
        const existingRecordIndex = currentRecords.findIndex(r => r.date === today);

        if (existingRecordIndex > -1) {
            // Already clocked in? Maybe just update if needed, but usually clock in is once.
            // If they want multiple ins/outs, logic needs to change. Assuming single In/Out per day for simplicity based on "Daily In Out".
            if (!currentRecords[existingRecordIndex].inTime) {
                currentRecords[existingRecordIndex].inTime = now;
            }
        } else {
            const newRecord: AttendanceRecord = {
                date: today,
                inTime: now,
                outTime: null,
                duration: ''
            };
            currentRecords = [...currentRecords, newRecord];
        }

        this.saveRecords(currentRecords);
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

    clockOut() {
        const key = this.getStorageKey();
        if (!key) return;

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
            this.saveRecords(currentRecords);
        }
    }

    private saveRecords(records: AttendanceRecord[]) {
        const key = this.getStorageKey();
        if (key) {
            this.storageService.setItem(key, records);
            this.records.set(records);
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
        
        const key = this.getStorageKey();
        console.log('addOrUpdateRecord: storageKey =', key);
        
        if (!key) {
            console.error('addOrUpdateRecord: No user logged in, cannot save');
            return;
        }

        let currentRecords = this.records();
        console.log('addOrUpdateRecord: Current records count =', currentRecords.length);
        
        const existingIndex = currentRecords.findIndex(r => r.date === dateIso);

        const record: AttendanceRecord = {
            date: dateIso,
            inTime: inTimeIso,
            outTime: outTimeIso,
            duration: this.calculateDuration(inTimeIso, outTimeIso)
        };

        if (existingIndex > -1) {
            // merge with existing (overwrite provided fields)
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
