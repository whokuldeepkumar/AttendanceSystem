import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { LoadingService } from './loading.service';
import { environment } from '../../environments/environment';

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
    private readonly API_URL = environment.apiUrl;

    // Computed signal to get records sorted by date descending
    sortedRecords = computed(() => {
        return this.records().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    constructor(
        private storageService: StorageService,
        private authService: AuthService,
        private loadingService: LoadingService
    ) {
        this.loadRecords();
    }

    private getStorageKey(): string {
        const user = this.authService.currentUser();
        return user ? `attendance_${user.id}` : '';
    }

    async loadRecords() {
        const user = this.authService.currentUser();
        if (!user) {
            this.records.set([]);
            return;
        }

        // Load from localStorage first for immediate display
        const key = this.getStorageKey();
        if (key) {
            const localData = this.storageService.getItem<AttendanceRecord[]>(key) || [];
            this.records.set(localData);
            console.log('Attendance records loaded from localStorage:', localData.length, 'records');
        }

        // Then fetch from API and update
        try {
            console.log('Loading attendance from API:', `${this.API_URL}/attendance/${user.id}`);
            const response = await fetch(`${this.API_URL}/attendance/${user.id}`);
            console.log('API response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Attendance records loaded from API:', data);
                this.records.set(data);
                // Update localStorage with fresh data
                if (key) {
                    this.storageService.setItem(key, data);
                }
            }
        } catch (error) {
            console.error('Error loading attendance from API:', error);
        }
    }

    getTodayRecord(): AttendanceRecord | undefined {
        const today = new Date().toISOString().split('T')[0];
        const allRecords = this.records();
        console.log('getTodayRecord: today=', today, 'records=', allRecords);
        const found = allRecords.find(r => {
            const recordDate = r.date.split('T')[0]; // Handle if date has timestamp
            console.log('getTodayRecord: comparing', recordDate, 'with', today, 'match=', recordDate === today);
            return recordDate === today;
        });
        console.log('getTodayRecord: found=', found);
        return found;
    }

    async clockIn(customTime?: Date) {
        const user = this.authService.currentUser();
        if (!user) {
            console.error('clockIn: No user logged in');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const now = customTime ? customTime.toISOString() : new Date().toISOString();

        let currentRecords = this.records();
        const existingRecordIndex = currentRecords.findIndex(r => r.date.split('T')[0] === today);
        let recordToSave: AttendanceRecord;

        if (existingRecordIndex > -1) {
            if (!currentRecords[existingRecordIndex].inTime) {
                currentRecords[existingRecordIndex].inTime = now;
                recordToSave = currentRecords[existingRecordIndex];
            } else {
                console.log('clockIn: Already have inTime, skipping');
                return;
            }
        } else {
            recordToSave = {
                userId: user.id,
                date: today,
                inTime: now,
                outTime: null,
                duration: ''
            };
            currentRecords = [...currentRecords, recordToSave];
        }

        console.log('clockIn: Saving record:', recordToSave);
        // Update local state first
        this.records.set(currentRecords);
        
        // Sync to localStorage
        const key = this.getStorageKey();
        if (key) {
            this.storageService.setItem(key, currentRecords);
        }

        // Save to API
        this.loadingService.show();
        await this.saveRecordToAPI(recordToSave);
        this.loadingService.hide();
    }

    /**
     * Mark a day with a label (e.g., 'Leave', 'Saturday Off') so it appears in attendance records.
     */
    async markDay(dateIso: string, label: string) {
        const user = this.authService.currentUser();
        if (!user) {
            console.error('markDay: No user logged in');
            return;
        }

        let currentRecords = this.records();
        const existingIndex = currentRecords.findIndex(r => r.date === dateIso);

        const record: AttendanceRecord = {
            userId: user.id,
            date: dateIso,
            inTime: null,
            outTime: null,
            duration: label
        };

        if (existingIndex > -1) {
            const existing = { ...currentRecords[existingIndex] };
            existing.duration = label;
            currentRecords = [...currentRecords.slice(0, existingIndex), existing, ...currentRecords.slice(existingIndex + 1)];
            record.inTime = existing.inTime;
            record.outTime = existing.outTime;
        } else {
            currentRecords = [...currentRecords, record];
        }

        console.log('markDay: Saving record:', record);
        // Update local state
        this.records.set(currentRecords);
        
        // Sync to localStorage
        const key = this.getStorageKey();
        if (key) {
            this.storageService.setItem(key, currentRecords);
        }

        // Save to API
        this.loadingService.show();
        await this.saveRecordToAPI(record);
        this.loadingService.hide();
    }

    async clockOut(customTime?: Date) {
        const user = this.authService.currentUser();
        if (!user) {
            console.error('clockOut: No user logged in');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const now = customTime ? customTime.toISOString() : new Date().toISOString();

        let currentRecords = this.records();
        const existingRecordIndex = currentRecords.findIndex(r => r.date.split('T')[0] === today);

        if (existingRecordIndex > -1) {
            const updatedRecord = {
                ...currentRecords[existingRecordIndex],
                outTime: now,
                duration: this.calculateDuration(currentRecords[existingRecordIndex].inTime, now)
            };
            
            currentRecords = [
                ...currentRecords.slice(0, existingRecordIndex),
                updatedRecord,
                ...currentRecords.slice(existingRecordIndex + 1)
            ];
            
            console.log('clockOut: Saving record:', updatedRecord);
            // Update local state
            this.records.set(currentRecords);
            
            // Sync to localStorage
            const key = this.getStorageKey();
            if (key) {
                this.storageService.setItem(key, currentRecords);
            }

            // Save to API
            this.loadingService.show();
            await this.saveRecordToAPI(updatedRecord);
            this.loadingService.hide();
        }
    }

    private async saveRecords(records: AttendanceRecord[]) {
        const user = this.authService.currentUser();
        if (!user) {
            console.error('saveRecords: No user logged in');
            return;
        }

        console.log('saveRecords: Starting save for', records.length, 'records');

        // Save to localStorage first for immediate availability
        const key = this.getStorageKey();
        if (key) {
            this.storageService.setItem(key, records);
            this.records.set(records);
            console.log('saveRecords: Saved to localStorage');
        }

        // Then sync to API
        try {
            for (const record of records) {
                const payload = {
                    userId: user.id,
                    date: record.date,
                    inTime: record.inTime,
                    outTime: record.outTime,
                    duration: record.duration
                };
                console.log('saveRecords: Sending to API:', payload);
                
                const response = await fetch(`${this.API_URL}/attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                console.log('saveRecords: API response status:', response.status);
                
                if (!response.ok) {
                    console.error(`saveRecords: API error: ${response.status} ${response.statusText}`);
                    const error = await response.json();
                    console.error('saveRecords: API error response:', error);
                } else {
                    const data = await response.json();
                    console.log('saveRecords: Record saved to API:', data);
                }
            }
            console.log('saveRecords: All records synced to API successfully');
        } catch (error) {
            console.error('saveRecords: Error syncing attendance to API:', error);
        }
    }

    private async saveRecordToAPI(record: AttendanceRecord): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) {
            console.error('saveRecordToAPI: No user logged in');
            return;
        }

        const payload = {
            userId: user.id,
            date: record.date,
            inTime: record.inTime,
            outTime: record.outTime,
            duration: record.duration
        };

        try {
            console.log('saveRecordToAPI: Sending record to API:', payload);
            
            const response = await fetch(`${this.API_URL}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('saveRecordToAPI: API response status:', response.status);

            if (!response.ok) {
                const error = await response.json();
                console.error('saveRecordToAPI: API error:', error);
                return;
            }

            const data = await response.json();
            console.log('saveRecordToAPI: Record saved successfully:', data);
        } catch (error) {
            console.error('saveRecordToAPI: Network error:', error);
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
    async addOrUpdateRecord(dateIso: string, inTimeIso: string | null, outTimeIso: string | null) {
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
        this.loadingService.show();
        await this.saveRecords(currentRecords);
        this.loadingService.hide();
        console.log('addOrUpdateRecord: Saved. New total records:', this.records().length);
    }

    /**
     * Delete attendance record for a given date.
     */
    async deleteRecord(dateIso: string) {
        const user = this.authService.currentUser();
        if (!user) {
            console.error('deleteRecord: No user logged in');
            return;
        }

        let currentRecords = this.records();
        const filtered = currentRecords.filter(r => r.date !== dateIso);
        
        // Update local state immediately
        this.records.set(filtered);
        
        // Sync deletion to localStorage
        const key = this.getStorageKey();
        if (key) {
            this.storageService.setItem(key, filtered);
        }

        // Delete from API
        this.loadingService.show();
        try {
            const response = await fetch(`${this.API_URL}/attendance/${user.id}/${dateIso}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log('Attendance record deleted from API');
            } else {
                console.error('Error deleting from API:', response.statusText);
            }
        } catch (error) {
            console.error('Error deleting attendance from API:', error);
        } finally {
            this.loadingService.hide();
        }
    }
}
