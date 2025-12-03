import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';

export interface Employee {
    name: string;
    mobile: string;
    id: string; // unique identifier (mobile)
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly USER_KEY = 'current_user';
    currentUser = signal<Employee | null>(null);

    constructor(private storageService: StorageService, private router: Router) {
        this.loadUser();
    }

    private loadUser() {
        const user = this.storageService.getItem<Employee>(this.USER_KEY);
        if (user) {
            this.currentUser.set(user);
        }
    }

    login(name: string, mobile: string): void {
        const user: Employee = {
            name,
            mobile,
            id: mobile
        };
        this.storageService.setItem(this.USER_KEY, user);
        this.currentUser.set(user);
        // We might want to store a list of all employees if we were doing admin stuff,
        // but for this standalone app, just the current user is enough for now.
    }

    logout(): void {
        this.storageService.removeItem(this.USER_KEY);
        this.currentUser.set(null);
        // Router navigation will be handled in component or guard
    }

    isAuthenticated(): boolean {
        return this.currentUser() !== null;
    }
}
